import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { eq, inArray, like, sql } from "drizzle-orm";
import { db } from "../db/client";
import { accounts, agents, branches, kybApplications, outbox, platformSettings, rolePermissions, roles, shipments, teamInvites, users } from "../db/schema";
import { appMe, driverContext, finishDriverLogin, swapHandoff, type DriverCtx } from "../services/drivers";
import { applyKybDecision, submitKyb } from "../services/kyb";
import { acceptInvite, createInvite, createStaffRole, declineInvite, inviteByToken, invitesFor, resendInvite, revokeInvite, teamOverview } from "../services/team-invites";
import { addOffice, listOffices, officeDetail, updateOffice } from "../services/branches";
import { createParcel } from "../services/shipments";
import { parcelOrderSchema } from "@/domain/order-schema";
import { verifyDriverToken } from "../auth/driver-token";
import { DEFAULT_ROLES } from "@/domain/roles";

const OWNER = "ondi|team.test.owner";
const STAFF = "ondi|team.test.staff";
const OTHER = "ondi|team.test.other";
const LEGACY = "ondi|team.test.legacy";
const SUBS = [OWNER, STAFF, OTHER, LEGACY];

const pkce = () => {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
};
async function signIn(sub: string, extra: { name?: string; phone?: string } = {}): Promise<DriverCtx> {
  const { verifier, challenge } = pkce();
  const code = await finishDriverLogin({ sub, name: extra.name ?? "Test Person", phone: extra.phone, roles: [] }, challenge);
  const { token } = await swapHandoff(code, verifier);
  return (await driverContext(await verifyDriverToken(token)))!;
}
const ctxOf = async (sub: string) => (await driverContext(sub))!;
const userOf = async (sub: string) => (await ctxOf(sub)).user;
const tokenOf = (link: string) => link.split("/join/")[1];

const form = {
  businessName: "Neema Parcels",
  businessType: "sole_trader",
  tin: "222-333-444",
  office: { region: "Arusha", district: "Arusha City", street: "Sokoine Rd", phone: "0713 222 333" },
  contact: { name: "Neema Owner", phone: "0754 222 333" },
  workflow: ["receive", "deliver"],
  declaration: true,
};

async function cleanup() {
  const rows = await db.select({ accountId: users.accountId }).from(users).where(inArray(users.id, SUBS));
  const apps = await db.select({ accountId: kybApplications.accountId }).from(kybApplications).where(inArray(kybApplications.userId, SUBS));
  const accts = [...new Set([...rows, ...apps].map((r) => r.accountId).filter((a): a is string => !!a && a.startsWith("acc_agt_")))];
  if (accts.length) await db.delete(agents).where(inArray(agents.accountId, accts));
  await db.execute(sql`delete from kyb_events where application_id in (select id from kyb_applications where user_id in (${sql.join(SUBS.map((s) => sql`${s}`), sql`, `)}))`);
  await db.delete(teamInvites).where(inArray(teamInvites.invitedBy, SUBS));
  await db.update(users).set({ accountId: null, branchId: null }).where(inArray(users.id, SUBS));
  await db.delete(kybApplications).where(inArray(kybApplications.userId, SUBS));
  if (accts.length) {
    const ids = sql`(select id from shipments where account_id in (${sql.join(accts.map((a) => sql`${a}`), sql`, `)}))`;
    for (const t of ["pieces", "events", "charge_snapshots", "cod_records", "exceptions", "notifications", "job_shipments", "parcel_ratings"]) {
      await db.execute(sql`delete from ${sql.identifier(t)} where shipment_id in ${ids}`);
    }
    await db.delete(shipments).where(inArray(shipments.accountId, accts));
    await db.delete(agents).where(inArray(agents.accountId, accts));
    await db.delete(branches).where(inArray(branches.accountId, accts));
    await db.delete(accounts).where(inArray(accounts.id, accts));
  }
  await db.execute(sql`delete from driver_handoffs where user_id in (${sql.join(SUBS.map((s) => sql`${s}`), sql`, `)})`);
  await db.delete(users).where(inArray(users.id, SUBS));
}

let saved: typeof platformSettings.$inferSelect | undefined;
const setAllowance = (n: number) =>
  db.insert(platformSettings).values({ key: "pendingParcelAllowance", value: n }).onConflictDoUpdate({ target: platformSettings.key, set: { value: n } });

const parcel = () =>
  parcelOrderSchema.parse({
    serviceLevel: "standard",
    paymentTerms: "account",
    handoverMode: "pickup",
    deliveryMode: "door",
    shipper: { name: "Neema Parcels", phone: "0754222333", address: { region: "Arusha", district: "Arusha City" } },
    consignee: { name: "Rehema Test", phone: "0712345678", address: { region: "Arusha", district: "Arusha City", landmark: "Clock tower" } },
    goodsDescription: "Shoes",
    goodsCategory: "general",
    prohibitedDeclared: true,
    pieces: [{ weightKg: 1, lengthCm: 20, widthCm: 20, heightCm: 10 }],
  });

