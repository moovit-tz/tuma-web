import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "./db/client";
import { rolePermissions, roles } from "./db/schema";
import { isPermission, type Permission } from "@/domain/roles";

export const ROLES_TAG = "rbac:roles";

/** Permission keys granted by the given active roles. Cached; invalidated when roles change. */
async function permissionsFor(roleKeys: string[]): Promise<Permission[]> {
  "use cache";
  cacheTag(ROLES_TAG);
  cacheLife("minutes");
  if (roleKeys.length === 0) return [];
  const rows = await db
    .select({ permission: rolePermissions.permission })
    .from(rolePermissions)
    .innerJoin(roles, eq(roles.key, rolePermissions.roleKey))
    .where(and(inArray(rolePermissions.roleKey, roleKeys), eq(roles.active, true)));
  // Ignore grants for permissions that no longer exist in the catalog.
  return [...new Set(rows.map((r) => r.permission).filter(isPermission))].sort();
}

export async function resolvePermissions(roleKeys: string[]): Promise<Set<Permission>> {
  return new Set(await permissionsFor([...roleKeys].sort()));
}
