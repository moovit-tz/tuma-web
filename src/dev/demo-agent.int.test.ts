/**
 * Local demo data for designing the agent web portal (not a test): one parcel agent business on its trial allowance,
 * with a spread of parcels. Runs through vitest only so Next's cache helpers are stubbed. Point it at a scratch
 * database, never a shared one:
 *   DATABASE_URL_TEST=postgres://…/tuma_design npx vitest run --project integration src/dev/demo-agent.int.test.ts
 * Then sign in at /dev/ondi as "ondi|demo.agent". Skipped unless DEMO_AGENT=1.
 */
import { it } from "vitest";

const SUB = "ondi|demo.agent";

it.runIf(process.env.DEMO_AGENT === "1")("creates the demo agent", async () => {
  delete process.env.HUDUPAY_URL;
  await main();
}, 120_000);

async function main() {
  const { db } = await import("@/server/db/client");
  const { accounts, platformSettings, shipments, users } = await import("@/server/db/schema");
  const { eq } = await import("drizzle-orm");
  const { driverContext, finishDriverLogin } = await import("@/server/services/drivers");
  const { submitKyb } = await import("@/server/services/kyb");
  const { agentBook } = await import("@/server/services/agent-parcels");

  await db.insert(platformSettings).values({ key: "pendingParcelAllowance", value: 200 }).onConflictDoUpdate({ target: platformSettings.key, set: { value: 200 } });
  const [existing] = await db.select().from(users).where(eq(users.id, SUB));
  if (!existing) await finishDriverLogin({ sub: SUB, name: "Neema Mushi", email: "neema@kariakoo-parcels.test", phone: "+255713500600", roles: [] }, "x".repeat(43));
  let me = (await driverContext(SUB))!;
  if (!me.user.accountId) {
    await submitKyb(me, {
      businessName: "Kariakoo Parcels",
      businessType: "sole_trader",
      tin: "456-789-123",
      office: { region: "Dar es Salaam", district: "Ilala", street: "Msimbazi St", landmark: "Opposite Kariakoo Market", phone: "0713 500 600", hours: "Mon–Sat 8:00–18:00" },
      contact: { name: "Neema Mushi", phone: "0713 500 600" },
      workflow: ["receive", "dispatch", "deliver"],
      declaration: true,
    });
    me = (await driverContext(SUB))!;
  }
  await db.update(accounts).set({ payOnDelivery: true }).where(eq(accounts.id, me.user.accountId!));
  const have = await db.select({ id: shipments.id }).from(shipments).where(eq(shipments.accountId, me.user.accountId!));
  if (have.length >= 10) return console.log(`Demo agent ready (${have.length} parcels). Sign in as ${SUB}.`);

  const people = [
    ["Rehema Mwakyusa", "0712 111 201"], ["Joseph Kimaro", "0754 222 302"], ["Fatuma Ally", "0715 333 403"], ["Emmanuel Shirima", "0767 444 504"],
    ["Zawadi Massawe", "0713 555 605"], ["Hassan Mfinanga", "0688 666 706"], ["Asha Bakari", "0744 777 807"], ["Godfrey Swai", "0719 888 908"],
  ] as const;
  const places = [
    ["Mwanza", "Ilemela", "Near Rock City Mall"], ["Arusha", "Arusha City", "Clock Tower"], ["Dodoma", "Dodoma City", "Jamhuri Stadium"], ["Mbeya", "Mbeya City", "Soweto market"],
    ["Morogoro", "Morogoro Municipal", "Msamvu stand"], ["Kilimanjaro", "Moshi Municipal", "Moshi bus stand"], ["Tanga", "Tanga City", "Uhuru Park"],
  ] as const;
  const goods = ["Two pairs of shoes", "Phone and charger", "Documents (envelope)", "Kitenge fabric, 6 pieces", "Spare parts: brake pads", "Baby clothes", "Laptop bag", "Books, 4"];
  for (let i = 0; i < 14; i++) {
    const s = people[i % people.length];
    const r = people[(i + 3) % people.length];
    const p = places[i % places.length];
    const senderPays = i % 3 !== 0;
    await agentBook(me.user, {
      sender: { name: s[0], phone: s[1] },
      receiver: { name: r[0], phone: r[1], region: p[0], district: p[1], landmark: p[2] },
      goods: goods[i % goods.length],
      weightKg: [0.5, 1, 2, 3.5, 5][i % 5],
      size: ["small", "medium", "large"][i % 3],
      payer: senderPays ? "sender" : "receiver",
      paidWith: senderPays ? "cash" : undefined,
      price: [5000, 7000, 9500, 12000, 15000][i % 5],
      declaredValue: [30000, 50000, 120000, 250000][i % 4],
      noProhibited: true,
    }).catch((e: Error) => console.warn(`booking ${i}: ${e.message}`));
  }
  // Spread them over the last week and through the states the desk shows.
  const rows = await db.select({ id: shipments.id }).from(shipments).where(eq(shipments.accountId, me.user.accountId!));
  const states = ["RECEIVED", "RECEIVED", "RECEIVED", "IN_TRANSIT", "IN_TRANSIT", "AT_HUB", "READY_FOR_COLLECTION", "OUT_FOR_DELIVERY", "DELIVERED", "DELIVERED", "DELIVERED", "AWAITING_HANDOVER", "RECEIVED", "IN_TRANSIT"] as const;
  for (const [i, row] of rows.entries()) {
    const at = new Date(Date.now() - (i % 7) * 86400_000 - i * 3600_000);
    await db.update(shipments).set({ state: states[i % states.length], createdAt: at, updatedAt: at }).where(eq(shipments.id, row.id));
  }
  console.log(`Demo agent ready (${rows.length} parcels). Sign in as ${SUB}.`);
}

