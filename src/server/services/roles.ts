import "server-only";
import { updateTag } from "next/cache";
import { and, asc, count, desc, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, type Tx } from "../db/client";
import { accounts, auditLog, branches, rolePermissions, roles, users } from "../db/schema";
import { audit } from "../audit";
import { ROLES_TAG } from "../rbac";
import { DomainError } from "./shipments";
import { requestApproval, staffRoleKeys } from "./admin/approvals";
import type { CurrentUser } from "../auth/current-user";
import { PARTNER_GRANTABLE, PERMISSION_KEYS, type Permission } from "@/domain/roles";

/**
 * Roles and team management, at two levels:
 *  - platform: Tuma staff with roles.manage / users.manage manage every role and user.
 *  - account:  a partner admin with team.manage manages roles it created for its own company and the
 *              people in that company. It may only grant PARTNER_GRANTABLE permissions and only assign
 *              built-in partner roles or its own roles.
 */

export const roleInputSchema = z.object({
  key: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z0-9_]{2,39}$/, "Use 3–40 lowercase letters, digits or underscores, starting with a letter"),
  name: z.string().trim().min(2, "Enter a name").max(60),
  description: z.string().trim().max(240).default(""),
  surface: z.enum(["portal", "console", "partner", "field", "api"]),
  permissions: z.array(z.enum(PERMISSION_KEYS as [Permission, ...Permission[]])).default([]),
});
export type RoleInput = z.output<typeof roleInputSchema>;

export type RoleScope = { kind: "platform" } | { kind: "account"; accountId: string };

export function roleScope(user: CurrentUser, need: "roles" | "users" = "roles"): RoleScope | null {
  if (user.permissions.has(need === "roles" ? "roles.manage" : "users.manage")) return { kind: "platform" };
  if (user.permissions.has("team.manage") && user.accountId) return { kind: "account", accountId: user.accountId };
  return null;
}

export function requireScope(user: CurrentUser, need: "roles" | "users" = "roles"): RoleScope {
  const scope = roleScope(user, need);
  if (!scope) throw new DomainError("FORBIDDEN", need === "roles" ? "You cannot manage roles." : "You cannot manage your team.", 403);
  return scope;
}

/** Roles a scope can see: everything for the platform; built-in partner roles + its own roles for an account. */
function visibleRoles(scope: RoleScope): SQL | undefined {
  if (scope.kind === "platform") return undefined;
  return or(eq(roles.accountId, scope.accountId), and(isNull(roles.accountId), eq(roles.surface, "partner")));
}

/** Account-created role keys are namespaced by the company so they never clash with other companies. */
export function accountRoleKey(accountId: string, key: string) {
  const prefix = accountId.replace(/^acc_/, "").slice(0, 16);
  return `${prefix}__${key}`.slice(0, 40);
}

export async function listRoles(user?: CurrentUser) {
  const scope = user ? requireScope(user) : ({ kind: "platform" } as RoleScope);
  const rows = await db
    .select({
      key: roles.key,
      name: roles.name,
      description: roles.description,
      surface: roles.surface,
      system: roles.system,
      active: roles.active,
      accountId: roles.accountId,
      updatedAt: roles.updatedAt,
      permissions: sql<string[]>`coalesce(array_agg(${rolePermissions.permission}) filter (where ${rolePermissions.permission} is not null), '{}')`,
    })
    .from(roles)
    .leftJoin(rolePermissions, eq(rolePermissions.roleKey, roles.key))
    .where(visibleRoles(scope))
    .groupBy(roles.key)
    .orderBy(asc(roles.surface), asc(roles.name));
  const userCounts = await db.execute<{ role: string; n: number }>(
    scope.kind === "platform"
      ? sql`select r as role, count(*)::int as n from ${users}, jsonb_array_elements_text(${users.roles}) r where ${users.active} group by r`
      : sql`select r as role, count(*)::int as n from ${users}, jsonb_array_elements_text(${users.roles}) r where ${users.active} and ${users.accountId} = ${scope.accountId} group by r`,
  );
  const counts = new Map(userCounts.map((r) => [r.role, Number(r.n)]));
  return rows.map((r) => ({
    ...r,
    userCount: counts.get(r.key) ?? 0,
    /** Can this scope edit the role? Platform: any. Account: only its own roles. */
    editable: scope.kind === "platform" || r.accountId === scope.accountId,
  }));
}

