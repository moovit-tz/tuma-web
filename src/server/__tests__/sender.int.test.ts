import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { accounts, agents, branches, customers, invoices, kybApplications, parcelPayments, paymentSettings, platformSettings, rolePermissions, roles, shipments, users } from "../db/schema";
import { driverContext, finishDriverLogin, swapHandoff, type DriverCtx } from "../services/drivers";
import { submitKyb } from "../services/kyb";
import { agentParcel, agentParcels, agentRequestPayment } from "../services/agent-parcels";
import { myParcels, priceDropOff, senderBook, senderCancel, senderParcel, tumaPoints } from "../services/sender";
import { verifyDriverToken } from "../auth/driver-token";
import { DEFAULT_ROLES } from "@/domain/roles";

const AGENT = "ondi|sender.test.agent";
const SENDER = "ondi|sender.test.person";
const RECEIVER = "ondi|sender.test.receiver";
const SUBS = [AGENT, SENDER, RECEIVER];

async function signIn(sub: string, name: string, phone: string): Promise<DriverCtx> {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const code = await finishDriverLogin({ sub, name, email: `${sub.split("|")[1]}@example.test`, phone, roles: [] }, challenge);
  const { token } = await swapHandoff(code, verifier);
  return (await driverContext(await verifyDriverToken(token)))!;
}

async function cleanup() {
  const apps = await db.select({ accountId: kybApplications.accountId }).from(kybApplications).where(inArray(kybApplications.userId, SUBS));
  const accts = [...new Set(apps.map((r) => r.accountId).filter((a): a is string => !!a))];
  await db.execute(sql`delete from kyb_events where application_id in (select id from kyb_applications where user_id in (${sql.join(SUBS.map((s) => sql`${s}`), sql`, `)}))`);
  await db.update(users).set({ accountId: null, branchId: null }).where(inArray(users.id, SUBS));
  await db.delete(kybApplications).where(inArray(kybApplications.userId, SUBS));
  if (accts.length) {
    const ids = sql`(select id from shipments where account_id in (${sql.join(accts.map((a) => sql`${a}`), sql`, `)}))`;
    for (const t of ["pieces", "events", "charge_snapshots", "cod_records", "exceptions", "notifications", "job_shipments", "tracking_otps"]) {
      await db.execute(sql`delete from ${sql.identifier(t)} where ${sql.identifier(t === "tracking_otps" ? "waybill" : "shipment_id")} in ${t === "tracking_otps" ? sql`(select waybill from shipments where account_id in (${sql.join(accts.map((a) => sql`${a}`), sql`, `)}))` : ids}`);
    }
    await db.delete(parcelPayments).where(inArray(parcelPayments.accountId, accts));
    await db.delete(invoices).where(inArray(invoices.accountId, accts));
    await db.delete(paymentSettings).where(inArray(paymentSettings.accountId, accts));
    await db.delete(shipments).where(inArray(shipments.accountId, accts));
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
  receiver: { name: "Neema Receiver", phone: "0754 909 101", region: "Dodoma", district: "Dodoma City", landmark: "Near the bus stand" },
  goods: "A box of books",
  weightKg: 3,
  declaredValue: 40000,
  noProhibited: true,
  ...over,
});

