import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { accounts, agents, branches, customerReports, customers, events, invoices, kybApplications, notifications, outbox, parcelPayments, paymentSettings, platformSettings, rolePermissions, roles, shipments, users } from "../db/schema";
import { settlePayment } from "../services/counter-payments";
import { driverContext, finishDriverLogin, swapHandoff, type DriverCtx } from "../services/drivers";
import { submitKyb } from "../services/kyb";
import { invoiceDetail, paymentDetail, paymentRecords, paymentSettingsFor, requestMomoSetup, updatePaymentSettings } from "../services/agent-payments";
import { agentBook, agentMove, agentNotifications, agentParcel, agentParcels, agentPaymentStatus, agentReport, agentReportCsv, agentRequestPayment, agentSummary, collectionPoints } from "../services/agent-parcels";
import { verifyDriverToken } from "../auth/driver-token";
import { devReceiverCode } from "../services/tracking";
import { DEFAULT_ROLES } from "@/domain/roles";
import { getSetting } from "../settings";
import { agentCustomers, customerProfile, deleteCustomer, dismissDuplicates, reportCustomer, updateCustomer, duplicateCustomers, mergeCustomers, rememberCustomers } from "../services/customers";

const OWNER = "ondi|agent.parcels.owner";
const SUBS = [OWNER];

async function signIn(sub: string): Promise<DriverCtx> {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const code = await finishDriverLogin({ sub, name: "Juma Counter", email: "juma@example.test", phone: "+255711000777", roles: [] }, challenge);
  const { token } = await swapHandoff(code, verifier);
  return (await driverContext(await verifyDriverToken(token)))!;
}

