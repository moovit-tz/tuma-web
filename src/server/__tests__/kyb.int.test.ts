import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { eq, like, sql } from "drizzle-orm";
import { db } from "../db/client";
import { accounts, agents, branches, kybApplications, outbox, users } from "../db/schema";
import { appMe, driverContext, finishDriverLogin, swapHandoff, type DriverCtx } from "../services/drivers";
import { applyKybDecision, businessOnTuma, myKyb, submitKyb } from "../services/kyb";
import { verifyDriverToken } from "../auth/driver-token";

const SUB = "ondi|kyb.test.owner";

const pkce = () => {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
};
async function signIn(sub: string, roles: string[] = []): Promise<DriverCtx> {
  const { verifier, challenge } = pkce();
  const code = await finishDriverLogin({ sub, name: "Mwanaidi Kombo", roles }, challenge);
  const { token } = await swapHandoff(code, verifier);
  return (await driverContext(await verifyDriverToken(token)))!;
}

const form = (over: Record<string, unknown> = {}) => ({
  businessName: "Kombo Parcels",
  businessType: "sole_trader",
  tin: "123-456-789",
  licenceNumber: "",
  office: { region: "Dar es Salaam", district: "Kinondoni", street: "Shekilango Rd", landmark: "Opposite Sinza Mori", phone: "0713 444 555" },
  contact: { name: "Mwanaidi Kombo", phone: "0754111222", email: "" },
  workflow: ["deliver", "receive", "receive"],
  declaration: true,
  ...over,
});

let ctx: DriverCtx;
let eventN = 0;
const decide = (ref: string, decision: string, note?: string) => applyKybDecision({ eventId: `test-${Date.now()}-${++eventN}`, ref, decision, note });

beforeAll(async () => {
  const [u] = await db.select({ accountId: users.accountId }).from(users).where(eq(users.id, SUB));
  await db.execute(sql`delete from kyb_events where application_id in (select id from kyb_applications where user_id = ${SUB})`);
  if (u?.accountId) {
    await db.delete(agents).where(eq(agents.accountId, u.accountId));
    await db.update(users).set({ accountId: null }).where(eq(users.id, SUB));
    await db.delete(branches).where(eq(branches.accountId, u.accountId));
  }
  await db.delete(kybApplications).where(eq(kybApplications.userId, SUB));
  await db.execute(sql`delete from accounts a where a.id like 'acc_agt_%' and not exists (select 1 from agents g where g.account_id = a.id) and not exists (select 1 from branches b where b.account_id = a.id) and not exists (select 1 from users x where x.account_id = a.id) and not exists (select 1 from kyb_applications k where k.account_id = a.id)`);
  await db.execute(sql`delete from driver_handoffs where user_id = ${SUB}`);
  await db.delete(users).where(eq(users.id, SUB));
  ctx = await signIn(SUB);
});

afterAll(async () => {
  await db.$client.end();
});

