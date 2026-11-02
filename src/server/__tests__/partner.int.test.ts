import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { partnerInvoices, partnerPayments, shipments } from "../db/schema";
import { createParcel, transition, listShipments } from "../services/shipments";
import { assignVehicle, createInvoice, listCargo, matchCandidates, partnerDashboard, reconcile, recordPayment, saveClient, saveVehicle, uninvoicedShipments, listClients, listVehicles, clientSchema, vehicleSchema, paymentSchema } from "../services/partner";
import { resolvePermissions } from "../rbac";
import type { CurrentUser } from "../auth/current-user";
import { parcelOrderSchema } from "@/domain/order-schema";

const as = async (id: string, roles: string[], accountId: string): Promise<CurrentUser> => ({ id, name: id, accountId, roles, permissions: await resolvePermissions(roles), locale: "en" });

let kfAdmin: CurrentUser, kfOps: CurrentUser, mzOps: CurrentUser, merchant: CurrentUser, tower: CurrentUser;
const KF = "acc_kilimanjaro_freight";
let clientId: string;
let vehicleId: string;

async function parcelFor(partner: string, client?: string) {
  const order = parcelOrderSchema.parse({
    serviceLevel: "standard",
    paymentTerms: "account",
    handoverMode: "pickup",
    deliveryMode: "door",
    shipper: { name: "Kariakoo Mart", phone: "0754100200", address: { region: "Dar es Salaam", district: "Ilala" } },
    consignee: { name: "Rehema Test", phone: "0712345678", address: { region: "Arusha", district: "Arusha City", landmark: "Clock tower" } },
    goodsDescription: "Coffee bags",
    goodsCategory: "general",
    prohibitedDeclared: true,
    pieces: [{ weightKg: 20, lengthCm: 60, widthCm: 40, heightCm: 40 }],
  });
  const { shipment } = await createParcel(merchant, order);
  await db.update(shipments).set({ handlingPartnerId: partner, partnerClientId: client ?? null }).where(eq(shipments.id, shipment.id));
  return shipment;
}

async function deliver(waybill: string) {
  await transition(kfOps, waybill, "RECEIVED", { source: "scan" });
  await transition(kfOps, waybill, "OUT_FOR_DELIVERY", { source: "scan" });
  await transition(kfOps, waybill, "DELIVERED", { source: "field_app" });
}

beforeAll(async () => {
  await db.execute(sql`truncate partner_payments, partner_invoices, partner_clients, vehicles restart identity cascade`);
  await db.execute(sql`insert into accounts (id, type, partner_kind, name) values ('acc_kilimanjaro_freight','partner','freight_forwarder','Kilimanjaro Freight Ltd'), ('acc_mzizima_wh','partner','warehouse','Mzizima Warehousing') on conflict do nothing`);
  kfAdmin = await as("kf-admin", ["partner_admin"], KF);
  kfOps = await as("kf-ops", ["partner_ops"], KF);
  mzOps = await as("mz-ops", ["partner_ops"], "acc_mzizima_wh");
  merchant = await as("ondi|amina.juma", ["merchant_user"], "acc_kariakoo_mart");
  tower = await as("ondi|neema.mollel", ["control_tower"], "acc_moovit_ops");
  await saveClient(kfAdmin, clientSchema.parse({ name: "Arusha Coffee Exporters", phone: "0754220011", creditTermsDays: 30 }));
  clientId = (await listClients(kfAdmin))[0].c.id;
  await saveVehicle(kfAdmin, vehicleSchema.parse({ plate: "t 482 dkj", kind: "truck", capacityKg: 18000 }));
  vehicleId = (await listVehicles(kfAdmin))[0].v.id;
});

afterAll(async () => {
  await db.$client.end();
});

