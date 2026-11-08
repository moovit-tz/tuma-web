import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { accounts, agents, branches, customers, invoices, kybApplications, parcelPayments, paymentSettings, platformSettings, rolePermissions, roles, users, walletEntries } from "../db/schema";
import { appMe, driverContext, finishDriverLogin, swapHandoff, type DriverCtx } from "../services/drivers";
import { setUpSender } from "../services/sender-profile";
import { submitKyb } from "../services/kyb";
import { agentCancel, agentParcel } from "../services/agent-parcels";
import { priceDropOff, senderBook, senderNotifications, senderParcel } from "../services/sender";
import { myWallet, payFromWallet, settleWalletTopUp, walletTopUp, walletTopUpStatus } from "../services/wallet";
import { verifyDriverToken } from "../auth/driver-token";
import { DEFAULT_ROLES } from "@/domain/roles";

const AGENT = "ondi|wallet.test.agent";
const SENDER = "ondi|wallet.test.sender";
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
  receiver: { name: "Neema Receiver", phone: "0754 909 222", region: "Dodoma", district: "Dodoma City", landmark: "Near the bus stand" },
  goods: "A box of books",
  weightKg: 2,
  declaredValue: 30000,
  noProhibited: true,
  paidWith: "wallet",
  ...over,
});

/** Tops up and settles it as HuduPay's callback would. */
async function topUp(me: DriverCtx, amount: number) {
  const { topUp: t } = await walletTopUp(me.user, { amount, phone: "0712 300 777" });
  const [e] = await db.select({ reference: walletEntries.reference }).from(walletEntries).where(eq(walletEntries.id, t.id));
  await settleWalletTopUp(e.reference, "SUCCESS", null);
  return t.id;
}

