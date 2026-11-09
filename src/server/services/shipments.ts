import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, lt, notInArray, or, sql, sum, type SQL } from "drizzle-orm";
import { db, type Tx } from "../db/client";
import {
  accounts,
  chargeSnapshots,
  codRecords,
  events,
  exceptions,
  invoices,
  locations,
  notifications,
  pieces,
  reasonCodes,
  shipments,
} from "../db/schema";
import { audit } from "../audit";
import { eventId } from "../ids";
import { enqueue } from "../adapters/outbox";
import { checkStanding } from "../adapters/finops";
import { notifyOnState } from "../adapters/notify";
import { requestRating } from "./ratings";
import { issueReceiverCode } from "./tracking";
import type { CurrentUser } from "../auth/current-user";
import { normaliseWaybill } from "@/domain/waybill-number";
import { issueReference } from "../adapters/references";
import { randomUUID } from "node:crypto";
import { canTransition, consigneeEditable, eventTypeFor, isBeforeHandover, isTerminal, type ShipmentState } from "@/domain/states";
import { MAX_PIECE_WEIGHT_KG, promisedAt, quote, weights, zoneFor, type Quote, type ServiceLevel } from "@/domain/pricing";
import type { ParcelOrder } from "@/domain/order-schema";
import type { Permission } from "@/domain/roles";
import { amountToCollect, senderPays } from "@/domain/payments";

import { DomainError } from "../errors";
import { getSetting } from "../settings";
export { DomainError };

/* ------------------------------------------------------------------ scope */

/** FR-PLT-02: data is isolated between accounts. Staff with shipment.read.all see every account. */
function scopeFilter(user: CurrentUser): SQL | undefined {
  if (user.permissions.has("shipment.read.all")) return undefined;
  // Partners see only cargo assigned to their own company.
  if (user.permissions.has("partner.cargo.read") && user.accountId) return eq(shipments.handlingPartnerId, user.accountId);
  if (user.permissions.has("shipment.read.own_account") && user.accountId) return eq(shipments.accountId, user.accountId);
  return sql`false`;
}

/* ---------------------------------------------------------------- create */

export async function quoteParcel(order: ParcelOrder) {
  return quote({
    originRegion: order.shipper.address.region,
    destRegion: order.consignee.address.region,
    serviceLevel: order.serviceLevel,
    pieces: order.pieces,
    codAmount: order.codAmount || undefined,
    declaredValue: order.declaredValue,
    deliveryMode: order.deliveryMode,
  });
}

/**
 * An agent's own price instead of Tuma's rate card: agents set their own tariffs and enter the charge at the counter.
 * Weights and the zone are still worked out, for the promise date and the records.
 */
function agentPriced(order: ParcelOrder, charge: number, extras: { code: string; label: string; amount: number }[] = []): Quote {
  if (order.pieces.some((p) => p.weightKg > MAX_PIECE_WEIGHT_KG)) {
    return { ok: false, code: "PIECE_TOO_HEAVY", message: `A piece weighs more than ${MAX_PIECE_WEIGHT_KG} kg. Book it as cargo.` };
  }
  const w = weights(order.pieces);
  return {
    ok: true,
    zone: zoneFor(order.shipper.address.region, order.consignee.address.region),
    chargeableKg: Math.max(1, Math.ceil(w.chargeableG / 1000)),
    lines: [{ code: "AGENT_RATE", label: "Agent's charge", amount: charge }, ...extras],
    subtotal: charge + extras.reduce((n, e) => n + e.amount, 0),
    tax: 0,
    total: charge + extras.reduce((n, e) => n + e.amount, 0),
    weights: w,
  };
}