describe("partner isolation", () => {
  it("shows a partner only its own cargo, and blocks acting on another partner's", async () => {
    const mine = await parcelFor(KF, clientId);
    const theirs = await parcelFor("acc_mzizima_wh");
    const cargo = await listCargo(kfOps, { view: "all" });
    expect(cargo.map((c) => c.waybill)).toContain(mine.waybill);
    expect(cargo.map((c) => c.waybill)).not.toContain(theirs.waybill);
    expect((await listShipments(kfOps, {})).items.every((i) => i.waybill !== theirs.waybill)).toBe(true);
    await expect(transition(kfOps, theirs.waybill, "RECEIVED", { source: "scan" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(assignVehicle(mzOps, mine.waybill, null)).rejects.toMatchObject({ code: "NOT_FOUND" });
    // Staff still see everything.
    expect((await listShipments(tower, { q: theirs.waybill })).items).toHaveLength(1);
  });

  it("will not load cargo onto another partner's vehicle", async () => {
    const theirs = await parcelFor("acc_mzizima_wh");
    await expect(assignVehicle(mzOps, theirs.waybill, vehicleId)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("keeps finance away from operations staff", async () => {
    await expect(uninvoicedShipments(kfOps, clientId)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("fleet", () => {
  it("normalises plates, rejects duplicates, and loads cargo onto a vehicle", async () => {
    expect((await listVehicles(kfAdmin))[0].v.plate).toBe("T 482 DKJ");
    await expect(saveVehicle(kfAdmin, vehicleSchema.parse({ plate: "T 482 DKJ", kind: "van", capacityKg: 900 }))).rejects.toMatchObject({ code: "DUPLICATE" });
    const s = await parcelFor(KF, clientId);
    await assignVehicle(kfOps, s.waybill, vehicleId);
    const [row] = await db.select().from(shipments).where(eq(shipments.id, s.id));
    expect(row.vehicleId).toBe(vehicleId);
    const [v] = await listVehicles(kfAdmin);
    expect(Number(v.loadCount)).toBeGreaterThan(0);
  });
});

describe("invoicing and reconciliation", () => {
  it("invoices delivered cargo once, then auto-matches a payment that quotes the invoice number", async () => {
    const a = await parcelFor(KF, clientId);
    const b = await parcelFor(KF, clientId);
    await deliver(a.waybill);
    await deliver(b.waybill);
    const open = await uninvoicedShipments(kfAdmin, clientId);
    expect(open.map((o) => o.waybill)).toEqual(expect.arrayContaining([a.waybill, b.waybill]));

    const inv = await createInvoice(kfAdmin, clientId, [a.waybill, b.waybill]);
    expect(inv.number).toMatch(/^INV-\d{4}-0001$/);
    expect(inv.total).toBe(a.totalCharge + b.totalCharge);
    expect(inv.subtotal + inv.tax).toBe(inv.total);
    await expect(createInvoice(kfAdmin, clientId, [a.waybill])).rejects.toMatchObject({ code: "STALE" });

    const r = await recordPayment(kfAdmin, paymentSchema.parse({ amount: 1000, method: "mobile_money", reference: `Payment for ${inv.number}` }));
    expect(r.matched).toBe(inv.number);
    const [after] = await db.select().from(partnerInvoices).where(eq(partnerInvoices.id, inv.id));
    expect(after).toMatchObject({ amountPaid: 1000, status: "partially_paid" });
  });

  it("auto-matches an exact balance for the client, otherwise leaves the payment to reconcile", async () => {
    const s = await parcelFor(KF, clientId);
    await deliver(s.waybill);
    const inv = await createInvoice(kfAdmin, clientId, [s.waybill]);
    const exact = await recordPayment(kfAdmin, paymentSchema.parse({ clientId, amount: inv.total, method: "bank_transfer", reference: "CRDB 77" }));
    expect(exact.matched).toBe(inv.number);
    const [paid] = await db.select().from(partnerInvoices).where(eq(partnerInvoices.id, inv.id));
    expect(paid.status).toBe("paid");

    const stray = await recordPayment(kfAdmin, paymentSchema.parse({ amount: 12345, method: "cash" }));
    expect(stray.matched).toBeNull();
  });

  it("reconciles manually from ranked suggestions and refuses double matching", async () => {
    const s = await parcelFor(KF, clientId);
    await deliver(s.waybill);
    const inv = await createInvoice(kfAdmin, clientId, [s.waybill]);
    await recordPayment(kfAdmin, paymentSchema.parse({ amount: inv.total, method: "mobile_money", reference: "MPESA XYZ" })); // no client → not auto-matched
    const [pay] = await db.select().from(partnerPayments).where(sql`${partnerPayments.reference} = 'MPESA XYZ'`);
    expect(pay.invoiceId).toBeNull();
    const candidates = await matchCandidates(kfAdmin, pay.id);
    expect(candidates[0].id).toBe(inv.id); // exact amount ranks first
    await reconcile(kfAdmin, pay.id, inv.id);
    await expect(reconcile(kfAdmin, pay.id, inv.id)).rejects.toMatchObject({ code: "ALREADY_MATCHED" });
    const d = await partnerDashboard(kfAdmin);
    expect(d.unmatched.payments).toBe(1); // only the stray cash receipt from the previous test
  });
});
