import "server-only";
import { and, asc, eq, isNull, sql, type SQL } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db, type Tx } from "../../db/client";
import { rolePermissions, roles } from "../../db/schema";
import { ROLES_TAG, parseScope } from "../../rbac";
import { audit } from "../../audit";
import { DomainError } from "../shipments";
import { requestApproval } from "./approvals";
import { PERMISSIONS, isPermission, type Permission } from "@/domain/roles";
import type { CurrentUser } from "../../auth/current-user";

/**
 * Grants with a scope and a money limit. A grant reads "permission @ scope ≤ limit": where it applies (everywhere, some
 * regions, some countries) and the most money one action under it may move or approve. The server checks both, so no
 * screen can get round them. Changing a grant's scope or limit waits for a second person, like any other access change.
 */

const fmtTzs = (n: number) => `TZS ${n.toLocaleString("en-US")}`;

/** The most money [user] may move or approve with [perm]; null = no limit. */
export function limitOf(user: CurrentUser, perm: Permission): number | null {
  return user.grants?.get(perm)?.max ?? null;
}

/** Throws when [amount] (TZS, sign ignored) is over what the user's grant for [perm] allows. */
export function checkLimit(user: CurrentUser, perm: Permission, amount: number) {
  const max = limitOf(user, perm);
  if (max !== null && Math.abs(amount) > max) {
    throw new DomainError("OVER_LIMIT", `That's over your limit of ${fmtTzs(max)}. Ask someone with a higher limit.`, 403);
  }
}

/** Regions the user may see under [perm]; null = everywhere. */
export function regionsOf(user: CurrentUser, perm: Permission): string[] | null {
  return user.grants?.get(perm)?.regions ?? null;
}

/** A SQL condition keeping rows whose region ([regionExpr]) is inside the user's scope for [perm]. */
export function regionScope(user: CurrentUser, perm: Permission, regionExpr: SQL): SQL {
  const regions = regionsOf(user, perm);
  if (!regions) return sql`true`;
  return sql`lower(coalesce(${regionExpr}, '')) in (${sql.join(
    regions.map((r) => sql`${r.toLowerCase()}`),
    sql`, `,
  )})`;
}

/** Whether the user may act on something in [region] under [perm]. */
export function inScope(user: CurrentUser, perm: Permission, region: string | null | undefined) {
  const regions = regionsOf(user, perm);
  return !regions || (!!region && regions.some((r) => r.toLowerCase() === region.toLowerCase()));
}

/* ------------------------------------------------------------------ editing */

const SCOPE_RE = /^(all|((region:[^,]{2,60}|country:[A-Za-z]{2})(\s*,\s*(region:[^,]{2,60}|country:[A-Za-z]{2}))*))$/;

export const grantChangeSchema = z.object({
  roleKey: z.string().min(1).max(80),
  permission: z.string().refine(isPermission, "Unknown permission"),
  scope: z
    .string()
    .trim()
    .transform((s) => s || "all")
    .refine((s) => SCOPE_RE.test(s), "Write all, or region:<name> / country:<CC>, separated by commas"),
  /** Empty = no limit. */
  maxAmount: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(1_000_000_000)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  reason: z.string().trim().min(10, "Explain the change (at least 10 characters)").max(500),
});
type GrantChange = z.output<typeof grantChangeSchema>;

function canManage(user: CurrentUser) {
  if (!user.permissions.has("roles.manage")) throw new DomainError("FORBIDDEN", "You can't change grants.", 403);
}

/** Tuma's staff roles with every permission they grant, its scope and limit. */
export async function listGrants(user: CurrentUser) {
  canManage(user);
  const rows = await db
    .select({ roleKey: roles.key, roleName: roles.name, active: roles.active, permission: rolePermissions.permission, scope: rolePermissions.scope, max: rolePermissions.maxAmount })
    .from(roles)
    .innerJoin(rolePermissions, eq(rolePermissions.roleKey, roles.key))
    .where(and(eq(roles.surface, "console"), isNull(roles.accountId)))
    .orderBy(asc(roles.name), asc(rolePermissions.permission));
  const label = new Map<string, string>(PERMISSIONS.map((p) => [p.key, p.label]));
  const out = new Map<string, { key: string; name: string; active: boolean; grants: { permission: string; label: string; scope: string; max: number | null }[] }>();
  for (const r of rows) {
    const role = out.get(r.roleKey) ?? { key: r.roleKey, name: r.roleName, active: r.active, grants: [] };
    role.grants.push({ permission: r.permission, label: label.get(r.permission) ?? r.permission, scope: r.scope, max: r.max });
    out.set(r.roleKey, role);
  }
  return [...out.values()];
}

async function applyGrantChange(tx: Tx, g: GrantChange, actorId: string, approval?: string) {
  const [before] = await tx
    .select()
    .from(rolePermissions)
    .where(and(eq(rolePermissions.roleKey, g.roleKey), eq(rolePermissions.permission, g.permission)))
    .for("update");
  if (!before) throw new DomainError("NOT_FOUND", "That role doesn't grant this permission any more.", 404);
  const scope = parseScope(g.scope).regions || parseScope(g.scope).countries ? g.scope.replace(/\s*,\s*/g, ",") : "all";
  await tx.update(rolePermissions).set({ scope, maxAmount: g.maxAmount }).where(and(eq(rolePermissions.roleKey, g.roleKey), eq(rolePermissions.permission, g.permission)));
  await audit(tx, {
    actorId,
    action: "role.grant_limit",
    entity: "role",
    entityId: g.roleKey,
    before: { permission: g.permission, scope: before.scope, max: before.maxAmount },
    after: { permission: g.permission, scope, max: g.maxAmount, approval: approval ?? null },
  });
}

/** Ask to change a grant's scope or limit; applied once a second person approves. */
export async function requestGrantChange(user: CurrentUser, raw: unknown) {
  canManage(user);
  const g = grantChangeSchema.parse(raw);
  const [role] = await db
    .select({ key: roles.key })
    .from(roles)
    .where(and(eq(roles.key, g.roleKey), eq(roles.surface, "console"), isNull(roles.accountId)));
  if (!role) throw new DomainError("NOT_FOUND", "No such staff role.", 404);
  const res = await db.transaction(async (tx) => {
    const row = await requestApproval(tx, user, { kind: "grant_limit", subjectId: g.roleKey, payload: g, reason: g.reason }, (t) => applyGrantChange(t, g, user.id));
    return { pending: !!row, id: row?.id ?? null };
  });
  if (!res.pending) updateTag(ROLES_TAG);
  return res;
}

/** Called by the approvals desk once approved. */
export async function applyApprovedGrantChange(tx: Tx, payload: unknown, approverId: string, approvalId: string) {
  await applyGrantChange(tx, grantChangeSchema.parse(payload), approverId, approvalId);
}
