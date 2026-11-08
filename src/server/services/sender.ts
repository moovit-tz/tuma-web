import "server-only";
import { and, desc, eq, gte, inArray, isNotNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { accounts, branches, departments, locations, chargeSnapshots, codRecords, events, shipments, users, walletEntries } from "../db/schema";
import type { CurrentUser } from "../auth/current-user";
import { toE164 } from "@/domain/phone";
import { TZ_REGIONS } from "@/domain/pricing";
import { parcelOrderSchema, type ParcelOrderInput } from "@/domain/order-schema";
import { amountToCollect } from "@/domain/payments";
import { normaliseWaybill } from "@/domain/waybill-number";
import { createParcel, DomainError, transition } from "./shipments";
import { liveFor, liveForMany } from "./live-tracking";
import { myRatingFor, ratingScores } from "./ratings";

import { agentMove, agentParcel, collectionPoints, counterAgent } from "./agent-parcels";
import { companyOf } from "./corporate";
import { rememberCustomers } from "./customers";
import { issueCompanyInvoice } from "./counter-payments";
import { autoPayFromWallet } from "./wallet";
import { queuePush } from "./push";

/**
 * Anyone with the Tuma app can send a parcel, with no business to set up: they book it ahead from their phone, take
 * it to a Tuma point (an agent's office) near them and pay there, at that office's price. The office sees it under
 * Expected, accepts it at the counter (price, payment) and it's on its way. "My parcels" lists what they sent and
 * what's coming to their number.
 */

/** Rough size of the parcel, as the counter form asks it. */
const SIZES = { small: [30, 20, 10], medium: [45, 35, 25], large: [60, 45, 40] } as const;

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/* ---------------------------------------------------------- Tuma points */

export const pointsSchema = z.object({
  lat: z.coerce.number().min(-12).max(0).optional(),
  lng: z.coerce.number().min(29).max(41).optional(),
  region: z.string().trim().max(60).optional(),
  q: z.string().trim().max(60).optional(),
  /** Only this business's points (where a parcel dropped at one of its offices can be collected). */
  business: z.string().trim().max(80).optional(),
});

/**
 * Tuma points: open offices of parcel agents (approved, or under review and trading), pinned on the map. Nearest first
 * when the sender shares where they are, otherwise their region first.
 */
export async function tumaPoints(raw: unknown) {
  const f = pointsSchema.parse(raw);
  const rows = await db
    .select({
      id: branches.id,
      name: branches.name,
      business: accounts.name,
      accountId: accounts.id,
      region: branches.region,
      district: branches.district,
      address: branches.address,
      phone: branches.phone,
      lat: branches.lat,
      lng: branches.lng,
      payOnDelivery: accounts.payOnDelivery,
    })
    .from(branches)
    .innerJoin(accounts, eq(accounts.id, branches.accountId))
    .where(
      and(
        eq(branches.active, true),
        eq(accounts.partnerKind, "parcel_agent"),
        inArray(accounts.status, ["active", "pending"]),
        isNotNull(branches.lat),
        f.business ? eq(accounts.id, f.business) : undefined,
        f.q ? or(sql`${branches.name} ilike ${"%" + f.q + "%"}`, sql`${accounts.name} ilike ${"%" + f.q + "%"}`, sql`${branches.district} ilike ${"%" + f.q + "%"}`) : undefined,
      ),
    );
  const here = f.lat != null && f.lng != null ? { lat: f.lat, lng: f.lng } : null;
  // businessId: a parcel collected at a point must go to one of the same business.
  // How receivers rate each business (null until it has enough ratings).
  const scores = await ratingScores([...new Set(rows.map((r) => r.accountId))]);
  const points = rows.map(({ accountId, ...p }) => ({
    ...p,
    businessId: accountId,
    km: here ? Math.round(km(here, { lat: p.lat!, lng: p.lng! }) * 10) / 10 : null,
    rating: scores.get(accountId)?.score ?? null,
    ratings: scores.get(accountId)?.count ?? 0,
  }));
  // Nearest first; without a location, the region's best rated first.
  points.sort((a, b) =>
    here
      ? a.km! - b.km!
      : Number(b.region === f.region) - Number(a.region === f.region) || a.region.localeCompare(b.region) || (b.rating ?? 0) - (a.rating ?? 0) || a.name.localeCompare(b.name),
  );
  return { points: points.slice(0, 50) };
}

/* -------------------------------------------------------------- booking */

export const senderBookingSchema = z.object({
  /** The Tuma point the sender will take it to. */
  dropOffId: z.string().uuid({ message: "Choose the Tuma point you'll take it to" }),
  receiver: z.object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim(),
    region: z.enum(TZ_REGIONS),
    district: z.string().trim().min(2).max(80),
    landmark: z.string().trim().max(200).optional(),
    lat: z.coerce.number().min(-12).max(0).optional(),
    lng: z.coerce.number().min(29).max(41).optional(),
    /** A company receiving it: the name is the company's; who takes it in and its TIN when known. */
    company: z
      .object({
        tin: z
          .string()
          .trim()
          .optional()
          .transform((v) => v?.replace(/\D/g, "") || undefined)
          .refine((v) => v == null || v.length === 9, "A TIN has 9 digits"),
        regNo: z.string().trim().max(40).optional(),
        contactName: z.string().trim().max(120).optional(),
      })
      .optional(),
  }),
  /** To the receiver's door, or collected at a Tuma point of the same business. */
  deliveryMode: z.enum(["door", "wakala_collect"]).default("door"),
  /** Collected at an office of the drop-off's business (collectId) or at a common collection point (deliveryLocationId). */
  collectId: z.string().uuid().optional(),
  deliveryLocationId: z.string().trim().min(1).max(64).optional(),
  goods: z.string().trim().min(3).max(200),
  category: z.string().trim().min(2).max(40).default("general"),
  weightKg: z.coerce.number().positive().max(30),
  size: z.enum(["small", "medium", "large"]).default("small"),
  fragile: z.boolean().default(false),
  /** A photo of the parcel the sender took (an upload key from /api/driver/uploads, kind "parcel"). */
  photo: z.string().regex(/^parcel\/[\w/.-]+$/).max(200).optional(),
  declaredValue: z.coerce.number({ message: "Enter what the goods are worth" }).int().min(1, "Enter what the goods are worth").max(1_000_000_000),
  /** Who pays: the sender at the drop-off, or the receiver on delivery (when the point takes that). */
  payer: z.enum(["sender", "receiver"]).default("sender"),
  /** Sending for a company: in its name, and it may go on the company's account (the point invoices it). */
  asCompany: z.boolean().default(false),
  /** At the point (cash or mobile money there), on the company's account, or from my Tuma wallet once it's priced. */
  paidWith: z.enum(["at_point", "account", "wallet"]).default("at_point"),
  /** Sending for a company: the department it's charged to (the sender's own when left out). */
  departmentId: z.uuid().optional(),
  noProhibited: z.literal(true, { message: "Confirm there are no prohibited items" }),
});