export async function getRole(user: CurrentUser, key: string) {
  const all = await listRoles(user);
  return all.find((r) => r.key === key) ?? null;
}

async function loadEditable(tx: Tx, scope: RoleScope, key: string) {
  const [r] = await tx.select().from(roles).where(eq(roles.key, key));
  if (!r) throw new DomainError("NOT_FOUND", "Role not found.", 404);
  if (scope.kind === "account" && r.accountId !== scope.accountId) throw new DomainError("FORBIDDEN", "This role is managed by Tuma.", 403);
  return r;
}

function checkGrantable(scope: RoleScope, permissions: Permission[]) {
  if (scope.kind === "platform") return;
  const bad = permissions.filter((p) => !PARTNER_GRANTABLE.includes(p));
  if (bad.length) throw new DomainError("NOT_GRANTABLE", `These permissions can only be granted by Tuma: ${bad.join(", ")}`, 403);
}

/**
 * Guards against lock-out after a change (runs inside the transaction):
 *  - platform: at least one active user keeps roles.manage
 *  - account:  at least one active user of the company keeps team.manage
 */
async function assertAdminRemains(tx: Tx, scope: RoleScope) {
  const permission = scope.kind === "platform" ? "roles.manage" : "team.manage";
  const [{ n }] = await tx
    .select({ n: count() })
    .from(users)
    .where(
      and(
        eq(users.active, true),
        scope.kind === "account" ? eq(users.accountId, scope.accountId) : undefined,
        sql`exists (
          select 1 from jsonb_array_elements_text(${users.roles}) uk
          join ${roles} r on r.key = uk and r.active
          join ${rolePermissions} rp on rp.role_key = r.key and rp.permission = ${permission}
        )`,
      ),
    );
  if (n === 0) {
    throw new DomainError(
      "LAST_ADMIN",
      scope.kind === "platform" ? "This change would leave nobody able to manage roles." : "This change would leave nobody in your company able to manage the team.",
      409,
    );
  }
}

export async function createRole(user: CurrentUser, input: RoleInput) {
  const scope = requireScope(user);
  checkGrantable(scope, input.permissions);
  const key = scope.kind === "account" ? accountRoleKey(scope.accountId, input.key) : input.key;
  const surface = scope.kind === "account" ? "partner" : input.surface;
  await db.transaction(async (tx) => {
    const [exists] = await tx.select({ key: roles.key }).from(roles).where(eq(roles.key, key));
    if (exists) throw new DomainError("ROLE_EXISTS", "A role with this key already exists.", 409);
    await tx.insert(roles).values({ key, name: input.name, description: input.description, surface, accountId: scope.kind === "account" ? scope.accountId : null });
    if (input.permissions.length) await tx.insert(rolePermissions).values(input.permissions.map((p) => ({ roleKey: key, permission: p })));
    await audit(tx, { actorId: user.id, action: "role.create", entity: "role", entityId: key, after: { ...input, key, scope } });
  });
  updateTag(ROLES_TAG);
  return key;
}

