import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { accounts, agents, branches, customers, events, invoices, kybApplications, outbox, parcelPayments, parcelRatings, paymentSettings, platformSettings, rolePermissions, roles, shipments, users } from "../db/schema";
import { driverContext, finishDriverLogin, swapHandoff, type DriverCtx } from "../services/drivers";
import { submitKyb } from "../services/kyb";
import { agentBook, agentCancel, agentMove, agentParcel, agentParcels } from "../services/agent-parcels";
import { agentRatings, ratingByToken, ratingScore, ratingScores, submitRating } from "../services/ratings";
import { tumaPoints } from "../services/sender";
import { devReceiverCode } from "../services/tracking";
import { createManifest, dispatchOptions, listManifests, manifestDetail, offloadParcel } from "../services/manifests";
import { verifyDriverToken } from "../auth/driver-token";
import { DEFAULT_ROLES } from "@/domain/roles";

const OWNER = "ondi|manifest.test.owner";
const RIDER = "ondi|manifest.test.rider";
const OTHER = "ondi|manifest.test.point";
const SUBS = [OWNER, RIDER, OTHER];

async function signIn(sub: string, name: string, phone: string): Promise<DriverCtx> {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const code = await finishDriverLogin({ sub, name, email: `${sub.split("|")[1]}@example.test`, phone, roles: [] }, challenge);
  const { token } = await swapHandoff(code, verifier);
  return (await driverContext(await verifyDriverToken(token)))!;
}

const list = (xs: string[]) => sql.join(xs.map((x) => sql`${x}`), sql`, `);

