/**
 * Development seed. Idempotent for reference data; demo shipments are recreated with --reset.
 *   pnpm db:seed           reference data + demo data if there are no shipments yet
 *   pnpm db:seed --reset   wipe shipments and recreate demo data
 *   pnpm db:seed --platform   production: roles, reason codes, hubs and Tuma's internal account only (no demo data)
 */
import { config } from "dotenv";
config({ path: ".env.local", override: false });

import { createHash, randomInt } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { count, eq, sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../src/server/db/schema";
import { DEFAULT_ROLES } from "../src/domain/roles";
import { generateWaybill } from "../src/domain/waybill-number";
import { promisedAt, quote, type ServiceLevel } from "../src/domain/pricing";
import { eventTypeFor, type ParcelState } from "../src/domain/states";
import { ulid } from "../src/server/ids";
import collectionPoints from "../drizzle/seed/collection-points.json";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema, casing: "snake_case" });
const reset = process.argv.includes("--reset");
const platform = process.argv.includes("--platform");
const referenceOnly = platform || process.argv.includes("--reference-only");

/* deterministic PRNG so demo data is stable between runs */
let seed = 20261101;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];

const REASONS = [
  ["FD01", "failed_delivery", "Receiver not reachable", "Mpokeaji hapatikani"],
  ["FD02", "failed_delivery", "Address wrong or incomplete", "Anwani si sahihi au haijakamilika"],
  ["FD03", "failed_delivery", "Receiver refused the parcel", "Mpokeaji amekataa kifurushi"],
  ["FD04", "failed_delivery", "Premises closed", "Mahali pamefungwa"],
  ["FD05", "failed_delivery", "Receiver asked to reschedule", "Mpokeaji ameomba kupanga upya"],
  ["FD06", "failed_delivery", "Receiver could not pay the COD amount", "Mpokeaji hakuweza kulipa kiasi cha COD"],
  ["FD07", "failed_delivery", "Access restricted", "Ufikiaji umezuiliwa"],
  ["FD08", "failed_delivery", "Weather or road conditions", "Hali ya hewa au barabara"],
  ["FD09", "failed_delivery", "Other (see the driver's note)", "Nyingine (angalia maelezo ya dereva)"],
  ["EX01", "exception", "Damaged", "Kimeharibika"],
  ["EX02", "exception", "Lost or missing", "Kimepotea au hakipo"],
  ["EX03", "exception", "Held for prohibited or suspect item", "Kimezuiliwa kwa bidhaa iliyokatazwa au inayoshukiwa"],
  ["EX04", "exception", "Label missing or unreadable", "Lebo haipo au haisomeki"],
  ["EX05", "exception", "Vehicle breakdown", "Gari limeharibika"],
  ["EX06", "exception", "Delay: road closure or traffic", "Kuchelewa: barabara imefungwa au foleni"],
  ["EX07", "exception", "Delay: border or checkpoint", "Kuchelewa: mpaka au kituo cha ukaguzi"],
  ["EX08", "exception", "Shortage at offload", "Upungufu wakati wa kupakua"],
  ["OV01", "override", "Scan missed, corrected by operations", "Skani haikufanyika, imesahihishwa na operesheni"],
  ["OV02", "override", "Customer request", "Ombi la mteja"],
  ["CN01", "cancellation", "Sender asked to cancel", "Mtumaji ameomba kusitisha"],
  ["CN02", "cancellation", "Prohibited or restricted item found", "Bidhaa iliyokatazwa au yenye masharti imegundulika"],
  ["CN03", "cancellation", "Damaged or badly packed; sender took it back", "Kimeharibika au kimefungwa vibaya; mtumaji amekichukua"],
  ["CN04", "cancellation", "Booked by mistake (wrong details or twice)", "Kimesajiliwa kimakosa (taarifa si sahihi au mara mbili)"],
  ["CN05", "cancellation", "Sender never paid", "Mtumaji hajalipa"],
  ["CN06", "cancellation", "Other (see the note)", "Nyingine (angalia maelezo)"],
] as const;

