import "server-only";
import { customerRatingsOn } from "./customer-ratings";
import { and, asc, count, desc, eq, gte, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { accounts, branches, codRecords, events, invoices, jobShipments, jobs, kybApplications, kybEvents, locations, manifestItems, manifests, parcelPayments, reasonCodes, shipments, users } from "../db/schema";
import { collect, collection } from "../adapters/hudupay";
import { issueCompanyInvoice, markPaid, receiveOnceFor, settlePayment } from "./counter-payments";
import { momoEnabled } from "./agent-payments";
import { refundToWallet } from "./wallet";
import { toE164 } from "@/domain/phone";
import { createParcel, DomainError, transition } from "./shipments";
import { enqueue } from "../adapters/outbox";
import { verifyTrackingOtp } from "./tracking";
import { trialFor } from "../rbac";
import type { CurrentUser } from "../auth/current-user";
import { normaliseWaybill } from "@/domain/waybill-number";
import { canTransition, nextStates, type ShipmentState } from "@/domain/states";
import { parcelOrderSchema, SPECIAL_HANDLING, type ParcelOrderInput } from "@/domain/order-schema";
import { rememberCustomers } from "./customers";
import { amountToCollect } from "@/domain/payments";
import { TZ_REGIONS } from "@/domain/pricing";
import { PACKAGING_TYPES } from "@/domain/parcel-types";

/**
 * Parcel work at an agent's counter, from the Tuma app: what's expected, in hand, on its way and done; booking a
 * parcel a customer brings in; and moving parcels on (received, ready for collection, handed over, failed attempt).
 * A business sees parcels it booked and parcels routed to it. The portal keeps set-up and reporting.
 */

const EXPECTED = ["CREATED", "AWAITING_HANDOVER"] as const;
const IN_HAND = ["RECEIVED", "AT_HUB", "READY_FOR_COLLECTION", "ATTEMPT_FAILED"] as const;
const ON_THE_WAY = ["IN_TRANSIT", "OUT_FOR_DELIVERY", "RETURNING"] as const;
const DONE = ["DELIVERED", "RETURNED", "CANCELLED"] as const;

export const AGENT_VIEWS = ["expected", "in_hand", "to_hand_over", "on_the_way", "done", "all"] as const;
export type AgentView = (typeof AGENT_VIEWS)[number];
/**
 * Here to be handed to the receiver, not sent on: ready to collect, back after a failed delivery attempt, or arrived
 * at the office it's to be collected from.
 */
const TO_HAND_OVER = sql`(${shipments.state} in ('READY_FOR_COLLECTION', 'ATTEMPT_FAILED') or (${shipments.state} in ('RECEIVED', 'AT_HUB') and ${shipments.deliveryBranchId} is not null and ${shipments.deliveryBranchId} = ${shipments.handlingBranchId}))`;

const VIEW_STATES: Record<Exclude<AgentView, "all" | "to_hand_over">, readonly ShipmentState[]> = {
  expected: EXPECTED,
  in_hand: IN_HAND,
  on_the_way: ON_THE_WAY,
  done: DONE,
};

/** Moves an agent may make from the app; the rest belong to hubs, dispatch and the platform. */
const AGENT_MOVES: ShipmentState[] = ["RECEIVED", "READY_FOR_COLLECTION", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "ATTEMPT_FAILED"];

const acctOf = (user: CurrentUser) => user.accountId!;

function businessOf(user: CurrentUser): string {
  if (!user.permissions.has("agent.workspace") || !user.accountId) throw new DomainError("FORBIDDEN", "You don't have access to parcels.", 403);
  return user.accountId;
}

/** Parcels the business booked or handles; narrowed to the person's office when they work at one. */
function mine(acct: string, user: CurrentUser): SQL {
  const ours = or(eq(shipments.accountId, acct), eq(shipments.handlingPartnerId, acct))!;
  return user.branchId ? and(ours, or(eq(shipments.handlingBranchId, user.branchId), sql`${shipments.handlingBranchId} is null`))! : ours;
}

/** Midnight in Dar es Salaam (UTC+3, no daylight saving), `daysAgo` days back. */
function darMidnight(daysAgo = 0): Date {
  const now = new Date(Date.now() + 3 * 3600_000);
  const d = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo);
  return new Date(d - 3 * 3600_000);
}

/* ----------------------------------------------------------------- summary */

export async function agentSummary(user: CurrentUser) {
  const acct = businessOf(user);
  const scope = mine(acct, user);
  const today = darMidnight(0);
  const week = darMidnight(6);
  const month = darMidnight(29);
  const day = sql<string>`to_char(${shipments.createdAt} at time zone 'Africa/Dar_es_Salaam', 'YYYY-MM-DD')`;
  const dday = sql<string>`to_char(${shipments.deliveredAt} at time zone 'Africa/Dar_es_Salaam', 'YYYY-MM-DD')`;
  const [byState, booked, delivered, periods, trial, coming, handOver] = await Promise.all([
    db.select({ state: shipments.state, n: count() }).from(shipments).where(scope).groupBy(shipments.state),
    db.select({ day, n: count(), value: sql<number>`coalesce(sum(${shipments.totalCharge}), 0)::int` }).from(shipments).where(and(scope, gte(shipments.createdAt, week))).groupBy(day),
    db.select({ day: dday, n: count() }).from(shipments).where(and(scope, eq(shipments.state, "DELIVERED"), gte(shipments.deliveredAt, week))).groupBy(dday),
    db
      .select({
        today: sql<number>`count(*) filter (where ${shipments.createdAt} >= ${today.toISOString()}::timestamptz)::int`,
        todayValue: sql<number>`coalesce(sum(${shipments.totalCharge}) filter (where ${shipments.createdAt} >= ${today.toISOString()}::timestamptz), 0)::int`,
        week: sql<number>`count(*) filter (where ${shipments.createdAt} >= ${week.toISOString()}::timestamptz)::int`,
        weekValue: sql<number>`coalesce(sum(${shipments.totalCharge}) filter (where ${shipments.createdAt} >= ${week.toISOString()}::timestamptz), 0)::int`,
        month: sql<number>`count(*)::int`,
        monthValue: sql<number>`coalesce(sum(${shipments.totalCharge}), 0)::int`,
      })
      .from(shipments)
      .where(and(scope, gte(shipments.createdAt, month), sql`${shipments.state} <> 'CANCELLED'`)),
    user.accountStatus === "pending" ? trialFor(acct) : Promise.resolve(null),
    // Manifests on their way to this office, to check in when they arrive.
    db
      .select({ n: count() })
      .from(manifests)
      .where(and(eq(manifests.toAccountId, acct), eq(manifests.status, "on_the_way"), user.branchId ? eq(manifests.toBranchId, user.branchId) : undefined)),
    db.select({ n: count() }).from(shipments).where(and(scope, TO_HAND_OVER)),
  ]);
  const st = Object.fromEntries(byState.map((r) => [r.state, r.n])) as Record<string, number>;
  const sum = (keys: readonly string[]) => keys.reduce((a, k) => a + (st[k] ?? 0), 0);
  const bookedBy = new Map(booked.map((r) => [r.day, r]));
  const deliveredBy = new Map(delivered.map((r) => [r.day, r.n]));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(darMidnight(6 - i).getTime() + 3 * 3600_000).toISOString().slice(0, 10);
    return { day: d, booked: bookedBy.get(d)?.n ?? 0, delivered: deliveredBy.get(d) ?? 0 };
  });
  const p = periods[0];
  return {
    counts: { expected: sum(EXPECTED), inHand: sum(IN_HAND), onTheWay: sum(ON_THE_WAY), readyForCollection: st.READY_FOR_COLLECTION ?? 0, toHandOver: handOver[0]?.n ?? 0, manifestsComing: coming[0]?.n ?? 0 },
    periods: {
      today: { parcels: p?.today ?? 0, value: p?.todayValue ?? 0 },
      week: { parcels: p?.week ?? 0, value: p?.weekValue ?? 0 },
      month: { parcels: p?.month ?? 0, value: p?.monthValue ?? 0 },
    },
    days,
    trial,
  };
}