export async function updateRole(user: CurrentUser, key: string, input: Omit<RoleInput, "key">) {
  const scope = requireScope(user);
  checkGrantable(scope, input.permissions);
  await db.transaction(async (tx) => {
    const before = await loadEditable(tx, scope, key);
    const beforePerms = (await tx.select().from(rolePermissions).where(eq(rolePermissions.roleKey, key))).map((r) => r.permission).sort();
    await tx
      .update(roles)
      .set({ name: input.name, description: input.description, surface: scope.kind === "account" ? "partner" : input.surface, updatedAt: new Date() })
      .where(eq(roles.key, key));
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleKey, key));
    if (input.permissions.length) await tx.insert(rolePermissions).values(input.permissions.map((p) => ({ roleKey: key, permission: p })));
    await assertAdminRemains(tx, scope);
    const afterPerms = [...input.permissions].sort();
    await audit(tx, {
      actorId: user.id,
      action: "role.update",
      entity: "role",
      entityId: key,
      before: { ...before, permissions: beforePerms },
      after: { ...input, granted: afterPerms.filter((p) => !beforePerms.includes(p)), revoked: beforePerms.filter((p) => !afterPerms.includes(p as Permission)) },
    });
  });
  updateTag(ROLES_TAG);
}

export async function setRoleActive(user: CurrentUser, key: string, active: boolean) {
  const scope = requireScope(user);
  await db.transaction(async (tx) => {
    await loadEditable(tx, scope, key);
    await tx.update(roles).set({ active, updatedAt: new Date() }).where(eq(roles.key, key));
    await assertAdminRemains(tx, scope);
    await audit(tx, { actorId: user.id, action: active ? "role.activate" : "role.deactivate", entity: "role", entityId: key });
  });
  updateTag(ROLES_TAG);
}

export async function deleteRole(user: CurrentUser, key: string) {
  const scope = requireScope(user);
  await db.transaction(async (tx) => {
    const r = await loadEditable(tx, scope, key);
    if (r.system) throw new DomainError("SYSTEM_ROLE", "Built-in roles can be deactivated but not deleted.", 409);
    const [{ n }] = await tx.select({ n: count() }).from(users).where(sql`${users.roles} ? ${key}`);
    if (n > 0) throw new DomainError("ROLE_IN_USE", `Remove this role from ${n} user(s) first.`, 409);
    await tx.delete(roles).where(eq(roles.key, key));
    await audit(tx, { actorId: user.id, action: "role.delete", entity: "role", entityId: key, before: r });
  });
  updateTag(ROLES_TAG);
}

/* ------------------------------------------------------------ user roles */

export async function listUsers(user: CurrentUser) {
  const scope = requireScope(user, "users");
  return db
    .select()
    .from(users)
    .where(scope.kind === "account" ? eq(users.accountId, scope.accountId) : undefined)
    .orderBy(asc(users.name));
}

/** Role keys a scope may assign. */
export async function assignableKeys(tx: Tx, scope: RoleScope) {
  const rows = await tx.select({ key: roles.key }).from(roles).where(visibleRoles(scope));
  return rows.map((r) => r.key);
}

/**
 * Assign roles to a user. With the Ondi stub this is the source of the user's role claims.
 * With real Ondi, either this writes back to Ondi or Ondi owns it (open question Q2).
 */
