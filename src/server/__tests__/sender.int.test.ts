import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { accounts, agents, branches, departments, customerRatings, locations, customers, parcelRatings, invoices, kybApplications, parcelPayments, paymentSettings, platformSettings, rolePermissions, roles, shipments, users } from "../db/schema";
import { driverContext, finishDriverLogin, swapHandoff, type DriverCtx } from "../services/drivers";
import { submitKyb } from "../services/kyb";
import { agentParcel, agentParcels, agentRequestPayment } from "../services/agent-parcels";
import { rateCustomer } from "../services/customer-ratings";
import { myRatings, rateMine } from "../services/ratings";
import { myParcels, priceDropOff, senderBook, senderCancel, senderCollectionPoints, senderParcel, tumaPoints } from "../services/sender";
import { companyCheck, registerCompany } from "../services/corporate";
import { companyHome, companyInvoices, companyKycDocument, companyReport, companyWallet, createDepartment, setCompanyPolicy, setStaffDepartment, updateDepartment } from "../services/company";
import { myPlaces, removePlace, savePlace } from "../services/saved-places";
import { walletTopUp } from "../services/wallet";
import { applyKybDecision } from "../services/kyb";
import { teamOverview } from "../services/team-invites";
import { verifyDriverToken } from "../auth/driver-token";
import { DEFAULT_ROLES } from "@/domain/roles";

const AGENT = "ondi|sender.test.agent";
const SENDER = "ondi|sender.test.person";
const RECEIVER = "ondi|sender.test.receiver";
const BOSS = "ondi|sender.test.company";
const MATE = "ondi|sender.test.colleague";
const SUBS = [AGENT, SENDER, RECEIVER, BOSS, MATE];

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
  await db.execute(sql`delete from kyb_events where application_id in (select id from kyb_applications where user_id in (${sql.join(SUBS.map((s) => sql`${s}`), sql`, `)}))`);
  await db.update(users).set({ accountId: null, branchId: null, departmentId: null }).where(inArray(users.id, SUBS));
  await db.execute(sql`delete from saved_places where user_id in (${sql.join(SUBS.map((s) => sql`${s}`), sql`, `)})`);
  await db.execute(sql`delete from wallet_entries where user_id in (${sql.join(SUBS.map((s) => sql`${s}`), sql`, `)})`);
  await db.delete(kybApplications).where(inArray(kybApplications.userId, SUBS));
  if (accts.length) {
    const ids = sql`(select id from shipments where account_id in (${sql.join(accts.map((a) => sql`${a}`), sql`, `)}))`;
    for (const t of ["pieces", "events", "charge_snapshots", "cod_records", "exceptions", "notifications", "job_shipments", "tracking_otps", "customer_ratings", "parcel_ratings"]) {
      await db.execute(sql`delete from ${sql.identifier(t)} where ${sql.identifier(t === "tracking_otps" ? "waybill" : "shipment_id")} in ${t === "tracking_otps" ? sql`(select waybill from shipments where account_id in (${sql.join(accts.map((a) => sql`${a}`), sql`, `)}))` : ids}`);
    }
    await db.delete(parcelPayments).where(inArray(parcelPayments.accountId, accts));
    await db.delete(invoices).where(inArray(invoices.accountId, accts));
    await db.execute(sql`delete from audit_log where entity_id in (${sql.join(accts.map((a) => sql`${a}`), sql`, `)})`).catch(() => {});
    await db.delete(paymentSettings).where(inArray(paymentSettings.accountId, accts));
    await db.delete(shipments).where(inArray(shipments.accountId, accts));
    await db.delete(customers).where(inArray(customers.accountId, accts));
    await db.delete(agents).where(inArray(agents.accountId, accts));
    await db.delete(departments).where(inArray(departments.accountId, accts));
    await db.delete(branches).where(inArray(branches.accountId, accts));
    await db.delete(accounts).where(inArray(accounts.id, accts));
  }
  await db.execute(sql`delete from driver_handoffs where user_id in (${sql.join(SUBS.map((s) => sql`${s}`), sql`, `)})`);
  await db.delete(users).where(inArray(users.id, SUBS));
  await db.delete(locations).where(eq(locations.id, LOC));
}