/* -------------------------------------------------------------------- list */

export const listSchema = z.object({
  view: z.enum(AGENT_VIEWS).default("all"),
  q: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function agentParcels(user: CurrentUser, raw: unknown) {
  const acct = businessOf(user);
  const f = listSchema.parse(raw);
  const where: (SQL | undefined)[] = [mine(acct, user)];
  if (f.view === "to_hand_over") where.push(TO_HAND_OVER);
  else if (f.view !== "all") where.push(inArray(shipments.state, [...VIEW_STATES[f.view]]));
  if (f.q) {
    const term = `%${f.q}%`;
    where.push(
      or(
        ilike(shipments.waybill, term),
        sql`${shipments.consignee}->>'name' ilike ${term}`,
        sql`${shipments.consignee}->>'phone' ilike ${term}`,
        sql`${shipments.shipper}->>'name' ilike ${term}`,
        sql`${shipments.shipper}->>'phone' ilike ${term}`,
      ),
    );
  }
  const rows = await db
    .select({
      waybill: shipments.waybill,
      state: shipments.state,
      shipper: shipments.shipper,
      consignee: shipments.consignee,
      goods: shipments.goodsDescription,
      pieces: shipments.piecesCount,
      deliveryMode: shipments.deliveryMode,
      totalCharge: shipments.totalCharge,
      createdAt: shipments.createdAt,
      updatedAt: shipments.updatedAt,
    })
    .from(shipments)
    .where(and(...where))
    .orderBy(desc(shipments.updatedAt), desc(shipments.id))
    .limit(f.limit);
  return {
    parcels: rows.map((r) => ({
      waybill: r.waybill,
      state: r.state,
      from: { name: r.shipper.name, region: r.shipper.address.region },
      to: { name: r.consignee.name, phone: r.consignee.phone, region: r.consignee.address.region, district: r.consignee.address.district },
      goods: r.goods,
      pieces: r.pieces,
      deliveryMode: r.deliveryMode,
      total: r.totalCharge,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  };
}

/* ------------------------------------------------------------------ detail */

async function load(user: CurrentUser, rawWaybill: string) {
  const acct = businessOf(user);
  const { waybill } = normaliseWaybill(rawWaybill);
  const [s] = await db.select().from(shipments).where(and(eq(shipments.waybill, waybill), mine(acct, user)));
  if (!s) throw new DomainError("NOT_FOUND", "We couldn't find that parcel among yours.", 404);
  return s;
}

/** In hand at an office: it leaves only on a dispatch (a manifest, with who carries it and where to). */
const IN_COUNTER: ShipmentState[] = ["RECEIVED", "AT_HUB", "ATTEMPT_FAILED"];
const LEAVING: ShipmentState[] = ["IN_TRANSIT", "OUT_FOR_DELIVERY"];

type Placed = { state: string; deliveryMode: string | null; deliveryBranchId: string | null; handlingBranchId: string | null };

/** It's collected at this very office, so it can be made ready for collection here without travelling. */
function collectedHere(user: CurrentUser, s: Placed) {
  const here = user.branchId ?? s.handlingBranchId;
  return s.deliveryMode === "wakala_collect" && !!s.deliveryBranchId && s.deliveryBranchId === here;
}

/**
 * What this person can do next with the parcel, from its state and their permissions. A parcel in hand can't be
 * handed over or sent off with a tap: it goes out on a dispatch, or is made ready for collection when it's collected
 * at this office.
 */
function movesFor(user: CurrentUser, s: Placed): ShipmentState[] {
  const state = s.state as ShipmentState;
  return nextStates(state).filter((to) => {
    if (!AGENT_MOVES.includes(to) || !canTransition(state, to, user.permissions).ok) return false;
    if (IN_COUNTER.includes(state) && LEAVING.includes(to)) return false;
    if (IN_COUNTER.includes(state) && to === "READY_FOR_COLLECTION") return collectedHere(user, s);
    return true;
  });
}

/**
 * The agent who took the parcel in at the counter (who received it, or booked it there): their name and phone, for the
 * receipt. Null until someone at the point has handled it.
 */
export async function counterAgent(s: { id: string; createdBy: string; handlingPartnerId: string | null; accountId: string }) {
  const [r] = await db
    .select({ name: users.name, phone: users.phone })
    .from(events)
    .innerJoin(users, sql`${users.id} = ${events.actorId}`)
    .where(and(eq(events.shipmentId, s.id), eq(events.stateAfter, "RECEIVED")))
    .orderBy(asc(events.occurredAt))
    .limit(1);
  if (r) return r;
  const [c] = await db
    .select({ name: users.name, phone: users.phone })
    .from(users)
    .where(and(eq(users.id, s.createdBy), inArray(users.accountId, [s.handlingPartnerId ?? s.accountId, s.accountId])));
  return c ?? null;
}

export async function agentParcel(user: CurrentUser, rawWaybill: string) {
  const s = await load(user, rawWaybill);
  const [evts, cod, delivery, inv] = await Promise.all([
    db
      .select({ type: events.type, state: events.stateAfter, at: events.occurredAt, note: events.note, reasonEn: reasonCodes.labelEn, reasonSw: reasonCodes.labelSw, place: locations.name })
      .from(events)
      .leftJoin(reasonCodes, eq(reasonCodes.code, events.reasonCode))
      .leftJoin(locations, eq(locations.id, events.locationId))
      .where(eq(events.shipmentId, s.id))
      .orderBy(asc(events.occurredAt)),
    db.select().from(codRecords).where(eq(codRecords.shipmentId, s.id)),
    s.deliveryLocationId
      ? db.select({ name: locations.name }).from(locations).where(eq(locations.id, s.deliveryLocationId))
      : s.deliveryBranchId
        ? db.select({ name: branches.name }).from(branches).where(eq(branches.id, s.deliveryBranchId))
        : Promise.resolve([]),
    db.select({ number: invoices.number, status: invoices.status, total: invoices.total, tax: invoices.tax }).from(invoices).where(eq(invoices.shipmentId, s.id)),
  ]);
  const due = amountToCollect(s);
  // Booked ahead from someone's phone (not by this business's staff): the counter prices it when it arrives.
  const [by] = s.createdBy ? await db.select({ accountId: users.accountId }).from(users).where(eq(users.id, s.createdBy)) : [];
  const bookedAhead = (EXPECTED as readonly string[]).includes(s.state) && by?.accountId !== s.handlingPartnerId;
  const needsPrice = bookedAhead && !s.receiveOnPayment && s.totalCharge === 0;
  // It comes in through pricing (priceDropOff), not straight to received.
  const moves = movesFor(user, s).filter((m) => !(needsPrice && m === "RECEIVED"));
  // In hand and not collected here: the next step is dispatching it (step one, who carries it).
  const canDispatch = user.permissions.has("shipment.dispatch") && IN_COUNTER.includes(s.state as ShipmentState) && !collectedHere(user, s) && !(await onItsWay(s.id));
  // Cancelling one in hand here: the owner (shipment.cancel), with a reason, before it's on its way with anyone.
  const canCancel = user.permissions.has("shipment.cancel") && CANCEL_FROM.includes(s.state) && !(await onItsWay(s.id));
  const cancelReasons = canCancel
    ? await db.select({ code: reasonCodes.code, en: reasonCodes.labelEn, sw: reasonCodes.labelSw }).from(reasonCodes).where(and(eq(reasonCodes.active, true), eq(reasonCodes.kind, "cancellation"))).orderBy(asc(reasonCodes.code))
    : [];
  const failReasons = moves.includes("ATTEMPT_FAILED")
    ? await db.select({ code: reasonCodes.code, en: reasonCodes.labelEn, sw: reasonCodes.labelSw }).from(reasonCodes).where(and(eq(reasonCodes.active, true), eq(reasonCodes.kind, "failed_delivery"))).orderBy(asc(reasonCodes.code))
    : [];
  const [agent, [office]] = await Promise.all([
    counterAgent(s),
    s.handlingBranchId
      ? db
          .select({ name: branches.name, business: accounts.name, phone: branches.phone })
          .from(branches)
          .innerJoin(accounts, eq(accounts.id, branches.accountId))
          .where(eq(branches.id, s.handlingBranchId))
      : Promise.resolve([]),
  ]);
  return {
    parcel: {
      waybill: s.waybill,
      state: s.state,
      agent,
      office: office ?? null,
      serviceLevel: s.serviceLevel,
      paymentTerms: s.paymentTerms,
      paidWith: s.prepayMethod,
      paidAt: s.paidAt,
      /** Booked, but only received once it's paid. */
      awaitingPayment: s.receiveOnPayment && !s.paidAt && s.state === "AWAITING_HANDOVER",
      /** Booked ahead by the sender on their phone; true until the counter accepts it. */
      bookedAhead,
      /** A parcel booked ahead the counter hasn't priced yet. */
      needsPrice,
      declaredValue: s.declaredValue,
      extras: s.extras,
      invoice: inv[0] ?? null,
      deliveryMode: s.deliveryMode,
      collectAt: delivery[0]?.name ?? null,
      shipper: s.shipper,
      consignee: s.consignee,
      instructions: s.deliveryInstructions,
      goods: s.goodsDescription,
      category: s.goodsCategory,
      pieces: s.piecesCount,
      weightKg: Math.round((s.chargeableWeightG ?? 0) / 100) / 10,
      specialHandling: s.specialHandling,
      total: s.totalCharge,
      promisedAt: s.promisedAt,
      createdAt: s.createdAt,
      attempts: s.attempts,
      toCollect: { goods: due.goods, fee: due.fee, total: due.total, collected: cod[0]?.status === "collected", methods: s.collectMethods },
      events: evts,
    },
    moves,
    canDispatch,
    // How this business rated the sender and the receiver (stars or null): rateable once it's at the counter.
    customerRatings: await customerRatingsOn(acctOf(user), s.id),
    failReasons,
    canCancel,
    cancelReasons,
  };
}

const CANCEL_FROM: readonly string[] = ["RECEIVED", "AT_HUB"];

/** On a manifest or a Tuma courier job that hasn't finished with it. */
async function onItsWay(shipmentId: string) {
  const r = (await db.execute(sql`
    select 1 from ${manifestItems} mi join ${manifests} mf on mf.id = mi.manifest_id
      where mi.shipment_id = ${shipmentId} and mf.status = 'on_the_way' and mi.arrived_at is null
    union all
    select 1 from ${jobShipments} js join ${jobs} j on j.id = js.job_id
      where js.shipment_id = ${shipmentId} and js.outcome = 'pending' and j.status in ('open','assigned','in_progress')
    limit 1`)) as unknown as unknown[];
  return r.length > 0;
}

export const cancelSchema = z.object({
  reasonCode: z.string().trim().regex(/^CN\d{2}$/, "Choose why it's being cancelled"),
  note: z.string().trim().max(300).optional(),
});

/**
 * The office cancels a parcel it holds (the sender changed their mind, a prohibited item, booked by mistake…). A
 * reason is required, and a note for "other". What the sender already paid is due back to them: the app says how much,
 * and FinOps gets it to reconcile. Nothing is left to collect from the receiver.
 */
export async function agentCancel(user: CurrentUser, rawWaybill: string, raw: unknown) {
  const s = await load(user, rawWaybill);
  const c = cancelSchema.parse(raw);
  if (!user.permissions.has("shipment.cancel")) throw new DomainError("FORBIDDEN", "Only the owner can cancel a parcel. Ask them.", 403);
  if (!CANCEL_FROM.includes(s.state)) throw new DomainError("CANNOT_CANCEL", "Only a parcel in hand at this office can be cancelled here.", 409);
  if (await onItsWay(s.id)) throw new DomainError("ON_ITS_WAY", "It's on a manifest on its way. Get it back first.", 409);
  const [rc] = await db.select({ code: reasonCodes.code, en: reasonCodes.labelEn }).from(reasonCodes).where(and(eq(reasonCodes.code, c.reasonCode), eq(reasonCodes.kind, "cancellation"), eq(reasonCodes.active, true)));
  if (!rc) throw new DomainError("BAD_REASON", "Choose why it's being cancelled.");
  if (rc.code === "CN06" && (c.note?.length ?? 0) < 3) throw new DomainError("NOTE_REQUIRED", "Say why it's being cancelled.");
  // The sender gets back what they paid: at the counter, or straight back into their Tuma wallet.
  const toWallet = !!s.paidAt && s.prepayMethod === "wallet";
  const refundDue = s.paidAt && !toWallet ? s.totalCharge : 0;
  await transition(user, s.waybill, "CANCELLED", { source: "field_app", reasonCode: rc.code, note: c.note || rc.en, data: { refundDue, refundedToWallet: toWallet ? s.totalCharge : 0 } });
  let refundedToWallet = 0;
  await db.transaction(async (tx) => {
    await tx.update(codRecords).set({ status: "none" }).where(eq(codRecords.shipmentId, s.id));
    if (toWallet) refundedToWallet = await refundToWallet(tx, s);
    if (refundDue > 0) {
      await enqueue(tx, {
        target: "finops",
        topic: "shipment.cancelled_refund",
        idempotencyKey: `cancelrefund:${s.waybill}`,
        waybill: s.waybill,
        payload: { waybill: s.waybill, accountId: user.accountId, refund: refundDue, currency: s.currency, reasonCode: rc.code },
      });
    }
  });
  return { ...(await agentParcel(user, s.waybill)), refundDue, refundedToWallet };
}

/* ------------------------------------------------------------------- moves */

export const moveSchema = z.object({
  to: z.enum(AGENT_MOVES as [ShipmentState, ...ShipmentState[]]),
  reasonCode: z.string().trim().max(40).optional(),
  note: z.string().trim().max(300).optional(),
  /** Who took the parcel at handover. */
  receiverName: z.string().trim().max(120).optional(),
  collectMethod: z.enum(["cash", "mobile_money"]).optional(),
  /** The receiver's code from their SMS: their signature that they got it. */
  code: z.string().trim().max(12).optional(),
  /** An optional proof-of-delivery photo, uploaded first (POST /api/driver/uploads kind=pod). */
  photo: z.string().regex(/^pod\/[\w/.-]+$/).max(200).optional(),
});

const CODE_ERRORS = {
  invalid: "That's not the receiver's code. Check the SMS with them, or send a new one.",
  expired: "The receiver's code has expired. Send them a new one.",
  locked: "Too many wrong codes. Send the receiver a new one.",
} as const;

export async function agentMove(user: CurrentUser, rawWaybill: string, raw: unknown) {
  const s = await load(user, rawWaybill);
  const m = moveSchema.parse(raw);
  if (!movesFor(user, s).includes(m.to as ShipmentState)) {
    throw new DomainError(
      IN_COUNTER.includes(s.state as ShipmentState) && LEAVING.includes(m.to as ShipmentState) ? "DISPATCH_FIRST" : "BAD_MOVE",
      IN_COUNTER.includes(s.state as ShipmentState) ? "Dispatch it first: choose who carries it and where it's going." : "That can't be done with this parcel now.",
      409,
    );
  }
  if (m.to === "ATTEMPT_FAILED" && !m.reasonCode) throw new DomainError("REASON_REQUIRED", "Choose why the handover didn't happen.");
  if (m.to === "DELIVERED" && !m.receiverName) throw new DomainError("RECEIVER_REQUIRED", "Enter the name of the person who took the parcel.");
  // Handing over: the receiver's code is their signature.
  if (m.to === "DELIVERED") {
    if (!m.code) throw new DomainError("CODE_REQUIRED", "Enter the code the receiver got by SMS.");
    const v = await verifyTrackingOtp(s.waybill, m.code);
    if (!v.ok) throw new DomainError(v.error === "invalid" ? "BAD_CODE" : v.error === "expired" ? "CODE_EXPIRED" : "CODE_LOCKED", CODE_ERRORS[v.error]);
  }
  // Taking a parcel in at this office makes it this office's to handle.
  if (m.to === "RECEIVED" && !s.handlingPartnerId) {
    await db.update(shipments).set({ handlingPartnerId: user.accountId, handlingBranchId: user.branchId ?? null }).where(eq(shipments.id, s.id));
  }
  await transition(user, s.waybill, m.to, {
    source: "field_app",
    reasonCode: m.reasonCode,
    note: m.note,
    collectMethod: m.collectMethod,
    pod: m.to === "DELIVERED" ? { method: "otp", receiverName: m.receiverName, photo: m.photo } : undefined,
  });
  return agentParcel(user, s.waybill);
}

/* ----------------------------------------------------------------- booking */

/** Packaging sold at the counter: the workbook's list (box, sack, crate, bag, envelope, bucket, jerrycan…). */
export const PACKAGING = PACKAGING_TYPES.map((p) => p.key) as unknown as readonly [PackagingKey, ...PackagingKey[]];
type PackagingKey = (typeof PACKAGING_TYPES)[number]["key"];
const PACKAGING_LABEL = Object.fromEntries(PACKAGING_TYPES.map((p) => [p.key, p.en])) as Record<PackagingKey, string>;

const SIZES = { small: [30, 20, 10], medium: [45, 35, 25], large: [60, 45, 40] } as const;

/** A counter booking: the app's short form, filled out into a full order (sender's address is this office). */
export const counterBookingSchema = z.object({
  /** A person, or a company (with what the agent has of its KYB: TIN, BRELA number, who brought it). */
  sender: z.object({
    kind: z.enum(["individual", "company"]).default("individual"),
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim(),
    email: z.union([z.email(), z.literal("")]).optional().transform((v) => v || undefined),
    tin: z
      .string()
      .optional()
      .transform((v) => v?.replace(/\D/g, "") || undefined)
      .pipe(z.string().regex(/^\d{9}$/, "A TIN is 9 digits").optional()),
    regNo: z.string().trim().max(40).optional().transform((v) => v || undefined),
    contactName: z.string().trim().max(120).optional().transform((v) => v || undefined),
  }),
  /** A person or a company too: company to company, a person to a company, and so on. */
  receiver: z.object({
    kind: z.enum(["individual", "company"]).default("individual"),
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim(),
    email: z.union([z.email(), z.literal("")]).optional().transform((v) => v || undefined),
    tin: z
      .string()
      .optional()
      .transform((v) => v?.replace(/\D/g, "") || undefined)
      .pipe(z.string().regex(/^\d{9}$/, "A TIN is 9 digits").optional()),
    regNo: z.string().trim().max(40).optional().transform((v) => v || undefined),
    contactName: z.string().trim().max(120).optional().transform((v) => v || undefined),
    region: z.enum(TZ_REGIONS),
    district: z.string().trim().min(2).max(80),
    landmark: z.string().trim().max(200).optional(),
    /** The door, pinned on the map in the app: riders get directions to it. Tanzania's box, like the order form. */
    lat: z.coerce.number().min(-12).max(0).optional(),
    lng: z.coerce.number().min(29).max(41).optional(),
  }),
  deliveryMode: z.enum(["door", "wakala_collect"]).default("door"),
  deliveryLocationId: z.string().trim().optional(),
  /** Collect at one of this company's own offices (from the collection-points list). */
  collectOfficeId: z.string().uuid().optional(),
  goods: z.string().trim().min(3).max(200),
  category: z.string().trim().min(2).max(40).default("general"),
  weightKg: z.coerce.number().positive().max(30),
  size: z.enum(["small", "medium", "large"]).default("small"),
  fragile: z.boolean().default(false),
  /** Handling marks picked at the counter (fragile, keep dry, this side up…). */
  handling: z.array(z.enum(SPECIAL_HANDLING)).max(10).default([]),
  /** A photo of the goods, uploaded first (POST /api/driver/uploads kind=parcel). */
  photo: z.string().regex(/^parcel\/[\w/.-]+$/).max(200).optional(),
  /** What the goods are worth: always asked at the counter (claims and insurance go by it). */
  declaredValue: z.coerce.number({ message: "Enter what the goods are worth" }).int().min(1, "Enter what the goods are worth").max(1_000_000_000),
  /** Extra services sold with it, at this office's own prices (TZS). */
  extras: z
    .object({
      insurance: z.coerce.number().int().min(0).max(10_000_000).optional(),
      packaging: z.object({ type: z.enum(PACKAGING), amount: z.coerce.number().int().min(0).max(1_000_000) }).optional(),
    })
    .default({}),
  serviceLevel: z.enum(["same_day", "next_day", "standard"]).default("next_day"),
  /** What this office charges for it, in TZS, from its own tariff. Tuma doesn't price counter parcels. */
  price: z.coerce.number().int().min(0).max(10_000_000),
  /**
   * Sender pays at the counter, or the receiver pays on delivery. The receiver paying is for a company receiver, or a
   * business with the pay-on-delivery add-on (it collects the money later).
   */
  payer: z.enum(["sender", "receiver"]).default("sender"),
  /**
   * How the sender pays: cash now, a mobile-money push (the parcel is received once it's paid), or, for a company
   * sender only, on its invoice later.
   */
  paidWith: z.enum(["cash", "mobile_money", "invoice"]).default("cash"),
  noProhibited: z.literal(true, { message: "Confirm there are no prohibited items" }),
  /** The parcel is on the counter now: book it and mark it received in one go. */
  inHand: z.boolean().default(true),
});

async function toOrder(user: CurrentUser, raw: unknown) {
  const acct = businessOf(user);
  const b = counterBookingSchema.parse(raw);
  const [office] = user.branchId
    ? await db.select({ id: branches.id, region: branches.region, district: branches.district, address: branches.address }).from(branches).where(eq(branches.id, user.branchId))
    : await db.select({ id: branches.id, region: branches.region, district: branches.district, address: branches.address }).from(branches).where(and(eq(branches.accountId, acct), eq(branches.isHead, true)));
  const here = office?.id;
  const region = (TZ_REGIONS as readonly string[]).includes(office?.region ?? "") ? office!.region : null;
  if (!region) throw new DomainError("NO_OFFICE", "Add your office in the portal before booking parcels.");
  // An office to collect from must be one of this company's own, open offices.
  let officeId: string | undefined;
  if (b.deliveryMode === "wakala_collect" && b.collectOfficeId) {
    const [o] = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.id, b.collectOfficeId), eq(branches.accountId, acct), eq(branches.active, true)));
    if (!o) throw new DomainError("OFFICE_NOT_FOUND", "That office isn't one of yours. Pick another.");
    if (o.id === here) throw new DomainError("OFFICE_IS_HERE", "That's the office you're sending from. Pick where the receiver will collect it.");
    officeId = o.id;
  }
  // Without proof of payment only companies' parcels are taken: on their invoice, or paid by a company receiver.
  // Anyone else's needs the business's pay-on-delivery add-on, since it collects that money later.
  if (b.paidWith === "invoice" && b.payer === "sender" && b.sender.kind !== "company") {
    throw new DomainError("INVOICE_COMPANIES_ONLY", "Only a company can pay on invoice. Take cash or mobile money.");
  }
  if (b.payer === "receiver" && b.receiver.kind !== "company") {
    const [a] = await db.select({ on: accounts.payOnDelivery }).from(accounts).where(eq(accounts.id, acct));
    if (!a?.on) throw new DomainError("PAY_ON_DELIVERY_OFF", "The receiver can pay on delivery only when it's a company. Take cash or mobile money.");
  }
  if (b.payer === "sender" && b.paidWith === "mobile_money" && !(await momoEnabled(acct))) {
    throw new DomainError("MOMO_OFF", "Mobile money isn't on for this business. Turn it on in More → Payments, or take cash.");
  }
  const [w, l, h] = SIZES[b.size];
  const input: ParcelOrderInput = {
    serviceLevel: b.serviceLevel,
    paymentTerms: b.payer === "receiver" ? "pay_on_delivery" : b.paidWith === "invoice" ? "account" : "prepaid",
    prepayMethod: b.payer === "sender" && b.paidWith !== "invoice" ? b.paidWith : undefined,
    collectMethods: ["cash", "mobile_money"],
    // Dropped at this office over the counter, which acts as the hand-over point.
    handoverMode: "hub_bulk",
    deliveryMode: b.deliveryMode,
    deliveryLocationId: b.deliveryMode === "wakala_collect" && !officeId ? b.deliveryLocationId : undefined,
    deliveryBranchId: officeId,
    shipper: {
      name: b.sender.name,
      phone: b.sender.phone,
      email: b.sender.email,
      language: "sw",
      company: b.sender.kind === "company" ? { tin: b.sender.tin, regNo: b.sender.regNo, contactName: b.sender.contactName } : undefined,
      address: { region: region as (typeof TZ_REGIONS)[number], district: office?.district || "—", street: office?.address ?? undefined } },
    consignee: {
      name: b.receiver.name,
      phone: b.receiver.phone,
      email: b.receiver.email,
      language: "sw",
      company: b.receiver.kind === "company" ? { tin: b.receiver.tin, regNo: b.receiver.regNo, contactName: b.receiver.contactName } : undefined,
      address: { region: b.receiver.region, district: b.receiver.district, landmark: b.receiver.landmark || undefined, lat: b.receiver.lat, lng: b.receiver.lng } },
    goodsDescription: b.goods,
    goodsCategory: b.category,
    declaredValue: b.declaredValue,
    specialHandling: [...new Set([...(b.fragile ? (["fragile"] as const) : []), ...b.handling])],
    prohibitedDeclared: true,
    pieces: [{ weightKg: b.weightKg, lengthCm: w, widthCm: l, heightCm: h }],
  };
  const extras = [
    ...(b.extras.insurance ? [{ code: "INSURANCE", label: "Insurance", amount: b.extras.insurance }] : []),
    ...(b.extras.packaging ? [{ code: "PACKAGING", label: `Packaging: ${PACKAGING_LABEL[b.extras.packaging.type]}`, amount: b.extras.packaging.amount }] : []),
  ];
  return { order: parcelOrderSchema.parse(input), inHand: b.inHand, price: b.price, extras, booking: b };
}

/** Receive a parcel over the counter at the price the agent entered, booked and (normally) received in one go. */
export async function agentBook(user: CurrentUser, raw: unknown) {
  const { order, inHand, price, extras, booking } = await toOrder(user, raw);
  const { shipment } = await createParcel(user, order, "app", { charge: price, extras });
  // A person paying by mobile money: the parcel waits at the counter until the money is in.
  const waitForPay = inHand && booking.payer === "sender" && booking.paidWith === "mobile_money";
  // Both people go into the company's customer list, so the next parcel for them is a pick.
  const ids = await rememberCustomers(businessOf(user), {
    sender: { kind: booking.sender.kind, name: order.shipper.name, phone: order.shipper.phone, email: booking.sender.email, tin: booking.sender.tin, regNo: booking.sender.regNo, contactName: booking.sender.contactName },
    receiver: {
      kind: booking.receiver.kind,
      name: order.consignee.name,
      phone: order.consignee.phone,
      email: booking.receiver.email,
      tin: booking.receiver.tin,
      regNo: booking.receiver.regNo,
      contactName: booking.receiver.contactName,
      ...order.consignee.address,
    },
  });
  await db
    .update(shipments)
    .set({
      goodsPhoto: booking.photo ?? null,
      shipperCustomerId: ids.sender,
      consigneeCustomerId: ids.receiver,
      extras,
      receiveOnPayment: waitForPay,
      ...(waitForPay ? { handlingPartnerId: user.accountId, handlingBranchId: user.branchId ?? null } : {}),
    })
    .where(eq(shipments.id, shipment.id));
  if (inHand && !waitForPay) await agentMove(user, shipment.waybill, { to: "RECEIVED" });
  // A company gets its invoice now; cash is paid on the spot. Mobile money is paid once the push goes through.
  await db.transaction(async (tx) => {
    const [s] = await tx.select().from(shipments).where(eq(shipments.id, shipment.id));
    if (booking.sender.kind === "company") await issueCompanyInvoice(tx, s, { customerId: ids.sender ?? null, actorId: user.id });
    if (booking.payer === "sender" && booking.paidWith === "cash") await markPaid(tx, s, { method: "cash", actorId: user.id });
  });
  return agentParcel(user, shipment.waybill);
}

/* ---------------------------------------------------------- mobile money */

const momoSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("mobile_money"), phone: z.string().trim().min(9).max(20) }),
  // The push didn't go through and the customer paid cash instead.
  z.object({ method: z.literal("cash") }),
]);