/**
 * Where a receiver can collect a parcel dropped at [dropOffId], as at that business's counter: its other offices
 * (the receiver's district first, then the head office) and the common collection points.
 */
export async function senderCollectionPoints(user: CurrentUser, f: { dropOffId?: string | null; region?: string | null; district?: string | null }) {
  const drop = f.dropOffId ? await point(f.dropOffId) : undefined;
  if (!drop) throw new DomainError("POINT_NOT_FOUND", "Choose the Tuma point you'll take it to first.");
  const counter: CurrentUser = { ...user, accountId: drop.accountId, branchId: drop.id };
  return { business: drop.business, ...(await collectionPoints(counter, f.region ?? undefined, f.district ?? undefined)) };
}

const booked0 = (state: string) => state === "AWAITING_HANDOVER" || state === "CREATED";

async function point(id: string) {
  const [p] = await db
    .select({ id: branches.id, name: branches.name, business: accounts.name, accountId: branches.accountId, region: branches.region, district: branches.district, address: branches.address, payOnDelivery: accounts.payOnDelivery })
    .from(branches)
    .innerJoin(accounts, eq(accounts.id, branches.accountId))
    .where(and(eq(branches.id, id), eq(branches.active, true), eq(accounts.partnerKind, "parcel_agent"), inArray(accounts.status, ["active", "pending"])));
  return p;
}

type SenderBooking = z.infer<typeof senderBookingSchema>;
type Company = NonNullable<Awaited<ReturnType<typeof companyOf>>>;

/**
 * Before a parcel goes on a company's account: the allowance while the company's KYC is reviewed, then its policy
 * (how it may be paid, the most it may be worth, a department, parcels per person a month) and the department's
 * monthly budget. Returns the department it's charged to.
 */