export async function setUserRoles(user: CurrentUser, userId: string, roleKeys: string[], reason?: string): Promise<{ pending: boolean }> {
  const scope = requireScope(user, "users");
  return db.transaction(async (tx) => {
    const [target] = await tx.select().from(users).where(eq(users.id, userId));
    if (!target || (scope.kind === "account" && target.accountId !== scope.accountId)) throw new DomainError("NOT_FOUND", "User not found.", 404);
    const allowed = await assignableKeys(tx, scope);
    const unknown = roleKeys.filter((k) => !allowed.includes(k));
    if (unknown.length) throw new DomainError("UNKNOWN_ROLE", `You can't assign: ${unknown.join(", ")}`, 403);
    // An account admin may not strip Tuma-assigned roles it cannot see; keep them.
    const hidden = scope.kind === "account" ? target.roles.filter((k) => !allowed.includes(k)) : [];
    const clean = [...new Set([...roleKeys, ...hidden])].sort();
    // Record them as Tuma's grants too: with real Ondi, roles are rebuilt from the claim plus these at every sign-in,
    // so a role assigned here would otherwise vanish the next time the person signs in.
    const granted = [...new Set([...target.grantedRoles.filter((k) => clean.includes(k)), ...roleKeys])].sort();
    // Four-eyes: giving someone a staff (console) role waits for a second person to approve it. Taking roles away
    // doesn't.
    const staff = scope.kind === "platform" ? await staffRoleKeys(tx) : [];
    const added = clean.filter((k) => !target.roles.includes(k) && staff.includes(k));
    if (added.length) {
      if (target.id === user.id) throw new DomainError("OWN_ROLES", "You can't give yourself a staff role. Ask another admin.", 403);
      const row = await requestApproval(
        tx,
        user,
        { kind: "role_grant", subjectId: userId, payload: { roles: clean, added, before: target.roles }, reason: reason?.trim() || `Give ${added.join(", ")}` },
        async (t) => {
          await t.update(users).set({ roles: clean, grantedRoles: granted }).where(eq(users.id, userId));
          await audit(t, { actorId: user.id, action: "user.roles", entity: "user", entityId: userId, before: { roles: target.roles }, after: { roles: clean } });
        },
      );
      return { pending: !!row };
    }
    await tx.update(users).set({ roles: clean, grantedRoles: granted }).where(eq(users.id, userId));
    await assertAdminRemains(tx, scope);
    await audit(tx, { actorId: user.id, action: "user.roles", entity: "user", entityId: userId, before: { roles: target.roles }, after: { roles: clean } });
    return { pending: false };
  });
}

export const memberSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(120),
  email: z.email("Enter a valid email"),
  roles: z.array(z.string()).min(1, "Choose at least one role"),
});

/**
 * Add a team member to the company (Ondi stub only). With real Ondi, people are invited in Ondi and appear
 * here on first sign-in; this then becomes an invitation request instead.
 */
export async function addTeamMember(user: CurrentUser, input: z.output<typeof memberSchema>) {
  const scope = requireScope(user, "users");
  if (process.env.ONDI_MODE !== "stub") throw new DomainError("ONDI_MANAGED", "People are invited through Ondi.", 409);
  const accountId = scope.kind === "account" ? scope.accountId : user.accountId;
  const id = `ondi|${input.email.toLowerCase()}`;
  await db.transaction(async (tx) => {
    const [exists] = await tx.select({ id: users.id }).from(users).where(eq(users.id, id));
    if (exists) throw new DomainError("EXISTS", "Someone with this email is already on Tuma.", 409);
    const allowed = await assignableKeys(tx, scope);
    const bad = input.roles.filter((k) => !allowed.includes(k));
    if (bad.length) throw new DomainError("UNKNOWN_ROLE", `You can't assign: ${bad.join(", ")}`, 403);
    await tx.insert(users).values({ id, name: input.name, email: input.email.toLowerCase(), accountId, roles: [...new Set(input.roles)].sort() });
    await audit(tx, { actorId: user.id, action: "user.invite", entity: "user", entityId: id, after: { name: input.name, roles: input.roles, accountId } });
  });
}

/** One person on the team, with their roles, what those roles allow, and recent activity. Scoped like listUsers. */
export async function getMember(user: CurrentUser, id: string) {
  const scope = requireScope(user, "users");
  const [m] = await db.select().from(users).where(eq(users.id, id));
  if (!m || (scope.kind === "account" && m.accountId !== scope.accountId)) return null;
  const [account] = m.accountId ? await db.select({ name: accounts.name }).from(accounts).where(eq(accounts.id, m.accountId)) : [];
  const roleRows = m.roles.length ? await db.select({ key: roles.key, name: roles.name, active: roles.active }).from(roles).where(inArray(roles.key, m.roles)) : [];
  const perms = m.roles.length
    ? await db
        .selectDistinct({ permission: rolePermissions.permission })
        .from(rolePermissions)
        .innerJoin(roles, and(eq(roles.key, rolePermissions.roleKey), eq(roles.active, true)))
        .where(inArray(rolePermissions.roleKey, m.roles))
    : [];
  const activity = await db
    .select({ at: auditLog.at, action: auditLog.action, entity: auditLog.entity, entityId: auditLog.entityId, actorId: auditLog.actorId })
    .from(auditLog)
    .where(or(eq(auditLog.actorId, id), and(eq(auditLog.entity, "user"), eq(auditLog.entityId, id))))
    .orderBy(desc(auditLog.at))
    .limit(12);
  const branchList = m.accountId
    ? await db.select({ id: branches.id, name: branches.name, code: branches.code }).from(branches).where(and(eq(branches.accountId, m.accountId), eq(branches.active, true))).orderBy(asc(branches.name))
    : [];
  return { m, accountName: account?.name ?? null, roles: roleRows, permissions: perms.map((p) => p.permission), activity, branches: branchList };
}