const LOCATIONS: (typeof schema.locations.$inferInsert)[] = [
  { id: "DAR-ILA-01", type: "hub", name: "Ilala Hub", region: "Dar es Salaam", district: "Ilala", ward: "Gerezani", landmark: "Near Kamata bus stop", lat: -6.8235, lng: 39.2695, hours: "06:00–22:00" },
  { id: "ARU-CEN-01", type: "hub", name: "Arusha Hub", region: "Arusha", district: "Arusha City", ward: "Kaloleni", lat: -3.3731, lng: 36.6853, hours: "07:00–20:00" },
  { id: "MWZ-NYA-01", type: "hub", name: "Mwanza Hub", region: "Mwanza", district: "Nyamagana", ward: "Mirongo", lat: -2.5164, lng: 32.9017, hours: "07:00–20:00" },
  { id: "DOD-CEN-01", type: "hub", name: "Dodoma Hub", region: "Dodoma", district: "Dodoma City", ward: "Majengo", lat: -6.163, lng: 35.7516, hours: "07:00–20:00" },
  { id: "WK-DAR-KKO-01", type: "wakala", name: "Wakala Kariakoo — Msimbazi St", region: "Dar es Salaam", district: "Ilala", ward: "Kariakoo", street: "Msimbazi", landmark: "Opposite Kariakoo market gate 3", lat: -6.8189, lng: 39.2773, phone: "+255713000101", hours: "08:00–20:00" },
  { id: "WK-DAR-MKV-01", type: "wakala", name: "Wakala Mikocheni — Shoppers", region: "Dar es Salaam", district: "Kinondoni", ward: "Mikocheni", landmark: "Shoppers Plaza ground floor", lat: -6.7614, lng: 39.2426, phone: "+255713000102", hours: "09:00–21:00" },
  { id: "WK-DAR-MBZ-01", type: "wakala", name: "Wakala Mbezi Mwisho", region: "Dar es Salaam", district: "Ubungo", ward: "Mbezi", landmark: "Next to Magufuli bus terminal", lat: -6.7339, lng: 39.1008, phone: "+255713000103", hours: "07:00–21:00" },
  { id: "WK-ARU-NGR-01", type: "wakala", name: "Wakala Ngarenaro", region: "Arusha", district: "Arusha City", ward: "Ngarenaro", landmark: "Ngarenaro market", lat: -3.3622, lng: 36.6788, phone: "+255713000104", hours: "08:00–19:00" },
  { id: "WK-MWZ-KIR-01", type: "wakala", name: "Wakala Kirumba", region: "Mwanza", district: "Ilemela", ward: "Kirumba", landmark: "Kirumba stadium roundabout", lat: -2.5017, lng: 32.9097, phone: "+255713000105", hours: "08:00–19:00" },
  { id: "WK-DOD-MJN-01", type: "wakala", name: "Wakala Majengo Dodoma", region: "Dodoma", district: "Dodoma City", ward: "Majengo", landmark: "Majengo market entrance", lat: -6.1702, lng: 35.7419, phone: "+255713000106", hours: "08:00–19:00" },
];

const ACCOUNTS: (typeof schema.accounts.$inferInsert)[] = [
  { id: "acc_kariakoo_mart", type: "merchant", name: "Kariakoo Mart Ltd", tin: "123-456-789", allowedServiceLevels: ["same_day", "next_day", "standard"], rateCardRef: "RC-MERCH-STD-2026", paymentPolicy: "warn" },
  { id: "acc_zuri_fashion", type: "merchant", name: "Zuri Fashion House", tin: "987-654-321", allowedServiceLevels: ["next_day", "standard"], rateCardRef: "RC-MERCH-STD-2026", paymentPolicy: "block" },
  { id: "acc_moovit_ops", type: "internal", name: "Moovit Operations", allowedServiceLevels: ["same_day", "next_day", "standard"] },
  { id: "acc_kilimanjaro_freight", type: "partner", partnerKind: "freight_forwarder", name: "Kilimanjaro Freight Ltd", tin: "456-112-908" },
  { id: "acc_mzizima_wh", type: "partner", partnerKind: "warehouse", name: "Mzizima Warehousing", tin: "331-778-204" },
];

const USERS: (typeof schema.users.$inferInsert)[] = [
  { id: "ondi|amina.juma", name: "Amina Juma", email: "amina@kariakoomart.co.tz", accountId: "acc_kariakoo_mart", roles: ["merchant_user"], locale: "en" },
  { id: "ondi|baraka.mushi", name: "Baraka Mushi", email: "baraka@zurifashion.co.tz", accountId: "acc_zuri_fashion", roles: ["merchant_user"], locale: "sw" },
  { id: "ondi|neema.mollel", name: "Neema Mollel", email: "neema@moovit.co.tz", accountId: "acc_moovit_ops", roles: ["control_tower"], scope: { region: "Dar es Salaam" } },
  { id: "ondi|john.mrema", name: "John Mrema", email: "john@moovit.co.tz", accountId: "acc_moovit_ops", roles: ["dispatcher"], scope: { hubId: "DAR-ILA-01" } },
  { id: "ondi|halima.said", name: "Halima Said", email: "halima@hudumika.co.tz", accountId: "acc_moovit_ops", roles: ["finance_officer"] },
  { id: "ondi|admin", name: "Tuma Admin", email: "admin@moovit.co.tz", accountId: "acc_moovit_ops", roles: ["tuma_admin"] },
  { id: "ondi|salim.rider", name: "Salim Hassan", email: "salim@moovit.co.tz", accountId: "acc_moovit_ops", roles: ["rider"] },
  { id: "ondi|grace.lyimo", name: "Grace Lyimo", email: "grace@kilifreight.co.tz", accountId: "acc_kilimanjaro_freight", roles: ["partner_admin"] },
  { id: "ondi|peter.kweka", name: "Peter Kweka", email: "accounts@kilifreight.co.tz", accountId: "acc_kilimanjaro_freight", roles: ["partner_finance"] },
  { id: "ondi|daudi.mfinanga", name: "Daudi Mfinanga", email: "ops@mzizima.co.tz", accountId: "acc_mzizima_wh", roles: ["partner_ops"] },
];

