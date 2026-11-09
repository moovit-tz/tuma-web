import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, type Tx } from "../../db/client";
import { approvalRequests, payoutLines, payouts } from "../../db/schema";
import { audit } from "../../audit";
import { enqueue } from "../../adapters/outbox";
import { DomainError } from "../shipments";
import { requestApproval } from "./approvals";
import { approvalAppliers, approvalRejecters } from "./approval-registry";
import { checkLimit } from "./grants";
import { ref } from "./claims";
import type { CurrentUser } from "../../auth/current-user";

/**
 * Payouts to the people Tuma owes: its own drivers (what each completed job pays) and agent points (a fee for each parcel
 * they hand over for another office). Finance works out a period; each payee's payout waits for a second person, then
 * goes to FinOps to pay, and is marked paid with the provider's reference. A job or parcel is paid once, ever.
 */

/** What Tuma pays a point for each parcel it hands over for another office (TZS). PLACEHOLDER until agreed. */
export const POINT_HANDOVER_FEE = 500;

const periodSchema = z
  .object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
  .refine((p) => p.from <= p.to, "The period ends before it starts");

type Line = { payeeType: "driver" | "point"; payeeId: string; payeeName: string; sourceType: "job" | "parcel"; sourceId: string; label: string; amount: number };

/** Unpaid lines in the period: Tuma's own drivers' completed jobs, and points' handovers for other offices. */
async function owed(from: string, to: string): Promise<Line[]> {
  const start = `${from}T00:00:00+03:00`;
  const end = `${to}T23:59:59.999+03:00`;
  const [jobs, parcels] = await Promise.all([
    db.execute<{ id: string; ref: string; driver: string; name: string; amount: number; [k: string]: unknown }>(sql`
      select j.id::text as id, j.ref, j.driver_id as driver, coalesce(u.name, j.driver_id) as name, j.payout as amount
      from jobs j join accounts a on a.id = j.account_id and a.type = 'internal'
      left join users u on u.id = j.driver_id
      where j.status = 'completed' and j.driver_id is not null and j.payout > 0
        and j.completed_at between ${start}::timestamptz and ${end}::timestamptz
        and not exists (select 1 from payout_lines l where l.source_type = 'job' and l.source_id = j.id::text)`),
    db.execute<{ id: string; waybill: string; point: string; name: string; [k: string]: unknown }>(sql`
      select s.id::text as id, s.waybill, s.handling_partner_id as point, coalesce(a.name, s.handling_partner_id) as name
      from shipments s join accounts a on a.id = s.handling_partner_id
      where s.delivered_at between ${start}::timestamptz and ${end}::timestamptz
        and s.handling_partner_id is not null and s.handling_partner_id <> s.account_id
        and not exists (select 1 from payout_lines l where l.source_type = 'parcel' and l.source_id = s.id::text)`),
  ]);
  return [
    ...[...jobs].map((j) => ({ payeeType: "driver" as const, payeeId: j.driver, payeeName: j.name, sourceType: "job" as const, sourceId: j.id, label: j.ref, amount: j.amount })),
    ...[...parcels].map((p) => ({ payeeType: "point" as const, payeeId: p.point, payeeName: p.name, sourceType: "parcel" as const, sourceId: p.id, label: p.waybill, amount: POINT_HANDOVER_FEE })),
  ];
}

function need(user: CurrentUser) {
  if (!user.permissions.has("payout.propose")) throw new DomainError("FORBIDDEN", "You can't propose payouts.", 403);
}

/** What would be paid for the period, by payee (nothing is created). */
export async function previewPayouts(user: CurrentUser, raw: unknown) {
  need(user);
  const p = periodSchema.parse(raw);
  const lines = await owed(p.from, p.to);
  const by = new Map<string, { payeeType: string; payeeId: string; payeeName: string; amount: number; lines: number }>();
  for (const l of lines) {
    const k = `${l.payeeType}:${l.payeeId}`;
    const g = by.get(k) ?? { payeeType: l.payeeType, payeeId: l.payeeId, payeeName: l.payeeName, amount: 0, lines: 0 };
    g.amount += l.amount;
    g.lines++;
    by.set(k, g);
  }
  return [...by.values()].sort((a, b) => b.amount - a.amount);
}

/** Propose a payout for every payee owed in the period; each waits for approval. */
export async function proposePayouts(user: CurrentUser, raw: unknown) {
  need(user);
  const p = periodSchema.parse(raw);
  const lines = await owed(p.from, p.to);
  if (!lines.length) throw new DomainError("NOTHING", "Nothing is owed for that period.", 409);
  const groups = new Map<string, Line[]>();
  for (const l of lines) groups.set(`${l.payeeType}:${l.payeeId}`, [...(groups.get(`${l.payeeType}:${l.payeeId}`) ?? []), l]);
  let created = 0;
  for (const g of groups.values()) {
    const amount = g.reduce((s, l) => s + l.amount, 0);
    checkLimit(user, "payout.propose", amount);
    await db.transaction(async (tx) => {
      const [po] = await tx
        .insert(payouts)
        .values({
          ref: ref("PO"),
          payeeType: g[0].payeeType,
          payeeId: g[0].payeeId,
          payeeName: g[0].payeeName,
          periodFrom: new Date(`${p.from}T00:00:00+03:00`),
          periodTo: new Date(`${p.to}T23:59:59+03:00`),
          amount,
          lineCount: g.length,
          proposedBy: user.id,
        })
        .returning();
      // The unique (source) index makes a line that was just paid elsewhere fail the whole payout, never pay twice.
      await tx.insert(payoutLines).values(g.map((l) => ({ payoutId: po.id, sourceType: l.sourceType, sourceId: l.sourceId, label: l.label, amount: l.amount })));
      const row = await requestApproval(
        tx,
        user,
        { kind: "payout", subjectId: g[0].payeeId, payload: { payoutId: po.id, amount, summary: `${po.ref} · ${po.payeeName} · ${g.length} ${g[0].sourceType === "job" ? "jobs" : "parcels"}` }, reason: `Payout ${p.from} – ${p.to}` },
        (t) => approve(t, po.id, user.id, null),
      );
      if (row) await tx.update(payouts).set({ approvalId: row.id }).where(eq(payouts.id, po.id));
    });
    created++;
  }
  return { created };
}

