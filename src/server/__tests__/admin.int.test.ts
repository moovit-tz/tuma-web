import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { accessReviews, approvalRequests, auditLog, users, walletEntries } from "../db/schema";
import { resolvePermissions } from "../rbac";
import { setUserRoles } from "../services/roles";
import { decideApproval, listApprovals, requestWalletAdjustment } from "../services/admin/approvals";
import { reviewAccess, staffForReview } from "../services/admin/access-reviews";
import { customer360, revealCustomerField, searchCustomers } from "../services/admin/support-desk";
import { financeLedger, reconciliation, recheckPayment } from "../services/admin/finance";
import { towerView } from "../services/admin/tower";
import { maskPhone, shown } from "../services/admin/pii";
import type { CurrentUser } from "../auth/current-user";

const ADMIN_A = "ondi|admin.int.a";
const ADMIN_B = "ondi|admin.int.b";
const TARGET = "ondi|admin.int.target";
const AGENT = "ondi|admin.int.support";
const FIN = "ondi|admin.int.finance";
const CUST = "ondi|admin.int.customer";
const IDS = [ADMIN_A, ADMIN_B, TARGET, AGENT, FIN, CUST];
const PHONE = "+255719000321";

async function asUser(id: string, roles: string[]): Promise<CurrentUser> {
  return { id, name: id, accountId: null, roles, permissions: await resolvePermissions(roles), locale: "en" };
}

async function cleanup() {
  await db.delete(approvalRequests).where(inArray(approvalRequests.subjectId, IDS));
  await db.delete(accessReviews).where(inArray(accessReviews.userId, IDS));
  await db.delete(walletEntries).where(inArray(walletEntries.userId, IDS));
  await db.delete(users).where(inArray(users.id, IDS));
}

