import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray, like, or } from "drizzle-orm";
import { db } from "../db/client";
import {
  accounts,
  amlScreenings,
  approvalRequests,
  claims,
  dsrRequests,
  events,
  jobs,
  kycRecords,
  payoutLines,
  payouts,
  riskAlerts,
  riskCases,
  riskHolds,
  riskRules,
  shipments,
  users,
  walletEntries,
  watchlistEntries,
} from "../db/schema";
import { resolveGrants, resolvePermissions } from "../rbac";
import { decideApproval } from "../services/admin/approvals";
import { addEvidence, decideClaim, getClaim, listClaims, openClaim, setLiability } from "../services/admin/claims";
import { activeHold, addCaseNote, closeCase, getCase, openCase, placeHold, requestRelease, riskOverview, runRiskChecks } from "../services/admin/risk";
import { addWatchlist, assertKycAllows, closeDsr, dsrExport, nameScore, openDsr, reviewKyc, reviewScreening, screenName, submitKyc } from "../services/admin/compliance";
import { listPayouts, previewPayouts, proposePayouts } from "../services/admin/payouts";
import type { CurrentUser } from "../auth/current-user";

const A = "ondi|trust.a";
const B = "ondi|trust.b";
const CUST = "ondi|trust.cust";
const RIDER = "ondi|trust.rider";
const IDS = [A, B, CUST, RIDER];
const ACC = "acc_trust_int";
const POINT = "acc_trust_point";
const PHONE = "+255719000777";
const WB = "TRT"; // waybill prefix

async function asUser(id: string, roleKeys: string[]): Promise<CurrentUser> {
  return { id, name: id === A ? "Admin A" : id === B ? "Admin B" : id, accountId: null, roles: roleKeys, permissions: await resolvePermissions(roleKeys), grants: await resolveGrants(roleKeys), locale: "en" };
}

const party = (name: string, phone: string) => ({ name, phone, address: { region: "Dar es Salaam", district: "Ilala", lat: -6.82, lng: 39.28 } });

async function parcel(n: number, extra: Partial<typeof shipments.$inferInsert> = {}) {
  const [s] = await db
    .insert(shipments)
    .values({
      waybill: `${WB}${String(n).padStart(4, "0")}`,
      type: "parcel",
      accountId: ACC,
      state: "CREATED",
      paymentTerms: "prepaid",
      shipper: party("Sender", "+255719000001"),
      consignee: party("Neema", PHONE),
      goodsDescription: "Phone",
      goodsCategory: "electronics",
      declaredValue: 300_000,
      actualWeightG: 500,
      volumetricWeightG: 500,
      chargeableWeightG: 500,
      channel: "console",
      createdBy: RIDER,
      ...extra,
    })
    .returning();
  return s;
}

async function cleanup() {
  const ships = await db.select({ id: shipments.id }).from(shipments).where(like(shipments.waybill, `${WB}%`));
  const sids = ships.map((s) => s.id);
  await db.delete(approvalRequests).where(inArray(approvalRequests.requestedBy, IDS));
  await db.delete(payoutLines).where(inArray(payoutLines.payoutId, db.select({ id: payouts.id }).from(payouts).where(inArray(payouts.payeeId, [RIDER, POINT]))));
  await db.delete(payouts).where(inArray(payouts.payeeId, [RIDER, POINT]));
  await db.delete(jobs).where(eq(jobs.accountId, ACC));
  await db.delete(walletEntries).where(inArray(walletEntries.userId, IDS));
  if (sids.length) {
    await db.delete(claims).where(inArray(claims.shipmentId, sids));
    await db.delete(events).where(inArray(events.shipmentId, sids));
    await db.delete(shipments).where(inArray(shipments.id, sids));
  }
  await db.delete(riskAlerts).where(inArray(riskAlerts.subjectId, IDS));
  await db.delete(riskCases).where(inArray(riskCases.subjectId, IDS));
  await db.delete(riskHolds).where(inArray(riskHolds.subjectId, IDS));
  await db.delete(kycRecords).where(inArray(kycRecords.userId, IDS));
  await db.delete(amlScreenings).where(inArray(amlScreenings.screenedBy, IDS));
  await db.delete(watchlistEntries).where(inArray(watchlistEntries.addedBy, IDS));
  await db.delete(dsrRequests).where(inArray(dsrRequests.createdBy, IDS));
  await db.delete(users).where(inArray(users.id, IDS));
  await db.delete(accounts).where(or(eq(accounts.id, ACC), eq(accounts.id, POINT)));
}

