import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { roles, users } from "../db/schema";
import { resolvePermissions } from "../rbac";
import { createRole, listRoles, listUsers, setUserRoles, updateRole, addTeamMember, roleScope, getMember, updateMember, setMemberActive } from "../services/roles";
import { clientOptions, getClient, listCargo, saveClient, setClientActive } from "../services/partner";
import { branches, partnerClients, vehicles } from "../db/schema";
import { branchSchema, effectiveBranch, listBranches, saveBranch } from "../services/branches";
import { pageCargo, partnerDashboard, vehicleOptions } from "../services/partner";
import { searchPortal } from "../services/search";
import type { CurrentUser } from "../auth/current-user";

const as = async (id: string, roleKeys: string[], accountId: string): Promise<CurrentUser> => ({ id, name: id, accountId, roles: roleKeys, permissions: await resolvePermissions(roleKeys), locale: "en" });
const KF = "acc_test_freight";
const MZ = "acc_mzizima_wh";
let kfAdmin: CurrentUser;

beforeAll(async () => {
  process.env.ONDI_MODE = "stub";
  await db.execute(sql`insert into accounts (id, type, partner_kind, name) values (${KF},'partner','freight_forwarder','Test Freight Ltd'), (${MZ},'partner','warehouse','Mzizima Warehousing') on conflict do nothing`);
  await db.execute(sql`delete from roles where account_id is not null`);
  await db.execute(sql`delete from users where id like 'test|%'`);
  await db.insert(users).values([
    { id: "test|kf-admin", name: "KF Admin", accountId: KF, roles: ["partner_admin"] },
    { id: "test|kf-clerk", name: "KF Clerk", accountId: KF, roles: ["partner_ops"] },
    { id: "test|mz-ops", name: "MZ Ops", accountId: MZ, roles: ["partner_ops"] },
  ]);
  kfAdmin = await as("test|kf-admin", ["partner_admin"], KF);
});

afterAll(async () => {
  await db.$client.end();
});