export async function createParcel(
  user: CurrentUser,
  order: ParcelOrder,
  channel: "portal" | "api" | "console" | "app" = "portal",
  /** The charge an agent entered at the counter; Tuma's rate card is not used then. */
  opts: { charge?: number; extras?: { code: string; label: string; amount: number }[] } = {},
) {
  if (!user.permissions.has("shipment.create")) throw new DomainError("FORBIDDEN", "You cannot create shipments.", 403);
  const accountId = user.accountId;
  if (!accountId) throw new DomainError("NO_ACCOUNT", "Your user is not linked to an account.");

  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  // FR-CRM-03: suspended or closed accounts cannot create orders.
  // A business under review may book parcels up to its allowance (checked again, locked, when the parcel is written).
  const trialing = account?.status === "pending";
  if (!account || (account.status !== "active" && !trialing)) throw new DomainError("ACCOUNT_INACTIVE", "This account cannot create new orders.");
  if (!account.allowedServiceLevels.includes(order.serviceLevel)) {
    throw new DomainError("SERVICE_NOT_IN_CONTRACT", "Your contract does not include this service level.");
  }

  const q = opts.charge !== undefined ? agentPriced(order, opts.charge, opts.extras) : await quoteParcel(order);
  if (!q.ok) throw new DomainError(q.code, q.message);

  // FR-FIN-03: check payment standing before confirming — only when the sender pays.
  if (senderPays(order.paymentTerms)) {
    const standing = await checkStanding(accountId, q.total);
    if (!standing.ok && account.paymentPolicy === "block") {
      throw new DomainError("INSUFFICIENT_STANDING", "Your prepaid balance or credit limit does not cover this order.");
    }
  }

  // FR-WB-09: warn (do not block) on a repeated merchant reference.
  let duplicateRef = false;
  if (order.merchantRef) {
    const [dup] = await db
      .select({ id: shipments.id })
      .from(shipments)
      .where(and(eq(shipments.accountId, accountId), eq(shipments.merchantRef, order.merchantRef)))
      .limit(1);
    duplicateRef = Boolean(dup);
  }

  const now = new Date();
  const promise = promisedAt(order.serviceLevel as ServiceLevel, q.zone, now);

  // The waybill is the shipment's Hudumika global reference (AAA001), issued against its id in the same transaction.
  const id = randomUUID();
  const created = await db.transaction(async (tx) => {
    if (trialing) {
      // One booking at a time per business, so two counters can't both take the last parcel of the allowance.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"trial:" + accountId}))`);
      const allowance = await getSetting("pendingParcelAllowance");
      const [{ used }] = await tx
        .select({ used: sql<number>`count(*)::int` })
        .from(shipments)
        .where(or(eq(shipments.accountId, accountId), eq(shipments.handlingPartnerId, accountId)));
      if (used >= allowance) {
        throw new DomainError("TRIAL_LIMIT", `While your business is being reviewed you can handle ${allowance} parcels, and they're used up. More open on approval.`, 403);
      }
    }
    const { referenceNumber: waybill } = await issueReference({ type: "PARCEL", entityId: id, tenantId: accountId, createdBy: user.id }, tx);
    const [s] = await tx
      .insert(shipments)
      .values({
        id,
        waybill,
        type: "parcel",
        accountId,
        // An agent office booking at its counter handles the parcel itself.
        handlingPartnerId: user.permissions.has("agent.workspace") ? accountId : null,
        handlingBranchId: user.permissions.has("agent.workspace") ? (user.branchId ?? null) : null,
        merchantRef: order.merchantRef,
        state: "AWAITING_HANDOVER",
        serviceLevel: order.serviceLevel,
        paymentTerms: order.paymentTerms,
        handoverMode: order.handoverMode,
        deliveryMode: order.deliveryMode,
        shipper: order.shipper,
        consignee: order.consignee,
        pickupLocationId: order.pickupLocationId,
        deliveryLocationId: order.deliveryLocationId,
        deliveryBranchId: order.deliveryBranchId,
        deliveryInstructions: order.deliveryInstructions,
        goodsDescription: order.goodsDescription,
        goodsCategory: order.goodsCategory,
        declaredValue: order.declaredValue,
        codAmount: order.codAmount || null,
        prepayMethod: order.paymentTerms === "prepaid" ? order.prepayMethod : null,
        collectMethods: order.collectMethods,
        specialHandling: order.specialHandling,
        prohibitedDeclared: order.prohibitedDeclared,
        piecesCount: order.pieces.length,
        actualWeightG: q.weights.actualG,
        volumetricWeightG: q.weights.volumetricG,
        chargeableWeightG: q.weights.chargeableG,
        totalCharge: q.total,
        promisedAt: promise,
        channel,
        createdBy: user.id,
      })
      .returning();

    await tx.insert(pieces).values(
      order.pieces.map((p, i) => ({
        shipmentId: s.id,
        seq: i + 1,
        weightG: Math.round(p.weightKg * 1000),
        lengthCm: p.lengthCm,
        widthCm: p.widthCm,
        heightCm: p.heightCm,
        description: p.description,
      })),
    );

    await tx.insert(chargeSnapshots).values({
      shipmentId: s.id,
      version: 1,
      lines: q.lines,
      subtotal: q.subtotal,
      tax: q.tax,
      total: q.total,
      taxRef: opts.charge !== undefined ? "AGENT-RATE" : "VAT18-ESTIMATE",
      reason: "confirmation",
    });

    // Money to collect at the door: COD goods value and/or the delivery fee when the receiver pays.
    const due = amountToCollect({ paymentTerms: order.paymentTerms, codAmount: order.codAmount, totalCharge: q.total });
    if (due.total > 0) {
      await tx.insert(codRecords).values({ shipmentId: s.id, amountDue: due.goods, feeDue: due.fee });
    }

    const actor = { actorType: "merchant", actorId: user.id };
    const createdEvt = eventId();
    await tx.insert(events).values([
      { id: createdEvt, shipmentId: s.id, type: "shipment.created", stateAfter: "CREATED", occurredAt: now, source: channel === "api" ? "api" : channel === "app" ? "field_app" : "portal", ...actor },
      {
        id: eventId(),
        shipmentId: s.id,
        type: "shipment.awaiting_handover",
        stateAfter: "AWAITING_HANDOVER",
        occurredAt: new Date(now.getTime() + 1),
        source: "system",
        actorType: "system",
      },
    ]);

    // FR-FIN-01: billable event with the charge snapshot.
    await enqueue(tx, {
      target: "finops",
      topic: "shipment.priced",
      idempotencyKey: `priced:${waybill}:v1`,
      waybill,
      payload: {
        waybill,
        accountId,
        payer: order.paymentTerms === "pay_on_delivery" ? "receiver" : "sender",
        paymentTerms: order.paymentTerms,
        prepayMethod: order.prepayMethod,
        lines: q.lines,
        subtotal: q.subtotal,
        tax: q.tax,
        total: q.total,
        currency: "TZS",
        taxRef: opts.charge !== undefined ? "AGENT-RATE" : "VAT18-ESTIMATE",
      },
    });

    // The receiver's code for full tracking details, sent in their first SMS.
    await issueReceiverCode(tx, { waybill, consignee: order.consignee }, "booked");

    await audit(tx, { actorId: user.id, action: "shipment.create", entity: "shipment", entityId: waybill, after: { state: "AWAITING_HANDOVER", total: q.total } });
    return s;
  });
  return { shipment: created, duplicateRef };
}