async function cleanup() {
  const rows = await db.select({ accountId: users.accountId }).from(users).where(inArray(users.id, SUBS));
  const apps = await db.select({ accountId: kybApplications.accountId }).from(kybApplications).where(inArray(kybApplications.userId, SUBS));
  const accts = [...new Set([...rows, ...apps].map((r) => r.accountId).filter((a): a is string => !!a))];
  await db.execute(sql`delete from kyb_events where application_id in (select id from kyb_applications where user_id in (${sql.join(SUBS.map((s) => sql`${s}`), sql`, `)}))`);
  await db.update(users).set({ accountId: null, branchId: null }).where(inArray(users.id, SUBS));
  await db.delete(kybApplications).where(inArray(kybApplications.userId, SUBS));
  if (accts.length) {
    const ids = sql`(select id from shipments where account_id in (${sql.join(accts.map((a) => sql`${a}`), sql`, `)}))`;
    for (const t of ["pieces", "events", "charge_snapshots", "cod_records", "exceptions", "notifications", "job_shipments", "parcel_ratings"]) {
      await db.execute(sql`delete from ${sql.identifier(t)} where shipment_id in ${ids}`);
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

const booking = (over: Record<string, unknown> = {}) => ({
  sender: { name: "Rehema Sender", phone: "0712 111 222" },
  receiver: { name: "Baraka Receiver", phone: "0754 333 444", region: "Mwanza", district: "Ilemela", landmark: "Near Rock City Mall" },
  goods: "Two pairs of shoes",
  weightKg: 2,
  size: "small",
  payer: "receiver",
  price: 7000,
  declaredValue: 50000,
  noProhibited: true,
  ...over,
});

beforeAll(async () => {
  // Mobile money is simulated here, whatever the local .env says.
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

describe("parcel work at the agent counter (app)", () => {
  let me: DriverCtx;
  let waybill: string;

  it("books a parcel brought to the counter, already received, and counts it on the home", async () => {
    me = await signIn(OWNER);
    await submitKyb(me, {
      businessName: "Juma Parcels",
      businessType: "sole_trader",
      tin: "333-444-555",
      office: { region: "Arusha", district: "Arusha City", street: "Sokoine Rd", phone: "0713 444 555" },
      contact: { name: "Juma Counter", phone: "0754 444 555" },
      workflow: ["receive", "deliver"],
      declaration: true,
    });
    me = (await driverContext(OWNER))!;

    const q = { total: 7000 }; // the agent's own price, not Tuma's rate card

    // A person receiving can't pay on delivery unless the business has that add-on (it collects the money later).
    await expect(agentBook(me.user, booking())).rejects.toMatchObject({ code: "PAY_ON_DELIVERY_OFF" });
    await expect(agentBook(me.user, booking({ declaredValue: undefined }))).rejects.toThrow(/worth/);
    await db.update(accounts).set({ payOnDelivery: true }).where(eq(accounts.id, me.user.accountId!));

    const r = await agentBook(me.user, booking());
    waybill = r.parcel.waybill;
    expect(r.parcel.state).toBe("RECEIVED");
    expect(r.parcel.total).toBe(q.total);
    expect(r.parcel.toCollect.fee).toBe(q.total); // receiver pays on delivery
    // In hand here: it can't be handed over or sent off with a tap; it leaves on a dispatch (opens on approval).
    expect(r.moves).not.toContain("READY_FOR_COLLECTION");
    expect(r.moves).not.toContain("OUT_FOR_DELIVERY");
    await expect(agentMove(me.user, waybill, { to: "READY_FOR_COLLECTION" })).rejects.toMatchObject({ code: "BAD_MOVE" });

    const home = await agentSummary(me.user);
    expect(home.counts.inHand).toBe(1);
    expect(home.periods.today).toEqual({ parcels: 1, value: q.total });
    expect(home.days).toHaveLength(7);
    expect(home.days[6].booked).toBe(1);
    expect(home.trial).toMatchObject({ used: 1, remaining: 19 });

    const list = await agentParcels(me.user, { view: "in_hand", q: "baraka" });
    expect(list.parcels.map((p) => p.waybill)).toEqual([waybill]);
    expect((await agentParcels(me.user, { view: "done" })).parcels).toHaveLength(0);
  });

  it("hands a parcel over at the counter with the receiver's SMS code as signature, an optional photo, collecting what's due", async () => {
    // As it arrives after a dispatch: at the office it's collected from (here, for the test).
    const [office] = await db.select({ id: branches.id }).from(branches).where(and(eq(branches.accountId, me.user.accountId!), eq(branches.isHead, true)));
    await db.update(shipments).set({ state: "AT_HUB", deliveryMode: "wakala_collect", deliveryBranchId: office.id, handlingBranchId: office.id }).where(eq(shipments.waybill, waybill));
    await agentMove(me.user, waybill, { to: "READY_FOR_COLLECTION" });
    await expect(agentMove(me.user, waybill, { to: "DELIVERED", collectMethod: "cash" })).rejects.toMatchObject({ code: "RECEIVER_REQUIRED" });
    await expect(agentMove(me.user, waybill, { to: "DELIVERED", receiverName: "Baraka Receiver" })).rejects.toMatchObject({ code: "CODE_REQUIRED" });
    const code = (await devReceiverCode(waybill))!;
    await expect(agentMove(me.user, waybill, { to: "DELIVERED", receiverName: "Baraka Receiver", code: code === "000000" ? "111111" : "000000" })).rejects.toMatchObject({ code: "BAD_CODE" });
    const r = await agentMove(me.user, waybill, { to: "DELIVERED", receiverName: "Baraka Receiver", collectMethod: "mobile_money", code, photo: "pod/2026/11/handover.jpg" });
    const [pod] = await db.select({ data: events.data }).from(events).where(and(eq(events.stateAfter, "DELIVERED"), sql`${events.shipmentId} = (select id from shipments where waybill = ${waybill})`));
    expect(pod.data).toMatchObject({ pod: { method: "otp", receiverName: "Baraka Receiver", photo: "pod/2026/11/handover.jpg" } });
    expect(r.parcel.state).toBe("DELIVERED");
    expect(r.parcel.toCollect.collected).toBe(true);
    expect(r.moves).toEqual([]);
    // The receiver paid at handover: the parcel is paid, and the money counts in Payments → Collected.
    expect(r.parcel).toMatchObject({ paidWith: "mobile_money", paidAt: expect.anything() });
    const pay = await paymentSettingsFor(me.user);
    expect(pay.collected.today.mobileMoney).toBeGreaterThanOrEqual(r.parcel.total);
    expect(pay.collected.today.booked).toBeGreaterThanOrEqual(pay.collected.today.total);
    expect((await agentSummary(me.user)).counts.inHand).toBe(0);
  });

  it("takes the agent's own price, paid by the sender in cash at the counter", async () => {
    // Pinned on the map in the app: the door's coordinates go on the receiver's address for directions.
    const pinned = { name: "Baraka Receiver", phone: "0754 333 444", region: "Mwanza", district: "Ilemela", landmark: "Rock City Mall, Ilemela", lat: -2.5164, lng: 32.9175 };
    const r = await agentBook(me.user, booking({ payer: "sender", paidWith: "cash", price: 12500, receiver: pinned }));
    expect(r.parcel.consignee.address).toMatchObject({ landmark: "Rock City Mall, Ilemela", lat: -2.5164, lng: 32.9175 });
    expect(r.parcel.total).toBe(12500);
    expect(r.parcel.paymentTerms).toBe("prepaid");
    expect(r.parcel.toCollect.total).toBe(0); // nothing more to collect at handover
  });

  it("reports the period's parcels, takings and handovers in the app", async () => {
    const r = await agentReport(me.user, { period: "week" });
    expect(r.totals).toMatchObject({ parcels: 2, value: 19500, delivered: 1 });
    expect(r.series).toHaveLength(7);
    expect(r.series[6]).toMatchObject({ parcels: 2, delivered: 1 });
    expect(Object.fromEntries(r.byPayment.map((x) => [x.key, x.n]))).toEqual({ receiver: 1, cash: 1 });
    expect(r.byRegion[0]).toMatchObject({ key: "Mwanza", n: 2 });
    expect(r.byStaff[0]).toMatchObject({ key: OWNER, n: 2 });
    await expect(agentReport(me.user, { period: "year" })).rejects.toThrow();
  });

  it("builds a custom report: a date range, filters, monthly buckets for long ranges, and a CSV of the parcels", async () => {
    const today = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
    const r = await agentReport(me.user, { period: "custom", from: today, to: today, payment: "cash" });
    expect(r.totals).toMatchObject({ parcels: 1, value: 12500 });
    expect(r.series).toHaveLength(1);
    expect(r.filters.payment).toBe("cash");
    expect(r.choices.staff.map((s) => s.id)).toContain(OWNER);
    const long = await agentReport(me.user, { period: "custom", from: "2026-01-01", to: today });
    expect(long.bucket).toBe("month");
    expect(long.series.at(-1)?.parcels).toBe(2);
    await expect(agentReport(me.user, { period: "custom", from: "2024-01-01", to: today })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(agentReport(me.user, { period: "custom", from: today })).rejects.toMatchObject({ code: "VALIDATION" });
    const { csv, rows, fileName } = await agentReportCsv(me.user, { period: "week", region: "Mwanza" });
    expect(rows).toBe(2);
    expect(fileName).toMatch(/^tuma-report-\d{4}-\d{2}-\d{2}-to-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(csv.startsWith("\uFEFFWaybill,Booked,State")).toBe(true);
    expect(csv).toContain("Baraka Receiver");
  });

  it("notifies about moves made by others and the business application, not the person's own moves", async () => {
    const own = await agentNotifications(me.user);
    expect(own.notifications.filter((n) => n.kind === "parcel")).toEqual([]); // every move so far was theirs
    expect(own.notifications.find((n) => n.kind === "business")).toMatchObject({ status: "submitted" });

    const [ship] = await db.select({ id: shipments.id }).from(shipments).where(eq(shipments.waybill, waybill));
    await db.insert(events).values({
      id: `evt_test_${randomBytes(6).toString("hex")}`,
      shipmentId: ship.id,
      type: "shipment.returning",
      stateAfter: "RETURNING",
      occurredAt: new Date(),
      actorType: "system",
      actorId: null,
      source: "system",
    });
    const r = await agentNotifications(me.user);
    expect(r.notifications[0]).toMatchObject({ kind: "parcel", waybill, state: "RETURNING", receiver: "Baraka Receiver" });
  });

  it("doesn't show or move another business's parcels", async () => {
    await expect(agentParcel(me.user, "ZZZ999")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("books for a company with its KYB, a foreign phone, handling marks and a photo, and keeps both in the customer list", async () => {
    const r = await agentBook(
      me.user,
      booking({
        sender: { kind: "company", name: "Kilimo Bora Ltd", phone: "+254 712 345 678", tin: "123-456-789", regNo: "BRELA-77", contactName: "Asha Mdee" },
        handling: ["keep_dry", "this_side_up"],
        fragile: true,
        photo: "parcel/2026/11/01TEST.jpg",
      }),
    );
    expect(r.parcel.shipper).toMatchObject({ name: "Kilimo Bora Ltd", phone: "+254712345678", company: { tin: "123456789", regNo: "BRELA-77", contactName: "Asha Mdee" } });
    const [row] = await db.select().from(shipments).where(eq(shipments.waybill, r.parcel.waybill));
    expect(row.specialHandling).toEqual(["fragile", "keep_dry", "this_side_up"]);
    expect(row.goodsPhoto).toBe("parcel/2026/11/01TEST.jpg");
    expect(row.shipperCustomerId).toBeTruthy();

    // A second parcel for the same people counts against the same customers, not new ones.
    await agentBook(me.user, booking({ sender: { kind: "company", name: "Kilimo Bora Ltd", phone: "+254712345678" } }));
    const companies = await agentCustomers(me.user, { kind: "company" });
    expect(companies.customers).toHaveLength(1);
    expect(companies.customers[0]).toMatchObject({ name: "Kilimo Bora Ltd", tin: "123456789", contactName: "Asha Mdee", sent: 2 });
    const found = await agentCustomers(me.user, { q: "0754 333" });
    expect(found.customers[0]).toMatchObject({ name: "Baraka Receiver", kind: "individual", region: "Mwanza", district: "Ilemela" });
    expect(found.customers[0].received).toBeGreaterThanOrEqual(2);

    await expect(agentBook(me.user, booking({ photo: "../etc/passwd" }))).rejects.toThrow();
    await expect(agentBook(me.user, booking({ sender: { name: "X Y", phone: "+255 222 123 456" } }))).rejects.toThrow();
  });

  it("offers the built-in goods types until a valid list is saved", async () => {
    await db.delete(platformSettings).where(eq(platformSettings.key, "goodsTypes"));
    const types = await getSetting("goodsTypes");
    expect(types.map((t) => t.key)).toEqual(expect.arrayContaining(["clothes", "electronics", "spare_parts", "general"]));
    await db.insert(platformSettings).values({ key: "goodsTypes", value: [{ key: "maize", en: "Maize", sw: "Mahindi" }] });
    expect(await getSetting("goodsTypes")).toEqual([{ key: "maize", en: "Maize", sw: "Mahindi" }]);
    await db.update(platformSettings).set({ value: [{ key: "Bad Key!", en: "x", sw: "y" }] }).where(eq(platformSettings.key, "goodsTypes"));
    expect((await getSetting("goodsTypes")).length).toBeGreaterThan(10);
    await db.delete(platformSettings).where(eq(platformSettings.key, "goodsTypes"));
  });

  it("lists the company's own offices in the receiver's region to collect from, and books collection at one", async () => {
    const acct = me.user.accountId!;
    const [far, near] = await db
      .insert(branches)
      .values([
        { accountId: acct, name: "Juma Nyamagana", code: "JNY", region: "Mwanza", district: "Nyamagana", address: "Kenyatta Rd" },
        { accountId: acct, name: "Juma Ilemela", code: "JIL", region: "Mwanza", district: "Ilemela", address: "Rock City Mall" },
      ])
      .returning({ id: branches.id });

    // The receiver's district first; offices in other regions (the Arusha counter) left out.
    const r = await collectionPoints(me.user, "Mwanza", "Ilemela");
    expect(r.offices.map((o) => o.id)).toEqual([near.id, far.id]);
    expect(r.offices[0]).toMatchObject({ name: "Juma Ilemela", inDistrict: true });

    const booked = await agentBook(me.user, booking({ deliveryMode: "wakala_collect", collectOfficeId: near.id }));
    expect(booked.parcel.deliveryMode).toBe("wakala_collect");
    expect(booked.parcel.collectAt).toBe("Juma Ilemela");

    // Another company's office (or a made-up one) can't be picked.
    await expect(agentBook(me.user, booking({ deliveryMode: "wakala_collect", collectOfficeId: crypto.randomUUID() }))).rejects.toMatchObject({ code: "OFFICE_NOT_FOUND" });
  });

  it("never offers the office the parcel is sent from as where to collect it, and refuses it", async () => {
    // Not tied to an office: the counter is the head office (Arusha).
    const [o] = await db.select().from(branches).where(and(eq(branches.accountId, me.user.accountId!), eq(branches.isHead, true)));
    const list = await collectionPoints(me.user, o.region ?? undefined, o.district ?? undefined);
    expect(list.offices.map((x) => x.id)).not.toContain(o.id);
    expect((await collectionPoints(me.user)).offices.map((x) => x.id)).not.toContain(o.id);
    await expect(
      agentBook(me.user, booking({ deliveryMode: "wakala_collect", collectOfficeId: o.id, receiver: { ...booking().receiver, region: o.region!, district: o.district! } })),
    ).rejects.toMatchObject({ code: "OFFICE_IS_HERE" });
  });

  it("sends company to company, keeping the receiving company with its TIN in the customer list", async () => {
    const r = await agentBook(
      me.user,
      booking({
        sender: { kind: "company", name: "Kilimo Bora Ltd", phone: "+254712345678", tin: "123456789" },
        receiver: { kind: "company", name: "Mwanza Agro Supplies Ltd", phone: "0768 222 333", tin: "987-654-321", contactName: "Juma Ali", region: "Mwanza", district: "Ilemela", landmark: "Kirumba" },
      }),
    );
    expect(r.parcel.consignee).toMatchObject({ name: "Mwanza Agro Supplies Ltd", company: { tin: "987654321", contactName: "Juma Ali" } });
    const companies = await agentCustomers(me.user, { kind: "company", q: "Mwanza Agro" });
    expect(companies.customers[0]).toMatchObject({ name: "Mwanza Agro Supplies Ltd", tin: "987654321", received: 1, district: "Ilemela" });
  });

  it("marks cash paid at booking and sends both people a receipt and a heads-up by SMS and WhatsApp", async () => {
    const r = await agentBook(me.user, booking({ payer: "sender", paidWith: "cash", price: 8000 }));
    expect(r.parcel.paidAt).toBeTruthy();
    expect(r.parcel.paidWith).toBe("cash");
    expect(r.parcel.invoice).toBeNull();
    const [row] = await db.select().from(shipments).where(eq(shipments.waybill, r.parcel.waybill));
    const sent = await db.select({ template: notifications.template, channel: notifications.channel }).from(notifications).where(eq(notifications.shipmentId, row.id));
    for (const template of ["parcel.receipt", "parcel.sent_to_you"]) {
      expect(sent.filter((n) => n.template === template).map((n) => n.channel).sort()).toEqual(["sms", "whatsapp"]);
    }
    const paid = await db.select().from(outbox).where(eq(outbox.idempotencyKey, `paid:${row.id}`));
    expect(paid[0]).toMatchObject({ target: "finops", topic: "agent.parcel.paid" });
    // Card isn't taken at the counter.
    await expect(agentBook(me.user, booking({ payer: "sender", paidWith: "card" }))).rejects.toThrow();
  });

  it("invoices a company sender automatically, settled when it pays at the counter", async () => {
    const company = { kind: "company", name: "Kilimo Bora Ltd", phone: "+254712345678", tin: "123456789", contactName: "Asha Mdee" };
    // Only a company is taken without proof of payment: on its invoice.
    await expect(agentBook(me.user, booking({ payer: "sender", paidWith: "invoice" }))).rejects.toMatchObject({ code: "INVOICE_COMPANIES_ONLY" });
    const later = await agentBook(me.user, booking({ sender: company, payer: "sender", paidWith: "invoice", price: 11800 }));
    expect(later.parcel).toMatchObject({ state: "RECEIVED", paymentTerms: "account", paidAt: null });
    expect(later.parcel.invoice).toMatchObject({ status: "issued", total: 11800, tax: 1800 });
    // The business's code makes it unique across Tuma: INV-JUP-2611-0004.
    expect(later.parcel.invoice!.number).toMatch(/^INV-[A-Z]{3}\d{0,2}-\d{4}-\d{4}$/);
    const now = await agentBook(me.user, booking({ sender: company, payer: "sender", paidWith: "cash", price: 5900 }));
    expect(now.parcel.invoice).toMatchObject({ status: "paid", total: 5900 });
    const [inv] = await db.select().from(invoices).where(eq(invoices.number, now.parcel.invoice!.number));
    expect(inv).toMatchObject({ amountPaid: 5900, paidWith: "cash", billTo: { name: "Kilimo Bora Ltd", tin: "123456789" } });
    expect(inv.customerId).toBeTruthy();
    const issued = await db.select().from(outbox).where(eq(outbox.idempotencyKey, `inv:${inv.id}`));
    expect(issued[0]).toMatchObject({ target: "finops", topic: "agent.invoice.issued" });
  });

  it("turns mobile money on in More → Payments, with where the takings are paid out", async () => {
    // Under review the float (and so payments) isn't open yet; it is once the business is approved.
    expect(await paymentSettingsFor(me.user)).toMatchObject({ canManage: false, blockedBy: "review" });
    await expect(updatePaymentSettings(me.user, { payOnDelivery: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    // Someone who can't turn mobile money on is told to ask, and can: a push to whoever manages payments, once a day.
    await expect(agentBook(me.user, booking({ payer: "sender", paidWith: "mobile_money" }))).rejects.toMatchObject({ code: "MOMO_OFF_ASK", message: expect.stringContaining("Ask your admin") });
    expect(await requestMomoSetup(me.user)).toEqual({ sent: true, already: false });
    await requestMomoSetup(me.user);
    const asks = (await db.select().from(outbox).where(eq(outbox.topic, "push.request"))).filter((e) => (e.payload as { template?: string }).template === "push.momo_setup" && (e.payload as { account?: { id: string } }).account?.id === me.user.accountId);
    expect(asks).toHaveLength(1);
    expect(asks[0].payload).toMatchObject({ account: { permission: "agent.wallet.manage" } });
    await db.update(accounts).set({ status: "active" }).where(eq(accounts.id, me.user.accountId!));
    me = (await driverContext(OWNER))!;
    const off = booking({ payer: "sender", paidWith: "mobile_money" });
    await expect(agentBook(me.user, off)).rejects.toMatchObject({ code: "MOMO_OFF" });
    expect(await paymentSettingsFor(me.user)).toMatchObject({ momo: { enabled: false, payout: null }, commissionBps: expect.any(Number), canManage: true });
    await expect(updatePaymentSettings(me.user, { momo: { enabled: true } })).rejects.toMatchObject({ code: "PAYOUT_REQUIRED" });
    await expect(updatePaymentSettings(me.user, { momo: { enabled: true, payout: { method: "mobile_money", phone: "+254712345678", name: "Juma" } } })).rejects.toMatchObject({
      code: "BAD_PHONE",
    });
    const bank = await updatePaymentSettings(me.user, {
      momo: { enabled: true, schedule: "weekly", payout: { method: "bank", bank: "CRDB", accountName: "Juma Parcels", accountNumber: "0150 1234 5678" } },
    });
    expect(bank.momo).toEqual({ enabled: true, schedule: "weekly", payout: { method: "bank", bank: "CRDB", accountName: "Juma Parcels", accountNumber: "015012345678" } });
    const r = await updatePaymentSettings(me.user, { momo: { enabled: true, payout: { method: "mobile_money", phone: "0754 444 555", name: "Juma Counter" } }, payOnDelivery: true });
    expect(r).toMatchObject({ momo: { enabled: true, schedule: "daily", payout: { method: "mobile_money", phone: "+255754444555" } }, payOnDelivery: true });
    const sent = await db.select().from(outbox).where(eq(outbox.topic, "agent.payout.configured"));
    const mine = sent.filter((e) => (e.payload as { accountId?: string }).accountId === me.user.accountId);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((e) => (e.payload as { commissionFrom?: string }).commissionFrom === "collection")).toBe(true);
    expect(mine.some((e) => (e.payload as { momoEnabled?: boolean }).momoEnabled === true)).toBe(true);
  });

  it("takes mobile money by a push to the payer's phone, and pays the parcel once it goes through", async () => {
    const r = await agentBook(me.user, booking({ sender: { kind: "company", name: "Kilimo Bora Ltd", phone: "+254712345678" }, payer: "sender", paidWith: "mobile_money", price: 9000 }));
    const wb = r.parcel.waybill;
    expect(r.parcel.paidAt).toBeNull();
    // Not received until it's paid.
    expect(r.parcel).toMatchObject({ state: "AWAITING_HANDOVER", awaitingPayment: true });
    expect(r.parcel.invoice).toMatchObject({ status: "issued" });
    await expect(agentRequestPayment(me.user, wb, { phone: "+254 712 345 678" })).rejects.toMatchObject({ code: "BAD_PHONE" });
    const payment = (await agentRequestPayment(me.user, wb, { phone: "0712 111 222" })).payment!;
    expect(payment).toMatchObject({ status: "pending", amount: 9000, phone: "+255712111222" });
    expect((await agentPaymentStatus(me.user, wb, payment.id)).payment.status).toBe("pending");
    // The simulated provider pays a few seconds later.
    await db.update(parcelPayments).set({ createdAt: new Date(Date.now() - 60_000) }).where(eq(parcelPayments.id, payment.id));
    expect((await agentPaymentStatus(me.user, wb, payment.id)).payment.status).toBe("paid");
    const after = await agentParcel(me.user, wb);
    expect(after.parcel.paidWith).toBe("mobile_money");
    expect(after.parcel.paidAt).toBeTruthy();
    expect(after.parcel.invoice).toMatchObject({ status: "paid" });
    expect(after.parcel).toMatchObject({ state: "RECEIVED", awaitingPayment: false });
    // Tuma's commission comes off the mobile-money takings, not the float.
    const [paidEvt] = await db.select().from(outbox).where(eq(outbox.idempotencyKey, `paid:${(await db.select({ id: shipments.id }).from(shipments).where(eq(shipments.waybill, wb)))[0].id}`));
    const before = await paymentSettingsFor(me.user);
    const bps = before.commissionBps;
    // The Payments screen's card: money taken today, split by method, with the commission on mobile money.
    expect(before.collected.today.mobileMoney).toBeGreaterThanOrEqual(9000);
    expect(before.collected.today.total).toBeGreaterThanOrEqual(before.collected.today.cash + before.collected.today.mobileMoney);
    expect(before.collected.today.commission).toBe(Math.round((before.collected.today.mobileMoney * bps) / 10_000));
    expect(before.collected.month.total).toBeGreaterThanOrEqual(before.collected.today.total);
    expect(before.collected.toCollect).toMatchObject({ payOnDelivery: { amount: expect.any(Number) }, invoices: { amount: expect.any(Number) } });
    expect(paidEvt.payload).toMatchObject({ method: "mobile_money", commission: Math.round((9000 * bps) / 10_000), commissionFrom: "collection", payout: 9000 - Math.round((9000 * bps) / 10_000) });
    await expect(agentRequestPayment(me.user, wb, { phone: "0712 111 222" })).rejects.toMatchObject({ code: "ALREADY_PAID" });
    // Payments → Records: this payment, newest first, and the company's paid invoice.
    const { payments } = await paymentRecords(me.user, { kind: "payments" });
    expect(payments!.find((p) => p.waybill === wb)).toMatchObject({ method: "mobile_money", amount: 9000 });
    expect(payments!.map((p) => p.at)).toEqual([...payments!.map((p) => p.at)].sort().reverse());
    const paidInvoices = (await paymentRecords(me.user, { kind: "invoices", status: "paid" })).invoices!;
    expect(paidInvoices.every((i) => i.status === "paid" && i.owed === 0)).toBe(true);
    expect((await paymentRecords(me.user, { kind: "invoices", status: "open" })).invoices!.every((i) => i.status !== "paid")).toBe(true);

    // A failed push leaves the parcel unpaid; a receiver-pays parcel can't be pushed at all.
    const other = await agentBook(me.user, booking({ payer: "sender", paidWith: "mobile_money", price: 4000 }));
    const tried = { payment: (await agentRequestPayment(me.user, other.parcel.waybill, { phone: "0754333444" })).payment! };
    const [row] = await db.select().from(parcelPayments).where(eq(parcelPayments.id, tried.payment.id));
    await settlePayment(row.reference, "FAILED", "Insufficient balance");
    expect((await agentPaymentStatus(me.user, other.parcel.waybill, tried.payment.id)).payment).toMatchObject({ status: "failed", failureMessage: "Insufficient balance" });
    expect((await agentParcel(me.user, other.parcel.waybill)).parcel).toMatchObject({ paidAt: null, state: "AWAITING_HANDOVER", awaitingPayment: true });
    // …so the customer pays cash instead.
    const cash = await agentRequestPayment(me.user, other.parcel.waybill, { method: "cash" });
    expect(cash.parcel).toMatchObject({ paidWith: "cash", state: "RECEIVED" });
    const cod = await agentBook(me.user, booking());
    await expect(agentRequestPayment(me.user, cod.parcel.waybill, { phone: "0712111222" })).rejects.toMatchObject({ code: "NOT_PREPAID" });
  });

  it("sells insurance and packaging with it, in the charge, on the invoice and the parcel", async () => {
    const company = { kind: "company", name: "Kilimo Bora Ltd", phone: "+254712345678", tin: "123456789" };
    const r = await agentBook(
      me.user,
      booking({ sender: company, payer: "sender", paidWith: "cash", price: 8000, declaredValue: 400000, extras: { insurance: 4000, packaging: { type: "box", amount: 1500 } } }),
    );
    expect(r.parcel.total).toBe(13500);
    expect(r.parcel.declaredValue).toBe(400000);
    expect(r.parcel.extras).toEqual([
      { code: "INSURANCE", label: "Insurance", amount: 4000 },
      { code: "PACKAGING", label: "Packaging: Box", amount: 1500 },
    ]);
    const [inv] = await db.select().from(invoices).where(eq(invoices.number, r.parcel.invoice!.number));
    expect(inv.lines.map((l) => l.amount)).toEqual([8000, 4000, 1500]);
    // The workbook's packaging list: a jerrycan is fine, bubble wrap isn't on it.
    const jerry = await agentBook(me.user, booking({ payer: "sender", paidWith: "cash", extras: { packaging: { type: "jerrycan", amount: 2000 } } }));
    expect(jerry.parcel.extras).toEqual([{ code: "PACKAGING", label: "Packaging: Jerrycan", amount: 2000 }]);
    await expect(agentBook(me.user, booking({ payer: "sender", paidWith: "cash", extras: { packaging: { type: "bubble_wrap", amount: 500 } } }))).rejects.toThrow();
  });

  it("shows counter staff only the payments and invoices on their own parcels; the owner sees the business's", async () => {
    const all = await paymentRecords(me.user, { kind: "payments" });
    expect(all.payments.length).toBeGreaterThan(0);
    const staff = { ...me.user, id: `staff-${Date.now()}`, permissions: new Set([...me.user.permissions].filter((p) => p !== "agent.wallet.manage" && p !== "report.view")) } as typeof me.user;
    expect((await paymentRecords(staff, { kind: "payments" })).payments).toEqual([]);
    expect((await paymentRecords(staff, { kind: "invoices" })).invoices).toEqual([]);
    await expect(paymentDetail(staff, all.payments[0].waybill)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const s = await paymentSettingsFor(staff);
    expect(s.scope).toBe("mine");
    expect(s.collected.month.total).toBe(0);
    expect((await paymentSettingsFor(me.user)).scope).toBe("business");
    expect((await agentSummary(staff)).moneyScope).toBe("mine");
  });

  it("suggests merging customers with the same name, and a merged number still finds the one kept", async () => {
    const acct = me.user.accountId!;
    const sender = (name: string, phone: string) => ({ sender: { kind: "individual" as const, name, phone }, receiver: { name: "Someone Else", phone: "+255700000999" } });
    await rememberCustomers(acct, sender("Zawadi  Mrisho", "+255711000101"));
    await rememberCustomers(acct, sender("zawadi mrisho", "+255711000102"));
    const { groups, canMerge } = await duplicateCustomers(me.user);
    expect(canMerge).toBe(true);
    const g = groups.find((x) => x.name.toLowerCase().replace(/\s+/g, " ") === "zawadi mrisho")!;
    expect(g.customers).toHaveLength(2);
    const [keep, other] = g.customers;
    const { customer } = await mergeCustomers(me.user, { keepId: keep.id, mergeIds: [other.id] });
    expect(customer).toMatchObject({ phone: keep.phone, otherPhones: [other.phone], sent: 2 });
    expect((await duplicateCustomers(me.user)).groups.some((x) => x.customers.some((c) => c.id === keep.id))).toBe(false);
    // Booking again with the merged number counts on the kept customer, not a new one.
    await rememberCustomers(acct, sender("Zawadi Mrisho", other.phone));
    const found = (await agentCustomers(me.user, { q: other.phone.slice(-6) })).customers.filter((c) => c.name.toLowerCase().startsWith("zawadi"));
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ id: keep.id, sent: 3 });

    // "Not the same" stops the suggestion.
    await rememberCustomers(acct, sender("Juma Ali", "+255711000201"));
    await rememberCustomers(acct, sender("Juma Ali", "+255711000202"));
    const juma = (await duplicateCustomers(me.user)).groups.find((x) => x.name === "Juma Ali")!;
    await dismissDuplicates(me.user, { ids: juma.customers.map((c) => c.id) });
    expect((await duplicateCustomers(me.user)).groups.some((x) => x.name === "Juma Ali")).toBe(false);
  });

  it("opens one customer with their parcels and analytics, one payment and one invoice", async () => {
    const company = { kind: "company", name: "Profile Traders Ltd", phone: "+255713700700", tin: "987654321", contactName: "Neema" };
    const a = await agentBook(me.user, booking({ sender: company, payer: "sender", paidWith: "cash", price: 7000 }));
    await agentBook(me.user, booking({ sender: company, payer: "sender", paidWith: "invoice", price: 4000 }));
    const c = (await agentCustomers(me.user, { kind: "company", q: "Profile Traders" })).customers[0];
    const p = await customerProfile(me.user, c.id);
    expect(p.customer).toMatchObject({ name: "Profile Traders Ltd", tin: "987654321" });
    expect(p.parcels).toHaveLength(2);
    expect(p.parcels.every((x) => x.sent)).toBe(true);
    expect(p.stats).toMatchObject({ parcels: 2, sent: 2, spent: 7000, owed: 4000, unpaidInvoices: 1, last30: 2 });
    expect(p.stats.months).toHaveLength(6);
    expect(p.stats.months.at(-1)!.parcels).toBe(2);
    await expect(customerProfile(me.user, "00000000-0000-0000-0000-000000000000")).rejects.toMatchObject({ code: "NOT_FOUND" });

    const { payment } = await paymentDetail(me.user, a.parcel.waybill);
    expect(payment).toMatchObject({ amount: 7000, method: "cash", commissionFrom: "float", paidBy: { name: "Profile Traders Ltd" } });
    expect(payment.keep + payment.commission).toBe(7000);
    expect(payment.invoice?.number).toBe(a.parcel.invoice!.number);
    const cash = await paymentRecords(me.user, { kind: "payments", method: "cash" });
    expect(cash.payments!.every((x) => x.method === "cash")).toBe(true);

    const { invoice } = await invoiceDetail(me.user, payment.invoice!.id);
    expect(invoice).toMatchObject({ status: "paid", total: 7000, owed: 0 });
  });

  it("edits, reports and removes a customer, and warns other businesses about a reported number", async () => {
    await rememberCustomers(me.user.accountId!, { sender: { kind: "individual", name: "Fraud Tester", phone: "+255711999001" }, receiver: { name: "Someone", phone: "+255711999002" } });
    const c = (await agentCustomers(me.user, { q: "Fraud Tester" })).customers[0];
    expect(c.flagged).toBe(0);
    const { customer } = await updateCustomer(me.user, c.id, { name: "Fraud Tester Two", email: "ft@example.com" });
    expect(customer).toMatchObject({ name: "Fraud Tester Two", email: "ft@example.com", phone: "+255711999001" });
    await reportCustomer(me.user, c.id, { reason: "fake_payment", note: "Fake M-Pesa SMS" });
    await expect(reportCustomer(me.user, c.id, { reason: "fake_payment" })).rejects.toMatchObject({ code: "ALREADY_REPORTED" });
    await expect(reportCustomer(me.user, c.id, { reason: "other" })).rejects.toMatchObject({ code: "NOTE_REQUIRED" });
    const p = await customerProfile(me.user, c.id);
    expect(p.reports).toEqual({ byOthers: 0, mine: ["fake_payment"] });
    expect(p.canManage).toBe(true);
    // Another business's report on the same number shows as a warning, without saying who.
    await db.insert(accounts).values({ id: "acc_test_reporter", type: "partner", name: "Other Agent" }).onConflictDoNothing();
    await db.insert(customerReports).values({ accountId: "acc_test_reporter", phone: "+255711999001", name: "Fraud Tester", reason: "abuse", reportedBy: me.user.id }).onConflictDoNothing();
    expect((await agentCustomers(me.user, { q: "Fraud Tester" })).customers[0].flagged).toBe(1);
    expect((await customerProfile(me.user, c.id)).reports.byOthers).toBe(1);
    await deleteCustomer(me.user, c.id);
    expect((await agentCustomers(me.user, { q: "Fraud Tester" })).customers).toHaveLength(0);
    await db.delete(customerReports).where(eq(customerReports.phone, "+255711999001"));
  });
});