describe("sending a parcel as a person (no business)", () => {
  let agent: DriverCtx;
  let me: DriverCtx;
  let pointId: string;
  let waybill: string;

  it("finds Tuma points near the sender, nearest first, only pinned offices of parcel agents", async () => {
    agent = await signIn(AGENT, "Halima Point", "+255713500600");
    await submitKyb(agent, {
      businessName: "Halima Parcels",
      businessType: "sole_trader",
      tin: "818-272-636",
      office: { region: "Dar es Salaam", district: "Kinondoni", street: "Morogoro Rd", phone: "0713 500 600", lat: -6.78, lng: 39.24 },
      contact: { name: "Halima Point", phone: "0713 500 600" },
      workflow: ["receive", "deliver"],
      declaration: true,
    });
    agent = (await driverContext(AGENT))!;
    const [o] = await db.select({ id: branches.id }).from(branches).where(eq(branches.accountId, agent.user.accountId!));
    pointId = o.id;
    const { points } = await tumaPoints({ lat: "-6.80", lng: "39.25" });
    const p = points.find((x) => x.id === pointId)!;
    expect(p.business).toBe("Halima Parcels");
    expect(p.km).toBeLessThan(5);
    expect(points.map((x) => x.km)).toEqual([...points.map((x) => x.km)].sort((a, b) => a! - b!));
  });

  it("books ahead from the phone: waiting at the point, unpriced, with the sender as who booked it", async () => {
    me = await signIn(SENDER, "Rehema Person", "+255712300400");
    const r = await senderBook(me.user, booking(pointId));
    waybill = r.waybill;
    expect(r).toMatchObject({ state: "AWAITING_HANDOVER", direction: "sent", total: null, canCancel: true, payer: "sender", point: { id: pointId } });
    expect(r.sender).toMatchObject({ name: "Rehema Person", phone: "+255712300400" });
    const mine = await myParcels(me.user);
    expect(mine.parcels.find((p) => p.waybill === waybill)).toMatchObject({ direction: "sent", other: "Neema Receiver", total: null });
  });

  it("refuses a receiver with the sender's own number, and pay on delivery where the point doesn't take it", async () => {
    await expect(senderBook(me.user, booking(pointId, { receiver: { ...booking(pointId).receiver, phone: "0712 300 400" } }))).rejects.toMatchObject({ code: "SAME_PHONE" });
    await expect(senderBook(me.user, booking(pointId, { payer: "receiver" }))).rejects.toMatchObject({ code: "PAY_ON_DELIVERY_OFF" });
  });

  it("shows it to the receiver as coming to their number", async () => {
    const them = await signIn(RECEIVER, "Neema Receiver", "+255754909101");
    const r = await myParcels(them.user);
    expect(r.parcels.find((p) => p.waybill === waybill)).toMatchObject({ direction: "coming", other: "Rehema Person" });
    expect((await senderParcel(them.user, waybill)).canCancel).toBe(false);
  });

  it("lands in the point's Expected list; the counter prices it, then it comes in once paid", async () => {
    const list = await agentParcels(agent.user, { view: "expected" });
    expect(list.parcels.map((p: { waybill: string }) => p.waybill)).toContain(waybill);
    const before = await agentParcel(agent.user, waybill);
    expect(before.parcel).toMatchObject({ bookedAhead: true, needsPrice: true });
    expect(before.moves).not.toContain("RECEIVED");
    const priced = await priceDropOff(agent.user, waybill, { price: 9000, weightKg: 3.5 });
    expect(priced.parcel).toMatchObject({ total: 9000, awaitingPayment: true, needsPrice: false, state: "AWAITING_HANDOVER" });
    await expect(priceDropOff(agent.user, waybill, { price: 1 })).resolves.toBeTruthy(); // still in: the price can be corrected before payment
    await priceDropOff(agent.user, waybill, { price: 9000 });
    const paid = await agentRequestPayment(agent.user, waybill, { method: "cash" });
    expect(paid.parcel).toMatchObject({ state: "RECEIVED", paidWith: "cash" });
    expect((await senderParcel(me.user, waybill)).total).toBe(9000);
    await expect(senderCancel(me.user, waybill, { reason: "Changed my mind" })).rejects.toMatchObject({ code: "CANNOT_CANCEL" });
  });

  it("lets the sender cancel a booking that hasn't reached the point, with a reason", async () => {
    const r = await senderBook(me.user, booking(pointId, { goods: "A pair of shoes" }));
    await expect(senderCancel(me.user, r.waybill, { reason: "" })).rejects.toBeTruthy();
    const c = await senderCancel(me.user, r.waybill, { reason: "Sending it next week" });
    expect(c).toMatchObject({ state: "CANCELLED", canCancel: false });
  });
});
