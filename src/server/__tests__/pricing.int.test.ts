import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { accounts, agents, branches, customers, invoices, kybApplications, parcelPayments, paymentSettings, platformSettings, rolePermissions, roles, shipments, users } from "../db/schema";
import { driverContext, finishDriverLogin, swapHandoff, type DriverCtx } from "../services/drivers";
import { submitKyb } from "../services/kyb";
import { agentBook } from "../services/agent-parcels";
import { publishPricing, pricingSnapshot, darToday } from "../services/pricing-analytics";
import { stubInbox } from "../adapters/hudubi";
import { outbox } from "../db/schema";
import { verifyDriverToken } from "../auth/driver-token";
import { DEFAULT_ROLES } from "@/domain/roles";

const A = "ondi|pricing.test.a";
const B = "ondi|pricing.test.b";
const SUBS = [A, B];

async function signIn(sub: string, name: string, phone: string): Promise<DriverCtx> {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const code = await finishDriverLogin({ sub, name, email: `${sub.split("|")[1]}@example.test`, phone, roles: [] }, challenge);
  const { token } = await swapHandoff(code, verifier);
  return (await driverContext(await verifyDriverToken(token)))!;
}

async function cleanup() {
  const apps = await db.select({ accountId: kybApplications.accountId }).from(kybApplications).where(inArray(kybApplications.userId, SUBS));
  // Also by TIN: a run that stopped halfway can leave the business behind without its application.
  const byTin = await db.select({ accountId: accounts.id }).from(accounts).where(inArray(accounts.tin, ["414525636", "747858969"]));
  const accts = [...new Set([...apps, ...byTin].map((r) => r.accountId).filter((a): a is string => !!a))];
  await db.execute(sql`delete from kyb_events where application_id in (select id from kyb_applications where user_id in (${sql.join(SUBS.map((s) => sql`${s}`), sql`, `)}))`);
  await db.update(users).set({ accountId: null, branchId: null }).where(inArray(users.id, SUBS));
  await db.delete(kybApplications).where(inArray(kybApplications.userId, SUBS));
  if (accts.length) {
    const ids = sql`(select id from shipments where account_id in (${sql.join(accts.map((a) => sql`${a}`), sql`, `)}))`;
    for (const t of ["pieces", "events", "charge_snapshots", "cod_records", "exceptions", "notifications", "job_shipments", "parcel_ratings", "wallet_entries", "parcel_payments", "invoices", "tracking_otps"]) {
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
  await db.delete(outbox).where(eq(outbox.target, "hudubi"));
});
afterAll(async () => {
  await cleanup();
  await db.$client.end();
});


const parcel = (price: number, over: Record<string, unknown> = {}) => ({
  sender: { name: "Mama Ntilie", phone: "0712 111 999" },
  receiver: { name: "Baraka Receiver", phone: "0754 333 444", region: "Mwanza", district: "Ilemela", landmark: "Rock City Mall" },
  goods: "Kitenge cloth",
  weightKg: 2,
  payer: "sender",
  paidWith: "cash",
  price,
  declaredValue: 30000,
  noProhibited: true,
  ...over,
});
const company = { kind: "company", name: "Kilimo Supplies Ltd", phone: "0713 222 888", tin: "121-343-565" };

async function agent(sub: string, name: string, phone: string, tin: string) {
  await signIn(sub, name, phone);
  await submitKyb((await driverContext(sub))!, {
    businessName: name,
    businessType: "sole_trader",
    tin,
    office: { region: "Arusha", district: "Arusha City", street: "Sokoine Rd", phone, lat: -3.37, lng: 36.68 },
    contact: { name, phone },
    workflow: ["receive", "deliver"],
    declaration: true,
  });
  return (await driverContext(sub))!;
}

describe("parcel pricing analytics for HuduBI", () => {
  it("finds an agent far above the market, free parcels and a company paying different prices, and publishes it", async () => {
    const a = await agent(A, "Cheap Parcels", "+255713700100", "414-525-636");
    const b = await agent(B, "Dear Parcels", "+255713700200", "747-858-969");
    for (let i = 0; i < 4; i++) await agentBook(a.user, parcel(5000 + i * 100));
    for (let i = 0; i < 4; i++) await agentBook(b.user, parcel(12000));
    await agentBook(a.user, parcel(0));
    for (const [who, price] of [[a, 5000], [a, 5000], [b, 12000], [b, 12000]] as const) await agentBook(who.user, parcel(price, { sender: company, paidWith: "invoice" }));

    const snap = await pricingSnapshot(darToday());
    const lane = (r: { laneFrom: string; laneTo: string; weightBand: string }) => r.laneFrom === "Arusha" && r.laneTo === "Mwanza" && r.weightBand === "1-3";
    const g = snap.rows.find((r) => r.scope === "global" && lane(r))!;
    expect(g.parcels).toBeGreaterThanOrEqual(12);
    const dear = snap.rows.find((r) => r.scope === "agent" && r.scopeName === "Dear Parcels" && lane(r))!;
    expect(dear).toMatchObject({ parcels: 6, median: 12000, min: 12000, max: 12000 });
    expect(snap.rows.find((r) => r.scope === "company" && r.scopeId === "121343565" && lane(r))).toMatchObject({ parcels: 4, scopeName: "Kilimo Supplies Ltd" });

    const kinds = (n: string) => snap.signals.filter((s) => s.scopeName === n).map((s) => s.kind);
    expect(kinds("Dear Parcels")).toContain("agent_above_market");
    expect(kinds("Cheap Parcels")).toContain("zero_priced");
    expect(snap.signals.find((s) => s.kind === "company_price_spread" && s.scopeName === "Kilimo Supplies Ltd")).toMatchObject({ data: { low: 5000, high: 12000, agents: 2 } });

    const before = stubInbox.length;
    const r = await publishPricing();
    expect(r).toMatchObject({ sent: 1, failed: 0 });
    expect(stubInbox.at(-1)).toMatchObject({ topic: "tuma.pricing.snapshot", key: `hudubi:pricing:${darToday()}` });
    // Running again the same day sends the newer figures under the same key, once.
    await publishPricing();
    expect(stubInbox.length).toBe(before + 2);
    expect(await db.select().from(outbox).where(eq(outbox.target, "hudubi"))).toHaveLength(1);
    // Two businesses and seven parcels: slow when the whole suite shares the database.
  }, 60_000);
});
