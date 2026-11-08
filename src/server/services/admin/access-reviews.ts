import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { accessReviews, auditLog, users } from "../../db/schema";
import { audit } from "../../audit";
import { DomainError } from "../shipments";
import { staffRoleKeys } from "./approvals";
import type { CurrentUser } from "../../auth/current-user";

/**
 * Access reviews: every staff member (anyone holding a console role) is looked at regularly. The reviewer sees their
 * staff roles, when they were last on Tuma, how many personal details they revealed lately and the last review, then
 * keeps the access or takes the staff roles away. Due every REVIEW_DAYS days.
 */
export const REVIEW_DAYS = 90;

export async function staffForReview(user: CurrentUser) {
  if (!user.permissions.has("access.review")) throw new DomainError("FORBIDDEN", "You can't review access.", 403);
  const staff = await staffRoleKeys();
  if (!staff.length) return { staff: [], reviewDays: REVIEW_DAYS };
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, roles: users.roles, active: users.active, lastSeenAt: users.lastSeenAt })
    .from(users)
    .where(and(sql`${users.roles} ?| ${sql.raw(`array[${staff.map((k) => `'${k.replace(/'/g, "''")}'`).join(",")}]`)}`, sql`${users.deletedAt} is null`));
  const ids = rows.map((r) => r.id);
  const since = new Date(Date.now() - 30 * 86400_000);
  const [last, reveals] = ids.length
    ? await Promise.all([
        db
          .selectDistinctOn([accessReviews.userId], { userId: accessReviews.userId, at: accessReviews.at, decision: accessReviews.decision, reviewerId: accessReviews.reviewerId })
          .from(accessReviews)
          .where(inArray(accessReviews.userId, ids))
          .orderBy(accessReviews.userId, desc(accessReviews.at)),
        db
          .select({ actorId: auditLog.actorId, n: sql<number>`count(*)::int` })
          .from(auditLog)
          .where(and(inArray(auditLog.actorId, ids), eq(auditLog.action, "pii.reveal"), sql`${auditLog.at} >= ${since.toISOString()}::timestamptz`))
          .groupBy(auditLog.actorId),
      ])
    : [[], []];
  const lastBy = new Map(last.map((l) => [l.userId, l]));
  const revealBy = new Map(reveals.map((r) => [r.actorId, r.n]));
  const due = Date.now() - REVIEW_DAYS * 86400_000;
  return {
    reviewDays: REVIEW_DAYS,
    staff: rows
      .map((r) => {
        const l = lastBy.get(r.id);
        return {
          id: r.id,
          name: r.name,
          email: r.email,
          active: r.active,
          staffRoles: r.roles.filter((k) => staff.includes(k)),
          otherRoles: r.roles.filter((k) => !staff.includes(k)),
          lastSeenAt: r.lastSeenAt?.toISOString() ?? null,
          lastReview: l ? { at: l.at.toISOString(), decision: l.decision } : null,
          due: !l || l.at.getTime() < due,
          reveals30d: revealBy.get(r.id) ?? 0,
          me: r.id === user.id,
        };
      })
      .sort((a, b) => Number(b.due) - Number(a.due) || a.name.localeCompare(b.name)),
  };
}

export const reviewSchema = z.object({ decision: z.enum(["keep", "revoke"]), note: z.string().trim().max(500).optional() });

/** Keep the access, or take away the person's staff roles (their other roles stay). Not for your own access. */
export async function reviewAccess(user: CurrentUser, userId: string, raw: unknown) {
  if (!user.permissions.has("access.review")) throw new DomainError("FORBIDDEN", "You can't review access.", 403);
  if (userId === user.id) throw new DomainError("OWN_ACCESS", "Someone else reviews your own access.", 403);
  const r = reviewSchema.parse(raw);
  const staff = await staffRoleKeys();
  return db.transaction(async (tx) => {
    const [u] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
    if (!u) throw new DomainError("NOT_FOUND", "No such person.", 404);
    const held = u.roles.filter((k) => staff.includes(k));
    if (r.decision === "revoke") {
      const keep = u.roles.filter((k) => !staff.includes(k));
      await tx.update(users).set({ roles: keep, grantedRoles: u.grantedRoles.filter((k) => !staff.includes(k)) }).where(eq(users.id, userId));
    }
    await tx.insert(accessReviews).values({ userId, reviewerId: user.id, decision: r.decision, roles: held, note: r.note ?? null });
    await audit(tx, { actorId: user.id, action: `access.${r.decision}`, entity: "user", entityId: userId, before: { roles: u.roles }, after: { decision: r.decision, note: r.note ?? null } });
    return { decision: r.decision };
  });
}
