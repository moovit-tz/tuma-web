import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, type Tx } from "../../db/client";
import { claims, events, shipments, users, walletEntries } from "../../db/schema";
import { audit } from "../../audit";
import { enqueue } from "../../adapters/outbox";
import { DomainError } from "../shipments";
import { requestApproval } from "./approvals";
import { approvalAppliers, approvalRejecters } from "./approval-registry";
import { checkLimit } from "./grants";
import type { CurrentUser } from "../../auth/current-user";

/**
 * The claims desk. A claim is opened on a parcel; the parcel's own record supplies most of the evidence (the photo at
 * booking, every scan with where and who, proof of delivery); the adjuster adds notes, decides who was liable and
 * proposes what to pay. Paying waits for a second person, then goes into the claimant's Tuma wallet (or to FinOps to
 * pay out when they have none). What's recovered from the liable party is recorded afterwards.
 */

export const CLAIM_KINDS = ["lost", "damaged", "short", "late"] as const;
export const LIABLE = ["point", "rider", "carrier", "border", "tuma", "customer", "none"] as const;
const STATUSES = ["open", "investigating", "proposed", "settled", "rejected"] as const;

export const ref = (prefix: string) => `${prefix}-${Date.now().toString(36).slice(-4).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

function need(user: CurrentUser, p: "claims.handle" | "claims.decide") {
  if (!user.permissions.has(p)) throw new DomainError("FORBIDDEN", "You can't work on claims.", 403);
}

export const newClaimSchema = z.object({
  waybill: z.string().trim().min(3).max(20),
  kind: z.enum(CLAIM_KINDS),
  claimantName: z.string().trim().min(2).max(120),
  claimantPhone: z.string().trim().max(20).optional(),
  amountClaimed: z.coerce.number().int().min(1, "Enter what they claim").max(50_000_000),
  description: z.string().trim().min(10, "Describe what happened (at least 10 characters)").max(2000),
});

export async function openClaim(user: CurrentUser, raw: unknown) {
  need(user, "claims.handle");
  const c = newClaimSchema.parse(raw);
  const waybill = c.waybill.toUpperCase();
  const [s] = await db.select().from(shipments).where(eq(shipments.waybill, waybill));
  if (!s) throw new DomainError("NOT_FOUND", `No parcel ${waybill}.`, 404);
  // The claimant is a Tuma user when their phone matches one: settlements then go to their wallet.
  const phone = c.claimantPhone?.replace(/\s+/g, "") || null;
  const [u] = phone ? await db.select({ id: users.id }).from(users).where(eq(users.phone, phone.startsWith("0") ? `+255${phone.slice(1)}` : phone)) : [];
  return db.transaction(async (tx) => {
    const [open] = await tx
      .select({ ref: claims.ref })
      .from(claims)
      .where(and(eq(claims.shipmentId, s.id), inArray(claims.status, ["open", "investigating", "proposed"])));
    if (open) throw new DomainError("CLAIM_OPEN", `Claim ${open.ref} is already open on this parcel.`, 409);
    const [row] = await tx
      .insert(claims)
      .values({
        ref: ref("CLM"),
        shipmentId: s.id,
        waybill,
        kind: c.kind,
        claimantUserId: u?.id ?? null,
        claimantName: c.claimantName,
        claimantPhone: phone,
        declaredValue: s.declaredValue,
        amountClaimed: c.amountClaimed,
        description: c.description,
        createdBy: user.id,
        handledBy: user.id,
      })
      .returning();
    await audit(tx, { actorId: user.id, action: "claim.open", entity: "claim", entityId: row.id, after: { ref: row.ref, waybill, kind: c.kind, amount: c.amountClaimed } });
    return { id: row.id, ref: row.ref };
  });
}

export async function listClaims(user: CurrentUser, status: "active" | "closed" = "active") {
  need(user, "claims.handle");
  const rows = await db
    .select()
    .from(claims)
    .where(inArray(claims.status, status === "active" ? ["open", "investigating", "proposed"] : ["settled", "rejected"]))
    .orderBy(desc(claims.createdAt))
    .limit(200);
  const [k] = await db.execute<{ open: number; proposed: number; paid30: number; claims30: number; parcels30: number; recovered: number; [k: string]: unknown }>(sql`
    select
      (select count(*)::int from claims where status in ('open','investigating')) as open,
      (select count(*)::int from claims where status = 'proposed') as proposed,
      (select coalesce(sum(settled_amount),0)::int from claims where status = 'settled' and decided_at > now() - interval '30 days') as paid30,
      (select count(*)::int from claims where created_at > now() - interval '30 days') as claims30,
      (select count(*)::int from shipments where created_at > now() - interval '30 days') as parcels30,
      (select coalesce(sum(recovered_amount),0)::int from claims where decided_at > now() - interval '30 days') as recovered`);
  return {
    rows: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), decidedAt: r.decidedAt?.toISOString() ?? null })),
    kpis: { ...k, per1000: k.parcels30 ? Math.round((k.claims30 / k.parcels30) * 10000) / 10 : 0 },
  };
}

/** The claim with the parcel's own evidence: booking photo, scans (where, who), proof of delivery. */
export async function getClaim(user: CurrentUser, id: string) {
  need(user, "claims.handle");
  const [c] = await db.select().from(claims).where(eq(claims.id, id));
  if (!c) throw new DomainError("NOT_FOUND", "No such claim.", 404);
  const [s] = await db.select().from(shipments).where(eq(shipments.id, c.shipmentId));
  const scans = await db
    .select({ type: events.type, state: events.stateAfter, at: events.occurredAt, lat: events.lat, lng: events.lng, actorType: events.actorType, actorId: events.actorId, note: events.note, data: events.data })
    .from(events)
    .where(eq(events.shipmentId, c.shipmentId))
    .orderBy(events.occurredAt);
  const actorIds = [...new Set(scans.map((e) => e.actorId).filter((x): x is string => !!x))];
  const names = actorIds.length ? new Map((await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, actorIds))).map((u) => [u.id, u.name])) : new Map<string, string>();
  const pod = scans.filter((e) => e.state === "DELIVERED").at(-1);
  return {
    claim: { ...c, createdAt: c.createdAt.toISOString(), decidedAt: c.decidedAt?.toISOString() ?? null },
    parcel: s
      ? {
          waybill: s.waybill,
          state: s.state,
          goods: s.goodsDescription,
          photo: s.goodsPhoto,
          declaredValue: s.declaredValue,
          charge: s.totalCharge,
          from: s.shipper.name,
          to: s.consignee.name,
          handlingPartnerId: s.handlingPartnerId,
          createdAt: s.createdAt.toISOString(),
          deliveredAt: s.deliveredAt?.toISOString() ?? null,
        }
      : null,
    scans: scans.map((e) => ({ ...e, at: e.at.toISOString(), actor: e.actorId ? (names.get(e.actorId) ?? e.actorId) : e.actorType })),
    pod: pod ? { at: pod.at.toISOString(), lat: pod.lat, lng: pod.lng, data: pod.data } : null,
    canDecide: user.permissions.has("claims.decide"),
  };
}

const evidenceSchema = z.object({ note: z.string().trim().min(3).max(1000), url: z.string().trim().url().max(500).optional().or(z.literal("")) });

export async function addEvidence(user: CurrentUser, id: string, raw: unknown) {
  need(user, "claims.handle");
  const e = evidenceSchema.parse(raw);
  await db.transaction(async (tx) => {
    const [c] = await tx.select().from(claims).where(eq(claims.id, id)).for("update");
    if (!c) throw new DomainError("NOT_FOUND", "No such claim.", 404);
    if (c.status === "settled" || c.status === "rejected") throw new DomainError("CLOSED", "This claim is closed.", 409);
    const item = { kind: e.url ? "file" : "note", note: e.note, url: e.url || undefined, by: user.name, at: new Date().toISOString() };
    await tx
      .update(claims)
      .set({ evidence: [...c.evidence, item], status: c.status === "open" ? "investigating" : c.status })
      .where(eq(claims.id, id));
  });
  return { id };
}

export const liabilitySchema = z.object({ liableParty: z.enum(LIABLE), liableId: z.string().trim().max(120).optional() });

export async function setLiability(user: CurrentUser, id: string, raw: unknown) {
  need(user, "claims.handle");
  const l = liabilitySchema.parse(raw);
  await db.transaction(async (tx) => {
    const [c] = await tx.select().from(claims).where(eq(claims.id, id)).for("update");
    if (!c) throw new DomainError("NOT_FOUND", "No such claim.", 404);
    if (c.status === "settled" || c.status === "rejected") throw new DomainError("CLOSED", "This claim is closed.", 409);
    await tx
      .update(claims)
      .set({ liableParty: l.liableParty, liableId: l.liableId || null, status: c.status === "open" ? "investigating" : c.status })
      .where(eq(claims.id, id));
    await audit(tx, { actorId: user.id, action: "claim.liability", entity: "claim", entityId: id, before: { party: c.liableParty, id: c.liableId }, after: l });
  });
  return { id };
}

export const decideSchema = z.object({
  outcome: z.enum(["pay", "reject"]),
  amount: z.coerce.number().int().min(0).max(50_000_000).optional(),
  note: z.string().trim().min(10, "Explain the decision (at least 10 characters)").max(1000),
});

/** Propose a settlement (waits for approval) or reject the claim. */
export async function decideClaim(user: CurrentUser, id: string, raw: unknown) {
  need(user, "claims.decide");
  const d = decideSchema.parse(raw);
  return db.transaction(async (tx) => {
    const [c] = await tx.select().from(claims).where(eq(claims.id, id)).for("update");
    if (!c) throw new DomainError("NOT_FOUND", "No such claim.", 404);
    if (c.status === "settled" || c.status === "rejected") throw new DomainError("CLOSED", "This claim is closed.", 409);
    if (c.status === "proposed") throw new DomainError("PROPOSED", "A settlement is already waiting for approval.", 409);
    if (d.outcome === "reject") {
      await tx.update(claims).set({ status: "rejected", decisionNote: d.note, decidedAt: new Date() }).where(eq(claims.id, id));
      await audit(tx, { actorId: user.id, action: "claim.rejected", entity: "claim", entityId: id, after: { note: d.note } });
      return { status: "rejected" as const };
    }
    if (!c.liableParty) throw new DomainError("NO_LIABILITY", "Decide who was liable first.", 409);
    const amount = d.amount ?? 0;
    if (amount < 1) throw new DomainError("NO_AMOUNT", "Enter what to pay.", 400);
    if (amount > c.amountClaimed) throw new DomainError("OVER_CLAIM", "That's more than they claimed.", 400);
    // Cover stops at the declared value (or the claim when nothing was declared).
    if (c.declaredValue && amount > c.declaredValue) throw new DomainError("OVER_COVER", "That's more than the declared value the parcel was covered for.", 400);
    checkLimit(user, "claims.decide", amount);
    await tx.update(claims).set({ status: "proposed", proposedAmount: amount, decisionNote: d.note }).where(eq(claims.id, id));
    const row = await requestApproval(
      tx,
      user,
      { kind: "claim_settle", subjectId: c.claimantUserId ?? c.id, payload: { claimId: c.id, amount, summary: `${c.ref} · ${c.waybill} · ${c.claimantName}` }, reason: d.note },
      (t) => settle(t, c.id, amount, user.id, null),
    );
    if (row) await tx.update(claims).set({ approvalId: row.id }).where(eq(claims.id, id));
    return { status: row ? ("proposed" as const) : ("settled" as const) };
  });
}

async function settle(tx: Tx, claimId: string, amount: number, approverId: string, approvalId: string | null) {
  const [c] = await tx.select().from(claims).where(eq(claims.id, claimId)).for("update");
  if (!c || c.status === "settled") return;
  if (c.claimantUserId) {
    await tx.insert(walletEntries).values({ userId: c.claimantUserId, kind: "claim", amount, reference: `CL-${c.ref}`, waybill: c.waybill, shipmentId: c.shipmentId, settledAt: new Date() });
  }
  await enqueue(tx, {
    target: "finops",
    topic: "claim.settled",
    idempotencyKey: `claim:${c.id}`,
    waybill: c.waybill,
    payload: { claim: c.ref, amount, toWallet: !!c.claimantUserId, claimant: c.claimantName, phone: c.claimantPhone, liable: c.liableParty, liableId: c.liableId },
  });
  await tx.update(claims).set({ status: "settled", settledAmount: amount, decidedAt: new Date() }).where(eq(claims.id, claimId));
  await audit(tx, { actorId: approverId, action: "claim.settled", entity: "claim", entityId: claimId, after: { amount, approval: approvalId } });
}

approvalAppliers.set("claim_settle", async (tx, r, approverId) => {
  const p = r.payload as { claimId: string; amount: number };
  await settle(tx, p.claimId, p.amount, approverId, r.id);
});

/** A rejected or withdrawn settlement goes back to the adjuster. */
approvalRejecters.set("claim_settle", async (tx, r) => {
  const p = r.payload as { claimId: string };
  await tx.update(claims).set({ status: "investigating", proposedAmount: null, approvalId: null }).where(and(eq(claims.id, p.claimId), eq(claims.status, "proposed")));
});

export async function recordRecovery(user: CurrentUser, id: string, raw: unknown) {
  need(user, "claims.decide");
  const { amount } = z.object({ amount: z.coerce.number().int().min(1).max(50_000_000) }).parse(raw);
  await db.transaction(async (tx) => {
    const [c] = await tx.select().from(claims).where(eq(claims.id, id)).for("update");
    if (!c || c.status !== "settled") throw new DomainError("NOT_SETTLED", "Record recoveries on a settled claim.", 409);
    if (c.recoveredAmount + amount > (c.settledAmount ?? 0)) throw new DomainError("OVER", "That's more than was paid out.", 400);
    await tx.update(claims).set({ recoveredAmount: c.recoveredAmount + amount }).where(eq(claims.id, id));
    await audit(tx, { actorId: user.id, action: "claim.recovered", entity: "claim", entityId: id, after: { amount, from: c.liableParty, id: c.liableId } });
  });
  return { id };
}

export { STATUSES as CLAIM_STATUSES };
