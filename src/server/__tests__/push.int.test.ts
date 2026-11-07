import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { accounts, agents, branches, customers, invoices, kybApplications, outbox, parcelPayments, paymentSettings, platformSettings, pushDevices, rolePermissions, roles, users, walletEntries } from "../db/schema";
import { driverContext, finishDriverLogin, swapHandoff, type DriverCtx } from "../services/drivers";
import { submitKyb } from "../services/kyb";
import { priceDropOff, senderBook, senderParcel } from "../services/sender";
import { settleWalletTopUp, walletTopUp } from "../services/wallet";
import { flushHuduFeed, registerDevice, unregisterDevice } from "../services/push";
import { feedInbox } from "../adapters/hudufeed";
import { enqueue } from "../adapters/outbox";
import { render } from "../messages/templates";
import { agentRequestPayment } from "../services/agent-parcels";
import { verifyDriverToken } from "../auth/driver-token";
import { DEFAULT_ROLES } from "@/domain/roles";

const AGENT = "ondi|push.test.agent";
const SENDER = "ondi|push.test.sender";
const SUBS = [AGENT, SENDER];

async function signIn(sub: string, name: string, phone: string): Promise<DriverCtx> {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const code = await finishDriverLogin({ sub, name, email: `${sub.split("|")[1]}@example.test`, phone, roles: [] }, challenge);
  const { token } = await swapHandoff(code, verifier);
  return (await driverContext(await verifyDriverToken(token)))!;
}

async function cleanup() {
  const apps = await db.select({ accountId: kybApplications.accountId }).from(kybApplications).where(inArray(kybApplications.userId, SUBS));
  const mine = await db.select({ accountId: users.accountId }).from(users).where(inArray(users.id, SUBS));
  const accts = [...new Set([...apps, ...mine].map((r) => r.accountId).filter((a): a is string => !!a))];
  await db.delete(walletEntries).where(inArray(walletEntries.userId, SUBS));
  await db.delete(pushDevices).where(inArray(pushDevices.userId, SUBS));
  await db.execute(sql`delete from kyb_events where application_id in (select id from kyb_applications where user_id in (${sql.join(SUBS.map((s) => sql`${s}`), sql`, `)}))`);
  await db.update(users).set({ accountId: null, branchId: null }).where(inArray(users.id, SUBS));
  await db.delete(kybApplications).where(inArray(kybApplications.userId, SUBS));
  if (accts.length) {
    const list = sql.join(accts.map((a) => sql`${a}`), sql`, `);
    const ids = sql`(select id from shipments where account_id in (${list}))`;
    for (const t of ["pieces", "events", "charge_snapshots", "cod_records", "exceptions", "notifications", "job_shipments", "parcel_ratings", "wallet_entries"]) {
      await db.execute(sql`delete from ${sql.identifier(t)} where shipment_id in ${ids}`);
    }
    await db.execute(sql`delete from tracking_otps where waybill in (select waybill from shipments where account_id in (${list}))`);
    await db.delete(parcelPayments).where(inArray(parcelPayments.accountId, accts));
    await db.delete(invoices).where(inArray(invoices.accountId, accts));
    await db.delete(paymentSettings).where(inArray(paymentSettings.accountId, accts));
    await db.execute(sql`delete from shipments where account_id in (${list})`);
    await db.delete(customers).where(inArray(customers.accountId, accts));
    await db.delete(agents).where(inArray(agents.accountId, accts));
    await db.delete(branches).where(inArray(branches.accountId, accts));
    await db.delete(accounts).where(inArray(accounts.id, accts));
  }
  await db.execute(sql`delete from driver_handoffs where user_id in (${sql.join(SUBS.map((s) => sql`${s}`), sql`, `)})`);
  await db.delete(users).where(inArray(users.id, SUBS));
}

beforeAll(async () => {
  delete process.env.HUDUPAY_URL;
  const r = DEFAULT_ROLES.find((x) => x.key === "parcel_agent")!;
  await db.insert(roles).values({ key: r.key, name: r.name, description: r.description, surface: r.surface, system: true }).onConflictDoNothing();
  await db.insert(rolePermissions).values(r.permissions.map((p) => ({ roleKey: r.key, permission: p }))).onConflictDoNothing();
  await db.insert(platformSettings).values({ key: "pendingParcelAllowance", value: 20 }).onConflictDoUpdate({ target: platformSettings.key, set: { value: 20 } });
  await cleanup();
});
afterAll(async () => {
  await cleanup();
  await db.$client.end();
});

const booking = (dropOffId: string, over: Record<string, unknown> = {}) => ({
  dropOffId,
  receiver: { name: "Neema Receiver", phone: "0754 909 333", region: "Dodoma", district: "Dodoma City", landmark: "Near the bus stand" },
  goods: "A box of books",
  weightKg: 2,
  declaredValue: 30000,
  noProhibited: true,
  paidWith: "wallet",
  ...over,
});

/** Tops up and settles it as HuduPay's callback would. */
async function topUp(me: DriverCtx, amount: number) {
  const { topUp: t } = await walletTopUp(me.user, { amount, phone: "0712 300 888" });
  const [e] = await db.select({ reference: walletEntries.reference }).from(walletEntries).where(eq(walletEntries.id, t.id));
  await settleWalletTopUp(e.reference, "SUCCESS", null);
  return t.id;
}