export const memberUpdateSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(120),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^\+?[0-9 ]*$/, "Use digits only, e.g. +255 712 345 678")
    .optional()
    .transform((v) => (v ? v.replace(/\s+/g, "") : null)),
  locale: z.enum(["en", "sw", "fr"]),
  /** "" = whole company. Omitted = unchanged. */
  branchId: z
    .union([z.uuid(), z.literal("")])
    .optional()
    .transform((v) => (v === undefined ? undefined : v || null)),
});

/** Edit a person's profile. With real Ondi the name comes from Ondi; phone and language stay Tuma's. */
export async function updateMember(user: CurrentUser, id: string, input: z.output<typeof memberUpdateSchema>) {
  const scope = requireScope(user, "users");
  await db.transaction(async (tx) => {
    const [before] = await tx.select().from(users).where(eq(users.id, id));
    if (!before || (scope.kind === "account" && before.accountId !== scope.accountId)) throw new DomainError("NOT_FOUND", "User not found.", 404);
    const { branchId, ...profile } = input;
    const change: Partial<typeof users.$inferInsert> = { ...profile };
    if (branchId !== undefined && branchId !== before.branchId) {
      // Someone tied to a branch can't move people between branches.
      if (user.branchId) throw new DomainError("FORBIDDEN", "Only company-wide admins can change someone's branch.", 403);
      if (branchId) {
        const [b] = await tx.select({ id: branches.id }).from(branches).where(and(eq(branches.id, branchId), before.accountId ? eq(branches.accountId, before.accountId) : sql`false`));
        if (!b) throw new DomainError("NOT_FOUND", "Branch not found for this company.", 404);
      }
      change.branchId = branchId;
    }
    await tx.update(users).set(change).where(eq(users.id, id));
    await audit(tx, { actorId: user.id, action: "user.update", entity: "user", entityId: id, before: { name: before.name, phone: before.phone, locale: before.locale, branchId: before.branchId }, after: change });
  });
}

/** Suspend or restore someone's access. Nobody can suspend themselves, or the last person who can manage the team. */
export async function setMemberActive(user: CurrentUser, id: string, active: boolean) {
  const scope = requireScope(user, "users");
  if (!active && id === user.id) throw new DomainError("SELF", "You can't suspend your own access.", 409);
  await db.transaction(async (tx) => {
    const [before] = await tx.select().from(users).where(eq(users.id, id));
    if (!before || (scope.kind === "account" && before.accountId !== scope.accountId)) throw new DomainError("NOT_FOUND", "User not found.", 404);
    await tx.update(users).set({ active }).where(eq(users.id, id));
    await assertAdminRemains(tx, scope);
    await audit(tx, { actorId: user.id, action: active ? "user.restore" : "user.suspend", entity: "user", entityId: id, before: { active: before.active }, after: { active } });
  });
}

export async function roleNames(keys: string[]) {
  if (!keys.length) return new Map<string, string>();
  const rows = await db.select({ key: roles.key, name: roles.name }).from(roles).where(inArray(roles.key, keys));
  return new Map(rows.map((r) => [r.key, r.name]));
}