async function companyRules(user: CurrentUser, co: Company, b: SenderBooking): Promise<string | null> {
  if (co.status === "pending" && user.trial && user.trial.remaining <= 0) {
    throw new DomainError(
      "KYC_PENDING_LIMIT",
      `${co.name} can send ${user.trial.allowance} parcels on its account while we check its documents. That's used up: send this one as yourself, or wait for the approval.`,
      403,
    );
  }
  if (co.status !== "active" && co.status !== "pending") throw new DomainError("COMPANY_CLOSED", `${co.name} can't send on Tuma right now.`, 403);
  const p = co.policy ?? {};
  const way = b.payer === "receiver" ? null : b.paidWith === "at_point" ? "point" : b.paidWith;
  if (way && p.payWith?.length && !p.payWith.includes(way)) throw new DomainError("POLICY_PAYMENT", `${co.name}'s policy doesn't allow paying this way.`, 403);
  if (p.maxDeclaredValue && b.declaredValue > p.maxDeclaredValue) {
    throw new DomainError("POLICY_VALUE", `${co.name}'s policy allows parcels worth up to TZS ${p.maxDeclaredValue.toLocaleString("en-US")}.`, 403);
  }
  const [me] = await db.select({ departmentId: users.departmentId }).from(users).where(eq(users.id, user.id));
  const departmentId = b.departmentId ?? me?.departmentId ?? null;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  if (departmentId) {
    const [d] = await db.select().from(departments).where(and(eq(departments.id, departmentId), eq(departments.accountId, co.id), eq(departments.active, true)));
    if (!d) throw new DomainError("DEPARTMENT", "Pick one of the company's departments.");
    if (d.monthlyBudget) {
      const [{ spent }] = await db
        .select({ spent: sql<number>`coalesce(sum(${shipments.totalCharge}), 0)::int` })
        .from(shipments)
        .where(and(eq(shipments.departmentId, d.id), gte(shipments.createdAt, monthStart), sql`${shipments.state} <> 'CANCELLED'`));
      if (spent >= d.monthlyBudget) throw new DomainError("BUDGET_USED", `${d.name} has used its budget for this month.`, 403);
    }
  } else if (p.requireDepartment) {
    throw new DomainError("DEPARTMENT", "Pick the department this parcel is for.");
  }
  if (p.monthlyParcelsPerSender) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(shipments)
      .where(and(eq(shipments.companyAccountId, co.id), eq(shipments.createdBy, user.id), gte(shipments.createdAt, monthStart), sql`${shipments.state} <> 'CANCELLED'`));
    if (n >= p.monthlyParcelsPerSender) throw new DomainError("POLICY_MONTHLY", `You've sent the ${p.monthlyParcelsPerSender} parcels a month ${co.name} allows each person.`, 403);
  }
  return departmentId;
}

/**
 * Book a parcel ahead. It is written in the drop-off office's books (that business prices and handles it) and waits
 * there as Expected; the sender is who booked it. Nothing is charged until the counter accepts it.
 */
