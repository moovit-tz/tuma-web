import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { users } from "../db/schema";
import { resolvePermissions } from "../rbac";
import { SESSION_COOKIE, verifySession } from "./session-token";
import type { Permission } from "@/domain/roles";

export type CurrentUser = {
  id: string;
  name: string;
  accountId: string | null;
  /** The branch the person works at; null = the whole company. */
  branchId?: string | null;
  roles: string[];
  permissions: Set<Permission>;
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
  const [row] = await db.select().from(users).where(eq(users.id, session.sub)).limit(1);
  if (!row || !row.active) return null;
  return {
    id: row.id,
    name: row.name,
    accountId: row.accountId,
    branchId: row.branchId,
    roles: row.roles,
    permissions: await resolvePermissions(row.roles),
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
