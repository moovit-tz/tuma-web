import "server-only";
import { and, desc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { accounts, branches, chargeSnapshots, codRecords, shipments, users } from "../db/schema";
import type { CurrentUser } from "../auth/current-user";
import { toE164 } from "@/domain/phone";
import { TZ_REGIONS } from "@/domain/pricing";
import { parcelOrderSchema, type ParcelOrderInput } from "@/domain/order-schema";
import { amountToCollect } from "@/domain/payments";
import { normaliseWaybill } from "@/domain/waybill-number";
import { createParcel, DomainError, transition } from "./shipments";
import { liveFor } from "./live-tracking";
import { ratingScores } from "./ratings";
import { agentMove, agentParcel } from "./agent-parcels";
import { companyOf } from "./corporate";
import { rememberCustomers } from "./customers";
import { issueCompanyInvoice } from "./counter-payments";

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
  }),
  /** To the receiver's door, or collected at a Tuma point of the same business. */
  deliveryMode: z.enum(["door", "wakala_collect"]).default("door"),
  collectId: z.string().uuid().optional(),
  goods: z.string().trim().min(3).max(200),
  category: z.string().trim().min(2).max(40).default("general"),
  weightKg: z.coerce.number().positive().max(30),
  size: z.enum(["small", "medium", "large"]).default("small"),
  fragile: z.boolean().default(false),
  declaredValue: z.coerce.number({ message: "Enter what the goods are worth" }).int().min(1, "Enter what the goods are worth").max(1_000_000_000),
  /** Who pays: the sender at the drop-off, or the receiver on delivery (when the point takes that). */
  payer: z.enum(["sender", "receiver"]).default("sender"),
  /** Sending for a company: in its name, and it may go on the company's account (the point invoices it). */
  asCompany: z.boolean().default(false),
  paidWith: z.enum(["at_point", "account"]).default("at_point"),
  noProhibited: z.literal(true, { message: "Confirm there are no prohibited items" }),
});

async function point(id: string) {
  const [p] = await db
    .select({ id: branches.id, name: branches.name, accountId: branches.accountId, region: branches.region, district: branches.district, address: branches.address, payOnDelivery: accounts.payOnDelivery })
    .from(branches)
    .innerJoin(accounts, eq(accounts.id, branches.accountId))
    .where(and(eq(branches.id, id), eq(branches.active, true), eq(accounts.partnerKind, "parcel_agent"), inArray(accounts.status, ["active", "pending"])));
  return p;
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
  if (!me?.phone && !co?.phone) throw new DomainError("PHONE_REQUIRED", "Add your phone number in your profile first: the Tuma point and the receiver need it.");
  const drop = await point(b.dropOffId);
  if (!drop) throw new DomainError("POINT_NOT_FOUND", "That Tuma point isn't taking parcels. Pick another.");
  if (!(TZ_REGIONS as readonly string[]).includes(drop.region)) throw new DomainError("POINT_NOT_FOUND", "That Tuma point isn't taking parcels. Pick another.");
  let collectId: string | undefined;
  if (b.deliveryMode === "wakala_collect") {
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
  await db.update(shipments).set({ handlingPartnerId: drop.accountId, handlingBranchId: drop.id }).where(eq(shipments.id, shipment.id));
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

/** What this person booked or sent (by their number), and what's coming to their number. */
export async function myParcels(user: CurrentUser) {
  const phone = await phoneOf(user);
  const co = await companyOf(user);
  // A company's team sees every parcel sent in its name.
  const sentBy = or(
    eq(shipments.createdBy, user.id),
    phone ? sql`${shipments.shipper}->>'phone' = ${phone}` : undefined,
    co?.tin ? sql`${shipments.shipper}->'company'->>'tin' = ${co.tin}` : undefined,
  )!;
  const toMe = phone ? sql`${shipments.consignee}->>'phone' = ${phone}` : sql`false`;
  const rows = await db
    .select({
      waybill: shipments.waybill,
      state: shipments.state,
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
  return {
    parcels: rows.map((r) => {
      const coming = phone != null && r.consignee.phone === phone && r.createdBy !== user.id && !(co?.tin && r.shipper.company?.tin === co.tin);
      return {
        waybill: r.waybill,
        state: r.state,
        direction: (coming ? "coming" : "sent") as Direction,
        // Who's on the other end: the receiver of what I sent, the sender of what's coming.
        other: coming ? r.shipper.name : r.consignee.name,
        otherPlace: coming ? r.shipper.address.region : `${r.consignee.address.district}, ${r.consignee.address.region}`,
        goods: r.goods,
        total: r.state === "AWAITING_HANDOVER" ? null : r.total,
        point: r.point,
        business: r.business,
        createdAt: r.createdAt.toISOString(),
        // Who at the company booked it (the contact on the parcel).
        bookedBy: co ? (r.shipper.company?.contactName ?? null) : null,
      };
    }),
    company: co ? { name: co.name } : null,
  };
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
          co?.tin ? sql`${shipments.shipper}->'company'->>'tin' = ${co.tin}` : undefined,
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
        .select({ id: branches.id, name: branches.name, business: accounts.name, address: branches.address, district: branches.district, region: branches.region, phone: branches.phone, lat: branches.lat, lng: branches.lng })
        .from(branches)
        .innerJoin(accounts, eq(accounts.id, branches.accountId))
        .where(eq(branches.id, s.handlingBranchId))
    : [];
  const mine = s.createdBy === user.id || s.shipper.phone === phone || (!!co?.tin && s.shipper.company?.tin === co.tin);
  const booked = s.state === "AWAITING_HANDOVER" || s.state === "CREATED";
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
    // The Tuma point's price, once it has accepted the parcel.
    total: booked ? null : s.totalCharge,
    point: p ?? null,
    canCancel: mine && booked && s.createdBy === user.id,
    live: await liveFor(s.id, true),
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
  // Free of charge, on account, or the receiver pays on delivery: in it comes.
  if (!s.receiveOnPayment) await agentMove(user, waybill, { to: "RECEIVED" });
  return agentParcel(user, waybill);
}