export async function senderBook(user: CurrentUser, raw: unknown) {
  const b = senderBookingSchema.parse(raw);
  const [me] = await db.select({ name: users.name, phone: users.phone, email: users.email }).from(users).where(eq(users.id, user.id));
  const co = b.asCompany ? await companyOf(user) : null;
  if (b.asCompany && !co) throw new DomainError("NOT_COMPANY", "You don't send for a company on Tuma.", 403);
  if (b.paidWith === "account" && (!co || b.payer !== "sender")) throw new DomainError("ACCOUNT_COMPANIES_ONLY", "Only a company can put a parcel on its account.");
  const departmentId = co ? await companyRules(user, co, b) : null;
  if (!me?.phone && !co?.phone) throw new DomainError("PHONE_REQUIRED", "Add your phone number in your profile first: the Tuma point and the receiver need it.");
  const drop = await point(b.dropOffId);
  if (!drop) throw new DomainError("POINT_NOT_FOUND", "That Tuma point isn't taking parcels. Pick another.");
  if (!(TZ_REGIONS as readonly string[]).includes(drop.region)) throw new DomainError("POINT_NOT_FOUND", "That Tuma point isn't taking parcels. Pick another.");
  let collectId: string | undefined;
  let locationId: string | undefined;
  if (b.deliveryMode === "wakala_collect" && !b.collectId && b.deliveryLocationId) {
    const [l] = await db
      .select({ id: locations.id })
      .from(locations)
      .where(and(eq(locations.id, b.deliveryLocationId), eq(locations.active, true), inArray(locations.type, ["wakala", "collection_point"])));
    if (!l) throw new DomainError("COLLECT_POINT", "That collection point isn't open. Pick another.");
    locationId = l.id;
  } else if (b.deliveryMode === "wakala_collect") {
    const c = b.collectId ? await point(b.collectId) : undefined;
    if (!c || c.accountId !== drop.accountId) throw new DomainError("COLLECT_POINT", "Choose where the receiver collects it: a Tuma point of the same business.");
    if (c.id === drop.id) throw new DomainError("COLLECT_POINT", "That's where you're dropping it off. Pick where the receiver will collect it.");
    collectId = c.id;
  }
  if (b.payer === "receiver" && !drop.payOnDelivery) throw new DomainError("PAY_ON_DELIVERY_OFF", "This Tuma point doesn't take pay on delivery. You pay when you drop it off.");
  if (me?.phone && toE164(b.receiver.phone) === toE164(me.phone)) throw new DomainError("SAME_PHONE", "The receiver's number is yours. Enter theirs.");

  const [w, l, h] = SIZES[b.size];
  const input: ParcelOrderInput = {
    serviceLevel: "next_day",
    paymentTerms: b.payer === "receiver" ? "pay_on_delivery" : b.paidWith === "account" ? "account" : "prepaid",
    prepayMethod: b.payer === "sender" && b.paidWith !== "account" ? "cash" : undefined,
    collectMethods: ["cash", "mobile_money"],
    handoverMode: "hub_bulk",
    deliveryMode: b.deliveryMode,
    deliveryBranchId: collectId,
    deliveryLocationId: locationId,
    shipper: {
      name: co ? co.name : me!.name,
      phone: co ? (me?.phone ?? co.phone!) : me!.phone!,
      email: me?.email ?? undefined,
      language: user.locale === "en" ? "en" : "sw",
      company: co ? { tin: co.tin ?? undefined, contactName: me?.name } : undefined,
      address: { region: drop.region as (typeof TZ_REGIONS)[number], district: drop.district || "—", street: drop.address ?? undefined },
    },
    consignee: {
      name: b.receiver.name,
      phone: b.receiver.phone,
      language: "sw",
      company: b.receiver.company ? { tin: b.receiver.company.tin, regNo: b.receiver.company.regNo || undefined, contactName: b.receiver.company.contactName || undefined } : undefined,
      address: { region: b.receiver.region, district: b.receiver.district, landmark: b.receiver.landmark || undefined, lat: b.receiver.lat, lng: b.receiver.lng },
    },
    goodsDescription: b.goods,
    goodsCategory: b.category,
    declaredValue: b.declaredValue,
    specialHandling: b.fragile ? ["fragile"] : [],
    prohibitedDeclared: true,
    pieces: [{ weightKg: b.weightKg, lengthCm: w, widthCm: l, heightCm: h }],
  };
  const order = parcelOrderSchema.parse(input);
  // Booked in the point's books, as if typed at its counter; the sender stays the one who booked it.
  const counter: CurrentUser = { ...user, accountId: drop.accountId, branchId: drop.id, permissions: new Set(["shipment.create", "agent.workspace"]) };
  const { shipment } = await createParcel(counter, order, "app", { charge: 0 });
  await db
    .update(shipments)
    // From the wallet: paid the moment the point prices it (if the balance covers it).
    .set({
      handlingPartnerId: drop.accountId,
      handlingBranchId: drop.id,
      goodsPhoto: b.photo ?? null,
      companyAccountId: co?.id ?? null,
      departmentId, ...(b.paidWith === "wallet" && b.payer === "sender" ? { prepayMethod: "wallet" } : {}) })
    .where(eq(shipments.id, shipment.id));
  // The point's team hears a parcel is on its way to their counter.
  await db.transaction((tx) =>
    queuePush(tx, {
      key: `booked:${shipment.id}`,
      to: { account: { id: drop.accountId, permission: "agent.workspace" } },
      template: "push.booked_here",
      variables: { waybill: shipment.waybill, point: drop.name, sender: input.shipper.name, receiver: b.receiver.name },
      data: { type: "agent_parcel", waybill: shipment.waybill },
      waybill: shipment.waybill,
    }),
  );
  return senderParcel(user, shipment.waybill);
}

/* ---------------------------------------------------------- my parcels */

type Direction = "sent" | "coming";

function phoneOf(user: CurrentUser) {
  return db
    .select({ phone: users.phone })
    .from(users)
    .where(eq(users.id, user.id))
    .then((r) => (r[0]?.phone ? toE164(r[0].phone) : null));
}

