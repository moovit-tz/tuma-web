import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/client";
import { accessElevations, approvalRequests, rolePermissions, roles, users } from "../db/schema";
import { resolveGrants, resolvePermissions } from "../rbac";
import { decideApproval, requestWalletAdjustment } from "../services/admin/approvals";
import { checkLimit, inScope, listGrants, requestGrantChange } from "../services/admin/grants";
import { elevatableRoles, endElevation, listElevations, requestElevation, reviewElevation } from "../services/admin/breakglass";
import { watermark } from "@/lib/csv";
import type { CurrentUser } from "../auth/current-user";

const A = "ondi|grants.a";
const B = "ondi|grants.b";
const FIN = "ondi|grants.fin";
const ONCALL = "ondi|grants.oncall";
const CUST = "ondi|grants.cust";
const IDS = [A, B, FIN, ONCALL, CUST];
const ROLE = "grants_test_fin";

async function asUser(id: string, roleKeys: string[]): Promise<CurrentUser> {
  return { id, name: id, accountId: null, roles: roleKeys, permissions: await resolvePermissions(roleKeys), grants: await resolveGrants(roleKeys), locale: "en" };
}

async function cleanup() {
  await db.delete(accessElevations).where(inArray(accessElevations.userId, IDS));
  await db.delete(approvalRequests).where(inArray(approvalRequests.requestedBy, IDS));
  await db.delete(users).where(inArray(users.id, IDS));
  await db.delete(roles).where(eq(roles.key, ROLE));
}

describe("grants with scope and limits, break-glass", () => {
  let a: CurrentUser;
  let b: CurrentUser;
  beforeAll(async () => {
    await cleanup();
    await db.insert(roles).values({ key: ROLE, name: "Grants test finance", surface: "console" });
    await db.insert(rolePermissions).values([
      { roleKey: ROLE, permission: "finance.reconcile", maxAmount: 50_000 },
      { roleKey: ROLE, permission: "tower.view", scope: "region:Arusha" },
    ]);
    await db.insert(users).values([
      { id: A, name: "Admin A", roles: ["tuma_admin"] },
      { id: B, name: "Admin B", roles: ["tuma_admin"] },
      { id: FIN, name: "Fin", roles: [ROLE] },
      { id: ONCALL, name: "On call", roles: ["on_call"] },
      { id: CUST, name: "Customer", roles: [] },
    ]);
    a = await asUser(A, ["tuma_admin"]);
    b = await asUser(B, ["tuma_admin"]);
  });
  afterAll(cleanup);

  it("resolves the widest scope and limit across roles", async () => {
    const fin = await asUser(FIN, [ROLE]);
    expect(fin.grants?.get("finance.reconcile")?.max).toBe(50_000);
    expect(inScope(fin, "tower.view", "Arusha")).toBe(true);
    expect(inScope(fin, "tower.view", "Mwanza")).toBe(false);
    // With a role that grants it everywhere and without a limit, the widest wins.
    const both = await asUser(FIN, [ROLE, "tuma_admin"]);
    expect(both.grants?.get("finance.reconcile")?.max ?? null).toBeNull();
    expect(inScope(both, "tower.view", "Mwanza")).toBe(true);
  });

  it("refuses money over the grant's limit", async () => {
    const fin = await asUser(FIN, [ROLE]);
    expect(() => checkLimit(fin, "finance.reconcile", -60_000)).toThrow(/limit/);
    await expect(requestWalletAdjustment(fin, { userId: CUST, amount: 60_000, reason: "Goodwill for a late parcel" })).rejects.toMatchObject({ code: "OVER_LIMIT" });
  });

  it("changing a grant's limit waits for a second person", async () => {
    const r = await requestGrantChange(a, { roleKey: ROLE, permission: "finance.reconcile", scope: "region:Dar es Salaam, country:tz", maxAmount: "75000", reason: "Raise for the month-end close" });
    expect(r.pending).toBe(true);
    const [before] = await db.select().from(rolePermissions).where(and(eq(rolePermissions.roleKey, ROLE), eq(rolePermissions.permission, "finance.reconcile")));
    expect(before.maxAmount).toBe(50_000);
    await expect(decideApproval(a, r.id!, { approve: true })).rejects.toMatchObject({ code: "OWN_REQUEST" });
    await decideApproval(b, r.id!, { approve: true });
    const [after] = await db.select().from(rolePermissions).where(and(eq(rolePermissions.roleKey, ROLE), eq(rolePermissions.permission, "finance.reconcile")));
    expect(after.maxAmount).toBe(75_000);
    expect(after.scope).toBe("region:Dar es Salaam,country:tz");
    const listed = await listGrants(a);
    expect(listed.find((x) => x.key === ROLE)?.grants.find((g) => g.permission === "finance.reconcile")?.max).toBe(75_000);
    await expect(requestGrantChange(a, { roleKey: ROLE, permission: "finance.reconcile", scope: "everywhere!", reason: "Not a valid scope here" })).rejects.toThrow();
  });

  it("break-glass: time-boxed, no governance roles, ended and reviewed by someone else", async () => {
    const oncall = await asUser(ONCALL, ["on_call"]);
    const allowed = (await elevatableRoles()).map((r) => r.key);
    expect(allowed).not.toContain("tuma_admin");
    expect(allowed).toContain("control_tower");
    await expect(requestElevation(oncall, { roleKey: "tuma_admin", hours: 2, reason: "Need everything right now please" })).rejects.toMatchObject({ code: "NOT_ELEVATABLE" });
    await expect(requestElevation(oncall, { roleKey: "control_tower", hours: 9, reason: "Hub outage, rerouting parcels" })).rejects.toThrow();
    const e = await requestElevation(oncall, { roleKey: "control_tower", hours: 2, reason: "Hub outage, rerouting parcels" });
    expect(new Date(e.expiresAt).getTime() - Date.now()).toBeGreaterThan(7_000_000);
    await expect(requestElevation(oncall, { roleKey: "control_tower", hours: 1, reason: "Hub outage, rerouting parcels" })).rejects.toMatchObject({ code: "ALREADY" });
    const mine = await listElevations(oncall);
    expect(mine[0]).toMatchObject({ active: true, canEnd: true, canReview: false });
    await expect(reviewElevation(oncall, e.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await endElevation(oncall, e.id);
    await reviewElevation(a, e.id);
    const seen = (await listElevations(a)).find((x) => x.id === e.id);
    expect(seen).toMatchObject({ active: false, reviewedBy: "Admin A", canReview: false });
  });

  it("watermarks exports with who and when", () => {
    expect(watermark("Fay", "ondi|fay", new Date("2026-11-09T10:00:00Z"))).toContain("Exported by Fay (ondi|fay) on 2026-11-09T10:00:00.000Z");
  });
});