async function approve(tx: Tx, payoutId: string, approverId: string, approvalId: string | null) {
  const [po] = await tx.update(payouts).set({ status: "sent" }).where(and(eq(payouts.id, payoutId), eq(payouts.status, "proposed"))).returning();
  if (!po) return;
  await enqueue(tx, {
    target: "finops",
    topic: "payout.send",
    idempotencyKey: `payout:${po.id}`,
    payload: { ref: po.ref, payeeType: po.payeeType, payeeId: po.payeeId, payee: po.payeeName, amount: po.amount, currency: "TZS", approvedBy: approverId, approval: approvalId },
  });
  await audit(tx, { actorId: approverId, action: "payout.approved", entity: "payout", entityId: po.id, after: { ref: po.ref, amount: po.amount } });
}

approvalAppliers.set("payout", async (tx, r, approverId) => approve(tx, (r.payload as { payoutId: string }).payoutId, approverId, r.id));
/** Rejected: its jobs and parcels are free to go into a later payout. */
approvalRejecters.set("payout", async (tx, r) => {
  const id = (r.payload as { payoutId: string }).payoutId;
  await tx.update(payouts).set({ status: "rejected" }).where(and(eq(payouts.id, id), eq(payouts.status, "proposed")));
  await tx.delete(payoutLines).where(eq(payoutLines.payoutId, id));
});

/** FinOps paid it: record the provider's reference. */
export async function markPayoutPaid(user: CurrentUser, id: string, raw: unknown) {
  if (!user.permissions.has("finance.reconcile")) throw new DomainError("FORBIDDEN", "You can't mark payouts paid.", 403);
  const { providerRef } = z.object({ providerRef: z.string().trim().min(3).max(80) }).parse(raw);
  await db.transaction(async (tx) => {
    const [po] = await tx.update(payouts).set({ status: "paid", paidAt: new Date(), providerRef }).where(and(eq(payouts.id, id), eq(payouts.status, "sent"))).returning();
    if (!po) throw new DomainError("NOT_SENT", "Only a payout sent to FinOps can be marked paid.", 409);
    await audit(tx, { actorId: user.id, action: "payout.paid", entity: "payout", entityId: id, after: { providerRef } });
  });
  return { id };
}

export async function listPayouts(user: CurrentUser, tab: "open" | "paid" = "open") {
  if (!user.permissions.has("payout.propose") && !user.permissions.has("finance.view")) throw new DomainError("FORBIDDEN", "You can't see payouts.", 403);
  const rows = await db
    .select()
    .from(payouts)
    .where(inArray(payouts.status, tab === "open" ? ["proposed", "sent"] : ["paid", "rejected"]))
    .orderBy(desc(payouts.createdAt))
    .limit(200);
  const [k] = await db.execute<{ proposed: number; sent: number; paid30: number; [k: string]: unknown }>(sql`
    select coalesce(sum(amount) filter (where status = 'proposed'), 0)::int as proposed,
      coalesce(sum(amount) filter (where status = 'sent'), 0)::int as sent,
      coalesce(sum(amount) filter (where status = 'paid' and paid_at > now() - interval '30 days'), 0)::int as paid30
    from payouts`);
  const approvals = rows.filter((r) => r.approvalId).map((r) => r.approvalId!);
  const pending = approvals.length ? new Set((await db.select({ id: approvalRequests.id }).from(approvalRequests).where(and(inArray(approvalRequests.id, approvals), eq(approvalRequests.status, "pending")))).map((a) => a.id)) : new Set<string>();
  return {
    rows: rows.map((r) => ({
      ...r,
      periodFrom: r.periodFrom.toISOString(),
      periodTo: r.periodTo.toISOString(),
      createdAt: r.createdAt.toISOString(),
      paidAt: r.paidAt?.toISOString() ?? null,
      waiting: !!r.approvalId && pending.has(r.approvalId),
    })),
    kpis: k,
    canPropose: user.permissions.has("payout.propose"),
    canMarkPaid: user.permissions.has("finance.reconcile"),
  };
}

export async function payoutLinesOf(user: CurrentUser, id: string) {
  if (!user.permissions.has("payout.propose") && !user.permissions.has("finance.view")) throw new DomainError("FORBIDDEN", "You can't see payouts.", 403);
  return db.select().from(payoutLines).where(eq(payoutLines.payoutId, id)).orderBy(payoutLines.label);
}