/**
 * Push a payment prompt for the parcel's charge to the payer's phone (Tanzanian mobile money, through HuduPay). The
 * app then polls [agentPaymentStatus] until it's paid or failed.
 */
export async function agentRequestPayment(user: CurrentUser, rawWaybill: string, raw: unknown) {
  if (!user.permissions.has("shipment.create")) throw new DomainError("FORBIDDEN", "You can't take payments.", 403);
  const s = await load(user, rawWaybill);
  if (s.paymentTerms !== "prepaid") throw new DomainError("NOT_PREPAID", "The receiver pays for this parcel on delivery.");
  if (s.paidAt) throw new DomainError("ALREADY_PAID", "This parcel is already paid for.", 409);
  if (s.totalCharge <= 0) throw new DomainError("NOTHING_DUE", "There's nothing to pay for this parcel.");
  const body = momoSchema.parse({ method: "mobile_money", ...(raw as object) });
  if (body.method === "cash") {
    await db.transaction(async (tx) => {
      await markPaid(tx, s, { method: "cash", actorId: user.id });
    });
    await receiveOnceFor(s.waybill);
    return { payment: null, parcel: (await agentParcel(user, s.waybill)).parcel };
  }
  if (!(await momoEnabled(s.accountId))) {
    throw new DomainError("MOMO_OFF", "Mobile money isn't on for this business. Turn it on in More → Payments, or take cash.");
  }
  const e164 = toE164(body.phone);
  if (!e164 || !e164.startsWith("+255")) throw new DomainError("BAD_PHONE", "Mobile money works with Tanzanian numbers for now.");
  const msisdn = e164.slice(1);
  const reference = `${s.waybill}-${Date.now().toString(36)}`;
  const base = process.env.APP_URL ?? "https://tuma.hudumika.tz";
  const c = await collect({ reference, amount: s.totalCharge, msisdn, narration: `Tuma parcel ${s.waybill}`, callbackUrl: `${base}/api/hooks/hudupay` });
  const [pay] = await db
    .insert(parcelPayments)
    .values({
      shipmentId: s.id,
      accountId: s.accountId,
      reference,
      providerId: c.id,
      msisdn,
      amount: s.totalCharge,
      status: c.status === "FAILED" ? "failed" : "pending",
      failureMessage: c.failureMessage,
      requestedBy: user.id,
      completedAt: c.status === "FAILED" ? new Date() : null,
    })
    .returning();
  return { payment: paymentOut(pay) };
}