/** Which parcels are this person's: booked by them, sent from their number (or in their company's name), or to it. */
async function senderScope(user: CurrentUser) {
  const phone = await phoneOf(user);
  const co = await companyOf(user);
  // The company's admin sees every parcel sent on its account; the rest of the team, the ones they sent.
  const sentBy = or(
    eq(shipments.createdBy, user.id),
    phone ? sql`${shipments.shipper}->>'phone' = ${phone}` : undefined,
    co && user.permissions.has("corporate.manage") ? eq(shipments.companyAccountId, co.id) : undefined,
  )!;
  const toMe = phone ? sql`${shipments.consignee}->>'phone' = ${phone}` : sql`false`;
  return { phone, co, sentBy, toMe };
}

/** What this person booked or sent (by their number), and what's coming to their number. */
export async function myParcels(user: CurrentUser) {
  const { phone, co, sentBy, toMe } = await senderScope(user);
  const rows = await db
    .select({
      id: shipments.id,
      waybill: shipments.waybill,
      state: shipments.state,
      companyAccountId: shipments.companyAccountId,
      shipper: shipments.shipper,
      consignee: shipments.consignee,
      goods: shipments.goodsDescription,
      total: shipments.totalCharge,
      createdAt: shipments.createdAt,
      createdBy: shipments.createdBy,
      point: branches.name,
      business: accounts.name,
    })
    .from(shipments)
    .leftJoin(branches, eq(branches.id, shipments.handlingBranchId))
    .leftJoin(accounts, eq(accounts.id, shipments.handlingPartnerId))
    .where(and(eq(shipments.type, "parcel"), or(sentBy, toMe)))
    .orderBy(desc(shipments.createdAt))
    .limit(100);
  // Where the courier is for the ones on the move (the same as the GTFS-RT feed per parcel), in one query.
  const live = await liveForMany(
    rows.filter((r) => !["DELIVERED", "CANCELLED", "RETURNED", "RETURNED_TO_SENDER"].includes(r.state)).map((r) => r.id),
    true,
  );
  return {
    parcels: rows.map((r) => {
      const coming = phone != null && r.consignee.phone === phone && r.createdBy !== user.id && !(co && r.companyAccountId === co.id);
      return {
        waybill: r.waybill,
        state: r.state,
        direction: (coming ? "coming" : "sent") as Direction,
        // Who's on the other end: the receiver of what I sent, the sender of what's coming.
        other: coming ? r.shipper.name : r.consignee.name,
        // The receiver's number on what I sent (to send to them again); not the sender's on what's coming.
        otherPhone: coming ? null : (r.consignee.phone ?? null),
        otherPlace: coming ? r.shipper.address.region : `${r.consignee.address.district}, ${r.consignee.address.region}`,
        goods: r.goods,
        total: r.state === "AWAITING_HANDOVER" ? null : r.total,
        point: r.point,
        business: r.business,
        createdAt: r.createdAt.toISOString(),
        // Who at the company booked it (the contact on the parcel).
        bookedBy: co ? (r.shipper.company?.contactName ?? null) : null,
        live: live.get(r.id) ?? null,
      };
    }),
    company: co ? { name: co.name } : null,
  };
}

/** A sender's notification: one of their parcels moved, or money in or out of their wallet. */
export type SenderNotification =
  | {
      id: string;
      kind: "parcel";
      at: string;
      waybill: string;
      state: string | null;
      receiver: string | null;
      /** Who sent it, for a parcel coming to me ("A parcel has been sent to you from …"). */
      sender: string | null;
      /** The Tuma point holding it at that moment, and where the receiver collects it (when collected). */
      point: string | null;
      collectAt: string | null;
      note: string | null;
      direction: Direction;
    }
  | { id: string; kind: "wallet"; at: string; entry: "topup" | "parcel" | "refund"; amount: number; waybill: string | null };

/**
 * The sender's notifications, read from what already happened: the last 30 days of moves on their parcels (sent and
 * coming) made by someone else, and their settled wallet top-ups, payments and refunds. Newest first; read state
 * stays on the phone.
 */
