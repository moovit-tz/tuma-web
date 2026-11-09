import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../db/client";
import { accessElevations, users } from "../db/schema";
import { effectivePermissions, resolveGrants, type Grant, type Trial } from "../rbac";
import { ensureWorkspace } from "../services/kyb";
import { SESSION_COOKIE, verifySession } from "./session-token";
import { activeHold, lookOnly } from "../services/admin/risk";
import type { Permission } from "@/domain/roles";

export type CurrentUser = {
  id: string;
  name: string;
  accountId: string | null;
  /** The branch the person works at; null = the whole company. */
  branchId?: string | null;
  roles: string[];
  permissions: Set<Permission>;
  /** Scope and money limit per permission. Missing (older callers, tests) = everywhere, no limit. */
  grants?: Map<Permission, Grant>;
  /** Break-glass roles held right now, with when each ends. */
  elevated?: { roleKey: string; expiresAt: string }[];
  /** Frozen by risk: why. */
  frozen?: string | null;
  /** The company's state; "pending" while its application is reviewed (set-up only). Null without a company. */
  accountStatus?: string | null;
  /** A business under review: its parcel allowance and how much is used. */
  trial?: Trial | null;
  locale: string;
};

/**
 * Reads the session and re-checks the user against the identity snapshot on every request, so a user
 * disabled in Ondi loses access immediately (FR-IDN-03 requires within 5 minutes).
 * Role keys come from the user row: today admins assign them; with real Ondi the row is refreshed
 * from claims at sign-in and by deactivation signals.
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return null;
  let [row] = await db.select().from(users).where(eq(users.id, session.sub)).limit(1);
  if (!row || !row.active) return null;
  // An application sent before workspaces existed: open its workspace so they land on their business home.
  if (!row.accountId && (await ensureWorkspace(row.id))) [row] = await db.select().from(users).where(eq(users.id, session.sub)).limit(1);
  // Break-glass: a staff role taken for a few hours counts until it ends.
  const elevated = await db
    .select({ roleKey: accessElevations.roleKey, expiresAt: accessElevations.expiresAt })
    .from(accessElevations)
    .where(and(eq(accessElevations.userId, row.id), isNull(accessElevations.endedAt), gt(accessElevations.expiresAt, new Date())));
  const roleKeys = [...new Set([...row.roles, ...elevated.map((e) => e.roleKey)])];
  const [{ permissions: granted, accountStatus, trial }, grants, hold] = await Promise.all([effectivePermissions(roleKeys, row.accountId), resolveGrants(roleKeys), activeHold(row.id, row.accountId)]);
  // Frozen by risk (the person or their business): they can still look, but not act.
  const permissions = hold ? new Set([...granted].filter(lookOnly)) : granted;
  return {
    id: row.id,
    name: row.name,
    accountId: row.accountId,
    branchId: row.branchId,
    roles: row.roles,
    permissions,
    grants,
    frozen: hold?.reason ?? null,
    elevated: elevated.map((e) => ({ roleKey: e.roleKey, expiresAt: e.expiresAt.toISOString() })),
    accountStatus,
    trial,
    locale: row.locale,
  };
});

export async function requireUser(locale = "en"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/signin`);
  return user;
}

/** For server actions and route handlers: returns the user or null when the permission is missing. */
export async function userWith(permission: Permission): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user && user.permissions.has(permission) ? user : null;
}
