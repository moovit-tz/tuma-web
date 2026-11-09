import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "./db/client";
import { accounts, rolePermissions, roles, shipments } from "./db/schema";
import { SETUP_PERMISSIONS, TRIAL_INTAKE, TRIAL_PERMISSIONS, isPermission, type Permission } from "@/domain/roles";
import { getSetting } from "./settings";

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

export type Trial = { allowance: number; used: number; remaining: number };

/**
 * Parcels a business under review has used of its allowance: an agent office, the ones it booked or was given to
 * handle; a sending company, the ones sent on its account.
 */
export async function trialFor(accountId: string, type?: string | null): Promise<Trial> {
  const company = type === "shipper";
  const [allowance, [{ used }]] = await Promise.all([
    getSetting(company ? "pendingCompanyParcelAllowance" : "pendingParcelAllowance"),
    db
      .select({ used: sql<number>`count(*)::int` })
      .from(shipments)
      .where(company ? eq(shipments.companyAccountId, accountId) : or(eq(shipments.accountId, accountId), eq(shipments.handlingPartnerId, accountId))),
  ]);
  return { allowance, used, remaining: Math.max(0, allowance - used) };
}

/**
 * What a person may actually do: their roles' permissions, limited by their company's state. While a self-onboarded
 * business is still being reviewed (account status "pending") everyone in it can set up (SETUP_PERMISSIONS) and
 * handle parcels up to the allowance set in the portal (TRIAL_PERMISSIONS); once it is used up they can finish the
 * parcels in hand but not take in new ones. Approval lifts the limit on the next request.
 */
export async function effectivePermissions(
  roleKeys: string[],
  accountId: string | null,
): Promise<{ permissions: Set<Permission>; accountStatus: string | null; trial: Trial | null }> {
  const [permissions, acct] = await Promise.all([
    resolvePermissions(roleKeys),
    accountId ? db.select({ status: accounts.status, type: accounts.type }).from(accounts).where(eq(accounts.id, accountId)).then((r) => r[0]) : Promise.resolve(undefined),
  ]);
  const accountStatus = acct?.status ?? null;
  if (accountStatus !== "pending") return { permissions, accountStatus, trial: null };
  const trial = await trialFor(accountId!, acct?.type);
  // Allowance 0 and nothing in hand: set-up only. Parcels already taken in can always be finished.
  const open = trial.allowance > 0 || trial.used > 0 ? TRIAL_PERMISSIONS.filter((p) => trial.remaining > 0 || !TRIAL_INTAKE.includes(p)) : [];
  const allowed = new Set<Permission>([...SETUP_PERMISSIONS, ...open]);
  return { permissions: new Set([...permissions].filter((p) => allowed.has(p))), accountStatus, trial };
}

/** What one permission allows: where (null = everywhere) and up to how much money per action (null = no limit). */
export type Grant = { regions: string[] | null; countries: string[] | null; max: number | null };

/**
 * The scope and money limit of each permission the roles give. When several roles grant the same permission the
 * widest wins: any "all" scope means everywhere, and any grant without a limit means no limit.
 */
async function grantRowsFor(roleKeys: string[]) {
  "use cache";
  cacheTag(ROLES_TAG);
  cacheLife("minutes");
  if (roleKeys.length === 0) return [];
  return db
    .select({ permission: rolePermissions.permission, scope: rolePermissions.scope, max: rolePermissions.maxAmount })
    .from(rolePermissions)
    .innerJoin(roles, eq(roles.key, rolePermissions.roleKey))
    .where(and(inArray(rolePermissions.roleKey, roleKeys), eq(roles.active, true)));
}

export function parseScope(scope: string): { regions: string[] | null; countries: string[] | null } {
  const parts = scope
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.length || parts.includes("all")) return { regions: null, countries: null };
  const regions = parts.filter((p) => p.startsWith("region:")).map((p) => p.slice(7).trim());
  const countries = parts.filter((p) => p.startsWith("country:")).map((p) => p.slice(8).trim().toUpperCase());
  return { regions: regions.length ? regions : null, countries: countries.length ? countries : null };
}

export async function resolveGrants(roleKeys: string[]): Promise<Map<Permission, Grant>> {
  const out = new Map<Permission, Grant>();
  for (const r of await grantRowsFor([...roleKeys].sort())) {
    if (!isPermission(r.permission)) continue;
    const g = { ...parseScope(r.scope), max: r.max };
    const prev = out.get(r.permission);
    if (!prev) {
      out.set(r.permission, g);
      continue;
    }
    const everywhere = (!prev.regions && !prev.countries) || (!g.regions && !g.countries);
    out.set(r.permission, {
      regions: everywhere ? null : prev.regions || g.regions ? [...new Set([...(prev.regions ?? []), ...(g.regions ?? [])])] : null,
      countries: everywhere ? null : prev.countries || g.countries ? [...new Set([...(prev.countries ?? []), ...(g.countries ?? [])])] : null,
      max: prev.max === null || g.max === null ? null : Math.max(prev.max, g.max),
    });
  }
  return out;
}