const PEOPLE = ["Rehema Mwakyusa", "Joseph Kimaro", "Fatuma Ally", "Emmanuel Shirima", "Zawadi Massawe", "Hassan Mfinanga", "Grace Lyimo", "Daudi Nyerere", "Mwanaisha Omary", "Peter Kweka", "Asha Bakari", "Godfrey Swai", "Upendo Minja", "Ally Mohamed", "Esther Mbwambo"];
const DESTS = [
  { region: "Dar es Salaam", district: "Kinondoni", ward: "Sinza", landmark: "Sinza Mori, near Lion Hotel", hub: "DAR-ILA-01" },
  { region: "Dar es Salaam", district: "Temeke", ward: "Mbagala", landmark: "Mbagala Rangi Tatu", hub: "DAR-ILA-01" },
  { region: "Dar es Salaam", district: "Ubungo", ward: "Kimara", landmark: "Kimara Stop Over", hub: "DAR-ILA-01" },
  { region: "Arusha", district: "Arusha City", ward: "Sakina", landmark: "Sakina petrol station", hub: "ARU-CEN-01" },
  { region: "Mwanza", district: "Ilemela", ward: "Buswelu", landmark: "Buswelu market", hub: "MWZ-NYA-01" },
  { region: "Dodoma", district: "Dodoma City", ward: "Area D", landmark: "Area D roundabout", hub: "DOD-CEN-01" },
  { region: "Morogoro", district: "Morogoro Urban", ward: "Kihonda", landmark: "Kihonda Maghorofani", hub: "DAR-ILA-01" },
];
const GOODS = [
  ["Phone accessories", "electronics"],
  ["Kitenge fabric, 3 pieces", "apparel"],
  ["Shoes", "apparel"],
  ["Cosmetics set", "beauty"],
  ["Books", "books"],
  ["Kitchen blender", "home"],
  ["Laptop bag", "accessories"],
] as const;