describe("admin foundation", () => {
  let a: CurrentUser;
  let b: CurrentUser;
  let support: CurrentUser;
  let fin: CurrentUser;
  beforeAll(async () => {
    await cleanup();
    await db.insert(users).values([
      { id: ADMIN_A, name: "Admin A", roles: ["tuma_admin"] },
      { id: ADMIN_B, name: "Admin B", roles: ["tuma_admin"] },
      { id: TARGET, name: "New Staff", roles: [] },
      { id: AGENT, name: "Support Sam", roles: ["service_agent"] },
      { id: FIN, name: "Finance Fay", roles: ["finance_officer"] },
      { id: CUST, name: "Neema Mteja Rashidi", phone: PHONE, email: "neema@example.test", roles: [] },
    ]);
    a = await asUser(ADMIN_A, ["tuma_admin"]);
    b = await asUser(ADMIN_B, ["tuma_admin"]);
    support = await asUser(AGENT, ["service_agent"]);
    fin = await asUser(FIN, ["finance_officer"]);
  });
  afterAll(cleanup);

  it("a staff role waits for a second person, who isn't the requester", async () => {
    await expect(setUserRoles(a, ADMIN_A, ["tuma_admin", "service_agent"])).rejects.toMatchObject({ code: "OWN_ROLES" });
    const r = await setUserRoles(a, TARGET, ["service_agent"], "Joins support");
    expect(r.pending).toBe(true);
    const [still] = await db.select({ roles: users.roles }).from(users).where(eq(users.id, TARGET));
    expect(still.roles).toEqual([]);

    const req = (await listApprovals(b)).find((x) => x.subjectId === TARGET)!;
    expect(req.canDecide).toBe(true);
    expect((await listApprovals(a)).find((x) => x.id === req.id)!.mine).toBe(true);
    await expect(decideApproval(a, req.id, { approve: true })).rejects.toMatchObject({ code: "OWN_REQUEST" });

    await decideApproval(b, req.id, { approve: true, note: "ok" });
    const [now] = await db.select({ roles: users.roles }).from(users).where(eq(users.id, TARGET));
    expect(now.roles).toEqual(["service_agent"]);
    await expect(decideApproval(b, req.id, { approve: false })).rejects.toMatchObject({ code: "DECIDED" });
  });

  it("a wallet adjustment applies only once approved", async () => {
    await expect(requestWalletAdjustment(support, { userId: CUST, amount: 5000, reason: "Goodwill for the late parcel" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const r = await requestWalletAdjustment(fin, { userId: CUST, amount: 5000, reason: "Goodwill for the late parcel" });
    expect(r.pending).toBe(true);
    expect(await db.select().from(walletEntries).where(eq(walletEntries.userId, CUST))).toHaveLength(0);
    await decideApproval(a, r.id!, { approve: true });
    const [e] = await db.select().from(walletEntries).where(and(eq(walletEntries.userId, CUST), eq(walletEntries.kind, "adjustment")));
    expect(e.amount).toBe(5000);
    expect(e.reference).toMatch(/^WA-/);
  });

  it("masks personal details, and a reveal is audited", async () => {
    expect(maskPhone(PHONE)).toBe("+25571••••321");
    expect(shown(support).name("Neema Mteja Rashidi")).toBe("Neema M. R.");
    expect(shown(a).phone(PHONE)).toBe(PHONE);

    const hits = await searchCustomers(support, PHONE);
    const hit = hits.find((h) => h.key === `u:${CUST}`)!;
    expect(hit.phone).not.toBe(PHONE);
    const v = await customer360(support, hit.key);
    expect(v.unmasked).toBe(false);
    expect(v.profile.phone).toBe(maskPhone(PHONE));
    expect(v.wallet?.balance).toBe(5000);

    await expect(revealCustomerField(support, { key: hit.key, field: "phone", reason: "no" })).rejects.toThrow();
    const r = await revealCustomerField(support, { key: hit.key, field: "phone", reason: "Calling back about her case" });
    expect(r.value).toBe(PHONE);
    const [log] = await db.select().from(auditLog).where(and(eq(auditLog.actorId, AGENT), eq(auditLog.action, "pii.reveal"))).limit(1);
    expect(log.entityId).toBe(CUST);
  });

  it("access review: keep, revoke staff roles, never your own", async () => {
    const list = await staffForReview(a);
    expect(list.staff.find((s) => s.id === TARGET)?.due).toBe(true);
    expect(list.staff.find((s) => s.id === AGENT)?.reveals30d).toBeGreaterThanOrEqual(1);
    await expect(reviewAccess(a, ADMIN_A, { decision: "keep" })).rejects.toMatchObject({ code: "OWN_ACCESS" });
    await reviewAccess(a, AGENT, { decision: "keep" });
    expect((await staffForReview(a)).staff.find((s) => s.id === AGENT)?.due).toBe(false);
    await reviewAccess(a, TARGET, { decision: "revoke", note: "Left the team" });
    const [u] = await db.select({ roles: users.roles }).from(users).where(eq(users.id, TARGET));
    expect(u.roles).toEqual([]);
  });

  it("reconciliation settles a stuck top-up with HuduPay", async () => {
    const ref = `TU-ADMININT-${Date.now()}`;
    await db.insert(walletEntries).values({
      userId: CUST,
      kind: "topup",
      amount: 10000,
      status: "pending",
      reference: ref,
      providerId: `sim_${ref}`,
      msisdn: "255719000321",
      createdAt: new Date(Date.now() - 20 * 60_000),
    });
    const before = await reconciliation(fin);
    expect(before.pending.map((p) => p.reference)).toContain(ref);
    await expect(recheckPayment(support, { source: "topup", reference: ref })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const r = await recheckPayment(fin, { source: "topup", reference: ref });
    expect(r.status).toBe("paid");
    const [e] = await db.select().from(walletEntries).where(eq(walletEntries.reference, ref));
    expect(e.status).toBe("paid");

    const ledger = await financeLedger(fin, { days: 7, source: "wallet" });
    expect(ledger.rows.some((x) => x.reference === ref)).toBe(true);
    expect(ledger.totals.topups).toBeGreaterThanOrEqual(10000);
  });

  it("control tower answers, and only for tower.view", async () => {
    await expect(towerView(fin)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const ops = await asUser("ondi|admin.int.ops", ["control_tower"]);
    const v = await towerView(ops);
    expect(v.kpis.inFlight).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(v.risk)).toBe(true);
    await db.execute(sql`select 1`);
  });
});