/** Where a push payment stands; asks HuduPay while it's pending, and pays the parcel when it went through. */
export async function agentPaymentStatus(user: CurrentUser, rawWaybill: string, id: string) {
  const s = await load(user, rawWaybill);
  const [pay] = await db.select().from(parcelPayments).where(and(eq(parcelPayments.id, id), eq(parcelPayments.shipmentId, s.id)));
  if (!pay) throw new DomainError("NOT_FOUND", "That payment isn't on this parcel.", 404);
  if (pay.status !== "pending" || !pay.providerId) return { payment: paymentOut(pay) };
  const c = await collection(pay.providerId, pay.createdAt).catch(() => null);
  const settled = c ? await settlePayment(pay.reference, c.status, c.failureMessage) : null;
  return { payment: paymentOut(settled ?? pay) };
}

const paymentOut = (p: typeof parcelPayments.$inferSelect) => ({
  id: p.id,
  status: p.status as "pending" | "paid" | "failed",
  amount: p.amount,
  phone: `+${p.msisdn}`,
  failureMessage: p.failureMessage,
  createdAt: p.createdAt,
  completedAt: p.completedAt,
});

/**
 * Where a receiver can collect from, for the booking form: this company's open offices in the region (the receiver's
 * district first, then the head office, then by name), and Tuma's Wakala points there. Never the office the parcel
 * is brought to: a parcel sent from here goes somewhere else.
 */