const TOKEN_ME = "fcm-token-sender-" + "x".repeat(40);
const TOKEN_AGENT = "fcm-token-agent-" + "y".repeat(40);
const pushesTo = (token: string) => feedInbox.filter((m) => m.channel === "push" && m.to === token);

describe("push notifications and message delivery", () => {
  let agent: DriverCtx;
  let me: DriverCtx;
  let pointId: string;

  it("puts finished text in the person's language, with a fallback for unknown templates", () => {
    expect(render("parcel.tracking_code", "sw", { code: "123456", waybill: "ABW010" }).body).toContain("namba yako ya kifurushi ABW010 ni 123456");
    expect(render("push.parcel_state", "en", { waybill: "ABW010", state: "OUT_FOR_DELIVERY" })).toEqual({ title: "Parcel ABW010", body: "Out for delivery" });
    expect(render("no.such", "en", { waybill: "ABW010" }).body).toBe("Tuma: no.such ABW010");
  });

  it("registers phones; a token follows whoever signed in last, and signing out removes it", async () => {
    agent = await signIn(AGENT, "Juma Push", "+255713500888");
    await submitKyb(agent, {
      businessName: "Juma Push Parcels",
      businessType: "sole_trader",
      tin: "818-272-888",
      office: { region: "Dar es Salaam", district: "Temeke", street: "Kilwa Rd", phone: "0713 500 888", lat: -6.85, lng: 39.27 },
      contact: { name: "Juma Push", phone: "0713 500 888" },
      workflow: ["receive", "deliver"],
      declaration: true,
    });
    await db.update(accounts).set({ status: "active" }).where(eq(accounts.id, (await driverContext(AGENT))!.user.accountId!));
    agent = (await driverContext(AGENT))!;
    [{ id: pointId }] = await db.select({ id: branches.id }).from(branches).where(eq(branches.accountId, agent.user.accountId!));
    me = await signIn(SENDER, "Rehema Push", "+255712300888");
    await db.update(users).set({ locale: "sw" }).where(eq(users.id, AGENT));
    await db.update(users).set({ locale: "en" }).where(eq(users.id, SENDER));
    await registerDevice(agent.user, { token: TOKEN_ME });
    await registerDevice(me.user, { token: TOKEN_ME, appVersion: "1.0.0" });
    await registerDevice(agent.user, { token: TOKEN_AGENT });
    const rows = await db.select().from(pushDevices).where(inArray(pushDevices.userId, SUBS));
    expect(rows.find((r) => r.token === TOKEN_ME)?.userId).toBe(SENDER);
    expect(rows).toHaveLength(2);
    await unregisterDevice(me.user, { token: TOKEN_AGENT }); // not mine: nothing happens
    expect(await db.select().from(pushDevices).where(inArray(pushDevices.userId, SUBS))).toHaveLength(2);
  });

  it("booking at a point pushes its team; each step pushes the sender; a top-up pushes the balance", async () => {
    const b = await senderBook(me.user, booking(pointId, { paidWith: "at_point" }));
    await flushHuduFeed(500);
    expect(pushesTo(TOKEN_AGENT).at(-1)).toMatchObject({ data: { type: "agent_parcel", waybill: b.waybill } });
    expect(pushesTo(TOKEN_AGENT).at(-1)!.title).toMatch(/^Kifurushi kipya kimesajiliwa /); // the team's language
    expect(pushesTo(TOKEN_AGENT).at(-1)!.message).toContain(b.waybill);
    await priceDropOff(agent.user, b.waybill, { price: 5000 });
    await agentRequestPayment(agent.user, b.waybill, { method: "cash" });
    await flushHuduFeed(500);
    const mine = pushesTo(TOKEN_ME);
    expect(mine.some((m) => m.title === `Parcel ${b.waybill}` && m.message === "Received at the Tuma point")).toBe(true);
    // The receipt SMS went out as text too.
    expect(feedInbox.some((m) => m.channel === "sms" && m.to === "+255712300888" && m.message.includes(b.waybill) && m.message.includes("5,000"))).toBe(true);

    const { topUp: t } = await walletTopUp(me.user, { amount: 5000, phone: "0712 300 888" });
    const [e] = await db.select({ reference: walletEntries.reference }).from(walletEntries).where(eq(walletEntries.id, t.id));
    await settleWalletTopUp(e.reference, "SUCCESS", null);
    await flushHuduFeed(500);
    expect(pushesTo(TOKEN_ME).at(-1)).toMatchObject({ title: "Wallet topped up", message: "TZS 5,000 is in your Tuma wallet. Balance: TZS 5,000.", data: { type: "wallet" } });
  });

  it("sends each message once, and never yesterday's", async () => {
    const before = feedInbox.length;
    await flushHuduFeed(500);
    expect(feedInbox.length).toBe(before);
    await db.transaction((tx) =>
      enqueue(tx, { target: "hudufeed", topic: "notification.request", idempotencyKey: `push-test-old:${Date.now()}`, payload: { template: "parcel.delivered", channel: "sms", to: "+255712300888", language: "en", variables: { waybill: "OLD001" } } }),
    );
    await db.update(outbox).set({ createdAt: new Date(Date.now() - 2 * 86400_000) }).where(sql`${outbox.idempotencyKey} like 'push-test-old:%'`);
    await flushHuduFeed(500);
    expect(feedInbox.slice(before).some((m) => m.message.includes("OLD001"))).toBe(false);
    await db.delete(outbox).where(sql`${outbox.idempotencyKey} like 'push-test-old:%'`);
  });
});