/** Progressions that end in the target state. */
const PATHS: Record<string, ParcelState[]> = {
  AWAITING_HANDOVER: ["CREATED", "AWAITING_HANDOVER"],
  RECEIVED: ["CREATED", "AWAITING_HANDOVER", "RECEIVED"],
  AT_HUB: ["CREATED", "AWAITING_HANDOVER", "RECEIVED", "AT_HUB"],
  IN_TRANSIT: ["CREATED", "AWAITING_HANDOVER", "RECEIVED", "AT_HUB", "IN_TRANSIT"],
  OUT_FOR_DELIVERY: ["CREATED", "AWAITING_HANDOVER", "RECEIVED", "AT_HUB", "OUT_FOR_DELIVERY"],
  ATTEMPT_FAILED: ["CREATED", "AWAITING_HANDOVER", "RECEIVED", "AT_HUB", "OUT_FOR_DELIVERY", "ATTEMPT_FAILED"],
  READY_FOR_COLLECTION: ["CREATED", "AWAITING_HANDOVER", "RECEIVED", "AT_HUB", "READY_FOR_COLLECTION"],
  DELIVERED: ["CREATED", "AWAITING_HANDOVER", "RECEIVED", "AT_HUB", "OUT_FOR_DELIVERY", "DELIVERED"],
  CANCELLED: ["CREATED", "AWAITING_HANDOVER", "CANCELLED"],
};
const STATE_MIX = ["DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "OUT_FOR_DELIVERY", "OUT_FOR_DELIVERY", "AT_HUB", "IN_TRANSIT", "RECEIVED", "AWAITING_HANDOVER", "AWAITING_HANDOVER", "ATTEMPT_FAILED", "READY_FOR_COLLECTION", "CANCELLED"];

async function seedReference() {
  // Fuzzy text matching for portal search.
  await db.execute(sql`create extension if not exists pg_trgm`);
  for (const r of DEFAULT_ROLES) {
    await db
      .insert(schema.roles)
      .values({ key: r.key, name: r.name, description: r.description, surface: r.surface, system: true })
      .onConflictDoNothing();
    // Grant defaults only to roles that have no grants yet, so admin edits survive re-seeding.
    const [{ n }] = await db.select({ n: count() }).from(schema.rolePermissions).where(sql`${schema.rolePermissions.roleKey} = ${r.key}`);
    if (n === 0 && r.permissions.length) {
      await db.insert(schema.rolePermissions).values(r.permissions.map((p) => ({ roleKey: r.key, permission: p })));
    }
  }
  for (const [code, kind, en, sw] of REASONS) {
    await db.insert(schema.reasonCodes).values({ code, kind, labelEn: en, labelSw: sw }).onConflictDoNothing();
  }
  for (const l of LOCATIONS) await db.insert(schema.locations).values(l).onConflictDoNothing();
  // Common collection points (Location_Master_Clean.xlsx). Names and places refresh; pins someone set are kept.
  for (const p of collectionPoints) {
    await db
      .insert(schema.locations)
      .values({ id: p.id, type: "collection_point", name: p.name, country: p.country, region: p.region, district: p.district })
      .onConflictDoUpdate({ target: schema.locations.id, set: { name: p.name, country: p.country, region: p.region, district: p.district } });
  }
  // Production gets Tuma's own account only: demo merchants, partners and personas stay out.
  for (const a of ACCOUNTS.filter((x) => !platform || x.type === "internal")) await db.insert(schema.accounts).values(a).onConflictDoNothing();
  if (!platform) for (const u of USERS) await db.insert(schema.users).values(u).onConflictDoNothing();
}

async function seedShipments() {
  const [{ n }] = await db.select({ n: count() }).from(schema.shipments);
  if (n > 0 && !reset) {
    console.log(`  ${n} shipments exist; skipping demo shipments (use --reset to recreate)`);
    return;
  }
  if (reset) {
    await db.execute(sql`truncate notifications, exceptions, cod_records, charge_snapshots, events, pieces, outbox, audit_log, tracking_otps, partner_payments, partner_invoices, partner_clients, vehicles, shipments restart identity cascade`);
  }

  const merchants = [
    { account: "acc_kariakoo_mart", user: "ondi|amina.juma", shipper: { name: "Kariakoo Mart Ltd", phone: "+255754100200", address: { region: "Dar es Salaam", district: "Ilala", ward: "Kariakoo", street: "Msimbazi", landmark: "Block 14, above Azam shop" } }, origin: "WK-DAR-KKO-01" },
    { account: "acc_zuri_fashion", user: "ondi|baraka.mushi", shipper: { name: "Zuri Fashion House", phone: "+255765300400", address: { region: "Dar es Salaam", district: "Kinondoni", ward: "Mikocheni", landmark: "Shoppers Plaza, shop 22" } }, origin: "WK-DAR-MKV-01" },
  ];

  const now = Date.now();
  let made = 0;
  for (let i = 0; i < 64; i++) {
    const m = merchants[i % 2];
    const target = pick(STATE_MIX);
    const dest = pick(DESTS);
    const [goods, category] = pick(GOODS);
    const serviceLevel: ServiceLevel = dest.region === "Dar es Salaam" ? pick(["same_day", "next_day", "standard"] as const) : pick(["next_day", "standard"] as const);
    const sl = m.account === "acc_zuri_fashion" && serviceLevel === "same_day" ? "next_day" : serviceLevel;
    const isCod = rnd() < 0.55;
    const codAmount = isCod ? Math.round((15000 + rnd() * 250000) / 500) * 500 : undefined;
    // Most operators run pay-on-delivery: the receiver pays the delivery fee at the door.
    const terms = pick(["pay_on_delivery", "pay_on_delivery", "pay_on_delivery", "account", "prepaid"] as const);
    const pieceCount = rnd() < 0.15 ? 2 : 1;
    const pcs = Array.from({ length: pieceCount }, () => ({ weightKg: Math.round((0.3 + rnd() * 6) * 10) / 10, lengthCm: 20 + Math.floor(rnd() * 30), widthCm: 15 + Math.floor(rnd() * 20), heightCm: 5 + Math.floor(rnd() * 20) }));
    const deliveryMode = rnd() < 0.2 ? "wakala_collect" : "door";
    const q = quote({ originRegion: "Dar es Salaam", destRegion: dest.region, serviceLevel: sl, pieces: pcs, codAmount, deliveryMode });
    if (!q.ok) continue;

    // Age: delivered ones older, in-flight ones recent. A few are overdue to populate "SLA at risk".
    const ageHours = target === "DELIVERED" || target === "CANCELLED" ? 30 + rnd() * 400 : target === "AWAITING_HANDOVER" ? rnd() * 20 : 6 + rnd() * 70;
    const createdAt = new Date(now - ageHours * 3600e3);
    const promise = promisedAt(sl, q.zone, createdAt);
    const path = PATHS[target];
    const waybill = generateWaybill("parcel", createdAt);
    const consigneeName = pick(PEOPLE);
    const phone = `+2557${String(Math.floor(10000000 + rnd() * 89999999))}`;
    const delivery = deliveryMode === "wakala_collect" ? LOCATIONS.find((l) => l.type === "wakala" && l.region === dest.region)?.id : undefined;
    const isException = target === "ATTEMPT_FAILED" ? rnd() < 0.5 : rnd() < 0.06 && target !== "DELIVERED" && target !== "CANCELLED";

    const span = Math.max(1, Date.now() - createdAt.getTime() - 3600e3);
    const stepTimes = path.map((_, k) => new Date(createdAt.getTime() + (k === 0 ? 0 : (span * k) / path.length + rnd() * 600e3)));
    const deliveredAt = target === "DELIVERED" ? stepTimes[stepTimes.length - 1] : null;
    // Most deliveries on time; some late.
    const finalPromise = target === "DELIVERED" && rnd() < 0.85 && deliveredAt && deliveredAt > promise ? new Date(deliveredAt.getTime() + 3 * 3600e3) : promise;

    const [s] = await db
      .insert(schema.shipments)
      .values({
        waybill,
        type: "parcel",
        accountId: m.account,
        merchantRef: `${m.account === "acc_kariakoo_mart" ? "KM" : "ZF"}-${String(10400 + i)}`,
        state: target as ParcelState,
        exception: isException,
        serviceLevel: sl,
        paymentTerms: terms,
        prepayMethod: terms === "prepaid" ? pick(["mobile_money", "card", "bank_transfer"]) : null,
        collectMethods: pick([["cash", "mobile_money"], ["cash", "mobile_money", "card"], ["mobile_money"]]),
        handoverMode: rnd() < 0.6 ? "wakala_dropoff" : "pickup",
        deliveryMode: delivery ? "wakala_collect" : "door",
        shipper: { ...m.shipper, language: "en" },
        consignee: { name: consigneeName, phone, language: rnd() < 0.7 ? "sw" : "en", address: { region: dest.region, district: dest.district, ward: dest.ward, landmark: dest.landmark } },
        pickupLocationId: m.origin,
        deliveryLocationId: delivery,
        goodsDescription: goods,
        goodsCategory: category,
        codAmount: codAmount ?? null,
        prohibitedDeclared: true,
        piecesCount: pieceCount,
        actualWeightG: q.weights.actualG,
        volumetricWeightG: q.weights.volumetricG,
        chargeableWeightG: q.weights.chargeableG,
        totalCharge: q.total,
        promisedAt: finalPromise,
        deliveredAt,
        attempts: target === "ATTEMPT_FAILED" ? 1 : 0,
        channel: "portal",
        createdBy: m.user,
        createdAt,
        updatedAt: stepTimes[stepTimes.length - 1],
      })
      .returning();

    await db.insert(schema.pieces).values(pcs.map((p, k) => ({ shipmentId: s.id, seq: k + 1, weightG: Math.round(p.weightKg * 1000), lengthCm: p.lengthCm, widthCm: p.widthCm, heightCm: p.heightCm })));
    await db.insert(schema.chargeSnapshots).values({ shipmentId: s.id, version: 1, lines: q.lines, subtotal: q.subtotal, tax: q.tax, total: q.total, taxRef: "VAT18-ESTIMATE", reason: "confirmation", createdAt });
    const feeDue = terms === "pay_on_delivery" ? q.total : 0;
    if (codAmount || feeDue) {
      const collected = target === "DELIVERED";
      await db.insert(schema.codRecords).values({
        shipmentId: s.id,
        amountDue: codAmount ?? 0,
        amountCollected: collected ? (codAmount ?? 0) : 0,
        feeDue,
        feeCollected: collected ? feeDue : 0,
        status: collected ? (rnd() < 0.5 ? "remitted" : "collected") : target === "CANCELLED" ? "none" : "due",
        method: collected ? pick(["cash", "mobile_money"]) : null,
        holderId: collected ? "ondi|salim.rider" : null,
        collectedAt: deliveredAt,
      });
    }

    const locFor = (st: ParcelState) =>
      st === "RECEIVED" ? m.origin : st === "AT_HUB" ? dest.hub : st === "READY_FOR_COLLECTION" ? delivery : undefined;
    await db.insert(schema.events).values(
      path.map((st, k) => ({
        id: `evt_${ulid(stepTimes[k].getTime())}`,
        shipmentId: s.id,
        type: st === "CREATED" ? "shipment.created" : eventTypeFor(st),
        stateAfter: st,
        occurredAt: stepTimes[k],
        receivedAt: new Date(stepTimes[k].getTime() + 2000 + rnd() * 8000),
        source: (st === "CREATED" ? "portal" : st === "AWAITING_HANDOVER" ? "system" : st === "CANCELLED" ? "portal" : "scan") as "portal" | "system" | "scan",
        actorType: st === "CREATED" || st === "CANCELLED" ? "merchant" : st === "AWAITING_HANDOVER" ? "system" : st === "AT_HUB" ? "hub_operator" : st === "RECEIVED" ? "wakala_agent" : "rider",
        actorId: st === "CREATED" || st === "CANCELLED" ? m.user : st === "OUT_FOR_DELIVERY" || st === "DELIVERED" || st === "ATTEMPT_FAILED" ? "ondi|salim.rider" : null,
        locationId: locFor(st),
        reasonCode: st === "ATTEMPT_FAILED" ? pick(["FD01", "FD02", "FD04", "FD05"]) : null,
        data: st === "DELIVERED" ? { pod: { method: pick(["otp", "signature"]), receiverName: consigneeName } } : undefined,
      })),
    );
    // Receiver code for full tracking details, as sent in the booking SMS (see issueReceiverCode).
    {
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      const [otp] = await db
        .insert(schema.trackingOtps)
        .values({
          waybill,
          codeHash: createHash("sha256").update(`${process.env.SESSION_SECRET}:${waybill}:${code}`).digest("hex"),
          expiresAt: new Date(Date.now() + 30 * 24 * 3600e3),
          createdAt,
        })
        .returning({ id: schema.trackingOtps.id });
      await db.insert(schema.outbox).values({
        target: "hudufeed",
        topic: "notification.request",
        idempotencyKey: `code:${otp.id}`,
        waybill,
        payload: { template: "parcel.tracking_code", channel: "sms", language: s.consignee.language ?? "sw", to: s.consignee.phone, variables: { code, waybill, reason: "booked" } },
        createdAt,
      });
    }

    // Synthetic milestone for the linehaul leg between hubs (FR-TRK-03).
    if (target === "IN_TRANSIT") {
      await db.insert(schema.events).values({
        id: `evt_${ulid(stepTimes.at(-1)!.getTime() + 1)}`,
        shipmentId: s.id,
        type: "milestone.departed_origin_region",
        occurredAt: new Date(stepTimes.at(-1)!.getTime() + 1800e3),
        source: "system",
        actorType: "system",
        estimated: true,
        note: "Estimated from trip schedule",
      });
    }
    if (isException) {
      const code = target === "ATTEMPT_FAILED" ? "FD02" : pick(["EX01", "EX04", "EX06"]);
      await db.insert(schema.exceptions).values({ shipmentId: s.id, reasonCode: code, openedBy: "ondi|neema.mollel", slaDueAt: new Date(now + (rnd() * 30 - 6) * 3600e3), note: code === "FD02" ? "Receiver address unclear; call before re-attempt" : undefined });
    }
    made++;
  }

  // Start the audit chain.
  const body = JSON.stringify({ action: "seed", at: new Date().toISOString() });
  await db.insert(schema.auditLog).values({ actorId: "system", action: "seed", entity: "system", entityId: "seed", prevHash: "GENESIS", hash: createHash("sha256").update("GENESIS").update(body).digest("hex") });
  console.log(`  created ${made} demo shipments`);
}

/** Partner demo data: Kilimanjaro Freight (forwarder) handles part of the network with its own fleet, clients and books. */
/**
 * Partner branches. Idempotent: creates the branches once, then spreads any cargo and vehicles that have no branch
 * across their company's branches, and ties the Mzizima ops user to one branch.
 */
async function seedBranches() {
  const want = [
    { accountId: "acc_kilimanjaro_freight", name: "Dar es Salaam head office", code: "DAR", region: "Dar es Salaam", district: "Temeke", address: "Nyerere Road, plot 12", phone: "+255222110001", isHead: true },
    { accountId: "acc_kilimanjaro_freight", name: "Arusha depot", code: "ARK", region: "Arusha", district: "Arusha City", address: "Sokoine Road, Unga Ltd", phone: "+255272500002" },
    { accountId: "acc_kilimanjaro_freight", name: "Moshi depot", code: "MOS", region: "Kilimanjaro", district: "Moshi Municipal", address: "Boma Road", phone: "+255272750003" },
    { accountId: "acc_mzizima_wh", name: "Kurasini warehouse", code: "KUR", region: "Dar es Salaam", district: "Temeke", address: "Kurasini, Mivinjeni", isHead: true },
    { accountId: "acc_mzizima_wh", name: "Ubungo warehouse", code: "UBG", region: "Dar es Salaam", district: "Ubungo", address: "Morogoro Road, Ubungo" },
  ];
  for (const b of want) {
    await db.insert(schema.branches).values(b).onConflictDoNothing();
  }
  const all = await db.select().from(schema.branches);
  for (const acc of [...new Set(all.map((b) => b.accountId))]) {
    const ids = all.filter((b) => b.accountId === acc).map((b) => b.id);
    const ships = await db.select({ id: schema.shipments.id }).from(schema.shipments).where(sql`${schema.shipments.handlingPartnerId} = ${acc} and ${schema.shipments.handlingBranchId} is null`);
    for (const [i, row] of ships.entries()) await db.update(schema.shipments).set({ handlingBranchId: ids[i % ids.length] }).where(eq(schema.shipments.id, row.id));
    const vans = await db.select({ id: schema.vehicles.id }).from(schema.vehicles).where(sql`${schema.vehicles.accountId} = ${acc} and ${schema.vehicles.branchId} is null`);
    for (const [i, row] of vans.entries()) await db.update(schema.vehicles).set({ branchId: ids[i % ids.length] }).where(eq(schema.vehicles.id, row.id));
  }
  const ubungo = all.find((b) => b.code === "UBG");
  if (ubungo) await db.update(schema.users).set({ branchId: ubungo.id }).where(sql`${schema.users.id} = 'ondi|daudi.mfinanga' and ${schema.users.branchId} is null`);
  console.log(`  branches: ${all.length}`);
}

async function seedPartners() {
  const [{ n }] = await db.select({ n: count() }).from(schema.vehicles);
  if (n > 0 && !reset) return;
  const KF = "acc_kilimanjaro_freight";
  const day = 86400e3;
  const now = Date.now();

  const clients = await db
    .insert(schema.partnerClients)
    .values([
      { partnerAccountId: KF, name: "Arusha Coffee Exporters", contactName: "Neema Laizer", phone: "+255754220011", email: "ops@arushacoffee.co.tz", tin: "102-334-551", region: "Arusha", creditTermsDays: 30 },
      { partnerAccountId: KF, name: "Meru Agro Supplies", contactName: "Elia Mollel", phone: "+255765330022", region: "Arusha", creditTermsDays: 14 },
      { partnerAccountId: KF, name: "Moshi Hardware & Building", contactName: "Rajab Shayo", phone: "+255713440033", tin: "221-908-114", region: "Kilimanjaro", creditTermsDays: 14 },
      { partnerAccountId: KF, name: "Serengeti Safari Supplies", contactName: "Anna Kimaro", phone: "+255786550044", email: "stores@serengetisupplies.co.tz", region: "Arusha", creditTermsDays: 7 },
      { partnerAccountId: KF, name: "Kili Beverages Depot", contactName: "John Massawe", phone: "+255744660055", tin: "330-115-776", region: "Kilimanjaro", creditTermsDays: 21 },
    ])
    .returning();

  const fleet = await db
    .insert(schema.vehicles)
    .values([
      { accountId: KF, plate: "T 482 DKJ", kind: "truck", make: "Scania P410", capacityKg: 18000, volumeM3: 60, status: "on_trip", driverName: "Hamisi Juma", driverPhone: "+255715100201", insuranceExpiry: new Date(now + 180 * day), inspectionExpiry: new Date(now + 90 * day) },
      { accountId: KF, plate: "T 731 DLA", kind: "truck", make: "Isuzu FVZ", capacityKg: 12000, volumeM3: 42, status: "available", driverName: "Selemani Mbwana", driverPhone: "+255715100202", insuranceExpiry: new Date(now + 12 * day), inspectionExpiry: new Date(now + 200 * day) },
      { accountId: KF, plate: "T 905 DMB", kind: "van", make: "Toyota HiAce", capacityKg: 1200, volumeM3: 9, status: "on_trip", driverName: "Baraka Swai", driverPhone: "+255715100203", insuranceExpiry: new Date(now + 300 * day), inspectionExpiry: new Date(now - 5 * day) },
      { accountId: KF, plate: "T 118 DNC", kind: "van", make: "Nissan NV350", capacityKg: 1000, volumeM3: 8, status: "available", driverName: "Zuhura Ally", driverPhone: "+255715100204", insuranceExpiry: new Date(now + 240 * day), inspectionExpiry: new Date(now + 150 * day) },
      { accountId: KF, plate: "T 264 DPD", kind: "truck", make: "Mercedes Actros", capacityKg: 24000, volumeM3: 80, status: "maintenance", driverName: null, insuranceExpiry: new Date(now + 60 * day), inspectionExpiry: new Date(now + 25 * day) },
      { accountId: KF, plate: "MC 551 CXT", kind: "motorbike", make: "TVS HLX 150", capacityKg: 40, status: "available", driverName: "Omari Said", driverPhone: "+255715100206", insuranceExpiry: new Date(now + 100 * day), inspectionExpiry: new Date(now + 100 * day) },
    ])
    .returning();
  await db.insert(schema.vehicles).values({ accountId: "acc_mzizima_wh", plate: "T 610 DQE", kind: "truck", make: "Hino 500", capacityKg: 8000, status: "available", driverName: "Musa Kitwana", driverPhone: "+255715100301" });

  // Hand about half the demo cargo to Kilimanjaro Freight, a few to Mzizima.
  const all = await db.select().from(schema.shipments).orderBy(schema.shipments.createdAt);
  const kfShipments = all.filter((_, i) => i % 2 === 0);
  const mzShipments = all.filter((_, i) => i % 7 === 3);
  const moving = ["IN_TRANSIT", "OUT_FOR_DELIVERY", "AT_HUB", "RECEIVED"];
  for (const [i, s] of kfShipments.entries()) {
    const client = clients[i % clients.length];
    const vehicle = moving.includes(s.state) ? fleet.filter((v) => v.status === "on_trip" || v.status === "available")[i % 4] : null;
    await db
      .update(schema.shipments)
      .set({ handlingPartnerId: KF, partnerClientId: client.id, vehicleId: vehicle?.id ?? null })
      .where(sql`${schema.shipments.id} = ${s.id}`);
  }
  for (const s of mzShipments) {
    if (kfShipments.includes(s)) continue;
    await db.update(schema.shipments).set({ handlingPartnerId: "acc_mzizima_wh" }).where(sql`${schema.shipments.id} = ${s.id}`);
  }

  // Invoices: bill most delivered cargo per client; leave the newest few uninvoiced.
  const delivered = (await db.select().from(schema.shipments).where(sql`${schema.shipments.handlingPartnerId} = ${KF} and ${schema.shipments.state} = 'DELIVERED'`)).sort(
    (a, b) => (a.deliveredAt?.getTime() ?? 0) - (b.deliveredAt?.getTime() ?? 0),
  );
  const toBill = delivered.slice(0, Math.max(0, delivered.length - 3));
  const byClient = new Map<string, typeof toBill>();
  for (const s of toBill) byClient.set(s.partnerClientId!, [...(byClient.get(s.partnerClientId!) ?? []), s]);
  let seq = 0;
  const invoices: (typeof schema.partnerInvoices.$inferSelect)[] = [];
  for (const [clientId, list] of byClient) {
    const client = clients.find((c) => c.id === clientId)!;
    const lines = list.map((s) => ({ waybill: s.waybill, description: s.goodsDescription, amount: s.totalCharge }));
    const total = lines.reduce((a, l) => a + l.amount, 0);
    const issue = new Date(now - (18 - seq * 4) * day);
    const [inv] = await db
      .insert(schema.partnerInvoices)
      .values({
        partnerAccountId: KF,
        clientId,
        number: `INV-2610-${String(++seq).padStart(4, "0")}`,
        issueDate: issue,
        dueDate: new Date(issue.getTime() + client.creditTermsDays * day),
        lines,
        subtotal: total - Math.round((total * 0.18) / 1.18),
        tax: Math.round((total * 0.18) / 1.18),
        total,
        createdBy: "ondi|peter.kweka",
      })
      .returning();
    await db.update(schema.shipments).set({ partnerInvoiceId: inv.id }).where(sql`${schema.shipments.waybill} in ${list.map((s) => s.waybill)}`);
    invoices.push(inv);
  }

  // Payments: first invoice paid in full, second part paid; plus two unreconciled receipts.
  const pay = async (inv: (typeof invoices)[number] | undefined, amount: number, method: string, reference: string, daysAgo: number, matched: boolean) => {
    if (!inv) return;
    await db.insert(schema.partnerPayments).values({
      partnerAccountId: KF,
      clientId: inv.clientId,
      invoiceId: matched ? inv.id : null,
      amount,
      method,
      reference,
      receivedAt: new Date(now - daysAgo * day),
      reconciledAt: matched ? new Date(now - daysAgo * day) : null,
      reconciledBy: matched ? "ondi|peter.kweka" : null,
      recordedBy: "ondi|peter.kweka",
    });
    if (matched) {
      const paid = inv.amountPaid + amount;
      inv.amountPaid = paid;
      await db.update(schema.partnerInvoices).set({ amountPaid: paid, status: paid >= inv.total ? "paid" : "partially_paid" }).where(sql`${schema.partnerInvoices.id} = ${inv.id}`);
    }
  };
  await pay(invoices[0], invoices[0]?.total ?? 0, "bank_transfer", `CRDB ${invoices[0]?.number}`, 6, true);
  await pay(invoices[1], Math.round((invoices[1]?.total ?? 0) / 2 / 100) * 100, "mobile_money", "MPESA QK72HX91LZ", 3, true);
  // Unmatched: exact balance of the third invoice (auto-suggested), and a stray mobile-money receipt.
  await pay(invoices[2], invoices[2]?.total ?? 0, "mobile_money", "MPESA QL18PZ44RT", 1, false);
  await db.insert(schema.partnerPayments).values({ partnerAccountId: KF, amount: 45000, method: "cash", reference: "Receipt 0412", receivedAt: new Date(now - 2 * day), recordedBy: "ondi|peter.kweka" });

  console.log(`  partners: ${clients.length} clients, ${fleet.length + 1} vehicles, ${kfShipments.length} shipments to Kilimanjaro Freight, ${invoices.length} invoices`);
}

/**
 * Tuma-X demo: drivers in Tuma's pool and Kilimanjaro Freight's fleet, and open jobs for them. Idempotent.
 * Sign in to the app with any of these numbers; outside production the code is returned by the API (devCode).
 */
async function seedDrivers() {
  const POOL = "acc_moovit_ops";
  const KFA = "acc_kilimanjaro_freight";
  const list = [
    { phone: "+255713400001", name: "Juma Mussa", acc: POOL, region: "Dar es Salaam", vehicle: "boda", plate: "MC 412 DKA", status: "approved" },
    { phone: "+255713400002", name: "Neema Said", acc: POOL, region: "Dar es Salaam", vehicle: "bajaji", plate: "MC 118 DLB", status: "approved" },
    { phone: "+255713400003", name: "Hassan Ali", acc: POOL, region: "Dar es Salaam", vehicle: "lorry", plate: "T 509 DQR", status: "approved" },
    { phone: "+255713400004", name: "Rehema Kweka", acc: POOL, region: "Arusha", vehicle: "van", plate: "T 221 EAA", status: "pending" },
    { phone: "+255713400005", name: "Baraka Lyimo", acc: KFA, region: "Dar es Salaam", vehicle: "pickup", plate: "T 777 DKF", status: "approved" },
  ];
  for (const d of list) {
    const id = `tumax|${d.phone}`;
    const role = ["boda", "bajaji", "van"].includes(d.vehicle) ? "rider" : "truck_driver";
    await db.insert(schema.users).values({ id, name: d.name, phone: d.phone, roles: [role], locale: "sw", accountId: d.acc === POOL ? null : d.acc }).onConflictDoNothing();
    await db
      .insert(schema.drivers)
      .values({ userId: id, accountId: d.acc, phone: d.phone, region: d.region, vehicleKind: d.vehicle, plate: d.plate, status: d.status, profile: { fullName: d.name }, reviewedBy: d.status === "approved" ? "seed" : null })
      .onConflictDoNothing();
  }

  const [{ n }] = await db.select({ n: count() }).from(schema.jobs);
  if (n > 0) return console.log(`  drivers: ${list.length}, jobs already present`);
  // Two open courier runs from the Ilala hub, built from Tuma-handled waybills that are waiting.
  const waiting = await db
    .select({ id: schema.shipments.id, w: schema.shipments.chargeableWeightG })
    .from(schema.shipments)
    .where(sql`${schema.shipments.handlingPartnerId} is null and ${schema.shipments.state} in ('AWAITING_HANDOVER','RECEIVED','AT_HUB') and ${schema.shipments.consignee}->'address'->>'region' = 'Dar es Salaam'`)
    .limit(4);
  const hub = { name: "Ilala Hub", address: "Gerezani, Ilala, Dar es Salaam (Near Kamata bus stop)", lat: -6.8235, lng: 39.2695 };
  const groups = [waiting.slice(0, 2), waiting.slice(2, 4)].filter((g) => g.length);
  for (const [i, g] of groups.entries()) {
    const [job] = await db
      .insert(schema.jobs)
      .values({ ref: `JOB-DEMO000${i + 1}`, accountId: POOL, kind: "parcel", region: "Dar es Salaam", pickup: hub, weightG: g.reduce((a, s) => a + s.w, 0), payout: 4500 + i * 1500, createdBy: "seed" })
      .returning();
    await db.insert(schema.jobShipments).values(g.map((s, k) => ({ jobId: job.id, shipmentId: s.id, seq: k + 1 })));
  }
  console.log(`  drivers: ${list.length}, open jobs: ${groups.length}`);
}

(async () => {
  console.log("Seeding reference data…");
  await seedReference();
  if (!referenceOnly) {
    console.log("Seeding demo shipments…");
    await seedShipments();
    console.log("Seeding partners…");
    await seedPartners();
    console.log("Seeding branches…");
    await seedBranches();
    console.log("Seeding Tuma-X drivers…");
    await seedDrivers();
  }
  await client.end();
  console.log("Done.");
})().catch(async (e) => {
  console.error(e);
  await client.end();
  process.exit(1);
});