export async function collectionPoints(user: CurrentUser, region?: string, district?: string) {
  const acct = user.accountId;
  // The counter: the person's own office, or the head office when they aren't tied to one (as when booking).
  const hereId = acct
    ? (user.branchId ??
      (await db.select({ id: branches.id }).from(branches).where(and(eq(branches.accountId, acct), eq(branches.isHead, true), eq(branches.active, true))))[0]?.id ??
      null)
    : null;
  const [offices, points] = await Promise.all([
    acct
      ? db
          .select({ id: branches.id, name: branches.name, code: branches.code, region: branches.region, district: branches.district, address: branches.address, phone: branches.phone, isHead: branches.isHead })
          .from(branches)
          .where(
            and(
              eq(branches.accountId, acct),
              eq(branches.active, true),
              region ? eq(branches.region, region) : undefined,
              hereId ? ne(branches.id, hereId) : undefined,
            ),
          )
      : Promise.resolve([]),
    db
      .select({ id: locations.id, name: locations.name, type: locations.type, region: locations.region, district: locations.district, landmark: locations.landmark, lat: locations.lat, lng: locations.lng })
      .from(locations)
      .where(and(eq(locations.active, true), inArray(locations.type, ["wakala", "collection_point"]), region ? eq(locations.region, region) : undefined))
      .orderBy(asc(locations.name)),
  ]);
  const near = (d: string | null) => (district && d?.toLowerCase() === district.toLowerCase() ? 0 : 1);
  offices.sort((a, b) => near(a.district) - near(b.district) || Number(b.isHead) - Number(a.isHead) || a.name.localeCompare(b.name));
  // The business's own offices come first; then the common collection points, the receiver's district first.
  points.sort((a, b) => near(a.district) - near(b.district) || a.name.localeCompare(b.name));
  return {
    offices: offices.map((o) => ({ ...o, inDistrict: near(o.district) === 0 })),
    points: points.map((p) => ({ ...p, inDistrict: near(p.district) === 0 })),
  };
}