/** A time the app says something was done offline: kept if it's within the last week and not in the future. */
export function offlineTime(at: Date | undefined) {
  if (!at) return undefined;
  const now = Date.now();
  const t = at.getTime();
  if (Number.isNaN(t) || t > now + 2 * 60_000 || t < now - 7 * 24 * 3600_000) return undefined;
  return at;
}

/* ------------------------------------------------------------- lifecycle */

type TransitionOpts = {
  reasonCode?: string;
  note?: string;
  source: "manual" | "scan" | "field_app" | "portal" | "system";
  locationId?: string;
  occurredAt?: Date;
  /** Done offline and synced later: the device time is expected to be behind, not a skewed clock. */
  offline?: boolean;
  pod?: { method: "otp" | "signature" | "photo" | "counter"; receiverName?: string; photo?: string };
  /** Where the device was when the event happened (field app). */
  lat?: number;
  lng?: number;
  /** Extra event data, e.g. the Tuma-X job the change belongs to. */
  data?: Record<string, unknown>;
  /** How the receiver paid what was due at the door. */
  collectMethod?: "cash" | "mobile_money" | "card";
};

async function loadForUpdate(tx: Tx, waybill: string) {
  const [s] = await tx.select().from(shipments).where(eq(shipments.waybill, waybill)).for("update");
  if (!s) throw new DomainError("NOT_FOUND", "Shipment not found.", 404);
  return s;
}

/**
 * Move a shipment to a new state through the event ledger (FR-WB-04, FR-TRK-01).
 * Rejected attempts are written to the audit log.
 */