export async function senderNotifications(user: CurrentUser): Promise<{ notifications: SenderNotification[] }> {
  const { phone, co, sentBy, toMe } = await senderScope(user);
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [moves, money] = await Promise.all([
    db
      .select({
        id: events.id,
        at: events.occurredAt,
        state: events.stateAfter,
        note: events.note,
        waybill: shipments.waybill,
        consignee: shipments.consignee,
        shipper: shipments.shipper,
        createdBy: shipments.createdBy,
        companyAccountId: shipments.companyAccountId,
        point: branches.name,
        collectBranch: sql<string | null>`(select b.name from branches b where b.id = ${shipments.deliveryBranchId})`,
        collectLocation: sql<string | null>`(select l.name from locations l where l.id = ${shipments.deliveryLocationId})`,
      })
      .from(events)
      .innerJoin(shipments, eq(events.shipmentId, shipments.id))
      .leftJoin(branches, eq(branches.id, shipments.handlingBranchId))
      .where(
        and(
          eq(shipments.type, "parcel"),
          or(sentBy, toMe),
          gte(events.occurredAt, since),
          sql`${events.stateAfter} is not null`,
          eq(events.estimated, false),
          or(sql`${events.actorId} is null`, sql`${events.actorId} <> ${user.id}`),
        ),
      )
      .orderBy(desc(events.occurredAt))
      .limit(50),
    db
      .select({ id: walletEntries.id, kind: walletEntries.kind, amount: walletEntries.amount, waybill: walletEntries.waybill, at: walletEntries.settledAt })
      .from(walletEntries)
      .where(and(eq(walletEntries.userId, user.id), eq(walletEntries.status, "paid"), gte(walletEntries.settledAt, since)))
      .orderBy(desc(walletEntries.settledAt))
      .limit(20),
  ]);
  const list: SenderNotification[] = [
    ...moves.map((m) => {
      const coming = phone != null && m.consignee.phone === phone && m.createdBy !== user.id && !(co && m.companyAccountId === co.id);
      return {
        id: m.id,
        kind: "parcel" as const,
        at: m.at.toISOString(),
        waybill: m.waybill,
        state: m.state,
        receiver: coming ? null : (m.consignee.name ?? null) || null,
        sender: coming ? (m.shipper.name ?? null) || null : null,
        point: m.point ?? null,
        collectAt: m.collectBranch ?? m.collectLocation ?? null,
        note: m.note,
        direction: (coming ? "coming" : "sent") as Direction,
      };
    }),
    ...money
      .filter((w) => w.at != null)
      .map((w) => ({
        id: w.id,
        kind: "wallet" as const,
        at: w.at!.toISOString(),
        entry: w.kind as "topup" | "parcel" | "refund",
        amount: Math.abs(w.amount),
        waybill: w.waybill,
      })),
  ];
  list.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return { notifications: list.slice(0, 60) };
}

async function own(user: CurrentUser, rawWaybill: string) {
  const waybill = normaliseWaybill(rawWaybill).waybill;
  const phone = await phoneOf(user);
  const co = await companyOf(user);
  const [s] = await db
    .select()
    .from(shipments)
    .where(
      and(
        eq(shipments.waybill, waybill),
        or(
          eq(shipments.createdBy, user.id),
          phone ? sql`${shipments.shipper}->>'phone' = ${phone}` : undefined,
          phone ? sql`${shipments.consignee}->>'phone' = ${phone}` : undefined,
          co && user.permissions.has("corporate.manage") ? eq(shipments.companyAccountId, co.id) : undefined,
        ),
      ),
    );
  if (!s) throw new DomainError("NOT_FOUND", "We couldn't find that parcel among yours.", 404);
  return { s, phone, co };
}