/* ----------------------------------------------------------------- reports */

export const REPORT_PERIODS = ["today", "week", "month", "quarter"] as const;
const PERIOD_DAYS: Record<(typeof REPORT_PERIODS)[number], number> = { today: 1, week: 7, month: 30, quarter: 90 };

/**
 * The business's report for the app (report.view): parcels received and their value, handed over, failed and
 * cancelled for the period; a day-by-day series; and splits by who pays, how they paid, service, destination
 * region and staff member. Same scope as the parcel lists.
 */
export async function agentReport(user: CurrentUser, raw: unknown) {
  if (!user.permissions.has("report.view")) throw new DomainError("FORBIDDEN", "You don't have access to reports.", 403);
  const acct = businessOf(user);
  const { period } = z.object({ period: z.enum(REPORT_PERIODS).default("week") }).parse(raw);
  const days = PERIOD_DAYS[period];
  const from = darMidnight(days - 1);
  const scope = and(mine(acct, user), gte(shipments.createdAt, from), sql`${shipments.state} <> 'CANCELLED'`)!;
  const fromSql = sql`${from.toISOString()}::timestamptz`;
  const day = sql<string>`to_char(${shipments.createdAt} at time zone 'Africa/Dar_es_Salaam', 'YYYY-MM-DD')`;
  const dday = sql<string>`to_char(${shipments.deliveredAt} at time zone 'Africa/Dar_es_Salaam', 'YYYY-MM-DD')`;
  const value = sql<number>`coalesce(sum(${shipments.totalCharge}), 0)::int`;
  const n = sql<number>`count(*)::int`;
  const region = sql<string>`coalesce(${shipments.consignee}->'address'->>'region', '')`;
  const paidHow = sql<string>`case when ${shipments.paymentTerms} = 'pay_on_delivery' then 'receiver' else coalesce(${shipments.prepayMethod}, 'cash') end`;
  const [totals, delivered, series, dseries, byPay, byService, byRegion, byStaff] = await Promise.all([
    db
      .select({
        parcels: n,
        value,
        failed: sql<number>`count(*) filter (where ${shipments.state} = 'ATTEMPT_FAILED')::int`,
        toCollect: sql<number>`coalesce(sum(${shipments.totalCharge}) filter (where ${shipments.paymentTerms} = 'pay_on_delivery' and ${shipments.state} <> 'DELIVERED'), 0)::int`,
      })
      .from(shipments)
      .where(scope),
    db
      .select({ n })
      .from(shipments)
      .where(and(mine(acct, user), eq(shipments.state, "DELIVERED"), sql`${shipments.deliveredAt} >= ${fromSql}`)),
    db.select({ day, n, value }).from(shipments).where(scope).groupBy(day),
    db
      .select({ day: dday, n })
      .from(shipments)
      .where(and(mine(acct, user), eq(shipments.state, "DELIVERED"), sql`${shipments.deliveredAt} >= ${fromSql}`))
      .groupBy(dday),
    db.select({ key: paidHow, n, value }).from(shipments).where(scope).groupBy(paidHow),
    db.select({ key: sql<string>`coalesce(${shipments.serviceLevel}::text, 'standard')`, n, value }).from(shipments).where(scope).groupBy(sql`1`),
    db.select({ key: region, n, value }).from(shipments).where(scope).groupBy(region).orderBy(desc(n)).limit(5),
    db
      .select({ key: shipments.createdBy, name: sql<string>`coalesce(${users.name}, '')`, n, value })
      .from(shipments)
      .leftJoin(users, eq(users.id, shipments.createdBy))
      .where(scope)
      .groupBy(shipments.createdBy, users.name)
      .orderBy(desc(n))
      .limit(10),
  ]);
  const t = totals[0];
  const bookedBy = new Map(series.map((r) => [r.day, r]));
  const deliveredBy = new Map(dseries.map((r) => [r.day, r.n]));
  const seriesOut = Array.from({ length: days }, (_, i) => {
    const d = new Date(darMidnight(days - 1 - i).getTime() + 3 * 3600_000).toISOString().slice(0, 10);
    return { day: d, parcels: bookedBy.get(d)?.n ?? 0, value: bookedBy.get(d)?.value ?? 0, delivered: deliveredBy.get(d) ?? 0 };
  });
  return {
    period,
    from: from.toISOString(),
    totals: {
      parcels: t?.parcels ?? 0,
      value: t?.value ?? 0,
      average: t?.parcels ? Math.round(t.value / t.parcels) : 0,
      delivered: delivered[0]?.n ?? 0,
      failed: t?.failed ?? 0,
      toCollect: t?.toCollect ?? 0,
    },
    series: seriesOut,
    byPayment: byPay,
    byService,
    byRegion: byRegion.map((r) => ({ ...r, key: r.key || "—" })),
    byStaff: byStaff.map((r) => ({ key: r.key, name: r.name || r.key, n: r.n, value: r.value })),
  };
}

