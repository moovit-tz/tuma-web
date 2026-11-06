import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { accounts, branches, kybApplications, rolePermissions, roles, users } from "../db/schema";
import { driverContext, finishDriverLogin, swapHandoff, type DriverCtx } from "../services/drivers";
import { submitKyb } from "../services/kyb";
import { deleteMyAccount } from "../services/account-deletion";
import { verifyDriverToken } from "../auth/driver-token";
import { DEFAULT_ROLES } from "@/domain/roles";

const SOLO = "ondi|delete.test.solo";
const SUBS = [SOLO];

async function signIn(sub: string, name = "Asha Delete"): Promise<DriverCtx> {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const code = await finishDriverLogin({ sub, name, email: "asha@example.test", phone: "+255711000999", roles: [] }, challenge);
  const { token } = await swapHandoff(code, verifier);
  return (await driverContext(await verifyDriverToken(token)))!;
}

const closed: string[] = [];
async function cleanup() {
  const apps = await db.select({ accountId: kybApplications.accountId }).from(kybApplications).where(inArray(kybApplications.userId, SUBS));
  const accts = [...new Set([...closed, ...apps.map((a) => a.accountId).filter((a): a is string => !!a)])];
  await db.execute(sql`delete from kyb_events where application_id in (select id from kyb_applications where user_id in (${sql.join(SUBS.map((s) => sql`${s}`), sql`, `)}))`);
  await db.update(users).set({ accountId: null }).where(inArray(users.id, SUBS));
  await db.delete(kybApplications).where(inArray(kybApplications.userId, SUBS));
  if (accts.length) {
    await db.delete(branches).where(inArray(branches.accountId, accts));
    await db.delete(accounts).where(inArray(accounts.id, accts));
  }
  await db.execute(sql`delete from driver_handoffs where user_id in (${sql.join(SUBS.map((s) => sql`${s}`), sql`, `)})`);
  await db.delete(users).where(inArray(users.id, SUBS));
}

beforeAll(async () => {
  const r = DEFAULT_ROLES.find((x) => x.key === "parcel_agent")!;
  await db.insert(roles).values({ key: r.key, name: r.name, description: r.description, surface: r.surface, system: true }).onConflictDoNothing();
  await db.insert(rolePermissions).values(r.permissions.map((p) => ({ roleKey: r.key, permission: p }))).onConflictDoNothing();
  await cleanup();
});
afterAll(async () => {
  await cleanup();
  await db.$client.end();
});

describe("deleting a Tuma account from the app", () => {
  let accountId: string;

  it("wipes their details, closes the business they alone applied for, and signs them out", async () => {
    const me = await signIn(SOLO);
    const app = await submitKyb(me, {
      businessName: "Asha Parcels",
      businessType: "sole_trader",
      tin: "111-222-999",
      office: { region: "Arusha", district: "Arusha City", street: "Sokoine Rd", phone: "0713 222 999" },
      contact: { name: "Asha Delete", phone: "0754 222 999" },
      workflow: ["receive"],
      declaration: true,
    });
    const ctx = (await driverContext(SOLO))!;
    accountId = ctx.user.accountId!;
    closed.push(accountId);
    await deleteMyAccount(ctx);

    const [u] = await db.select().from(users).where(eq(users.id, SOLO));
    expect(u).toMatchObject({ active: false, name: "Deleted user", email: null, phone: null, avatarUrl: null, roles: [], accountId: null });
    expect(u.deletedAt).toBeInstanceOf(Date);
    expect(await driverContext(SOLO)).toBeNull(); // every token stops working
    const [acct] = await db.select().from(accounts).where(eq(accounts.id, accountId));
    expect(acct.status).toBe("closed");
    const [k] = await db.select().from(kybApplications).where(eq(kybApplications.ref, app.ref));
    expect(k.status).toBe("rejected");
    expect(k.contact).toMatchObject({ name: "Deleted user", phone: "" });
  });

  it("signing in with Ondi again starts afresh, with nothing carried over", async () => {
    const again = await signIn(SOLO, "Asha New");
    expect(again.user.accountId).toBeNull();
    expect(again.user.permissions.size).toBe(0);
    const [u] = await db.select().from(users).where(eq(users.id, SOLO));
    expect(u).toMatchObject({ active: true, deletedAt: null, name: "Asha New", grantedRoles: [] });
  });

  it("applying again opens a new business, not the closed one", async () => {
    const me = (await driverContext(SOLO))!;
    await submitKyb(me, {
      businessName: "Asha Parcels Two",
      businessType: "sole_trader",
      tin: "111-222-998",
      office: { region: "Arusha", district: "Arusha City", street: "Sokoine Rd", phone: "0713 222 998" },
      contact: { name: "Asha New", phone: "0754 222 998" },
      workflow: ["receive"],
      declaration: true,
    });
    const ctx = (await driverContext(SOLO))!;
    expect(ctx.user.accountId).not.toBe(accountId);
    expect(ctx.user.accountStatus).toBe("pending");
  });
});