describe("parcel agent self-onboarding (KYB)", () => {
  it("routes a new Ondi user to account setup: no account, no application", async () => {
    const me = await appMe(ctx);
    expect(me.account).toBeNull();
    expect(me.onboarding).toBeNull();
    expect(me.modules).not.toContain("agent");
  });

  it("validates the TIN, phones and declaration with field-level errors", async () => {
    await expect(submitKyb(ctx, form({ tin: "12345" }))).rejects.toMatchObject({ issues: expect.arrayContaining([expect.objectContaining({ path: ["tin"] })]) });
    await expect(submitKyb(ctx, form({ declaration: false }))).rejects.toBeTruthy();
    await expect(submitKyb(ctx, form({ workflow: [] }))).rejects.toBeTruthy();
    await expect(submitKyb(ctx, form({ licenceFile: "../../etc/passwd" }))).rejects.toBeTruthy();
  });

  it("submits to ComplyOS, normalises the answers and texts the applicant", async () => {
    const a = await submitKyb(ctx, form());
    expect(a.status).toBe("submitted");
    expect(a.ref).toMatch(/^KYB-\d{4}-[0-9A-Z]{5}$/);
    expect(a.application.tin).toBe("123456789");
    expect(a.application.workflow).toEqual(["receive", "deliver"]);
    expect(a.application.office.phone).toBe("+255713444555");
    const msgs = await db.select().from(outbox).where(like(outbox.idempotencyKey, `%${a.ref}%`));
    expect(msgs.map((m) => `${m.target}:${m.topic}`).sort()).toEqual(["complyos:kyb.submitted", "hudufeed:notify.send"]);
    expect(msgs.find((m) => m.target === "complyos")!.payload).toMatchObject({ externalRef: a.ref, business: { tin: "123456789" } });
    await expect(submitKyb(ctx, form())).rejects.toMatchObject({ code: "ALREADY_SUBMITTED" });
    expect((await appMe(ctx)).onboarding).toMatchObject({ ref: a.ref, status: "submitted" });
  });

  it("lets the applicant fix and resubmit when ComplyOS asks for more information", async () => {
    const { ref } = (await myKyb(ctx))!;
    await decide(ref, "in_review");
    const r = await decide(ref, "needs_info", "The TIN belongs to another business. Check it.");
    expect(r.status).toBe("needs_info");
    const mine = (await myKyb(ctx))!;
    expect(mine).toMatchObject({ status: "needs_info", canEdit: true, note: "The TIN belongs to another business. Check it." });
    const again = await submitKyb(ctx, form({ tin: "987654321" }));
    expect(again).toMatchObject({ ref, status: "submitted", version: 2, note: null });
    expect(again.events.map((e) => e.status)).toEqual(["submitted", "in_review", "needs_info", "submitted"]);
  });

  it("on approval opens the account, head office, role, wallet and SEAL site, once", async () => {
    const { ref } = (await myKyb(ctx))!;
    const eventId = `test-approve-${Date.now()}`;
    const r = await applyKybDecision({ eventId, ref, decision: "approved" });
    expect(r.status).toBe("approved");
    const dup = await applyKybDecision({ eventId, ref, decision: "approved" });
    expect(dup).toMatchObject({ duplicate: true });
    // A late "rejected" can't undo an approval.
    expect(await decide(ref, "rejected", "late")).toMatchObject({ status: "approved", ignored: true });

    const accountId = r.accountId!;
    const [acct] = await db.select().from(accounts).where(eq(accounts.id, accountId));
    expect(acct).toMatchObject({ type: "partner", partnerKind: "parcel_agent", name: "Kombo Parcels", tin: "987654321" });
    const [agent] = await db.select().from(agents).where(eq(agents.accountId, accountId));
    expect(agent).toMatchObject({ ownerId: SUB, workflow: ["receive", "deliver"], commissionBps: 1000 });
    const [branch] = await db.select().from(branches).where(eq(branches.id, agent.branchId));
    expect(branch).toMatchObject({ accountId, isHead: true, region: "Dar es Salaam", code: "KOM" });
    const keys = (await db.select({ k: outbox.idempotencyKey, t: outbox.target }).from(outbox).where(like(outbox.idempotencyKey, `%${accountId}%`))).map((m) => m.t).sort();
    expect(keys).toEqual(["crm", "finops"]);
    expect((await db.select().from(outbox).where(eq(outbox.idempotencyKey, `seal-site:${branch.id}`))).length).toBe(1);

    // The app now opens the agent workspace: checked by permission, not role name.
    ctx = (await driverContext(SUB))!;
    expect(ctx.user.permissions.has("agent.workspace")).toBe(true);
    const me = await appMe(ctx);
    expect(me.modules).toContain("agent");
    expect(me.account).toMatchObject({ id: accountId, kind: "parcel_agent" });
    expect(me.agent).toMatchObject({ workflow: ["receive", "deliver"], commissionBps: 1000, walletOpen: false, office: { region: "Dar es Salaam" } });
    await expect(submitKyb(ctx, form())).rejects.toMatchObject({ code: "ALREADY_APPROVED" });
  });

  it("keeps the role Tuma granted when real Ondi signs the owner in with a fresh claim", async () => {
    const before = process.env.ONDI_MODE;
    process.env.ONDI_MODE = "oidc";
    try {
      const c = await signIn(SUB, ["some_ondi_role"]);
      expect(c.user.roles).toEqual(expect.arrayContaining(["some_ondi_role", "parcel_agent"]));
      expect(c.user.permissions.has("agent.workspace")).toBe(true);
    } finally {
      process.env.ONDI_MODE = before;
    }
  });

  it("knows a business already on Tuma by its TIN, and sends a second applicant to its owner", async () => {
    const OTHER = "ondi|kyb.test.second";
    await db.delete(kybApplications).where(eq(kybApplications.userId, OTHER));
    const second = await signIn(OTHER);
    // The approved Kombo Parcels has TIN 987-654-321.
    expect(await businessOnTuma(OTHER, { tin: "987 654 321" })).toMatchObject({ taken: true, name: "Kombo Parcels" });
    expect(await businessOnTuma(OTHER, { tin: "111-111-112" })).toMatchObject({ taken: false });
    // The owner's own business isn't "someone else's".
    expect((await businessOnTuma(SUB, { regNo: "none" })).taken).toBe(false);
    await expect(submitKyb(second, form({ tin: "987654321" }))).rejects.toMatchObject({ code: "BUSINESS_ON_TUMA" });
    await db.execute(sql`delete from driver_handoffs where user_id = ${OTHER}`);
    await db.delete(users).where(eq(users.id, OTHER));
  });
});