async function cleanup() {
  const apps = await db.select({ accountId: kybApplications.accountId }).from(kybApplications).where(inArray(kybApplications.userId, SUBS));
  const mine = await db.select({ accountId: users.accountId }).from(users).where(inArray(users.id, SUBS));
  const accts = [...new Set([...apps, ...mine].map((r) => r.accountId).filter((a): a is string => !!a))];
  await db.execute(sql`delete from kyb_events where application_id in (select id from kyb_applications where user_id in (${list(SUBS)}))`);
  await db.execute(sql`delete from dispatchers where created_by in (${list(SUBS)})`);
  await db.update(users).set({ accountId: null, branchId: null }).where(inArray(users.id, SUBS));
  await db.delete(kybApplications).where(inArray(kybApplications.userId, SUBS));
  if (accts.length) {
    const jobIds = sql`(select job_id from manifests where account_id in (${list(accts)}) and job_id is not null)`;
    await db.execute(sql`delete from job_shipments where job_id in ${jobIds}`);
    const ids = (await db.execute(sql`select job_id from manifests where account_id in (${list(accts)}) and job_id is not null`)) as unknown as { job_id: string }[];
    await db.execute(sql`delete from manifests where account_id in (${list(accts)}) or to_account_id in (${list(accts)})`);
    await db.execute(sql`delete from dispatchers where account_id in (${list(accts)})`);
    if (ids.length) await db.execute(sql`delete from jobs where id in (${list(ids.map((i) => i.job_id))})`);
    const sh = sql`(select id from shipments where account_id in (${list(accts)}))`;
    for (const t of ["pieces", "events", "charge_snapshots", "cod_records", "exceptions", "notifications", "job_shipments", "parcel_ratings"]) {
      await db.execute(sql`delete from ${sql.identifier(t)} where shipment_id in ${sh}`);
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
  await db.execute(sql`delete from driver_handoffs where user_id in (${list(SUBS)})`);
  await db.delete(users).where(inArray(users.id, SUBS));
}

beforeAll(async () => {
  delete process.env.HUDUPAY_URL;
  for (const key of ["parcel_agent", "agent_rider"]) {
    const r = DEFAULT_ROLES.find((x) => x.key === key)!;
    await db.insert(roles).values({ key: r.key, name: r.name, description: r.description, surface: r.surface, system: true }).onConflictDoNothing();
    await db.insert(rolePermissions).values(r.permissions.map((p) => ({ roleKey: r.key, permission: p }))).onConflictDoNothing();
  }
  await db.insert(platformSettings).values({ key: "pendingParcelAllowance", value: 20 }).onConflictDoUpdate({ target: platformSettings.key, set: { value: 20 } });
  await cleanup();
});
afterAll(async () => {
  await cleanup();
  await db.$client.end();
});

async function agentOffice(sub: string, name: string, phone: string, tin: string, region: string, district: string) {
  const ctx = await signIn(sub, name, phone);
  await submitKyb(ctx, {
    businessName: `${name} Parcels`,
    businessType: "sole_trader",
    tin,
    office: { region, district, street: "Main Rd", phone, lat: region === "Mwanza" ? -2.52 : -6.8, lng: region === "Mwanza" ? 32.9 : 39.27 },
    contact: { name, phone },
    workflow: ["receive", "deliver"],
    declaration: true,
  });
  // Approved: dispatch waits for approval.
  const [k] = await db.select({ accountId: kybApplications.accountId }).from(kybApplications).where(eq(kybApplications.userId, sub));
  await db.update(accounts).set({ status: "active", payOnDelivery: true }).where(eq(accounts.id, k.accountId!));
  const me = (await driverContext(sub))!;
  const [b] = await db.select({ id: branches.id }).from(branches).where(eq(branches.accountId, me.user.accountId!));
  return { ctx: me, branchId: b.id };
}

const booking = (over: Record<string, unknown> = {}) => ({
  sender: { name: "Rehema Sender", phone: "0712 111 222" },
  receiver: { name: "Baraka Receiver", phone: "0754 333 444", region: "Dar es Salaam", district: "Ilala", landmark: "Near Kariakoo market" },
  goods: "Two pairs of shoes",
  weightKg: 2,
  size: "small",
  payer: "receiver",
  price: 7000,
  declaredValue: 50000,
  noProhibited: true,
  ...over,
});

describe("sending parcels on from an office under a manifest", () => {
  let owner: DriverCtx;
  let riderId: string;
  let mwanza: string;
  let pointRun: string;
  const wbs: string[] = [];

  it("lists who can carry: the office's people with dispatch, and Tuma couriers", async () => {
    const a = await agentOffice(OWNER, "Amina Sender", "+255713400500", "717-272-636", "Dar es Salaam", "Ilala");
    owner = a.ctx;
    const b = await agentOffice(OTHER, "Mussa Point", "+255713400600", "727-272-636", "Mwanza", "Ilemela");
    mwanza = b.branchId;
    const rider = await signIn(RIDER, "Juma Rider", "+255713400700");
    riderId = rider.user.id;
    await db.update(users).set({ accountId: owner.user.accountId, branchId: null, roles: ["agent_rider"] }).where(eq(users.id, riderId));
    for (let i = 0; i < 5; i++) wbs.push((await agentBook(owner.user, booking())).parcel.waybill);
    const o = await dispatchOptions(owner.user);
    expect(o.couriers.map((c) => c.name)).toEqual(expect.arrayContaining(["Juma Rider", "Amina Sender"]));
    expect(o.couriers.find((c) => c.id === owner.user.id)?.you).toBe(true);
    expect(typeof o.tumaCourier).toBe("boolean");
  });

  it("sends two to the door with the office's rider: out for delivery, on one manifest", async () => {
    const m = await createManifest(owner.user, { waybills: [wbs[0], wbs[1]], mode: "door", carrier: { kind: "staff", userId: riderId } });
    expect(m).toMatchObject({ mode: "door", status: "on_the_way", outgoing: true, to: null, carrier: { kind: "staff", name: "Juma Rider" }, totals: { parcels: 2, arrived: 0 } });
    expect(m.ref).toMatch(/^MAN-/);
    expect(m.parcels.map((p) => [p.seq, p.waybill, p.state])).toEqual([
      [1, wbs[0], "OUT_FOR_DELIVERY"],
      [2, wbs[1], "OUT_FOR_DELIVERY"],
    ]);
    const [ev] = await db
      .select({ data: events.data })
      .from(events)
      .innerJoin(shipments, eq(shipments.id, events.shipmentId))
      .where(sql`${shipments.waybill} = ${wbs[0]} and ${events.stateAfter} = 'OUT_FOR_DELIVERY'`);
    expect(ev.data).toMatchObject({ manifest: m.ref });
  });

  it("won't put a parcel on a second manifest, or send one that isn't in hand", async () => {
    await expect(createManifest(owner.user, { waybills: [wbs[0]], mode: "door", carrier: { kind: "staff", userId: riderId } })).rejects.toMatchObject({ code: "NOT_SENDABLE" });
    await expect(createManifest(owner.user, { waybills: ["TUM000000000"], mode: "door", carrier: { kind: "staff", userId: riderId } })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("refuses carriers that don't fit the run, and a point run with nowhere to go", async () => {
    // Anyone else carrying them gives a name, a phone and a vehicle number (they join the dispatcher network).
    await expect(createManifest(owner.user, { waybills: [wbs[2]], mode: "door", carrier: { kind: "transporter", name: "Abood Bus" } })).rejects.toThrow(/phone/);
    await expect(createManifest(owner.user, { waybills: [wbs[2]], mode: "door", carrier: { kind: "transporter", name: "Abood Bus", phone: "0713 999 888" } })).rejects.toThrow(/vehicle/);
    await expect(createManifest(owner.user, { waybills: [wbs[2]], mode: "door", carrier: { kind: "transporter", name: "Abood Bus", phone: "12345", plate: "T 1 A" } })).rejects.toThrow(/phone/);
    await expect(
      createManifest(owner.user, { waybills: [wbs[2]], mode: "door", carrier: { kind: "transporter", name: "Abood Bus", phone: "0713 999 888", plate: "T 1 A", receiptKey: "../etc/passwd" } }),
    ).rejects.toThrow(/receipt/);
    await expect(createManifest(owner.user, { waybills: [wbs[2]], mode: "point", carrier: { kind: "tuma" } })).rejects.toMatchObject({ code: "BAD_CARRIER" });
    await expect(createManifest(owner.user, { waybills: [wbs[2]], mode: "point", carrier: { kind: "transporter", name: "Abood Bus", phone: "0713 999 888", plate: "T 1 A" } })).rejects.toMatchObject({
      code: "DESTINATION_REQUIRED",
    });
    await expect(createManifest(owner.user, { waybills: [wbs[2]], mode: "door", carrier: { kind: "staff", userId: OTHER } })).rejects.toMatchObject({ code: "BAD_CARRIER" });
  });

  it("sends two to another Tuma point by bus: in transit, and the point sees them coming", async () => {
    // One is for the receiver to collect at that point (booked there from the sender's phone).
    await db.update(shipments).set({ deliveryMode: "wakala_collect", deliveryBranchId: mwanza }).where(eq(shipments.waybill, wbs[3]));
    const m = await createManifest(owner.user, {
      waybills: [wbs[2], wbs[3]],
      mode: "point",
      toBranchId: mwanza,
      carrier: { kind: "transporter", name: "Abood Bus", phone: "0713 999 888", plate: "t 123 abc", ref: "Ticket 4471", receiptKey: "dispatch/2026/11/01JCRECEIPT.jpg" },
      note: "Two boxes, top rack",
    });
    expect(m).toMatchObject({
      mode: "point",
      to: { id: mwanza, business: "Mussa Point Parcels" },
      carrier: { kind: "transporter", name: "Abood Bus", phone: "+255713999888", plate: "T 123 ABC", ref: "Ticket 4471", receiptKey: "dispatch/2026/11/01JCRECEIPT.jpg", dispatcherId: expect.any(String) },
    });
    // Saved to this office's dispatchers, unvetted, and offered next time.
    const saved = (await dispatchOptions(owner.user)).dispatchers;
    expect(saved).toEqual([expect.objectContaining({ name: "Abood Bus", phone: "+255713999888", plate: "T 123 ABC", status: "unvetted", trips: 1 })]);
    // And that point is offered first next time.
    expect((await dispatchOptions(owner.user)).recentPoints).toEqual([expect.objectContaining({ id: mwanza, business: "Mussa Point Parcels" })]);
    expect(m.parcels.every((p) => p.state === "IN_TRANSIT")).toBe(true);
    pointRun = m.id;
    const point = (await driverContext(OTHER))!;
    const coming = await listManifests(point.user, { dir: "in" });
    expect(coming.manifests.map((x) => x.ref)).toEqual([m.ref]);
    expect(coming.manifests[0]).toMatchObject({ parcels: 2, arrived: 0, fromName: expect.any(String), toName: expect.any(String) });
    expect((await manifestDetail(point.user, m.id)).outgoing).toBe(false);
    const sent = await listManifests(owner.user, { dir: "out" });
    expect(sent.manifests.map((s) => s.mode)).toEqual(["point", "door"]);
  });

  it("the point checks them in: collection parcels ready, the rest in hand there; then the manifest has arrived", async () => {
    const point = (await driverContext(OTHER))!;
    await expect(offloadParcel(point.user, pointRun, { waybill: wbs[0] })).rejects.toMatchObject({ code: "NOT_ON_MANIFEST" });
    await expect(offloadParcel(owner.user, pointRun, { waybill: wbs[3] })).rejects.toMatchObject({ code: "NOT_FOUND" });

    const a = await offloadParcel(point.user, pointRun, { waybill: wbs[3].toLowerCase() });
    expect(a.checkedIn).toEqual({ waybill: wbs[3], state: "READY_FOR_COLLECTION", receiver: "Baraka Receiver" });
    expect(a.manifest).toMatchObject({ status: "on_the_way", totals: { arrived: 1, parcels: 2 } });
    await expect(offloadParcel(point.user, pointRun, { waybill: wbs[3] })).rejects.toMatchObject({ code: "ALREADY_IN" });
    // Now it's the point's to hand over.
    const ready = await agentParcels(point.user, { view: "in_hand" });
    expect(ready.parcels.map((p) => p.waybill)).toContain(wbs[3]);

    const b = await offloadParcel(point.user, pointRun, { waybill: wbs[2] });
    expect(b.checkedIn.state).toBe("AT_HUB");
    expect(b.manifest).toMatchObject({ status: "arrived", totals: { arrived: 2 } });
    expect(b.manifest.arrivedAt).not.toBeNull();
    expect((await listManifests(point.user, { dir: "in" })).manifests[0]).toMatchObject({ status: "arrived", arrived: 2 });
  });

  it("sends one to the door with a Tuma courier: a job in Tuma's pool from this office; it moves when picked up", async () => {
    const m = await createManifest(owner.user, { waybills: [wbs[4]], mode: "door", carrier: { kind: "tuma" } });
    expect(m).toMatchObject({ carrier: { kind: "tuma" }, job: { status: "open", assigned: false } });
    expect(m.parcels[0].state).toBe("RECEIVED");
    const [j] = (await db.execute(sql`select j.account_id, j.pickup, j.payout from jobs j join manifests m on m.job_id = j.id where m.id = ${m.id}`)) as unknown as {
      account_id: string;
      pickup: { name: string; lat: number };
      payout: number;
    }[];
    const [pool] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.type, "internal")).orderBy(accounts.id).limit(1);
    expect(j.account_id).toBe(pool.id);
    expect(j.pickup.name).toContain("Amina Sender Parcels");
    expect(j.payout).toBeGreaterThan(0);
    await expect(createManifest(owner.user, { waybills: [wbs[4]], mode: "door", carrier: { kind: "staff", userId: riderId } })).rejects.toMatchObject({ code: "ON_MANIFEST" });
  });

  it("keeps manifests to the two offices on them", async () => {
    const sent = await listManifests(owner.user, { dir: "out" });
    expect(sent.manifests.length).toBeGreaterThan(0);
    const rider = (await driverContext(RIDER))!;
    await expect(dispatchOptions({ ...rider.user, permissions: new Set(["agent.workspace"]) })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await db.update(users).set({ accountId: null, roles: [] }).where(eq(users.id, RIDER));
    const outsider = (await driverContext(RIDER))!;
    await expect(manifestDetail({ ...outsider.user, accountId: "acc_nobody" }, sent.manifests[0].id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("the owner cancels a parcel in hand with a reason; what the sender paid is due back", async () => {
    const wb = (await agentBook(owner.user, booking())).parcel.waybill;
    const before = await agentParcel(owner.user, wb);
    expect(before.canCancel).toBe(true);
    expect(before.cancelReasons.map((r) => r.code)).toEqual(["CN01", "CN02", "CN03", "CN04", "CN05", "CN06"]);
    await expect(agentCancel(owner.user, wb, {})).rejects.toThrow();
    await expect(agentCancel(owner.user, wb, { reasonCode: "FD01" })).rejects.toThrow();
    await expect(agentCancel(owner.user, wb, { reasonCode: "CN06" })).rejects.toMatchObject({ code: "NOTE_REQUIRED" });
    await expect(agentCancel({ ...owner.user, permissions: new Set([...owner.user.permissions].filter((p) => p !== "shipment.cancel")) }, wb, { reasonCode: "CN01" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    // Paid at the counter: the money goes back.
    await db.update(shipments).set({ paidAt: new Date() }).where(eq(shipments.waybill, wb));
    const r = await agentCancel(owner.user, wb, { reasonCode: "CN02", note: "Gas cylinder inside" });
    expect(r.parcel.state).toBe("CANCELLED");
    expect(r.canCancel).toBe(false);
    expect(r.refundDue).toBe(7000);
    const [o] = await db.select({ payload: outbox.payload }).from(outbox).where(eq(outbox.idempotencyKey, `cancelrefund:${wb}`));
    expect(o.payload).toMatchObject({ waybill: wb, refund: 7000, reasonCode: "CN02" });
    await db.delete(outbox).where(eq(outbox.idempotencyKey, `cancelrefund:${wb}`));
    await expect(agentCancel(owner.user, wb, { reasonCode: "CN01" })).rejects.toMatchObject({ code: "CANNOT_CANCEL" });
  });

  it("won't cancel a parcel that's on its way with a courier", async () => {
    expect((await agentParcel(owner.user, wbs[4])).canCancel).toBe(false);
    await expect(agentCancel(owner.user, wbs[4], { reasonCode: "CN01" })).rejects.toMatchObject({ code: "ON_ITS_WAY" });
  });

  it("delivered by the point: the receiver gets one SMS to rate it, and rates it once", async () => {
    const code = (await devReceiverCode(wbs[0]))!;
    await agentMove(owner.user, wbs[0], { to: "DELIVERED", receiverName: "Baraka Receiver", code, collectMethod: "cash" });
    const [msg] = await db
      .select({ payload: outbox.payload })
      .from(outbox)
      .where(and(eq(outbox.waybill, wbs[0]), sql`${outbox.payload}->>'template' = 'parcel.rate'`));
    expect(msg.payload).toMatchObject({ channel: "sms", to: "+255754333444", variables: { waybill: wbs[0], business: "Amina Sender Parcels" } });
    const token = String((msg.payload as { variables: { link: string } }).variables.link).split("/rate/")[1];
    expect(await ratingByToken(token)).toMatchObject({ status: "open", waybill: wbs[0], business: "Amina Sender Parcels", stars: null });
    expect(await ratingByToken("not-a-real-token-at-all")).toEqual({ status: "not_found" });
    await expect(submitRating(token, { stars: 7 })).rejects.toThrow();
    const r = await submitRating(token, { stars: 2, issue: "late", comment: "Waited two days" });
    expect(r).toMatchObject({ status: "rated", stars: 2 });
    await expect(submitRating(token, { stars: 5 })).rejects.toMatchObject({ code: "ALREADY_RATED" });
  });

  it("scores points: hidden under three ratings, then a Bayesian average the agent and senders see", async () => {
    expect(ratingScore(15, 3)).toBe(4.4);
    expect(ratingScore(500, 100)).toBe(5);
    const acct = owner.user.accountId!;
    let mine = await agentRatings(owner.user);
    expect(mine).toMatchObject({ score: null, count: 1, average: 2, stars: { 2: 1 }, issues: { late: 1 } });
    expect(mine.recent[0]).toMatchObject({ waybill: wbs[0], stars: 2, comment: "Waited two days" });
    // Two more five-star ratings on the other door parcel's record make three.
    const [s1] = await db.select({ id: shipments.id }).from(shipments).where(eq(shipments.waybill, wbs[1]));
    const [s2] = await db.select({ id: shipments.id }).from(shipments).where(eq(shipments.waybill, wbs[2]));
    await db.insert(parcelRatings).values([
      { shipmentId: s1.id, accountId: acct, tokenHash: "t-test-1", phone: "+255754000001", stars: 5, ratedAt: new Date() },
      { shipmentId: s2.id, accountId: acct, tokenHash: "t-test-2", phone: "+255754000002", stars: 5, ratedAt: new Date() },
    ]);
    mine = await agentRatings(owner.user);
    expect(mine).toMatchObject({ count: 3, average: 4, score: ratingScore(12, 3) });
    expect((await ratingScores([acct])).get(acct)).toEqual({ score: ratingScore(12, 3), count: 3 });
    const { points } = await tumaPoints({ region: "Dar es Salaam" });
    expect(points.find((p) => p.businessId === acct)).toMatchObject({ rating: ratingScore(12, 3), ratings: 3 });
  });
});