const LOC = "TEST-SENDER-WAKALA";

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
    // Accepting can correct what the booking said: what's inside, and what it's worth.
    await priceDropOff(agent.user, waybill, { price: 9000, goods: "Books · A box of school books", category: "books", declaredValue: 45000 });
    expect((await agentParcel(agent.user, waybill)).parcel).toMatchObject({ goods: "Books · A box of school books", category: "books", declaredValue: 45000 });
    // Priced, not paid: the sender has a proforma invoice from the point.
    const pf = (await senderParcel(me.user, waybill)).document;
    expect(pf).toMatchObject({ kind: "proforma", number: `PF-${waybill}`, total: 9000, billTo: { name: "Rehema Person" } });
    expect(pf?.issuer?.business).toBeTruthy();
    const paid = await agentRequestPayment(agent.user, waybill, { method: "cash" });
    expect(paid.parcel).toMatchObject({ state: "RECEIVED", paidWith: "cash" });
    // The history says it was cash, not mobile money.
    const rec = (paid.parcel!.events as { state: string; note?: string | null }[]).find((e) => e.state === "RECEIVED");
    expect(JSON.stringify(rec)).toContain("Paid in cash");
    // In hand to be sent on, not handed over here: it isn't on the hand-over list.
    expect((await agentParcels(agent.user, { view: "in_hand" })).parcels.map((p: { waybill: string }) => p.waybill)).toContain(waybill);
    expect((await agentParcels(agent.user, { view: "to_hand_over" })).parcels.map((p: { waybill: string }) => p.waybill)).not.toContain(waybill);
    // Paid: a receipt.
    expect((await senderParcel(me.user, waybill)).document).toMatchObject({ kind: "receipt", number: `RC-${waybill}`, total: 9000, paidWith: "cash" });
    expect((await senderParcel(me.user, waybill)).total).toBe(9000);
    await expect(senderCancel(me.user, waybill, { reason: "Changed my mind" })).rejects.toMatchObject({ code: "CANNOT_CANCEL" });
  });

  it("rates both ways: the point rates the sender, the receiver rates the point in the app", async () => {
    // Not on the move with a courier: no live position on the list.
    expect((await myParcels(me.user)).parcels.find((p) => p.waybill === waybill)?.live).toBeNull();
    await expect(rateCustomer(me.user, waybill, { role: "sender", stars: 5 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(rateCustomer(agent.user, waybill, { role: "sender", stars: 9 })).rejects.toBeTruthy();
    const r = await rateCustomer(agent.user, waybill, { role: "sender", stars: 4, note: "On time" });
    expect(r.ratings).toEqual({ sender: 4, receiver: null });
    // Rating again changes it rather than adding one.
    await rateCustomer(agent.user, waybill, { role: "sender", stars: 5 });
    expect((await agentParcel(agent.user, waybill)).customerRatings).toEqual({ sender: 5, receiver: null });
    expect(await db.select().from(customerRatings).where(eq(customerRatings.phone, "+255712300400"))).toHaveLength(1);

    const them = (await driverContext(RECEIVER))!;
    const [s] = await db.select({ id: shipments.id }).from(shipments).where(eq(shipments.waybill, waybill));
    await db.insert(parcelRatings).values({ shipmentId: s.id, accountId: agent.user.accountId!, tokenHash: `t-${waybill}`, phone: "+255754909101" });
    expect((await myRatings(them.user)).toRate).toMatchObject([{ waybill, business: "Halima Parcels", status: "open" }]);
    expect((await senderParcel(them.user, waybill)).rating).toMatchObject({ status: "open" });
    await expect(rateMine(me.user, waybill, { stars: 5 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await rateMine(them.user, waybill, { stars: 2, issue: "late" });
    expect((await myRatings(them.user)).rated).toMatchObject([{ waybill, stars: 2, issue: "late" }]);
    await expect(rateMine(them.user, waybill, { stars: 5 })).rejects.toMatchObject({ code: "ALREADY_RATED" });
  });

  it("sends from a person to a company: in the company's name, with who takes it in and its TIN", async () => {
    const r = await senderBook(
      me.user,
      booking(pointId, { photo: "parcel/2026/11/test.webp", receiver: { ...booking(pointId).receiver, name: "Mwanga Traders Ltd", company: { tin: "123-456-789", contactName: "Asha Store" } } }),
    );
    expect((await db.select({ photo: shipments.goodsPhoto }).from(shipments).where(eq(shipments.waybill, r.waybill)))[0].photo).toBe("parcel/2026/11/test.webp");
    await expect(senderBook(me.user, booking(pointId, { photo: "kyb/secret.pdf" }))).rejects.toBeTruthy();
    const [s] = await db.select({ consignee: shipments.consignee }).from(shipments).where(eq(shipments.waybill, r.waybill));
    expect(s.consignee).toMatchObject({ name: "Mwanga Traders Ltd", company: { tin: "123456789", contactName: "Asha Store" } });
    await expect(senderBook(me.user, booking(pointId, { receiver: { ...booking(pointId).receiver, company: { tin: "12" } } }))).rejects.toBeTruthy();
  });

  it("is collected where a counter would send it: the business's other offices or a common collection point", async () => {
    await db.insert(locations).values({ id: LOC, type: "wakala", name: "Sender Test Wakala", region: "Dodoma", district: "Dodoma City", landmark: "By the market" }).onConflictDoNothing();
    const list = await senderCollectionPoints(me.user, { dropOffId: pointId, region: "Dodoma" });
    expect(list.offices.map((o) => o.id)).not.toContain(pointId);
    expect(list.points.map((p) => p.id)).toContain(LOC);
    const r = await senderBook(me.user, booking(pointId, { deliveryMode: "wakala_collect", deliveryLocationId: LOC }));
    const [s] = await db.select({ loc: shipments.deliveryLocationId, mode: shipments.deliveryMode }).from(shipments).where(eq(shipments.waybill, r.waybill));
    expect(s).toMatchObject({ loc: LOC, mode: "wakala_collect" });
    await db.update(locations).set({ active: false }).where(eq(locations.id, LOC));
    await expect(senderBook(me.user, booking(pointId, { deliveryMode: "wakala_collect", deliveryLocationId: LOC }))).rejects.toMatchObject({ code: "COLLECT_POINT" });
    await expect(senderCollectionPoints(me.user, { dropOffId: null })).rejects.toMatchObject({ code: "POINT_NOT_FOUND" });
  });

  it("lets the sender cancel a booking that hasn't reached the point, with a reason", async () => {
    const r = await senderBook(me.user, booking(pointId, { goods: "A pair of shoes" }));
    await expect(senderCancel(me.user, r.waybill, { reason: "" })).rejects.toBeTruthy();
    const c = await senderCancel(me.user, r.waybill, { reason: "Sending it next week" });
    expect(c).toMatchObject({ state: "CANCELLED", canCancel: false });
  });
  it("registers a company that sends; its admin books in its name on account, the point invoices it, the team sees it", async () => {
    let boss = await signIn(BOSS, "Asha Boss", "+255715100200");
    const co = await registerCompany(boss.user, { name: "Kilimo Supplies Ltd", tin: "565-676-787", region: "Dar es Salaam", district: "Ilala", street: "Samora Ave", phone: "0715 100 200" });
    await expect(registerCompany((await signIn(MATE, "Juma Mate", "+255715100300")).user, { name: "Kilimo Copy", tin: "565676787", region: "Dar es Salaam", district: "Ilala", street: "Samora Ave", phone: "0715 100 300" })).rejects.toMatchObject({ code: "COMPANY_ON_TUMA" });
    expect(await companyCheck({ tin: "565676787" })).toEqual({ taken: true, name: "Kilimo Supplies Ltd" });
    boss = (await driverContext(BOSS))!;
    expect(boss.user.permissions.has("corporate.send")).toBe(true);
    // Its team: only a company's roles to give.
    expect((await teamOverview(boss.user)).roles.map((r: { key: string }) => r.key).sort()).toEqual(["corporate_admin", "corporate_sender"]);

    await expect(senderBook(me.user, booking(pointId, { paidWith: "account" }))).rejects.toMatchObject({ code: "ACCOUNT_COMPANIES_ONLY" });
    const r = await senderBook(boss.user, booking(pointId, { asCompany: true, paidWith: "account" }));
    expect(r).toMatchObject({ onAccount: true, sender: { name: "Kilimo Supplies Ltd" } });
    const accepted = await priceDropOff(agent.user, r.waybill, { price: 15000 });
    expect(accepted.parcel).toMatchObject({ state: "RECEIVED", total: 15000, paymentTerms: "account" });
    expect(accepted.parcel.invoice).toMatchObject({ total: 15000 });
    // The receipt names the agent who took it in.
    expect(accepted.parcel.agent).toMatchObject({ name: "Halima Point", phone: "+255713500600" });
    expect(accepted.parcel.shipper).toMatchObject({ company: { tin: "565676787", contactName: "Asha Boss" } });

    // The admin monitors every parcel on the company's account; a colleague sees the ones they sent.
    await db.update(users).set({ accountId: co.accountId, roles: ["corporate_sender"] }).where(eq(users.id, MATE));
    const mate = (await driverContext(MATE))!;
    const list = await myParcels(mate.user);
    expect(list.company).toEqual({ name: "Kilimo Supplies Ltd" });
    expect(list.parcels.find((p) => p.waybill === r.waybill)).toBeUndefined();
    const m = await senderBook(mate.user, booking(pointId, { asCompany: true, goods: "Seed samples" }));
    expect((await senderParcel(mate.user, m.waybill)).direction).toBe("sent");
    const all = await myParcels(boss.user);
    expect(all.parcels.find((p) => p.waybill === m.waybill)).toMatchObject({ direction: "sent", bookedBy: "Juma Mate" });
    // Sent as themself instead: it's theirs alone, not the company's.
    const own = await senderBook(mate.user, booking(pointId, { goods: "A gift for mum" }));
    expect((await myParcels(boss.user)).parcels.find((p) => p.waybill === own.waybill)).toBeUndefined();
    expect((await senderParcel(mate.user, own.waybill)).sender).toMatchObject({ name: "Juma Mate" });
  });

  it("vets a new company: pending with a KYC application, 5 parcels on its account until ComplyOS approves", async () => {
    const [acct] = await db.select({ status: accounts.status }).from(accounts).where(eq(accounts.name, "Kilimo Supplies Ltd"));
    expect(acct.status).toBe("pending");
    const boss = (await driverContext(BOSS))!;
    const home = await companyHome(boss.user);
    expect(home).toMatchObject({ admin: true, company: { status: "pending" }, kyc: { status: "submitted" }, trial: { allowance: 5, used: 2 } });
    // Three more fit the allowance; the sixth is refused with a way out.
    for (const g of ["One", "Two", "Three"]) await senderBook(boss.user, booking(pointId, { asCompany: true, goods: `Box ${g}` }));
    const full = (await driverContext(BOSS))!;
    expect(full.user.trial).toMatchObject({ remaining: 0 });
    await expect(senderBook(full.user, booking(pointId, { asCompany: true }))).rejects.toMatchObject({ code: "KYC_PENDING_LIMIT" });
    // As themself it still goes; the company wallet waits for approval.
    await expect(senderBook(full.user, booking(pointId, { goods: "My own" }))).resolves.toBeTruthy();
    await expect(walletTopUp(full.user, { amount: 5000, phone: "0715100200", forCompany: true })).rejects.toMatchObject({ code: "KYC_PENDING" });
    // A document, then approval opens it fully.
    await companyKycDocument(full.user, { licenceFile: "kyb/2026/11/01JC0000000000000000000000.pdf" });
    const [app] = await db.select().from(kybApplications).where(eq(kybApplications.userId, BOSS));
    expect(app).toMatchObject({ accountKind: "company", licenceFile: "kyb/2026/11/01JC0000000000000000000000.pdf" });
    await applyKybDecision({ eventId: "co-approve-1", ref: app.ref, decision: "approved" });
    const open = (await driverContext(BOSS))!;
    expect(open.user.accountStatus).toBe("active");
    await expect(senderBook(open.user, booking(pointId, { asCompany: true, goods: "After approval" }))).resolves.toBeTruthy();
  });

  it("runs the company: departments with budgets, staff in them, a policy the team books under, reports and invoices", async () => {
    const boss = (await driverContext(BOSS))!;
    const mate = (await driverContext(MATE))!;
    await expect(createDepartment(mate.user, { name: "Sales" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const { departments: ds } = await createDepartment(boss.user, { name: "Sales", monthlyBudget: 10000 });
    await expect(createDepartment(boss.user, { name: "Sales" })).rejects.toMatchObject({ code: "DEPARTMENT_EXISTS" });
    const sales = ds.find((d) => d.name === "Sales")!;
    const { staff } = await setStaffDepartment(boss.user, MATE, { departmentId: sales.id });
    expect(staff.find((x) => x.id === MATE)).toMatchObject({ department: { name: "Sales" }, admin: false });
    // Charged to the sender's department; once it has spent its budget, it stops.
    const d1 = await senderBook(mate.user, booking(pointId, { asCompany: true, goods: "Brochures" }));
    const [s1] = await db.select({ departmentId: shipments.departmentId }).from(shipments).where(eq(shipments.waybill, d1.waybill));
    expect(s1.departmentId).toBe(sales.id);
    await priceDropOff(agent.user, d1.waybill, { price: 12000 });
    await expect(senderBook(mate.user, booking(pointId, { asCompany: true }))).rejects.toMatchObject({ code: "BUDGET_USED" });
    await updateDepartment(boss.user, sales.id, { monthlyBudget: null });
    // The policy: how it's paid, what it's worth, a department each, parcels a month per person.
    await setCompanyPolicy(boss.user, { payWith: ["account"], maxDeclaredValue: 50000, requireDepartment: true, monthlyParcelsPerSender: 50 });
    await expect(senderBook(mate.user, booking(pointId, { asCompany: true, paidWith: "wallet" }))).rejects.toMatchObject({ code: "POLICY_PAYMENT" });
    await expect(senderBook(mate.user, booking(pointId, { asCompany: true, paidWith: "account", declaredValue: 90000 }))).rejects.toMatchObject({ code: "POLICY_VALUE" });
    await expect(senderBook(boss.user, booking(pointId, { asCompany: true, paidWith: "account" }))).rejects.toMatchObject({ code: "DEPARTMENT" });
    await expect(senderBook(boss.user, booking(pointId, { asCompany: true, paidWith: "account", departmentId: sales.id }))).resolves.toBeTruthy();
    await setCompanyPolicy(boss.user, { monthlyParcelsPerSender: 1 });
    await expect(senderBook(mate.user, booking(pointId, { asCompany: true, paidWith: "account" }))).rejects.toMatchObject({ code: "POLICY_MONTHLY" });

    const rep = await companyReport(boss.user, {});
    expect(rep.totals.parcels).toBeGreaterThanOrEqual(8);
    expect(rep.byDepartment.find((d) => d.name === "Sales")).toMatchObject({ parcels: 2, spend: 12000 });
    expect(rep.byPerson.map((p) => p.name)).toContain("Juma Mate");
    const inv = await companyInvoices(boss.user);
    expect(inv.invoices.length).toBeGreaterThanOrEqual(1);
    expect(inv.owed).toBeGreaterThanOrEqual(15000);
    await expect(companyInvoices(mate.user)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await companyWallet(boss.user))).toMatchObject({ balance: 0, open: true });
  });

  it("saves home, work and favourite places; home is one, so saving again moves it", async () => {
    const pin = { region: "Dar es Salaam", district: "Kinondoni", lat: -6.77, lng: 39.24 };
    await savePlace(me.user, { kind: "home", line: "Mikocheni B, Dar es Salaam", ...pin });
    await savePlace(me.user, { kind: "home", line: "Sinza, Dar es Salaam", ...pin });
    await savePlace(me.user, { kind: "favourite", label: "Mum's", line: "Mbezi Beach", ...pin });
    await expect(savePlace(me.user, { kind: "work", line: "Posta", region: "Nowhere", district: "X", lat: 0, lng: 0 })).rejects.toBeTruthy();
    const { places } = await myPlaces(me.user);
    expect(places.map((p) => [p.kind, p.label, p.line])).toEqual([
      ["home", "Home", "Sinza, Dar es Salaam"],
      ["favourite", "Mum's", "Mbezi Beach"],
    ]);
    const after = await removePlace(me.user, places[1].id);
    expect(after.places).toHaveLength(1);
  });
});

