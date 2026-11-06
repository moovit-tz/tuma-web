import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { codRecords, drivers, events, jobs, shipments } from "../db/schema";
import { resolvePermissions } from "../rbac";
import { createParcel } from "../services/shipments";
import { issueReceiverCode } from "../services/tracking";
import { verifyDriverToken } from "../auth/driver-token";
import { verifySession } from "../auth/session-token";
import {
  acceptJob,
  cashHeld,
  completeJob,
  currentJob,
  deliverStop,
  driverContext,
  driverMe,
  driverPath,
  failStop,
  jobHistory,
  offersFor,
  registerDriver,
  releaseJob,
  reportProgress,
  setPresence,
  finishDriverLogin,
  swapHandoff,
  allowedAppRedirect,
  type DriverCtx,
} from "../services/drivers";
import { addDriver, cancelJob, createJob, dispatchable, listDrivers, setDriverStatus } from "../services/dispatch";
import type { CurrentUser } from "../auth/current-user";
import { parcelOrderSchema } from "@/domain/order-schema";

const as = async (id: string, roles: string[], accountId: string | null): Promise<CurrentUser> => ({ id, name: id, accountId, roles, permissions: await resolvePermissions(roles), locale: "en" });

const order = (over: Record<string, unknown> = {}) =>
  parcelOrderSchema.parse({
    serviceLevel: "next_day",
    paymentTerms: "pay_on_delivery",
    codAmount: 20000,
    collectMethods: ["cash", "mobile_money"],
    handoverMode: "pickup",
    deliveryMode: "door",
    shipper: { name: "Kariakoo Mart", phone: "0754100200", address: { region: "Dar es Salaam", district: "Ilala" } },
    consignee: { name: "Rehema Test", phone: "0712 000 111", address: { region: "Dar es Salaam", district: "Kinondoni", landmark: "Near Sinza Mori" } },
    goodsDescription: "Shoes",
    goodsCategory: "apparel",
    prohibitedDeclared: true,
    pieces: [{ weightKg: 1.2, lengthCm: 30, widthCm: 20, heightCm: 10 }],
    ...over,
  });

/** Signs someone in the way the app does after Ondi: hand-off code + PKCE verifier → token → context. */
const pkce = () => {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
};
async function signIn(sub: string, name = sub): Promise<DriverCtx> {
  const { verifier, challenge } = pkce();
  const code = await finishDriverLogin({ sub, name, roles: [] }, challenge);
  const { token } = await swapHandoff(code, verifier);
  return (await driverContext(await verifyDriverToken(token)))!;
}
const refresh = async (c: DriverCtx) => (await driverContext(c.user.id))!;

let merchant: CurrentUser;
let dispatcher: CurrentUser;
let partnerAdmin: CurrentUser;

beforeAll(async () => {
  await db.execute(sql`truncate job_shipments, jobs, drivers, driver_handoffs restart identity cascade`);
  // Cash collected by test drivers in earlier runs would count as still held.
  await db.execute(sql`update cod_records set holder_id = null, status = 'remitted' where holder_id like 'tumax|%' or holder_id like 'ondi|%bajaji%'`);
  await db.execute(sql`delete from users where id like 'tumax|%' or id in ('ondi|neema.bajaji', 'ondi|hassan.lorry')`);
  await db.execute(sql`insert into accounts (id, type, name) values ('acc_moovit_ops','internal','Moovit Operations') on conflict do nothing`);
  await db.execute(sql`insert into accounts (id, type, partner_kind, name) values ('acc_drv_partner','partner','parcel_company','Drv Partner') on conflict do nothing`);
  merchant = await as("ondi|amina.juma", ["merchant_user"], "acc_kariakoo_mart");
  dispatcher = await as("ondi|dispatch.test", ["dispatcher"], "acc_moovit_ops");
  partnerAdmin = await as("ondi|drv.partner", ["partner_admin"], "acc_drv_partner");
});

afterAll(async () => {
  await db.$client.end();
});