describe("admin phase 2: trust", () => {
  let a: CurrentUser;
  let b: CurrentUser;
  let velocity: Record<string, number>;
  beforeAll(async () => {
    await cleanup();
    await db.insert(accounts).values([
      { id: ACC, type: "internal", name: "Trust test ops" },
      { id: POINT, type: "partner", name: "Trust Point" },
    ]);
    await db.insert(users).values([
      { id: A, name: "Admin A", roles: ["tuma_admin"] },
      { id: B, name: "Admin B", roles: ["tuma_admin"] },
      { id: CUST, name: "Neema Mteja", phone: PHONE, roles: [] },
      { id: RIDER, name: "Rider Ray", roles: ["rider"] },
    ]);
    a = await asUser(A, ["tuma_admin"]);
    b = await asUser(B, ["tuma_admin"]);
    [{ params: velocity }] = await db.select({ params: riskRules.params }).from(riskRules).where(eq(riskRules.key, "velocity"));
  });
  afterAll(async () => {
    await db.update(riskRules).set({ params: velocity }).where(eq(riskRules.key, "velocity"));
    await cleanup();
  });

  it("claims: evidence, liability, a settlement that waits for a second person, paid to the wallet", async () => {
    const s = await parcel(1);
    const c = await openClaim(a, { waybill: s.waybill, kind: "damaged", claimantName: "Neema", claimantPhone: PHONE, amountClaimed: 250_000, description: "Screen cracked on arrival" });
    await expect(openClaim(a, { waybill: s.waybill, kind: "lost", claimantName: "Neema", amountClaimed: 1000, description: "Duplicate claim here" })).rejects.toMatchObject({ code: "CLAIM_OPEN" });
    await addEvidence(a, c.id, { note: "Photo from the receiver shows a cracked screen" });
    await expect(decideClaim(a, c.id, { outcome: "pay", amount: 200_000, note: "Rider dropped the parcel" })).rejects.toMatchObject({ code: "NO_LIABILITY" });
    await setLiability(a, c.id, { liableParty: "rider", liableId: RIDER });
    await expect(decideClaim(a, c.id, { outcome: "pay", amount: 400_000, note: "More than they asked for" })).rejects.toMatchObject({ code: "OVER_CLAIM" });
    const d = await decideClaim(a, c.id, { outcome: "pay", amount: 200_000, note: "Rider dropped the parcel" });
    expect(d.status).toBe("proposed");
    const [ap] = await db.select().from(approvalRequests).where(eq(approvalRequests.kind, "claim_settle")).orderBy(approvalRequests.requestedAt);
    // Rejected: back to the adjuster.
    await decideApproval(b, ap.id, { approve: false, note: "Check the declared value" });
    expect((await getClaim(a, c.id)).claim.status).toBe("investigating");
    await decideClaim(a, c.id, { outcome: "pay", amount: 180_000, note: "Agreed lower amount with claimant" });
    const [ap2] = await db.select().from(approvalRequests).where(eq(approvalRequests.status, "pending"));
    await decideApproval(b, ap2.id, { approve: true });
    const done = await getClaim(a, c.id);
    expect(done.claim).toMatchObject({ status: "settled", settledAmount: 180_000 });
    const [w] = await db.select().from(walletEntries).where(eq(walletEntries.userId, CUST));
    expect(w).toMatchObject({ kind: "claim", amount: 180_000 });
    expect((await listClaims(a, "closed")).rows.some((r) => r.id === c.id)).toBe(true);
  });

  it("risk: rules raise alerts once, cases close with an outcome, a freeze needs a second person to lift", async () => {
    await db.update(riskRules).set({ params: { perHour: 2 } }).where(eq(riskRules.key, "velocity"));
    for (const n of [10, 11, 12]) await parcel(n);
    const ghost = await parcel(13, { state: "DELIVERED" });
    const t = Date.now() - 600_000;
    await db.insert(events).values([
      { id: `evt_trust_ofd`, shipmentId: ghost.id, type: "shipment.out_for_delivery", stateAfter: "OUT_FOR_DELIVERY", occurredAt: new Date(t), actorType: "rider", actorId: RIDER, source: "field_app" },
      { id: `evt_trust_dlv`, shipmentId: ghost.id, type: "shipment.delivered", stateAfter: "DELIVERED", occurredAt: new Date(t + 10_000), lat: -3.37, lng: 36.68, actorType: "rider", actorId: RIDER, source: "field_app" },
    ]);
    const first = await runRiskChecks(A);
    expect(first.created).toBeGreaterThanOrEqual(2);
    expect((await runRiskChecks(A)).created).toBe(0); // each finding once
    const ov = await riskOverview(a);
    const mine = ov.alerts.filter((x) => x.subjectId === RIDER);
    expect(mine.map((x) => x.rule).sort()).toEqual(expect.arrayContaining(["ghost_delivery", "velocity"]));
    const g = mine.find((x) => x.rule === "ghost_delivery")!;
    expect(g.details).toMatchObject({ waybill: ghost.waybill, secondsAfterOutForDelivery: 10 });

    const c = await openCase(a, mine[0].id);
    const cs = await getCase(a, c.id);
    expect(cs.alerts.length).toBe(mine.length);
    await addCaseNote(a, c.id, { text: "Called the receiver: never got it" });

    await placeHold(a, { subjectType: "user", subjectId: RIDER, reason: "Ghost deliveries under review", caseId: c.id });
    expect(await activeHold(RIDER, null)).not.toBeNull();
    const [h] = await db.select().from(riskHolds).where(eq(riskHolds.subjectId, RIDER));
    const r = await requestRelease(a, h.id, { reason: "Receiver found the parcel at a neighbour" });
    expect(r.pending).toBe(true);
    expect(await activeHold(RIDER, null)).not.toBeNull();
    const [ap] = await db.select().from(approvalRequests).where(eq(approvalRequests.kind, "risk_release"));
    await expect(decideApproval(a, ap.id, { approve: true })).rejects.toMatchObject({ code: "OWN_REQUEST" });
    await decideApproval(b, ap.id, { approve: true });
    expect(await activeHold(RIDER, null)).toBeNull();
    await closeCase(a, c.id, { outcome: "not_fraud", note: "Parcel was with a neighbour; coaching given" });
    expect((await getCase(a, c.id)).case).toMatchObject({ status: "closed", outcome: "not_fraud" });
  });

  it("compliance: KYC raises the tier, AML matches are reviewed by someone else, DSR export and erasure", async () => {
    await expect(assertKycAllows(CUST, 600_000)).rejects.toMatchObject({ code: "KYC_LIMIT" });
    const k = await submitKyc(a, { phone: "0719000777", fullName: "Neema Mteja", idType: "nida", idNumber: "19900101-12345-00001-23", tier: 2 });
    await expect(reviewKyc(a, k.id, true)).rejects.toMatchObject({ code: "OWN_REQUEST" });
    await reviewKyc(b, k.id, true);
    const [u] = await db.select({ tier: users.kycTier }).from(users).where(eq(users.id, CUST));
    expect(u.tier).toBe(2);
    await expect(assertKycAllows(CUST, 600_000)).resolves.toBeUndefined();
    const [rec] = await db.select().from(kycRecords).where(eq(kycRecords.id, k.id));
    expect(rec.idLast4).toBe("0123"); // only the last four characters are kept

    expect(nameScore("Juma Kassim Mbwana", "MBWANA, Juma")).toBeGreaterThanOrEqual(60);
    expect(nameScore("Neema Mteja", "Juma Kassim Mbwana")).toBe(0);
    await addWatchlist(a, { name: "Juma Kassim Mbwana", kind: "sanctions", source: "Test list" });
    const clear = await screenName(a, { name: "Neema Mteja" });
    expect(clear.result).toBe("clear");
    const hit = await screenName(a, { name: "Mbwana Juma" });
    expect(hit.result).toBe("possible_match");
    await expect(reviewScreening(a, hit.id, { verdict: "false_positive", note: "Different date of birth" })).rejects.toMatchObject({ code: "OWN_REQUEST" });
    await reviewScreening(b, hit.id, { verdict: "false_positive", note: "Different date of birth" });

    const d = await openDsr(a, { name: "Neema Mteja", phone: "0719000777", kind: "erasure", detail: "Please delete my data" });
    const ex = await dsrExport(a, d.id);
    expect(ex.profile?.id).toBe(CUST);
    expect(ex.parcels.length).toBeGreaterThan(0);
    await closeDsr(a, d.id, { outcome: "done", response: "Personal details wiped; parcel records kept as the law requires" });
    const [gone] = await db.select().from(users).where(eq(users.id, CUST));
    expect(gone.deletedAt).not.toBeNull();
    expect(gone.phone).not.toBe(PHONE);
  });

  it("payouts: owed jobs and handovers, approved by a second person, never paid twice", async () => {
    const today = new Date().toISOString().slice(0, 10);
    await db.insert(jobs).values({
      ref: "JTRUST1",
      accountId: ACC,
      kind: "parcel",
      region: "Dar es Salaam",
      status: "completed",
      pickup: { name: "Hub", address: "Ilala", lat: -6.8, lng: 39.2 },
      payout: 7_000,
      driverId: RIDER,
      createdBy: A,
      completedAt: new Date(),
    });
    await parcel(20, { handlingPartnerId: POINT, deliveredAt: new Date(), state: "DELIVERED" });
    const preview = await previewPayouts(a, { from: today, to: today });
    expect(preview.find((p) => p.payeeId === RIDER)).toMatchObject({ amount: 7_000, lines: 1 });
    expect(preview.find((p) => p.payeeId === POINT)).toMatchObject({ amount: 500, lines: 1 });
    await proposePayouts(a, { from: today, to: today });
    const again = await previewPayouts(a, { from: today, to: today });
    expect(again.find((p) => p.payeeId === RIDER)).toBeUndefined();
    const aps = await db.select().from(approvalRequests).where(eq(approvalRequests.kind, "payout"));
    const rider = aps.find((x) => x.subjectId === RIDER)!;
    const point = aps.find((x) => x.subjectId === POINT)!;
    await decideApproval(b, rider.id, { approve: true });
    await decideApproval(b, point.id, { approve: false, note: "Fee not agreed yet" });
    const list = await listPayouts(a, "open");
    expect(list.rows.find((r) => r.payeeId === RIDER)?.status).toBe("sent");
    // The rejected point's parcel is owed again.
    expect((await previewPayouts(a, { from: today, to: today })).find((p) => p.payeeId === POINT)).toMatchObject({ amount: 500 });
  });
});