describe("a sender's Tuma wallet", () => {
  let agent: DriverCtx;
  let me: DriverCtx;
  let pointId: string;

  it("tops up by mobile money: pending until HuduPay confirms, then in the balance once", async () => {
    agent = await signIn(AGENT, "Zawadi Point", "+255713500777");
    await submitKyb(agent, {
      businessName: "Zawadi Parcels",
      businessType: "sole_trader",
      tin: "818-272-777",
      office: { region: "Dar es Salaam", district: "Ilala", street: "Uhuru St", phone: "0713 500 777", lat: -6.81, lng: 39.27 },
      contact: { name: "Zawadi Point", phone: "0713 500 777" },
      workflow: ["receive", "deliver"],
      declaration: true,
    });
    agent = (await driverContext(AGENT))!;
    await db.update(accounts).set({ status: "active" }).where(eq(accounts.id, agent.user.accountId!));
    agent = (await driverContext(AGENT))!;
    [{ id: pointId }] = await db.select({ id: branches.id }).from(branches).where(eq(branches.accountId, agent.user.accountId!));

    me = await signIn(SENDER, "Rehema Wallet", "+255712300777");
    expect(await myWallet(me.user)).toMatchObject({ balance: 0, pending: 0, phone: "+255712300777" });
    const { topUp: t } = await walletTopUp(me.user, { amount: 20000, phone: "0712 300 777" });
    expect(t).toMatchObject({ kind: "topup", status: "pending", amount: 20000, phone: "+255712300777" });
    expect(await myWallet(me.user)).toMatchObject({ balance: 0, pending: 20000 });
    expect((await walletTopUpStatus(me.user, t.id)).topUp.status).toBe("pending");
    const [e] = await db.select({ reference: walletEntries.reference }).from(walletEntries).where(eq(walletEntries.id, t.id));
    await settleWalletTopUp(e.reference, "SUCCESS", null);
    await settleWalletTopUp(e.reference, "SUCCESS", null);
    expect(await myWallet(me.user)).toMatchObject({ balance: 20000, pending: 0 });
    expect((await walletTopUpStatus(me.user, t.id)).balance).toBe(20000);
  });

  it("refuses foreign numbers, amounts out of range, and someone else's top-up", async () => {
    await expect(walletTopUp(me.user, { amount: 5000, phone: "+254712345678" })).rejects.toMatchObject({ code: "BAD_PHONE" });
    await expect(walletTopUp(me.user, { amount: 500, phone: "0712 300 777" })).rejects.toThrow();
    const { topUp: t } = await walletTopUp(me.user, { amount: 5000, phone: "0712 300 777" });
    await expect(walletTopUpStatus(agent.user, t.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const [e] = await db.select({ reference: walletEntries.reference }).from(walletEntries).where(eq(walletEntries.id, t.id));
    await settleWalletTopUp(e.reference, "FAILED", "Cancelled by the payer");
    expect(await myWallet(me.user)).toMatchObject({ balance: 20000, pending: 0 });
  });

  it("booked from the wallet: paid and received the moment the point prices it", async () => {
    const b = await senderBook(me.user, booking(pointId));
    expect(b).toMatchObject({ fromWallet: true, paid: false, total: null });
    const r = await priceDropOff(agent.user, b.waybill, { price: 7000 });
    expect(r.parcel).toMatchObject({ state: "RECEIVED", paidWith: "wallet" });
    expect(await senderParcel(me.user, b.waybill)).toMatchObject({ paid: true, paidWith: "wallet", total: 7000, canPayFromWallet: false });
    const w = await myWallet(me.user);
    expect(w.balance).toBe(13000);
    expect(w.entries[0]).toMatchObject({ kind: "parcel", amount: -7000, waybill: b.waybill });
  });

  it("when the wallet is short it waits for payment; top up, then pay from the parcel", async () => {
    const b = await senderBook(me.user, booking(pointId));
    const r = await priceDropOff(agent.user, b.waybill, { price: 15000 });
    expect(r.parcel).toMatchObject({ state: "AWAITING_HANDOVER", awaitingPayment: true });
    expect(await senderParcel(me.user, b.waybill)).toMatchObject({ total: 15000, paid: false, canPayFromWallet: true });
    await expect(payFromWallet(me.user, b.waybill)).rejects.toMatchObject({ code: "LOW_BALANCE" });
    await expect(payFromWallet(agent.user, b.waybill)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await topUp(me, 5000);
    expect(await payFromWallet(me.user, b.waybill)).toEqual({ balance: 3000 });
    expect((await agentParcel(agent.user, b.waybill)).parcel).toMatchObject({ state: "RECEIVED", paidWith: "wallet" });
    await expect(payFromWallet(me.user, b.waybill)).rejects.toMatchObject({ code: "ALREADY_PAID" });
  });

  it("a parcel paid from the wallet and cancelled at the point goes back into the wallet, once", async () => {
    const b = await senderBook(me.user, booking(pointId));
    await topUp(me, 10000);
    await priceDropOff(agent.user, b.waybill, { price: 6000 });
    expect((await myWallet(me.user)).balance).toBe(7000);
    const c = await agentCancel(agent.user, b.waybill, { reasonCode: "CN01" });
    expect(c).toMatchObject({ refundDue: 0, refundedToWallet: 6000 });
    const w = await myWallet(me.user);
    expect(w.balance).toBe(13000);
    expect(w.entries[0]).toMatchObject({ kind: "refund", amount: 6000, waybill: b.waybill });
  });

  it("notifies the sender of the point's moves on their parcels and of their wallet, not of their own steps", async () => {
    const { notifications: n } = await senderNotifications(me.user);
    const parcel = n.filter((x) => x.kind === "parcel");
    expect(parcel.length).toBeGreaterThan(0);
    const got = parcel.find((x) => x.state === "RECEIVED" && x.direction === "sent");
    // Enough to say it in words: who it's for and which point has it.
    expect(got).toMatchObject({ receiver: expect.any(String), point: expect.any(String) });
    expect(parcel.some((x) => x.state === "CREATED")).toBe(false);
    const money = n.filter((x) => x.kind === "wallet");
    expect(money.some((x) => x.entry === "topup" && x.amount === 20000)).toBe(true);
    expect(money.some((x) => x.entry === "refund" && x.amount === 6000)).toBe(true);
    expect(money.some((x) => x.entry === "parcel" && x.amount === 7000)).toBe(true);
    expect([...n].sort((a, b) => (a.at < b.at ? 1 : -1)).map((x) => x.id)).toEqual(n.map((x) => x.id));
    expect((await senderNotifications(agent.user)).notifications.some((x) => x.kind === "wallet")).toBe(false);
  });

  it("sets up as a sender: area and language kept, the phone left as Ondi has it, shown by /me", async () => {
    await expect(setUpSender(me.user, { region: "Atlantis" })).rejects.toThrow();
    const r = await setUpSender(me.user, { region: "Dar es Salaam", district: "Kinondoni", language: "sw", phone: "0700 000 000" });
    expect(r).toMatchObject({ sender: { region: "Dar es Salaam", district: "Kinondoni" }, phone: "+255712300777" });
    me = (await driverContext(SENDER))!;
    const m = await appMe(me);
    expect(m.sender).toMatchObject({ region: "Dar es Salaam", district: "Kinondoni" });
    expect(m.user.locale).toBe("sw");
    // Set up again later: the date it started stays.
    const again = await setUpSender(me.user, { region: "Arusha" });
    expect(again.sender.since).toBe(r.sender.since);
  });

  it("paying at the point still works as before", async () => {
    const b = await senderBook(me.user, booking(pointId, { paidWith: "at_point" }));
    const r = await priceDropOff(agent.user, b.waybill, { price: 4000 });
    expect(r.parcel).toMatchObject({ state: "AWAITING_HANDOVER", awaitingPayment: true });
    expect((await myWallet(me.user)).balance).toBe(13000);
  });
});
