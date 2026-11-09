import "server-only";
import { and, desc, eq, gt, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { accessElevations, rolePermissions, roles, users } from "../../db/schema";
import { audit } from "../../audit";
import { enqueue } from "../../adapters/outbox";
import { DomainError } from "../shipments";
import type { CurrentUser } from "../../auth/current-user";

/**
 * Break-glass: in an emergency someone on call (breakglass.request) takes a staff role for 1–8 hours with a reason,
 * without waiting for a second person. It ends by itself; it can be ended early by them or by a reviewer; every one
 * is audited, announced to the people who review access, and listed in the access review until someone has looked at
 * it. Roles that change access or approve things (governance) can't be taken this way.
 */

/** Permissions a break-glass role may not carry: taking them would let one person get round four-eyes. */
const GOVERNANCE = ["roles.manage", "users.manage", "approvals.decide", "access.review", "settings.manage", "breakglass.request", "team.manage"];

export const MAX_HOURS = 8;

/** Staff roles that can be taken with break-glass. */
export async function elevatableRoles() {
  return db
    .select({ key: roles.key, name: roles.name, description: roles.description })
    .from(roles)
    .where(
      and(
        eq(roles.surface, "console"),
        isNull(roles.accountId),
        eq(roles.active, true),
        sql`not exists (select 1 from ${rolePermissions} rp where rp.role_key = ${roles.key} and rp.permission in (${sql.join(
          GOVERNANCE.map((g) => sql`${g}`),
          sql`, `,
        )}))`,
      ),
    )
    .orderBy(roles.name);
}

export const elevationSchema = z.object({
  roleKey: z.string().min(1).max(80),
  hours: z.coerce.number().int().min(1).max(MAX_HOURS),
  reason: z.string().trim().min(15, "Say what the emergency is (at least 15 characters)").max(500),
});

export async function requestElevation(user: CurrentUser, raw: unknown) {
  if (!user.permissions.has("breakglass.request")) throw new DomainError("FORBIDDEN", "You can't use break-glass access.", 403);
  const e = elevationSchema.parse(raw);
  const allowed = await elevatableRoles();
  const role = allowed.find((r) => r.key === e.roleKey);
  if (!role) throw new DomainError("NOT_ELEVATABLE", "That role can't be taken with break-glass.", 400);
  const now = new Date();
  return db.transaction(async (tx) => {
    const [open] = await tx
      .select({ id: accessElevations.id })
      .from(accessElevations)
      .where(and(eq(accessElevations.userId, user.id), eq(accessElevations.roleKey, e.roleKey), isNull(accessElevations.endedAt), gt(accessElevations.expiresAt, now)));
    if (open) throw new DomainError("ALREADY", "You already hold that role right now.", 409);
    const expiresAt = new Date(now.getTime() + e.hours * 3_600_000);
    const [row] = await tx.insert(accessElevations).values({ userId: user.id, roleKey: e.roleKey, reason: e.reason, startedAt: now, expiresAt }).returning();
    await audit(tx, { actorId: user.id, action: "access.breakglass", entity: "user", entityId: user.id, after: { role: e.roleKey, hours: e.hours, reason: e.reason, until: expiresAt.toISOString() } });
    await enqueue(tx, {
      target: "seal",
      topic: "access.breakglass",
      idempotencyKey: `breakglass:${row.id}`,
      payload: { userId: user.id, name: user.name, role: role.name, hours: e.hours, reason: e.reason, until: expiresAt.toISOString() },
    });
    return { id: row.id, expiresAt: expiresAt.toISOString() };
  });
}

/** End early: the holder, or someone who reviews access. */
export async function endElevation(user: CurrentUser, id: string) {
  const [r] = await db.select().from(accessElevations).where(eq(accessElevations.id, id));
  if (!r) throw new DomainError("NOT_FOUND", "No such break-glass access.", 404);
  if (r.userId !== user.id && !user.permissions.has("access.review")) throw new DomainError("FORBIDDEN", "You can't end someone else's access.", 403);
  if (r.endedAt || r.expiresAt <= new Date()) return { id, ended: false };
  await db.transaction(async (tx) => {
    await tx.update(accessElevations).set({ endedAt: new Date(), endedBy: user.id }).where(eq(accessElevations.id, id));
    await audit(tx, { actorId: user.id, action: "access.breakglass.end", entity: "user", entityId: r.userId, after: { role: r.roleKey, elevation: id } });
  });
  return { id, ended: true };
}

/** A reviewer has looked at it (never their own). */
export async function reviewElevation(user: CurrentUser, id: string) {
  if (!user.permissions.has("access.review")) throw new DomainError("FORBIDDEN", "You can't review access.", 403);
  const [r] = await db.select().from(accessElevations).where(eq(accessElevations.id, id));
  if (!r) throw new DomainError("NOT_FOUND", "No such break-glass access.", 404);
  if (r.userId === user.id) throw new DomainError("OWN_REQUEST", "Someone else has to review your own break-glass access.", 403);
  await db.transaction(async (tx) => {
    await tx.update(accessElevations).set({ reviewedBy: user.id, reviewedAt: new Date() }).where(eq(accessElevations.id, id));
    await audit(tx, { actorId: user.id, action: "access.breakglass.reviewed", entity: "user", entityId: r.userId, after: { elevation: id } });
  });
  return { id };
}

/**
 * Reviewers see every break-glass of the last 30 days and any not yet reviewed; others see their own.
 */
export async function listElevations(user: CurrentUser) {
  const reviewer = user.permissions.has("access.review");
  if (!reviewer && !user.permissions.has("breakglass.request")) throw new DomainError("FORBIDDEN", "You can't see break-glass access.", 403);
  const since = new Date(Date.now() - 30 * 86_400_000);
  const rows = await db
    .select({ e: accessElevations, name: users.name, roleName: roles.name })
    .from(accessElevations)
    .innerJoin(users, eq(users.id, accessElevations.userId))
    .leftJoin(roles, eq(roles.key, accessElevations.roleKey))
    .where(and(reviewer ? sql`true` : eq(accessElevations.userId, user.id), or(gte(accessElevations.startedAt, since), isNull(accessElevations.reviewedAt))))
    .orderBy(desc(accessElevations.startedAt))
    .limit(200);
  const reviewerIds = [...new Set(rows.flatMap((r) => [r.e.reviewedBy, r.e.endedBy]).filter((x): x is string => !!x))];
  const names = reviewerIds.length ? new Map((await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, reviewerIds))).map((u) => [u.id, u.name])) : new Map();
  const now = Date.now();
  return rows.map(({ e, name, roleName }) => ({
    id: e.id,
    userId: e.userId,
    name,
    role: roleName ?? e.roleKey,
    reason: e.reason,
    startedAt: e.startedAt.toISOString(),
    expiresAt: e.expiresAt.toISOString(),
    endedAt: e.endedAt?.toISOString() ?? null,
    active: !e.endedAt && e.expiresAt.getTime() > now,
    reviewedBy: e.reviewedBy ? (names.get(e.reviewedBy) ?? e.reviewedBy) : null,
    mine: e.userId === user.id,
    canEnd: !e.endedAt && e.expiresAt.getTime() > now && (e.userId === user.id || reviewer),
    canReview: reviewer && !e.reviewedAt && e.userId !== user.id,
  }));
}

/** Not yet reviewed: shown as a count on the access review. */
export async function unreviewedElevations() {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(accessElevations).where(isNull(accessElevations.reviewedAt));
  return r?.n ?? 0;
}