/* ----------------------------------------------------------- notifications */

/** What a notification is about: a parcel that moved, or the business application. */
export type AgentNotification =
  | { id: string; kind: "parcel"; at: string; waybill: string; state: ShipmentState | null; receiver: string | null; note: string | null }
  | { id: string; kind: "business"; at: string; status: string; ref: string; note: string | null };

/**
 * The app's notifications, read from what already happened (no separate store): the last 30 days of moves on the
 * business's parcels made by someone else (drivers, hubs, other offices, the platform), and the person's business
 * application updates. Newest first. Read state stays on the phone.
 */
export async function agentNotifications(user: CurrentUser): Promise<{ notifications: AgentNotification[] }> {
  const acct = businessOf(user);
  const since = darMidnight(29);
  const [moves, kyb] = await Promise.all([
    db
      .select({
        id: events.id,
        at: events.occurredAt,
        state: events.stateAfter,
        note: events.note,
        waybill: shipments.waybill,
        consignee: shipments.consignee,
      })
      .from(events)
      .innerJoin(shipments, eq(events.shipmentId, shipments.id))
      .where(
        and(
          mine(acct, user),
          gte(events.occurredAt, since),
          sql`${events.stateAfter} is not null`,
          eq(events.estimated, false),
          or(sql`${events.actorId} is null`, sql`${events.actorId} <> ${user.id}`),
          // Booking steps on the business's own parcels aren't news; a parcel another business sends its way is.
          sql`not (${shipments.accountId} = ${acct} and ${events.stateAfter} in ('CREATED', 'AWAITING_HANDOVER'))`,
        ),
      )
      .orderBy(desc(events.occurredAt))
      .limit(50),
    db
      .select({ id: kybEvents.id, at: kybEvents.occurredAt, status: kybEvents.status, note: kybEvents.note, ref: kybApplications.ref })
      .from(kybEvents)
      .innerJoin(kybApplications, eq(kybEvents.applicationId, kybApplications.id))
      .where(and(eq(kybApplications.userId, user.id), gte(kybEvents.occurredAt, since)))
      .orderBy(desc(kybEvents.occurredAt))
      .limit(20),
  ]);
  const list: AgentNotification[] = [
    ...moves.map((m) => ({
      id: m.id,
      kind: "parcel" as const,
      at: m.at.toISOString(),
      waybill: m.waybill,
      state: m.state,
      receiver: ((m.consignee as { name?: string } | null)?.name ?? null) || null,
      note: m.note,
    })),
    ...kyb.map((k) => ({ id: k.id, kind: "business" as const, at: k.at.toISOString(), status: k.status, ref: k.ref, note: k.note })),
  ];
  list.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return { notifications: list.slice(0, 60) };
}
