import "server-only";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db, type Tx } from "../../db/client";
import { approvalRequests, rolePermissions, roles, users, walletEntries } from "../../db/schema";
import { audit } from "../../audit";
import { enqueue } from "../../adapters/outbox";
import { DomainError } from "../shipments";
import type { CurrentUser } from "../../auth/current-user";
import { updateTag } from "next/cache";
import { ROLES_TAG } from "../../rbac";
import { applyApprovedGrantChange, checkLimit } from "./grants";
import { approvalAppliers, approvalRejecters } from "./approval-registry";

/**
 * Four-eyes approvals. Some changes are too sensitive for one person: giving someone a staff (console) role, and
 * putting money into or taking it out of a wallet by hand. They are asked for here and applied only once a second
 * person with approvals.decide approves. Nobody decides their own request.
 *
 * Bootstrap: while nobody else can approve (a new installation), the change applies at once and the audit says so.
 */

export type ApprovalKind = "role_grant" | "wallet_adjust" | "grant_limit" | "payout" | "risk_release" | "claim_settle" | "price_publish";
type Row = typeof approvalRequests.$inferSelect;

/** Someone other than [userId] who can approve (an active user whose roles give approvals.decide). */
async function otherApproverExists(q: Tx | typeof db, userId: string) {
  const [r] = await q
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(
      and(
        ne(users.id, userId),
        eq(users.active, true),
        sql`exists (select 1 from ${rolePermissions} rp join ${roles} r on r.key = rp.role_key where r.active and rp.permission = 'approvals.decide' and ${users.roles} ? rp.role_key)`,
      ),
    );
  return (r?.n ?? 0) > 0;
}

/** Ask for a change. Returns the request (pending), or null when it was applied at once (bootstrap). */
export async function requestApproval(
  tx: Tx,
  user: CurrentUser,
  r: { kind: ApprovalKind; subjectId: string; payload: Record<string, unknown>; reason: string },
  apply: (tx: Tx) => Promise<void>,
): Promise<Row | null> {
  if (!(await otherApproverExists(tx, user.id))) {
    await apply(tx);
    await audit(tx, { actorId: user.id, action: `approval.${r.kind}.bootstrap`, entity: "approval", entityId: r.subjectId, after: { ...r.payload, reason: r.reason } });
    return null;
  }
  const [row] = await tx.insert(approvalRequests).values({ kind: r.kind, subjectId: r.subjectId, payload: r.payload, reason: r.reason, requestedBy: user.id }).returning();
  await audit(tx, { actorId: user.id, action: `approval.${r.kind}.requested`, entity: "approval", entityId: row.id, after: { subjectId: r.subjectId, ...r.payload, reason: r.reason } });
  return row;
}

/** Pending first, then the latest decided ones; with who asked and who it's about. */
export async function listApprovals(user: CurrentUser, status: "pending" | "decided" = "pending") {
  if (!user.permissions.has("approvals.decide") && !user.permissions.has("users.manage") && !user.permissions.has("finance.reconcile")) {
    throw new DomainError("FORBIDDEN", "You can't see approvals.", 403);
  }
  const rows = await db
    .select()
    .from(approvalRequests)
    .where(status === "pending" ? eq(approvalRequests.status, "pending") : inArray(approvalRequests.status, ["approved", "rejected", "cancelled"]))
    .orderBy(desc(approvalRequests.requestedAt))
    .limit(100);
  const ids = [...new Set(rows.flatMap((r) => [r.requestedBy, r.decidedBy, r.subjectId]).filter((x): x is string => !!x))];
  const people = ids.length ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, ids)) : [];
  const name = new Map(people.map((p) => [p.id, p.name]));
  return rows.map((r) => ({
    ...r,
    requestedAt: r.requestedAt.toISOString(),
    decidedAt: r.decidedAt?.toISOString() ?? null,
    requestedByName: name.get(r.requestedBy) ?? r.requestedBy,
    decidedByName: r.decidedBy ? (name.get(r.decidedBy) ?? r.decidedBy) : null,
    subjectName: name.get(r.subjectId) ?? null,
    mine: r.requestedBy === user.id,
    canDecide: r.status === "pending" && r.requestedBy !== user.id && user.permissions.has("approvals.decide"),
  }));
}

export const decisionSchema = z.object({ approve: z.boolean(), note: z.string().trim().max(500).optional() });

export async function decideApproval(user: CurrentUser, id: string, raw: unknown) {
  if (!user.permissions.has("approvals.decide")) throw new DomainError("FORBIDDEN", "You can't approve requests.", 403);
  const d = decisionSchema.parse(raw);
  return db.transaction(async (tx) => {
    const [r] = await tx.select().from(approvalRequests).where(eq(approvalRequests.id, id)).for("update");
    if (!r) throw new DomainError("NOT_FOUND", "No such request.", 404);
    if (r.status !== "pending") throw new DomainError("DECIDED", "This request was already decided.", 409);
    if (r.requestedBy === user.id) throw new DomainError("OWN_REQUEST", "Someone else has to approve your own request.", 403);
    // Money waits for someone whose approval limit covers it.
    const amount = Number((r.payload as { amount?: unknown }).amount ?? 0);
    if (d.approve && Number.isFinite(amount) && amount !== 0) checkLimit(user, "approvals.decide", amount);
    if (d.approve) await applyApproved(tx, r, user.id);
    else {
      await import("./appliers");
      await approvalRejecters.get(r.kind)?.(tx, r, user.id);
    }
    await tx
      .update(approvalRequests)
      .set({ status: d.approve ? "approved" : "rejected", decidedBy: user.id, decidedAt: new Date(), decisionNote: d.note ?? null })
      .where(eq(approvalRequests.id, id));
    await audit(tx, { actorId: user.id, action: `approval.${r.kind}.${d.approve ? "approved" : "rejected"}`, entity: "approval", entityId: id, after: { note: d.note ?? null } });
    return { id, status: d.approve ? "approved" : "rejected", kind: r.kind };
  }).then((res) => {
    if (res.kind === "grant_limit" && res.status === "approved") updateTag(ROLES_TAG);
    return { id: res.id, status: res.status };
  });
}