describe("driver path through the state machine", () => {
  it("finds the steps a driver sets and skips what is already done", () => {
    expect(driverPath("AWAITING_HANDOVER", "DELIVERED")).toEqual(["RECEIVED", "OUT_FOR_DELIVERY", "DELIVERED"]);
    expect(driverPath("AT_HUB", "OUT_FOR_DELIVERY")).toEqual(["OUT_FOR_DELIVERY"]);
    expect(driverPath("ATTEMPT_FAILED", "DELIVERED")).toEqual(["OUT_FOR_DELIVERY", "DELIVERED"]);
    expect(driverPath("DELIVERED", "DELIVERED")).toEqual([]);
    expect(driverPath("CANCELLED", "DELIVERED")).toBeNull();
  });
});

describe("Tuma-X sign-in and registration", () => {
  it("signs in through Ondi with a one-time, PKCE-bound hand-off; the token never works as a portal session", async () => {
    expect(allowedAppRedirect("tumax://auth")).toBe("tumax://auth");
    expect(allowedAppRedirect("https://evil.example/cb")).toBeNull();
    const { verifier, challenge } = pkce();
    const code = await finishDriverLogin({ sub: "tumax|+255713555001", name: "Juma Boda", roles: [] }, challenge);
    await expect(swapHandoff(code, pkce().verifier)).rejects.toMatchObject({ code: "BAD_VERIFIER" });
    // A failed swap burns the code too.
    await expect(swapHandoff(code, verifier)).rejects.toMatchObject({ code: "CODE_EXPIRED" });
    const again = pkce();
    const code2 = await finishDriverLogin({ sub: "tumax|+255713555001", name: "Juma Boda", roles: [] }, again.challenge);
    const { token, driver } = await swapHandoff(code2, again.verifier);
    expect(driver).toBeNull();
    expect(await verifyDriverToken(token)).toBe("tumax|+255713555001");
    expect(await verifySession(token)).toBeNull();
    await expect(swapHandoff(code2, again.verifier)).rejects.toMatchObject({ code: "CODE_EXPIRED" });
  });

  it("registers into Tuma's pool as pending; jobs wait for approval", async () => {
    let c = (await driverContext("tumax|+255713555001"))!;
    await expect(registerDriver(c, { fullName: "Juma Boda", phone: "0713555001", region: "Kusini Pemba", vehicleKind: "trailer" })).rejects.toMatchObject({ code: "VEHICLE_NOT_ALLOWED" });
    const d = await registerDriver(c, { fullName: "Juma Boda", phone: "0713 555 001", region: "Dar es Salaam", vehicleKind: "boda", plate: "mc 123 abc" });
    expect(d).toMatchObject({ status: "pending", role: "rider", plate: "MC 123 ABC", fleet: { tuma: true } });
    c = await refresh(c);
    await expect(offersFor(c, {})).rejects.toMatchObject({ code: "NOT_APPROVED" });
    await expect(setPresence(c, { online: true })).rejects.toMatchObject({ code: "NOT_APPROVED" });

    const pending = await listDrivers(dispatcher, "pending");
    expect(pending.map((r) => r.d.userId)).toContain("tumax|+255713555001");
    await setDriverStatus(dispatcher, "tumax|+255713555001", "approved");
    c = await refresh(c);
    expect((await driverMe(c)).driver.status).toBe("approved");
    expect(c.user.permissions.has("driver.jobs")).toBe(true);
  });

  it("keeps a partner's drivers to that partner", async () => {
    await addDriver(partnerAdmin, { name: "Partner Rider", phone: "0713555009", region: "Dar es Salaam", vehicleKind: "boda", plate: "" });
    expect((await listDrivers(partnerAdmin)).map((r) => r.d.userId)).toEqual(["tumax|+255713555009"]);
    await expect(setDriverStatus(partnerAdmin, "tumax|+255713555001", "suspended")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(addDriver(partnerAdmin, { name: "Dup", phone: "+255713555009", region: "Dar es Salaam", vehicleKind: "boda", plate: "" })).rejects.toMatchObject({ code: "DUPLICATE" });
  });
});

describe("a job from dispatch to delivery", () => {
  let wbA: string;
  let wbB: string;
  let jobId: string;
  let juma: DriverCtx;
  let other: DriverCtx;

  it("dispatch builds a job from waybills that aren't on one", async () => {
    wbA = (await createParcel(merchant, order())).shipment.waybill;
    wbB = (await createParcel(merchant, order({ codAmount: undefined, paymentTerms: "account" }))).shipment.waybill;
    expect((await dispatchable(dispatcher)).map((r) => r.waybill)).toEqual(expect.arrayContaining([wbA, wbB]));
    // Too heavy for the chosen vehicle, or the wrong kind of vehicle, is refused.
    await expect(createJob(dispatcher, { waybills: [wbA], kind: "parcel", pickup: "loc:DAR-ILA-01", requiredVehicle: "lorry" })).rejects.toMatchObject({ code: "BAD_VEHICLE" });
    const job = await createJob(dispatcher, { waybills: [wbA, wbB], kind: "parcel", pickup: "loc:DAR-ILA-01" });
    jobId = job.id;
    expect(job.vehicle).toBe("boda");
    expect(job.payout).toBeGreaterThan(0);
    expect((await dispatchable(dispatcher)).map((r) => r.waybill)).not.toContain(wbA);
    await expect(createJob(dispatcher, { waybills: [wbA], kind: "parcel", pickup: "sender" })).rejects.toMatchObject({ code: "NOT_DISPATCHABLE" });
  });

  it("offers it only to eligible drivers in the fleet, and the first to accept wins", async () => {
    juma = (await driverContext("tumax|+255713555001"))!;
    // Another Tuma boda driver in Dar, and a truck driver who must not see a parcel run.
    other = await signIn("ondi|neema.bajaji");
    await expect(registerDriver(other, { fullName: "Neema Bajaji", phone: "0713555001", region: "Dar es Salaam", vehicleKind: "bajaji" })).rejects.toMatchObject({ code: "PHONE_TAKEN" });
    await registerDriver(other, { fullName: "Neema Bajaji", phone: "0713555002", region: "Dar es Salaam", vehicleKind: "bajaji" });
    await setDriverStatus(dispatcher, other.user.id, "approved");
    other = await refresh(other);
    let truck = await signIn("ondi|hassan.lorry");
    await registerDriver(truck, { fullName: "Hassan Lorry", phone: "0713555003", region: "Dar es Salaam", vehicleKind: "lorry" });
    await setDriverStatus(dispatcher, truck.user.id, "approved");
    truck = await refresh(truck);
    // The partner's own rider is in another fleet.
    const partnerRider = await signIn("tumax|+255713555009");

    const offers = await offersFor(juma, { lat: -6.82, lng: 39.27 });
    expect(offers.map((o) => o.id)).toContain(jobId);
    const offer = offers.find((o) => o.id === jobId)!;
    expect(offer.dropoffs.map((s) => s.id)).toEqual([wbA, wbB]);
    expect(offer.dropoffs[0].codDue).toBeGreaterThan(20000); // goods + delivery fee (pay on delivery)
    expect(offer.dropoffs[1].codDue).toBe(0);
    expect((await offersFor(truck, {})).map((o) => o.id)).not.toContain(jobId);
    expect((await offersFor(partnerRider, {})).map((o) => o.id)).not.toContain(jobId);

    const [first, second] = await Promise.allSettled([acceptJob(juma, jobId), acceptJob(other, jobId)]);
    const won = [first, second].filter((r) => r.status === "fulfilled");
    expect(won).toHaveLength(1);
    const lost = [first, second].find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(lost.reason).toMatchObject({ code: "TAKEN" });
    // Make Juma the winner for the rest of the run, whoever won the race.
    if (first.status !== "fulfilled") {
      await releaseJob(other, jobId, { reason: "test swap" });
      await acceptJob(juma, jobId);
    }
    expect((await currentJob(juma))?.id).toBe(jobId);
    expect(await offersFor(juma, {})).toEqual([]);
  });

  it("moves the waybills through the lifecycle as the app reports phases", async () => {
    await reportProgress(juma, jobId, { phase: "atPickup", lat: -6.8235, lng: 39.2695 });
    await reportProgress(juma, jobId, { phase: "outForDelivery", stopId: wbA, lat: -6.8, lng: 39.25 });
    const [a] = await db.select({ state: shipments.state }).from(shipments).where(eq(shipments.waybill, wbA));
    expect(a.state).toBe("OUT_FOR_DELIVERY");
    const [j] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    expect(j).toMatchObject({ status: "in_progress", phase: "outForDelivery" });
    await expect(completeJob(juma, jobId, {})).rejects.toMatchObject({ code: "STOPS_PENDING" });
  });

  it("needs proof and the full COD to deliver, then records who holds the cash", async () => {
    await expect(deliverStop(juma, jobId, wbA, { recipientName: "Rehema" })).rejects.toMatchObject({ code: "POD_REQUIRED" });
    await expect(deliverStop(juma, jobId, wbA, { otp: "000000" })).rejects.toMatchObject({ code: "BAD_OTP" });
    await expect(deliverStop(juma, jobId, wbA, { photo: "pod/x.jpg", codCollected: 100 })).rejects.toMatchObject({ code: "COD_SHORT" });
    const code = await db.transaction((tx) => issueReceiverCode(tx, { waybill: wbA, consignee: { phone: "+255712000111" } }, "resend"));
    const out = await deliverStop(juma, jobId, wbA, { otp: code, recipientName: "Rehema", method: "cash", lat: -6.77, lng: 39.23 });
    expect(out.outcome).toBe("delivered");
    const [s] = await db.select().from(shipments).where(eq(shipments.waybill, wbA));
    expect(s.state).toBe("DELIVERED");
    const [ev] = await db.select().from(events).where(sql`${events.shipmentId} = ${s.id} and ${events.stateAfter} = 'DELIVERED'`);
    expect(ev).toMatchObject({ source: "field_app", actorId: juma.user.id, lat: -6.77 });
    expect(ev.data).toMatchObject({ job: expect.stringMatching(/^JOB-/), pod: { method: "otp", receiverName: "Rehema" } });
    const [cod] = await db.select().from(codRecords).where(eq(codRecords.shipmentId, s.id));
    expect(cod).toMatchObject({ status: "collected", holderId: juma.user.id, method: "cash" });
    expect((await cashHeld(juma)).total).toBe(cod.amountCollected + cod.feeCollected);
    await expect(deliverStop(juma, jobId, wbA, { photo: "pod/x.jpg" })).rejects.toMatchObject({ code: "STOP_DONE" });
  });

  it("records a failed attempt with a reason, then completes the job", async () => {
    await expect(failStop(juma, jobId, wbB, { reason: "other" })).rejects.toMatchObject({ code: "NOTE_REQUIRED" });
    const out = await failStop(juma, jobId, wbB, { reason: "recipientAbsent" });
    expect(out).toMatchObject({ outcome: "failed", reasonCode: "FD01" });
    const [b] = await db.select({ state: shipments.state, attempts: shipments.attempts }).from(shipments).where(eq(shipments.waybill, wbB));
    expect(b).toEqual({ state: "ATTEMPT_FAILED", attempts: 1 });

    const done = await completeJob(juma, jobId, { distanceM: 12_400, trail: [[-6.82, 39.27], [-6.77, 39.23]] });
    expect(done.status).toBe("completed");
    const me = await driverMe(juma);
    expect(me.today).toMatchObject({ jobs: 1, payout: done.payout });
    expect(me.activeJobId).toBeNull();
    expect((await jobHistory(juma))[0]).toMatchObject({ id: jobId, delivered: 1, failed: 1 });
    // The failed waybill can be dispatched again.
    expect((await dispatchable(dispatcher)).map((r) => r.waybill)).toContain(wbB);
  });

  it("puts a job handed back before pickup back in the pool; dispatch can cancel an unstarted job", async () => {
    const wbC = (await createParcel(merchant, order({ codAmount: undefined, paymentTerms: "account" }))).shipment.waybill;
    const job = await createJob(dispatcher, { waybills: [wbC], kind: "parcel", pickup: "sender" });
    await acceptJob(juma, job.id);
    await releaseJob(juma, job.id, { reason: "Flat tyre" });
    const [back] = await db.select().from(jobs).where(eq(jobs.id, job.id));
    expect(back).toMatchObject({ status: "open", driverId: null });
    await cancelJob(dispatcher, job.id, "Customer asked to wait");
    expect((await dispatchable(dispatcher)).map((r) => r.waybill)).toContain(wbC);
    // Suspension is blocked mid-job and takes the driver offline otherwise.
    await setDriverStatus(dispatcher, juma.user.id, "suspended");
    const [d] = await db.select().from(drivers).where(eq(drivers.userId, juma.user.id));
    expect(d).toMatchObject({ status: "suspended", online: false });
    await expect(offersFor(await refresh(juma), {})).rejects.toMatchObject({ code: "SUSPENDED" });
  });
});