beforeAll(async () => {
  // The roles this flow uses, as the seed and migration 0003 leave them.
  for (const key of ["parcel_agent", "agent_staff"]) {
    const r = DEFAULT_ROLES.find((x) => x.key === key)!;
    await db.insert(roles).values({ key, name: r.name, description: r.description, surface: r.surface, system: true }).onConflictDoNothing();
    await db.insert(rolePermissions).values(r.permissions.map((p) => ({ roleKey: key, permission: p }))).onConflictDoNothing();
  }
  await cleanup();
  // A small allowance for parcels while under review; put back whatever was there afterwards.
  [saved] = await db.select().from(platformSettings).where(eq(platformSettings.key, "pendingParcelAllowance"));
  await setAllowance(2);
});

afterAll(async () => {
  await cleanup();
  if (saved) await setAllowance(saved.value as number);
  else await db.delete(platformSettings).where(eq(platformSettings.key, "pendingParcelAllowance"));
  await db.$client.end();
});

describe("setting up a business while it's reviewed, and inviting staff", () => {
  let accountId: string;
  let ref: string;

  it("opens a pending workspace at submission: head office, owner linked, set-up permissions only", async () => {
    const owner = await signIn(OWNER, { name: "Neema Owner" });
    const app = await submitKyb(owner, form);
    ref = app.ref;
    const [k] = await db.select().from(kybApplications).where(eq(kybApplications.ref, ref));
    accountId = k.accountId!;
    const [acct] = await db.select().from(accounts).where(eq(accounts.id, accountId));
    expect(acct).toMatchObject({ status: "pending", name: "Neema Parcels", partnerKind: "parcel_agent" });
    const [head] = await db.select().from(branches).where(eq(branches.accountId, accountId));
    expect(head).toMatchObject({ isHead: true, region: "Arusha", district: "Arusha City" });

    const ctx = await ctxOf(OWNER);
    expect(ctx.user.accountStatus).toBe("pending");
    // Set-up, plus parcel work up to the allowance. No wallet, finance or dispatch until approval.
    expect([...ctx.user.permissions].sort()).toEqual([
      "agent.workspace", "label.print", "partner.branches.manage", "partner.cargo.operate", "partner.cargo.read", "partner.clients.manage",
      "report.view", "shipment.collection", "shipment.create", "shipment.deliver", "shipment.fail_attempt", "shipment.receive", "team.manage",
    ]);
    const me = await appMe(ctx);
    // The app opens the agent home straight away.
    expect(me.modules).toEqual(expect.arrayContaining(["agent", "team", "offices"]));
    expect(me.account).toMatchObject({ status: "pending", trial: { allowance: 2, used: 0, remaining: 2 } });
    expect(me.agent).toMatchObject({ status: "pending", walletOpen: false, workflow: ["receive", "deliver"], office: { name: "Neema Parcels", region: "Arusha" } });
  });

  it("lets the owner add an office, with a code made from its name", async () => {
    const o = await addOffice(await userOf(OWNER), { name: "Neema Kijenge", region: "Arusha", district: "Arusha City", address: "Kijenge market", lat: -3.37, lng: 36.68 });
    expect(o.code).toBe("NEE2"); // head office already took NEE
    await expect(addOffice(await userOf(OWNER), { name: "X", region: "Nowhere", district: "", address: "" })).rejects.toThrow();
    // An office is a drop-off and collection point: it can't be saved without its pin.
    await expect(addOffice(await userOf(OWNER), { name: "No Pin", region: "Arusha", district: "Arusha City", address: "Somewhere" })).rejects.toThrow(/Pin the office/);
    // The owner isn't tied to an office: they count, and are listed, at the head office.
    const offices = await listOffices(await userOf(OWNER));
    const headOffice = offices.find((x) => x.isHead)!;
    expect(headOffice.staff).toBeGreaterThanOrEqual(1);
    expect(offices.find((x) => x.id === o.id)!.staff).toBe(0);
    expect((await officeDetail(await userOf(OWNER), headOffice.id)).staff.map((p) => p.id)).toContain(OWNER);
  });

  it("lets the owner move an office to a new pin, keeping its code; only its own offices", async () => {
    const owner = await userOf(OWNER);
    const o = await addOffice(owner, { name: "Moving Office", region: "Arusha", district: "Arusha City", address: "Old street", lat: -3.38, lng: 36.69 });
    const moved = await updateOffice(owner, o.id, { name: "Moving Office", region: "Dodoma", district: "Dodoma City", address: "Nyerere Sq", lat: -6.17, lng: 35.74 });
    expect(moved).toMatchObject({ code: o.code, region: "Dodoma", address: "Nyerere Sq", lat: -6.17, lng: 35.74 });
    const one = await officeDetail(owner, o.id);
    expect(one.office).toMatchObject({ id: o.id, name: "Moving Office", region: "Dodoma" });
    expect(one.stats).toMatchObject({ inHandTotal: 0, toCollect: 0, parcels30: 0 });
    expect(one.stats.days).toHaveLength(7);
    expect(one.staff).toEqual([]);
    const elsewhere = "00000000-0000-4000-8000-000000000000";
    await expect(updateOffice(owner, elsewhere, { name: "Mine", region: "Dodoma", district: "Dodoma City", address: "x x", lat: -6.17, lng: 35.74 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("invites by phone, texts the link, and refuses roles the company can't give", async () => {
    const owner = await userOf(OWNER);
    await expect(createInvite(owner, { name: "Juma", phone: "0712 000 111", roles: ["tuma_admin"] })).rejects.toMatchObject({ code: "UNKNOWN_ROLE" });
    const { id, link } = await createInvite(owner, { name: "Juma Staff", phone: "0712 000 111", roles: ["agent_staff"] });
    expect(link).toMatch(/\/sw\/join\/[A-Za-z0-9_-]{30,}$/);
    const [sms] = await db.select().from(outbox).where(like(outbox.idempotencyKey, `team-invite:${id}:%`));
    expect(sms.payload).toMatchObject({ template: "team.invite", to: "+255712000111", variables: { business: "Neema Parcels", link } });
    const team = await teamOverview(owner);
    expect(team.invites).toHaveLength(1);
    expect(team.roles.map((r) => r.key)).toContain("agent_staff");
    expect(team.roles.map((r) => r.key)).not.toContain("tuma_admin");
  });

  it("a resend replaces the link; revoking kills it", async () => {
    const owner = await userOf(OWNER);
    const first = await createInvite(owner, { name: "Asha", phone: "0765 111 222", roles: ["agent_staff"] });
    const second = await resendInvite(owner, first.id);
    expect(await inviteByToken(tokenOf(first.link))).toBeNull();
    expect(await inviteByToken(tokenOf(second.link))).toMatchObject({ business: "Neema Parcels", inviter: "Neema Owner", businessPending: true, status: "pending" });
    await revokeInvite(owner, first.id);
    expect(await inviteByToken(tokenOf(second.link))).toMatchObject({ status: "revoked" });
  });

  it("the invited person signs in with Ondi, sees the invitation by phone, and joins with its roles", async () => {
    const staff = await signIn(STAFF, { name: "Juma Staff", phone: "+255712000111" });
    const me = await appMe(staff);
    expect(me.invites).toHaveLength(1);
    expect(me.invites[0]).toMatchObject({ business: "Neema Parcels", roles: ["Office staff"], inviter: "Neema Owner" });

    // Someone else can't take it by id.
    const other = await signIn(OTHER, { phone: "+255799999999" });
    await expect(acceptInvite(other.user, { id: me.invites[0].id })).rejects.toMatchObject({ code: "NOT_FOUND" });

    await acceptInvite(staff.user, { id: me.invites[0].id });
    const [u] = await db.select().from(users).where(eq(users.id, STAFF));
    expect(u).toMatchObject({ accountId });
    expect(u.roles).toContain("agent_staff");
    expect(u.grantedRoles).toContain("agent_staff"); // survives the next Ondi sign-in
    // Under review, counter staff can handle parcels (within the allowance) but not manage the team.
    const perms = (await ctxOf(STAFF)).user.permissions;
    expect(perms.has("shipment.receive")).toBe(true);
    expect(perms.has("team.manage")).toBe(false);
    expect(await invitesFor(await userOf(STAFF))).toEqual([]);
    await expect(acceptInvite(await userOf(STAFF), { id: me.invites[0].id })).rejects.toMatchObject({ code: "ALREADY_JOINED" });
  });

  it("offers office staff, courier and store keeper; only the owner makes a custom kind of staff", async () => {
    const owner = await userOf(OWNER);
    const team = await teamOverview(owner);
    expect(team.roles.map((r) => r.key).slice(0, 3)).toEqual(["agent_staff", "agent_rider", "agent_storekeeper"]);
    expect(team.roles.map((r) => r.key)).not.toContain("partner_admin");
    expect(team).toMatchObject({ canCreateRole: true, grantable: expect.arrayContaining(["shipment.deliver"]) });
    // Running the team stays with the owner: it can't be given to a custom kind of staff.
    await expect(createStaffRole(owner, { name: "Cashier", permissions: ["team.manage"] })).rejects.toThrow();
    const role = await createStaffRole(owner, { name: "Cashier", permissions: ["partner.finance.manage", "report.view"] });
    expect(role).toMatchObject({ name: "Cashier", custom: true });
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(rolePermissions).where(eq(rolePermissions.roleKey, role.key));
    expect(n).toBe(5); // + the workspace and the business's parcels
    expect((await teamOverview(owner)).roles.find((r) => r.key === role.key)).toMatchObject({ custom: true });
    // Staff can't, even someone who may invite.
    await expect(createStaffRole(await userOf(STAFF), { name: "Boss", permissions: ["report.view"] })).rejects.toThrow();
  });

  it("accepting by link works for anyone holding it, once; declining closes it", async () => {
    const owner = await userOf(OWNER);
    const a = await createInvite(owner, { name: "Other", phone: "0688 123 456", roles: ["agent_staff"] });
    const other = await userOf(OTHER);
    await declineInvite(other, { token: tokenOf(a.link) });
    await expect(acceptInvite(other, { token: tokenOf(a.link) })).rejects.toMatchObject({ code: "CLOSED" });
    expect(await inviteByToken(tokenOf(a.link))).toMatchObject({ status: "declined" });
  });

  it("books parcels up to the allowance, then only finishes the ones in hand", async () => {
    const early = await userOf(OWNER); // loaded while parcels were left, like a request already in flight
    await createParcel(early, parcel());
    await createParcel(await userOf(STAFF), parcel());
    // The count is checked again, locked, when the parcel is written.
    await expect(createParcel(early, parcel())).rejects.toMatchObject({ code: "TRIAL_LIMIT" });
    // A fresh request no longer has the permission at all.
    await expect(createParcel(await userOf(OWNER), parcel())).rejects.toMatchObject({ code: "FORBIDDEN" });
    const owner = await ctxOf(OWNER);
    expect(owner.user.trial).toEqual({ allowance: 2, used: 2, remaining: 0 });
    expect(owner.user.permissions.has("shipment.create")).toBe(false);
    expect(owner.user.permissions.has("shipment.receive")).toBe(false);
    expect(owner.user.permissions.has("shipment.deliver")).toBe(true);
    // Raised in the portal: open again on the next request.
    await setAllowance(3);
    expect((await ctxOf(OWNER)).user.permissions.has("shipment.create")).toBe(true);
    // Set to 0 with parcels in hand: they can still be delivered.
    await setAllowance(0);
    const zero = (await ctxOf(OWNER)).user.permissions;
    expect(zero.has("shipment.create")).toBe(false);
    expect(zero.has("shipment.deliver")).toBe(true);
    await setAllowance(2);
  });

  it("approval activates the company: the owner and staff can work, no new sign-in", async () => {
    await applyKybDecision({ eventId: `team-approve-${Date.now()}`, ref, decision: "approved" });
    const [acct] = await db.select().from(accounts).where(eq(accounts.id, accountId));
    expect(acct.status).toBe("active");
    const owner = await ctxOf(OWNER);
    expect(owner.user.permissions.has("agent.workspace")).toBe(true);
    expect(owner.user.permissions.has("team.manage")).toBe(true);
    expect(owner.user.permissions.has("shipment.create")).toBe(true); // no limit once approved
    expect(owner.user.trial).toBeNull();
    const staff = await ctxOf(STAFF);
    expect(staff.user.permissions.has("agent.workspace")).toBe(true);
    expect(staff.user.permissions.has("shipment.receive")).toBe(true);
    expect(staff.user.permissions.has("team.manage")).toBe(false);
    // One head office, still the one opened at submission.
    expect((await db.select().from(branches).where(eq(branches.accountId, accountId))).filter((b) => b.isHead)).toHaveLength(1);
    expect((await db.select().from(agents).where(eq(agents.accountId, accountId))).length).toBe(1);
  });
});

describe("an application sent before workspaces existed", () => {
  it("gets its workspace at the next sign-in, so the owner lands on the business home", async () => {
    const owner = await signIn(LEGACY, { name: "Old Applicant" });
    const app = await submitKyb(owner, { ...form, businessName: "Legacy Parcels", tin: "555-666-777" });
    // Undo what submission now does, to look like an application from before.
    const [k] = await db.select().from(kybApplications).where(eq(kybApplications.ref, app.ref));
    await db.update(users).set({ accountId: null, roles: [], grantedRoles: [] }).where(eq(users.id, LEGACY));
    await db.update(kybApplications).set({ accountId: null }).where(eq(kybApplications.id, k.id));
    await db.delete(branches).where(eq(branches.accountId, k.accountId!));
    await db.delete(accounts).where(eq(accounts.id, k.accountId!));

    const ctx = await ctxOf(LEGACY);
    expect(ctx.user.accountStatus).toBe("pending");
    expect((await appMe(ctx)).modules).toContain("agent");
    const [again] = await db.select().from(kybApplications).where(eq(kybApplications.id, k.id));
    expect(again.accountId).toBe(ctx.user.accountId);
  });
});