/** One of my parcels: where it is, the Tuma point, the price once the counter set it, and the courier when one has it. */
export async function senderParcel(user: CurrentUser, rawWaybill: string) {
  const { s, phone, co } = await own(user, rawWaybill);
  const [p] = s.handlingBranchId
    ? await db
        .select({
          id: branches.id,
          name: branches.name,
          business: accounts.name,
          tin: accounts.tin,
          address: branches.address,
          district: branches.district,
          region: branches.region,
          phone: branches.phone,
          lat: branches.lat,
          lng: branches.lng,
        })
        .from(branches)
        .innerJoin(accounts, eq(accounts.id, branches.accountId))
        .where(eq(branches.id, s.handlingBranchId))
    : [];
  const priced = !(booked0(s.state) && !s.receiveOnPayment) && s.totalCharge > 0;
  const payer = s.paymentTerms === "pay_on_delivery" ? "receiver" : "sender";
  const mine = s.createdBy === user.id || s.shipper.phone === phone || (!!co && s.companyAccountId === co.id && user.permissions.has("corporate.manage"));
  const booked = booked0(s.state);
  // Whoever pays sees the paperwork: a proforma invoice once the point has priced it, a receipt once it's paid.
  const [snap] =
    priced && (mine ? payer === "sender" : payer === "receiver")
      ? await db.select().from(chargeSnapshots).where(eq(chargeSnapshots.shipmentId, s.id)).orderBy(desc(chargeSnapshots.version)).limit(1)
      : [];
  const cod = payer === "receiver" && snap ? (await db.select({ st: codRecords.status }).from(codRecords).where(eq(codRecords.shipmentId, s.id)))[0] : undefined;
  const settled = payer === "sender" ? !!s.paidAt : ["collected", "deposited", "remitted"].includes(cod?.st ?? "");
  const { tin: pointTin, ...point } = p ?? { tin: null };
  const agent = snap ? await counterAgent(s) : null;
  return {
    waybill: s.waybill,
    state: s.state,
    direction: mine ? "sent" : "coming",
    sender: { name: s.shipper.name, phone: s.shipper.phone },
    receiver: { name: s.consignee.name, phone: s.consignee.phone, region: s.consignee.address.region, district: s.consignee.address.district, landmark: s.consignee.address.landmark ?? null },
    deliveryMode: s.deliveryMode,
    goods: s.goodsDescription,
    declaredValue: s.declaredValue,
    weightKg: s.actualWeightG / 1000,
    payer: s.paymentTerms === "pay_on_delivery" ? "receiver" : "sender",
    onAccount: s.paymentTerms === "account",
    // The Tuma point's price, once it has set it (it may still wait for payment).
    total: booked && !s.receiveOnPayment ? null : s.totalCharge,
    paid: !!s.paidAt,
    paidWith: s.paidAt ? s.prepayMethod : null,
    fromWallet: s.prepayMethod === "wallet",
    // Priced and waiting for my payment: I can pay it from my wallet.
    canPayFromWallet: s.createdBy === user.id && s.paymentTerms === "prepaid" && s.receiveOnPayment && !s.paidAt && s.totalCharge > 0 && s.state === "AWAITING_HANDOVER",
    point: p ? point : null,
    document: snap
      ? {
          kind: settled ? "receipt" : "proforma",
          number: `${settled ? "RC" : "PF"}-${s.waybill}`,
          issuedAt: (settled && s.paidAt ? s.paidAt : snap.createdAt).toISOString(),
          issuer: p ? { business: p.business, office: p.name, tin: pointTin, phone: p.phone, address: [p.address, p.district, p.region].filter(Boolean).join(", ") } : null,
          agent,
          billTo: payer === "sender" ? { name: s.shipper.name, phone: s.shipper.phone, tin: s.shipper.company?.tin ?? null } : { name: s.consignee.name, phone: s.consignee.phone, tin: s.consignee.company?.tin ?? null },
          lines: snap.lines.map((l) => ({ label: l.label, amount: l.amount })),
          subtotal: snap.subtotal,
          tax: snap.tax,
          total: snap.total,
          currency: snap.currency,
          paidWith: settled ? (s.prepayMethod ?? null) : null,
        }
      : null,
    canCancel: mine && booked && s.createdBy === user.id,
    live: await liveFor(s.id, true),
    // The receiver's rating of the point that handed it over, once it's delivered.
    rating: phone && !mine ? await myRatingFor(s.id, phone) : null,
    createdAt: s.createdAt.toISOString(),
  };
}

/** Change of plan before the parcel reaches the counter. */
export async function senderCancel(user: CurrentUser, rawWaybill: string, raw: unknown) {
  const { reason } = z.object({ reason: z.string().trim().min(3, "Say why you're cancelling").max(300) }).parse(raw);
  const { s } = await own(user, rawWaybill);
  if (s.createdBy !== user.id || !["CREATED", "AWAITING_HANDOVER"].includes(s.state)) {
    throw new DomainError("CANNOT_CANCEL", "Only a booking that hasn't reached the Tuma point can be cancelled. Ask the point.", 409);
  }
  await transition("system", s.waybill, "CANCELLED", { source: "field_app", reasonCode: "OV02", note: reason, data: { by: user.id } });
  return senderParcel(user, s.waybill);
}

/* ------------------------------------------------- at the Tuma point */

export const acceptSchema = z.object({
  /** This office's price for it, from its own tariff. */
  price: z.coerce.number().int().min(0).max(10_000_000),
  /** What the counter found on the scale, when it differs from the booking. */
  weightKg: z.coerce.number().positive().max(30).optional(),
  /** What the counter found when it looked: the kind and description of the goods, and what they're worth. */
  goods: z.string().trim().min(3).max(200).optional(),
  category: z.string().trim().min(2).max(40).optional(),
  declaredValue: z.coerce.number().int().min(1).max(1_000_000_000).optional(),
});