export async function transition(user: CurrentUser | "system", waybill: string, to: ShipmentState, opts: TransitionOpts) {
  const actorId = user === "system" ? "system" : user.id;
  try {
    return await db.transaction(async (tx) => {
    const s = await loadForUpdate(tx, waybill);
    if (user !== "system") assertCanOperate(user, s);

    const check = canTransition(s.state as ShipmentState, to, user === "system" ? "system" : user.permissions);
    if (!check.ok) {
      throw new RejectedTransition(check.code, check.message, { from: s.state, to });
    }
    if (opts.source === "manual" && !opts.reasonCode && to !== "DELIVERED") {
      throw new DomainError("REASON_REQUIRED", "Manual changes need a reason code.");
    }
    if (to === "ATTEMPT_FAILED" && !opts.reasonCode) throw new DomainError("REASON_REQUIRED", "Choose why the attempt failed.");

    const now = new Date();
    const occurredAt = opts.occurredAt ?? now;
    const evtId = eventId();
    await tx.insert(events).values({
      id: evtId,
      shipmentId: s.id,
      type: eventTypeFor(to),
      stateAfter: to,
      occurredAt,
      clockSkew: !opts.offline && Math.abs(occurredAt.getTime() - now.getTime()) > 10 * 60 * 1000, // FR-TRK-06
      source: opts.source,
      actorType: user === "system" ? "system" : "user",
      actorId: user === "system" ? null : user.id,
      reasonCode: opts.reasonCode,
      locationId: opts.locationId,
      note: opts.note,
      lat: opts.lat,
      lng: opts.lng,
      data: opts.pod || opts.data ? { ...opts.data, ...(opts.pod ? { pod: opts.pod } : {}) } : undefined,
    });

    const patch: Partial<typeof shipments.$inferInsert> = { state: to, updatedAt: now };
    if (to === "DELIVERED") patch.deliveredAt = occurredAt;
    if (to === "ATTEMPT_FAILED") patch.attempts = s.attempts + 1;
    await tx.update(shipments).set(patch).where(eq(shipments.id, s.id));

    // Side effects
    if (to === "DELIVERED") {
      await enqueue(tx, { target: "finops", topic: "shipment.delivered", idempotencyKey: `delivered:${waybill}`, waybill, payload: { waybill, accountId: s.accountId, at: occurredAt.toISOString() } });
      const due = amountToCollect(s);
      if (due.total > 0) {
        const method = opts.collectMethod ?? "cash";
        if (!s.collectMethods.includes(method)) throw new DomainError("METHOD_NOT_ACCEPTED", `This shipment does not accept ${method.replace("_", " ")}.`);
        await tx
          .update(codRecords)
          .set({ amountCollected: due.goods, feeCollected: due.fee, method, status: "collected", collectedAt: occurredAt, holderId: actorId })
          .where(eq(codRecords.shipmentId, s.id));
        // The receiver paid the delivery charge here: the parcel is paid for, and counts in the business's takings.
        if (due.fee > 0 && !s.paidAt) {
          await tx.update(shipments).set({ paidAt: occurredAt, prepayMethod: method === "card" ? "cash" : method }).where(eq(shipments.id, s.id));
          await tx.update(invoices).set({ status: "paid", amountPaid: s.totalCharge, paidWith: method }).where(eq(invoices.shipmentId, s.id));
        }
        // FR-FIN-02: report the collection; cash stays "held" by the collector until deposited.
        await enqueue(tx, {
          target: "finops",
          topic: "payment.collected_on_delivery",
          idempotencyKey: `collect:${waybill}`,
          waybill,
          payload: { waybill, goods: due.goods, deliveryFee: due.fee, total: due.total, method, holder: actorId },
        });
      }
    }
    await notifyOnState(tx, s, to, evtId);
    // Delivered by a Tuma point: the receiver is asked to rate it.
    if (to === "DELIVERED") await requestRating(tx, s);
    await audit(tx, { actorId, action: `shipment.${to.toLowerCase()}`, entity: "shipment", entityId: waybill, before: { state: s.state }, after: { state: to, reasonCode: opts.reasonCode, source: opts.source } });

    // FR-PCL-10/11: after the configured attempts, start the return automatically.
    if (to === "ATTEMPT_FAILED" && s.attempts + 1 >= MAX_ATTEMPTS) {
      await tx.insert(events).values({
        id: eventId(),
        shipmentId: s.id,
        type: eventTypeFor("RETURNING"),
        stateAfter: "RETURNING",
        occurredAt: new Date(occurredAt.getTime() + 1),
        source: "system",
        actorType: "system",
        note: `Return started after ${MAX_ATTEMPTS} failed attempts`,
      });
      await tx.update(shipments).set({ state: "RETURNING" }).where(eq(shipments.id, s.id));
      await createReturnWaybill(tx, s, "attempts_exhausted");
    }
    return { from: s.state, to };
    });
  } catch (e) {
    // FR-WB-04: reject AND log. The transaction rolled back, so write the audit row on its own.
    if (e instanceof RejectedTransition) {
      await db.transaction((tx) => audit(tx, { actorId, action: "transition.rejected", entity: "shipment", entityId: waybill, before: { state: e.detail.from }, after: { to: e.detail.to, code: e.code } }));
    }
    throw e;
  }
}

class RejectedTransition extends DomainError {
  constructor(code: string, message: string, public detail: { from: string; to: string }) {
    super(code, message, 409);
  }
}

export const MAX_ATTEMPTS = 3; // SRS 5.2 default
const CANCELLATION_FEE = 2000; // PLACEHOLDER fee table (FR-PCL-12)