/** The requester changed their mind. */
export async function cancelApproval(user: CurrentUser, id: string) {
  return db.transaction(async (tx) => {
    const [r] = await tx
      .update(approvalRequests)
      .set({ status: "cancelled", decidedBy: user.id, decidedAt: new Date() })
      .where(and(eq(approvalRequests.id, id), eq(approvalRequests.requestedBy, user.id), eq(approvalRequests.status, "pending")))
      .returning();
    if (!r) throw new DomainError("NOT_FOUND", "No pending request of yours with that id.", 404);
    await import("./appliers");
    await approvalRejecters.get(r.kind)?.(tx, r, user.id);
    return { id, status: "cancelled" };
  });
}

async function applyApproved(tx: Tx, r: Row, approverId: string) {
  if (r.kind === "role_grant") {
    const p = r.payload as { roles: string[] };
    const [u] = await tx.select().from(users).where(eq(users.id, r.subjectId)).for("update");
    if (!u) throw new DomainError("NOT_FOUND", "That person isn't on Tuma any more.", 404);
    const clean = [...new Set(p.roles)].sort();
    const granted = [...new Set([...u.grantedRoles.filter((k) => clean.includes(k)), ...clean])].sort();
    await tx.update(users).set({ roles: clean, grantedRoles: granted }).where(eq(users.id, u.id));
    await audit(tx, { actorId: approverId, action: "user.roles", entity: "user", entityId: u.id, before: { roles: u.roles }, after: { roles: clean, approval: r.id } });
    return;
  }
  if (r.kind === "wallet_adjust") {
    await applyWalletAdjustment(tx, r.id, r.subjectId, r.payload as WalletAdjust, approverId);
    return;
  }
  if (r.kind === "grant_limit") {
    await applyApprovedGrantChange(tx, r.payload, approverId, r.id);
    return;
  }
  await import("./appliers"); // every feature registers what approving its kind does
  const apply = approvalAppliers.get(r.kind);
  if (apply) {
    await apply(tx, r, approverId);
    return;
  }
  throw new DomainError("UNKNOWN_KIND", `Can't apply a ${r.kind} request.`, 400);
}

/* ------------------------------------------------------- wallet adjustments */

export const walletAdjustSchema = z.object({
  userId: z.string().min(1).max(120),
  /** A company's wallet instead of the person's own. */
  accountId: z.string().max(120).optional(),
  /** Signed TZS: + credit (goodwill, a missed refund), − debit (a duplicate credit). */
  amount: z.coerce
    .number()
    .int()
    .refine((n) => n !== 0, "Enter an amount")
    .refine((n) => Math.abs(n) <= 5_000_000, "At most TZS 5,000,000"),
  reason: z.string().trim().min(10, "Explain the adjustment (at least 10 characters)").max(500),
  waybill: z.string().trim().max(20).optional(),
});
type WalletAdjust = z.output<typeof walletAdjustSchema>;

async function applyWalletAdjustment(tx: Tx, ref: string, userId: string, a: WalletAdjust, actorId: string) {
  await tx.insert(walletEntries).values({
    userId,
    accountId: a.accountId ?? null,
    kind: "adjustment",
    amount: a.amount,
    reference: `WA-${ref.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
    waybill: a.waybill ?? null,
    failureMessage: null,
    settledAt: new Date(),
  });
  await enqueue(tx, {
    target: "finops",
    topic: "wallet.adjustment",
    idempotencyKey: `walletadjust:${ref}`,
    payload: { userId, accountId: a.accountId ?? null, amount: a.amount, reason: a.reason, approvedBy: actorId, request: ref },
  });
}

/** Finance asks to adjust a wallet; it waits for a second person. */
export async function requestWalletAdjustment(user: CurrentUser, raw: unknown) {
  if (!user.permissions.has("finance.reconcile")) throw new DomainError("FORBIDDEN", "You can't adjust wallets.", 403);
  const a = walletAdjustSchema.parse(raw);
  checkLimit(user, "finance.reconcile", a.amount);
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, a.userId));
  if (!u) throw new DomainError("NOT_FOUND", "No such person.", 404);
  return db.transaction(async (tx) => {
    const id = crypto.randomUUID();
    const row = await requestApproval(tx, user, { kind: "wallet_adjust", subjectId: a.userId, payload: a, reason: a.reason }, (t) =>
      applyWalletAdjustment(t, id, a.userId, a, user.id),
    );
    return { pending: !!row, id: row?.id ?? null };
  });
}

/** Staff roles: the ones whose surface is the console. Granting one waits for approval. */
export async function staffRoleKeys(q: Tx | typeof db = db) {
  const rows = await q.select({ key: roles.key }).from(roles).where(and(eq(roles.surface, "console"), sql`${roles.accountId} is null`));
  return rows.map((r) => r.key);
}