describe("one portal, company-scoped roles", () => {
  it("gives a partner admin company scope, not platform scope", () => {
    expect(roleScope(kfAdmin)).toEqual({ kind: "account", accountId: KF });
  });

  it("lets a partner create a role for its own company with partner permissions only", async () => {
    const key = await createRole(kfAdmin, { key: "dispatcher", name: "Dispatcher", description: "", surface: "console", permissions: ["partner.cargo.read", "partner.cargo.operate", "shipment.dispatch"] });
    expect(key).toBe("test_freight__dispatcher");
    const [row] = await db.select().from(roles).where(eq(roles.key, key));
    expect(row).toMatchObject({ accountId: KF, surface: "partner" });
    await expect(createRole(kfAdmin, { key: "superuser", name: "Super", description: "", surface: "partner", permissions: ["shipment.read.all"] })).rejects.toMatchObject({ code: "NOT_GRANTABLE" });
  });

  it("shows a partner its own roles plus built-in partner roles, and keeps Tuma roles read-only", async () => {
    const list = await listRoles(kfAdmin);
    const keys = list.map((r) => r.key);
    expect(keys).toEqual(expect.arrayContaining(["partner_admin", "partner_ops", "test_freight__dispatcher"]));
    expect(keys).not.toContain("tuma_admin");
    expect(list.find((r) => r.key === "partner_ops")?.editable).toBe(false);
    await expect(updateRole(kfAdmin, "partner_ops", { name: "x", description: "", surface: "partner", permissions: [] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("scopes the team to the partner's company and its assignable roles", async () => {
    expect((await listUsers(kfAdmin)).map((u) => u.id).sort()).toEqual(["test|kf-admin", "test|kf-clerk"]);
    await setUserRoles(kfAdmin, "test|kf-clerk", ["test_freight__dispatcher"]);
    await expect(setUserRoles(kfAdmin, "test|mz-ops", ["partner_ops"])).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(setUserRoles(kfAdmin, "test|kf-clerk", ["tuma_admin"])).rejects.toMatchObject({ code: "UNKNOWN_ROLE" });
  });

  it("will not let a partner remove its last team admin", async () => {
    await expect(setUserRoles(kfAdmin, "test|kf-admin", ["partner_ops"])).rejects.toMatchObject({ code: "LAST_ADMIN" });
  });

  it("adds team members to the partner's own company (Ondi stub)", async () => {
    await addTeamMember(kfAdmin, { name: "New Driver Lead", email: "Lead@TestFreight.co.tz", roles: ["partner_ops"] });
    const [u] = await db.select().from(users).where(eq(users.id, "ondi|lead@testfreight.co.tz"));
    expect(u).toMatchObject({ accountId: KF, roles: ["partner_ops"] });
    await db.delete(users).where(eq(users.id, "ondi|lead@testfreight.co.tz"));
  });
});

describe("portal search respects access", () => {
  it("turns questions into views the user is allowed to open", async () => {
    const r = await searchPortal(kfAdmin, "overdue invoices", "en");
    expect(r.suggestions[0]).toMatchObject({ href: "/en/portal/invoices?tab=overdue" });
    const v = await searchPortal(kfAdmin, "malori yenye bima iliyoisha", "sw");
    expect(v.suggestions[0].href).toBe("/sw/portal/vehicles?status=expired");
  });

  it("does not offer partner finance to a merchant, or another company's cargo to a partner", async () => {
    const merchant = await as("ondi|amina.juma", ["merchant_user"], "acc_kariakoo_mart");
    expect((await searchPortal(merchant, "overdue invoices", "en")).suggestions).toHaveLength(0);
    const mz = await as("test|mz-ops", ["partner_ops"], MZ);
    const r = await searchPortal(mz, "unpaid invoices", "en");
    expect(r.suggestions).toHaveLength(0); // ops role has no finance
    const cargo = await searchPortal(mz, "delivered cargo", "en");
    expect(cargo.suggestions[0].href).toContain("/portal/cargo/all?view=delivered");
  });
});

describe("team member page", () => {
  it("shows and edits people in the partner's own company only", async () => {
    const m = await getMember(kfAdmin, "test|kf-clerk");
    expect(m?.m.name).toBe("KF Clerk");
    expect(await getMember(kfAdmin, "test|mz-ops")).toBeNull();
    await updateMember(kfAdmin, "test|kf-clerk", { name: "KF Clerk Two", phone: "+255712345678", locale: "sw", branchId: undefined });
    const [u] = await db.select().from(users).where(eq(users.id, "test|kf-clerk"));
    expect(u).toMatchObject({ name: "KF Clerk Two", phone: "+255712345678", locale: "sw" });
    await expect(updateMember(kfAdmin, "test|mz-ops", { name: "x y", phone: null, locale: "en", branchId: undefined })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("suspends and restores access, but never yourself or the last admin", async () => {
    await setMemberActive(kfAdmin, "test|kf-clerk", false);
    expect((await db.select().from(users).where(eq(users.id, "test|kf-clerk")))[0].active).toBe(false);
    await setMemberActive(kfAdmin, "test|kf-clerk", true);
    await expect(setMemberActive(kfAdmin, "test|kf-admin", false)).rejects.toMatchObject({ code: "SELF" });
    const other = await as("test|kf-clerk", ["partner_admin"], KF);
    await expect(setMemberActive(other, "test|kf-admin", false)).rejects.toMatchObject({ code: "LAST_ADMIN" });
  });
});

describe("CRM client page", () => {
  it("opens only the partner's own clients, lists their cargo, and archives them out of pickers", async () => {
    await db.delete(partnerClients).where(eq(partnerClients.partnerAccountId, KF));
    await saveClient(kfAdmin, { name: "Moshi Traders", contactName: "Asha", phone: null, email: null, tin: "", region: "Kilimanjaro", creditTermsDays: 14 });
    const [cl] = await db.select().from(partnerClients).where(eq(partnerClients.partnerAccountId, KF));
    const detail = await getClient(kfAdmin, cl.id);
    expect(detail?.c.name).toBe("Moshi Traders");
    expect(detail?.shipments.total).toBe(0);
    expect(await listCargo(kfAdmin, { view: "all", clientId: cl.id })).toEqual([]);
    const mz = await as("test|mz-ops", ["partner_admin"], MZ);
    expect(await getClient(mz, cl.id)).toBeNull();
    expect(await getClient(kfAdmin, "not-a-uuid")).toBeNull();
    await setClientActive(kfAdmin, cl.id, false);
    expect((await clientOptions(kfAdmin)).map((c) => c.id)).not.toContain(cl.id);
    await setClientActive(kfAdmin, cl.id, true);
    expect((await clientOptions(kfAdmin)).map((c) => c.id)).toContain(cl.id);
  });
});

describe("branches", () => {
  it("scopes branch staff to their branch, and lets company-wide staff pick only their own company's branches", async () => {
    await db.delete(branches).where(eq(branches.accountId, KF));
    await saveBranch(kfAdmin, branchSchema.parse({ name: "Head office", code: "hq", region: "Dar es Salaam" }));
    await saveBranch(kfAdmin, branchSchema.parse({ name: "Arusha", code: "ARK", region: "Arusha" }));
    await expect(saveBranch(kfAdmin, branchSchema.parse({ name: "Dup", code: "ark", region: "Arusha" }))).rejects.toMatchObject({ code: "DUPLICATE" });
    const [ark, hq] = await db.select().from(branches).where(eq(branches.accountId, KF)).orderBy(branches.code);
    expect([ark.code, hq.code]).toEqual(["ARK", "HQ"]);

    const mzBranch = (await db.insert(branches).values({ accountId: MZ, name: "Ubungo", code: "TUBG", region: "Dar es Salaam" }).onConflictDoNothing().returning())[0];
    expect(await effectiveBranch(kfAdmin, ark.id)).toBe(ark.id);
    if (mzBranch) expect(await effectiveBranch(kfAdmin, mzBranch.id)).toBeNull(); // another company's branch is ignored
    const bound = { ...(await as("test|kf-clerk", ["partner_ops"], KF)), branchId: ark.id };
    expect(await effectiveBranch(bound, hq.id)).toBe(ark.id); // can't look outside their branch
    expect((await listBranches(bound)).map((r) => r.b.id)).toEqual([ark.id]);

    // Vehicles and fleet figures follow the branch.
    const v1 = (await db.insert(vehicles).values({ accountId: KF, plate: "T 001 BRA", kind: "van", capacityKg: 900, branchId: ark.id }).onConflictDoNothing().returning())[0];
    const v2 = (await db.insert(vehicles).values({ accountId: KF, plate: "T 002 BRH", kind: "van", capacityKg: 900, branchId: hq.id }).onConflictDoNothing().returning())[0];
    const plates = (await vehicleOptions(bound)).map((v) => v.plate);
    expect(plates).toContain("T 001 BRA");
    expect(plates).not.toContain("T 002 BRH");
    const wide = (await vehicleOptions(kfAdmin)).map((v) => v.plate);
    expect(wide).toEqual(expect.arrayContaining(["T 001 BRA", "T 002 BRH"]));
    expect((await partnerDashboard(bound, null)).fleet.total).toBe(1);
    await db.delete(vehicles).where(sql`${vehicles.id} in (${v1?.id ?? null}, ${v2?.id ?? null})`);
    if (mzBranch) await db.delete(branches).where(eq(branches.id, mzBranch.id));
  });

  it("moves people between branches only within their company", async () => {
    const [ark] = await db.select().from(branches).where(and(eq(branches.accountId, KF), eq(branches.code, "ARK")));
    await updateMember(kfAdmin, "test|kf-clerk", { name: "KF Clerk Two", phone: null, locale: "en", branchId: ark.id });
    expect((await db.select().from(users).where(eq(users.id, "test|kf-clerk")))[0].branchId).toBe(ark.id);
    const other = (await db.insert(branches).values({ accountId: MZ, name: "Other", code: "TOTH", region: "Dar es Salaam" }).returning())[0];
    await expect(updateMember(kfAdmin, "test|kf-clerk", { name: "KF Clerk Two", phone: null, locale: "en", branchId: other.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const boundAdmin = { ...kfAdmin, branchId: ark.id };
    await expect(updateMember(boundAdmin, "test|kf-clerk", { name: "KF Clerk Two", phone: null, locale: "en", branchId: null })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await updateMember(kfAdmin, "test|kf-clerk", { name: "KF Clerk Two", phone: null, locale: "en", branchId: null });
    await db.delete(branches).where(eq(branches.id, other.id));
  });

  it("pages the cargo list and clamps a page past the end to the last page", async () => {
    const r = await pageCargo(kfAdmin, { view: "all", page: 999, pageSize: 5 });
    expect(r.page).toBe(r.pages);
    expect(r.rows.length).toBeLessThanOrEqual(5);
    expect(r.total).toBeGreaterThanOrEqual(r.rows.length);
  });
});