/**
 * The office prices a parcel booked ahead, once it's on the counter. The charge snapshot gets a new version; when the
 * receiver pays, what to collect at the door follows the price. Receiving and taking the money are the usual moves.
 */
export async function priceDropOff(user: CurrentUser, rawWaybill: string, raw: unknown) {
  if (!user.permissions.has("agent.workspace") || !user.accountId) throw new DomainError("FORBIDDEN", "You don't have access to parcels.", 403);
  const a = acceptSchema.parse(raw);
  const waybill = normaliseWaybill(rawWaybill).waybill;
  await db.transaction(async (tx) => {
    const [s] = await tx.select().from(shipments).where(eq(shipments.waybill, waybill)).for("update");
    if (!s || s.handlingPartnerId !== user.accountId) throw new DomainError("NOT_FOUND", "Parcel not found.", 404);
    if (!["CREATED", "AWAITING_HANDOVER"].includes(s.state)) throw new DomainError("ALREADY_ACCEPTED", "This parcel is already in. Its price is set.", 409);
    const weightG = a.weightKg ? Math.round(a.weightKg * 1000) : s.actualWeightG;
    await tx
      .update(shipments)
      .set({
        totalCharge: a.price,
        actualWeightG: weightG,
        chargeableWeightG: Math.max(weightG, s.volumetricWeightG),
        goodsDescription: a.goods ?? s.goodsDescription,
        goodsCategory: a.category ?? s.goodsCategory,
        declaredValue: a.declaredValue ?? s.declaredValue,
        handlingBranchId: user.branchId ?? s.handlingBranchId,
        // The sender pays now (cash or a mobile-money push) and the parcel is received once it's paid.
        receiveOnPayment: s.paymentTerms === "prepaid" && a.price > 0,
      })
      .where(eq(shipments.id, s.id));
    const [{ v }] = await tx.select({ v: sql<number>`coalesce(max(${chargeSnapshots.version}), 0)::int` }).from(chargeSnapshots).where(eq(chargeSnapshots.shipmentId, s.id));
    await tx.insert(chargeSnapshots).values({
      shipmentId: s.id,
      version: v + 1,
      lines: [{ code: "AGENT_RATE", label: "Agent's charge", amount: a.price }],
      subtotal: a.price,
      tax: 0,
      total: a.price,
      taxRef: "AGENT-RATE",
      reason: "counter_price",
    });
    const due = amountToCollect({ paymentTerms: s.paymentTerms, codAmount: s.codAmount, totalCharge: a.price });
    await tx.delete(codRecords).where(eq(codRecords.shipmentId, s.id));
    if (due.total > 0) await tx.insert(codRecords).values({ shipmentId: s.id, amountDue: due.goods, feeDue: due.fee });
  });
  // Both people go into the point's customer list, like a counter booking.
  const [s] = await db.select().from(shipments).where(eq(shipments.waybill, waybill));
  const company = s.shipper.company;
  const ids = await rememberCustomers(user.accountId, {
    sender: { kind: company ? "company" : "individual", name: s.shipper.name, phone: s.shipper.phone, email: s.shipper.email, tin: company?.tin, regNo: company?.regNo, contactName: company?.contactName },
    receiver: { kind: "individual", name: s.consignee.name, phone: s.consignee.phone, ...s.consignee.address },
  });
  await db.update(shipments).set({ shipperCustomerId: ids.sender, consigneeCustomerId: ids.receiver }).where(eq(shipments.id, s.id));
  // On the company's account: the point invoices the company now.
  if (s.paymentTerms === "account") {
    await db.transaction(async (tx) => {
      const [fresh] = await tx.select().from(shipments).where(eq(shipments.id, s.id));
      await issueCompanyInvoice(tx, fresh, { customerId: ids.sender ?? null, actorId: user.id });
    });
  }
  // Free of charge, on account, or the receiver pays on delivery: in it comes. Booked "from my wallet": paid now
  // when the wallet covers it (and in it comes); otherwise it waits for payment as usual.
  if (!s.receiveOnPayment) await agentMove(user, waybill, { to: "RECEIVED" });
  else if (s.prepayMethod === "wallet") await autoPayFromWallet(s.id);
  return agentParcel(user, waybill);
}