async function createReturnWaybill(tx: Tx, original: typeof shipments.$inferSelect, reason: string) {
  // A return is a new shipment, so it gets its own reference; the original keeps its number forever.
  const id = randomUUID();
  const { referenceNumber: waybill } = await issueReference(
    { type: original.type === "cargo" ? "CARGO" : "PARCEL", entityId: id, tenantId: original.accountId, createdBy: "system" },
    tx,
  );
  const [r] = await tx
    .insert(shipments)
    .values({
      ...original,
      id,
      waybill,
      state: "CREATED",
      shipper: original.consignee,
      consignee: original.shipper,
      codAmount: null,
      paymentTerms: "account",
      returnOfId: original.id,
      merchantRef: original.merchantRef ? `RET-${original.merchantRef}` : null,
      attempts: 0,
      labelPrints: 0,
      version: 1,
      deliveredAt: null,
      createdBy: "system",
      channel: "console",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  await tx.insert(events).values({ id: eventId(), shipmentId: r.id, type: "shipment.created", stateAfter: "CREATED", occurredAt: new Date(), source: "system", actorType: "system", note: `Return of ${original.waybill}`, data: { returnOf: original.waybill, reason } });
  await tx.update(codRecords).set({ status: "none" }).where(eq(codRecords.shipmentId, original.id));
  await audit(tx, { actorId: "system", action: "shipment.return_created", entity: "shipment", entityId: waybill, after: { returnOf: original.waybill, reason } });
  return r;
}

export async function cancelShipment(user: CurrentUser, waybill: string, reason: string) {
  return db.transaction(async (tx) => {
    const s = await loadForUpdate(tx, waybill);
    assertCanSee(user, s.accountId);
    if (!user.permissions.has("shipment.cancel")) throw new DomainError("FORBIDDEN", "You cannot cancel shipments.", 403);
    const check = canTransition(s.state as ShipmentState, "CANCELLED", user.permissions);
    if (!check.ok) throw new DomainError(check.code, "This shipment can no longer be cancelled.", 409);
    const fee = isBeforeHandover(s.state as ShipmentState) ? 0 : CANCELLATION_FEE;
    await tx.insert(events).values({ id: eventId(), shipmentId: s.id, type: "shipment.cancelled", stateAfter: "CANCELLED", occurredAt: new Date(), source: "portal", actorType: "user", actorId: user.id, note: reason, data: { fee } });
    await tx.update(shipments).set({ state: "CANCELLED", updatedAt: new Date() }).where(eq(shipments.id, s.id));
    if (fee > 0) {
      await enqueue(tx, { target: "finops", topic: "shipment.cancelled_with_fee", idempotencyKey: `cancelfee:${waybill}`, waybill, payload: { waybill, fee } });
    }
    await audit(tx, { actorId: user.id, action: "shipment.cancel", entity: "shipment", entityId: waybill, before: { state: s.state }, after: { state: "CANCELLED", fee, reason } });
    return { fee };
  });
}

export async function updateConsignee(user: CurrentUser, waybill: string, patch: { phone?: string; landmark?: string; instructions?: string; name?: string }) {
  return db.transaction(async (tx) => {
    const s = await loadForUpdate(tx, waybill);
    assertCanSee(user, s.accountId);
    if (!user.permissions.has("shipment.edit_consignee")) throw new DomainError("FORBIDDEN", "You cannot edit this shipment.", 403);
    if (!consigneeEditable(s.state as ShipmentState)) throw new DomainError("LOCKED", "Consignee details are locked once the parcel is out for delivery.", 409);
    const consignee = {
      ...s.consignee,
      ...(patch.name ? { name: patch.name } : {}),
      ...(patch.phone ? { phone: patch.phone } : {}),
      address: { ...s.consignee.address, ...(patch.landmark !== undefined ? { landmark: patch.landmark } : {}) },
    };
    await tx
      .update(shipments)
      .set({ consignee, deliveryInstructions: patch.instructions ?? s.deliveryInstructions, version: s.version + 1, updatedAt: new Date() })
      .where(eq(shipments.id, s.id));
    await audit(tx, { actorId: user.id, action: "shipment.edit_consignee", entity: "shipment", entityId: waybill, before: { consignee: s.consignee, instructions: s.deliveryInstructions }, after: { consignee, instructions: patch.instructions } });
  });
}

export async function recordLabelPrint(user: CurrentUser, waybill: string, format: string) {
  await db.transaction(async (tx) => {
    const [s] = await tx.update(shipments).set({ labelPrints: sql`${shipments.labelPrints} + 1` }).where(eq(shipments.waybill, waybill)).returning({ prints: shipments.labelPrints });
    await audit(tx, { actorId: user.id, action: s.prints > 1 ? "label.reprint" : "label.print", entity: "shipment", entityId: waybill, after: { format, count: s.prints } });
  });
}

const LIFECYCLE: Permission[] = ["shipment.receive", "shipment.hub_scan", "shipment.dispatch", "shipment.deliver", "shipment.fail_attempt", "shipment.collection", "shipment.return", "shipment.override"];

/**
 * Field and hub roles find a parcel by scanning it, not through an account, so holding a lifecycle
 * permission lets a user act on any shipment by waybill. canTransition still decides what they may set.
 * TODO(FR-PLT-03): narrow to the user's hub, Wakala point or assigned tasks once tasks exist.
 */
function assertCanOperate(user: CurrentUser, s: { accountId: string; handlingPartnerId: string | null }) {
  if (user.permissions.has("shipment.read.all")) return;
  // Partner staff act only on cargo assigned to their company.
  if (user.permissions.has("partner.cargo.read")) {
    if (user.accountId && s.handlingPartnerId === user.accountId) return;
    throw new DomainError("NOT_FOUND", "Shipment not found.", 404);
  }
  if (LIFECYCLE.some((p) => user.permissions.has(p))) return;
  assertCanSee(user, s.accountId);
}

function assertCanSee(user: CurrentUser, accountId: string) {
  if (user.permissions.has("shipment.read.all")) return;
  if (user.permissions.has("shipment.read.own_account") && user.accountId === accountId) return;
  throw new DomainError("NOT_FOUND", "Shipment not found.", 404);
}

/* ---------------------------------------------------------------- queries */

export type ShipmentFilter = { q?: string; state?: string; accountId?: string; cursor?: string; limit?: number; atRisk?: boolean };

export async function listShipments(user: CurrentUser, f: ShipmentFilter) {
  const limit = Math.min(f.limit ?? 25, 100);
  const where: (SQL | undefined)[] = [scopeFilter(user)];
  if (f.state) {
    if (f.state === "OPEN") where.push(notInArray(shipments.state, ["DELIVERED", "RETURNED", "CANCELLED", "CLOSED"]));
    else where.push(eq(shipments.state, f.state as ShipmentState));
  }
  if (f.accountId && user.permissions.has("shipment.read.all")) where.push(eq(shipments.accountId, f.accountId));
  if (f.atRisk) {
    where.push(notInArray(shipments.state, ["DELIVERED", "RETURNED", "CANCELLED", "CLOSED"]));
    where.push(lt(shipments.promisedAt, new Date(Date.now() + SLA_ALERT_HOURS * 3600 * 1000)));
  }
  if (f.q) {
    // FR-OPS-03: search by waybill, merchant reference, phone or name.
    const term = f.q.trim();
    const { waybill } = normaliseWaybill(term);
    const digits = term.replace(/\D/g, "");
    where.push(
      or(
        eq(shipments.waybill, waybill),
        ilike(shipments.waybill, `%${term}%`),
        ilike(shipments.merchantRef, `%${term}%`),
        sql`${shipments.consignee}->>'name' ilike ${"%" + term + "%"}`,
        sql`${shipments.consignee}->'address'->>'region' ilike ${term}`,
        sql`${shipments.consignee}->'address'->>'district' ilike ${"%" + term + "%"}`,
        digits.length >= 4 ? sql`${shipments.consignee}->>'phone' like ${"%" + digits.slice(-9) + "%"}` : undefined,
      ),
    );
  }
  if (f.cursor) where.push(lt(shipments.createdAt, new Date(f.cursor)));

  const rows = await db
    .select({
      id: shipments.id,
      waybill: shipments.waybill,
      merchantRef: shipments.merchantRef,
      state: shipments.state,
      exception: shipments.exception,
      serviceLevel: shipments.serviceLevel,
      consignee: shipments.consignee,
      codAmount: shipments.codAmount,
      totalCharge: shipments.totalCharge,
      piecesCount: shipments.piecesCount,
      promisedAt: shipments.promisedAt,
      createdAt: shipments.createdAt,
      accountName: accounts.name,
    })
    .from(shipments)
    .innerJoin(accounts, eq(accounts.id, shipments.accountId))
    .where(and(...where))
    .orderBy(desc(shipments.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items, nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null };
}

export async function getShipment(user: CurrentUser, rawWaybill: string) {
  const { waybill } = normaliseWaybill(rawWaybill);
  const [s] = await db
    .select({ shipment: shipments, accountName: accounts.name })
    .from(shipments)
    .innerJoin(accounts, eq(accounts.id, shipments.accountId))
    .where(and(eq(shipments.waybill, waybill), scopeFilter(user)));
  if (!s) return null;
  const id = s.shipment.id;
  const [evts, pcs, charges, cod, exc, notes, pickup, delivery, returnOf] = await Promise.all([
    db
      .select({ e: events, reasonEn: reasonCodes.labelEn, reasonSw: reasonCodes.labelSw, locationName: locations.name })
      .from(events)
      .leftJoin(reasonCodes, eq(reasonCodes.code, events.reasonCode))
      .leftJoin(locations, eq(locations.id, events.locationId))
      .where(eq(events.shipmentId, id))
      .orderBy(asc(events.occurredAt)),
    db.select().from(pieces).where(eq(pieces.shipmentId, id)).orderBy(asc(pieces.seq)),
    db.select().from(chargeSnapshots).where(eq(chargeSnapshots.shipmentId, id)).orderBy(desc(chargeSnapshots.version)),
    db.select().from(codRecords).where(eq(codRecords.shipmentId, id)),
    db.select().from(exceptions).where(eq(exceptions.shipmentId, id)).orderBy(desc(exceptions.openedAt)),
    db.select().from(notifications).where(eq(notifications.shipmentId, id)).orderBy(desc(notifications.createdAt)),
    s.shipment.pickupLocationId ? db.select().from(locations).where(eq(locations.id, s.shipment.pickupLocationId)) : Promise.resolve([]),
    s.shipment.deliveryLocationId ? db.select().from(locations).where(eq(locations.id, s.shipment.deliveryLocationId)) : Promise.resolve([]),
    s.shipment.returnOfId ? db.select({ waybill: shipments.waybill }).from(shipments).where(eq(shipments.id, s.shipment.returnOfId)) : Promise.resolve([]),
  ]);
  const [returnWaybill] = await db.select({ waybill: shipments.waybill }).from(shipments).where(eq(shipments.returnOfId, id));
  return {
    ...s.shipment,
    accountName: s.accountName,
    events: evts.map((r) => ({ ...r.e, reasonEn: r.reasonEn, reasonSw: r.reasonSw, locationName: r.locationName })),
    pieces: pcs,
    charges: charges[0] ?? null,
    chargeHistory: charges,
    cod: cod[0] ?? null,
    exceptions: exc,
    notifications: notes,
    pickupLocation: pickup[0] ?? null,
    deliveryLocation: delivery[0] ?? null,
    returnOf: returnOf[0]?.waybill ?? null,
    returnWaybill: returnWaybill?.waybill ?? null,
  };
}

export type ShipmentDetail = NonNullable<Awaited<ReturnType<typeof getShipment>>>;

/* -------------------------------------------------------------- dashboard */

export const SLA_ALERT_HOURS = 4; // FR-TRK-05 default

/**
 * Dashboard figures. Shipment counts cover shipments booked since `since` (null = all time); delivery and on-time
 * figures cover deliveries in that period. At-risk, cash held and open exceptions are as of now.
 */
export async function dashboardStats(user: CurrentUser, since: Date | null = new Date(Date.now() - 30 * 24 * 3600 * 1000)) {
  const scope = scopeFilter(user);
  const open = notInArray(shipments.state, ["DELIVERED", "RETURNED", "CANCELLED", "CLOSED"]);
  const booked = since ? gte(shipments.createdAt, since) : undefined;
  const deliveredSince = since ? gte(shipments.deliveredAt, since) : undefined;
  const [byState, atRisk, codOut, openExc, delivered, onTime] = await Promise.all([
    db.select({ state: shipments.state, n: count() }).from(shipments).where(and(scope, booked)).groupBy(shipments.state),
    db.select({ n: count() }).from(shipments).where(and(scope, open, lt(shipments.promisedAt, new Date(Date.now() + SLA_ALERT_HOURS * 3600e3)))),
    db
      .select({ due: sum(codRecords.amountDue), collected: sql<number>`sum(${codRecords.amountCollected} + ${codRecords.feeCollected})`, n: count() })
      .from(codRecords)
      .innerJoin(shipments, eq(shipments.id, codRecords.shipmentId))
      .where(and(scope, inArray(codRecords.status, ["collected", "deposited"]))),
    db.select({ n: count() }).from(exceptions).innerJoin(shipments, eq(shipments.id, exceptions.shipmentId)).where(and(scope, notInArray(exceptions.status, ["resolved"]))),
    db.select({ n: count() }).from(shipments).where(and(scope, eq(shipments.state, "DELIVERED"), deliveredSince)),
    db.select({ n: count() }).from(shipments).where(and(scope, eq(shipments.state, "DELIVERED"), deliveredSince, sql`${shipments.deliveredAt} <= ${shipments.promisedAt}`)),
  ]);
  const states = Object.fromEntries(byState.map((r) => [r.state, r.n])) as Record<string, number>;
  const total = byState.reduce((a, r) => a + r.n, 0);
  const openCount = byState.filter((r) => !isTerminal(r.state as ShipmentState)).reduce((a, r) => a + r.n, 0);
  return {
    total,
    open: openCount,
    states,
    atRisk: atRisk[0]?.n ?? 0,
    codHeld: Number(codOut[0]?.collected ?? 0),
    codHeldCount: codOut[0]?.n ?? 0,
    openExceptions: openExc[0]?.n ?? 0,
    onTimeRate: delivered[0]?.n ? onTime[0].n / delivered[0].n : null,
    delivered: delivered[0]?.n ?? 0,
  };
}

/* ------------------------------------------------------------- exceptions */

export async function raiseException(user: CurrentUser, waybill: string, reasonCode: string, note?: string) {
  if (!user.permissions.has("exception.manage")) throw new DomainError("FORBIDDEN", "You cannot manage exceptions.", 403);
  return db.transaction(async (tx) => {
    const s = await loadForUpdate(tx, waybill);
    const [ex] = await tx
      .insert(exceptions)
      .values({ shipmentId: s.id, reasonCode, note, openedBy: user.id, slaDueAt: new Date(Date.now() + 24 * 3600e3) })
      .returning();
    await tx.update(shipments).set({ exception: true }).where(eq(shipments.id, s.id));
    await tx.insert(events).values({ id: eventId(), shipmentId: s.id, type: "exception.raised", occurredAt: new Date(), source: "manual", actorType: "user", actorId: user.id, reasonCode, note });
    // FR-SVC-02: exceptions that need a person become Bliss cases.
    await enqueue(tx, { target: "bliss", topic: "case.create", idempotencyKey: `case:${ex.id}`, waybill, payload: { waybill, reasonCode, note } });
    await audit(tx, { actorId: user.id, action: "exception.raise", entity: "shipment", entityId: waybill, after: { reasonCode, note } });
    return ex;
  });
}

export async function resolveException(user: CurrentUser, exceptionId: string, resolution: string) {
  if (!user.permissions.has("exception.manage")) throw new DomainError("FORBIDDEN", "You cannot manage exceptions.", 403);
  return db.transaction(async (tx) => {
    const [ex] = await tx.update(exceptions).set({ status: "resolved", resolvedAt: new Date(), resolution, ownerId: user.id }).where(eq(exceptions.id, exceptionId)).returning();
    if (!ex) throw new DomainError("NOT_FOUND", "Exception not found.", 404);
    const [{ n }] = await tx.select({ n: count() }).from(exceptions).where(and(eq(exceptions.shipmentId, ex.shipmentId), notInArray(exceptions.status, ["resolved"])));
    if (n === 0) await tx.update(shipments).set({ exception: false }).where(eq(shipments.id, ex.shipmentId));
    await tx.insert(events).values({ id: eventId(), shipmentId: ex.shipmentId, type: "exception.resolved", occurredAt: new Date(), source: "manual", actorType: "user", actorId: user.id, note: resolution });
    await audit(tx, { actorId: user.id, action: "exception.resolve", entity: "exception", entityId: ex.id, after: { resolution } });
  });
}

export async function listExceptions(status: "open" | "resolved" = "open") {
  return db
    .select({ ex: exceptions, waybill: shipments.waybill, state: shipments.state, accountName: accounts.name, reasonEn: reasonCodes.labelEn, reasonSw: reasonCodes.labelSw })
    .from(exceptions)
    .innerJoin(shipments, eq(shipments.id, exceptions.shipmentId))
    .innerJoin(accounts, eq(accounts.id, shipments.accountId))
    .innerJoin(reasonCodes, eq(reasonCodes.code, exceptions.reasonCode))
    .where(status === "open" ? notInArray(exceptions.status, ["resolved"]) : eq(exceptions.status, "resolved"))
    .orderBy(asc(exceptions.slaDueAt))
    .limit(200);
}

export async function listReasonCodes() {
  return db.select().from(reasonCodes).where(eq(reasonCodes.active, true)).orderBy(asc(reasonCodes.code));
}

export async function listLocations(type?: "hub" | "wakala") {
  return db
    .select()
    .from(locations)
    .where(and(eq(locations.active, true), type ? eq(locations.type, type) : undefined))
    .orderBy(asc(locations.region), asc(locations.name));
}
