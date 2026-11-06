import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { auditLog, codRecords, events, outbox } from "../db/schema";
import { cancelShipment, createParcel, getShipment, listShipments, transition } from "../services/shipments";
import { resolvePermissions } from "../rbac";
import { createRole, deleteRole, setUserRoles, updateRole } from "../services/roles";
import type { CurrentUser } from "../auth/current-user";
import { parcelOrderSchema } from "@/domain/order-schema";
import { isValidWaybill } from "@/domain/waybill-number";

async function asUser(id: string, roles: string[], accountId: string | null): Promise<CurrentUser> {
  return { id, name: id, accountId, roles, permissions: await resolvePermissions(roles), locale: "en" };
}

const order = (over: Record<string, unknown> = {}) =>
  parcelOrderSchema.parse({
    serviceLevel: "next_day",
    paymentTerms: "pay_on_delivery",
    codAmount: 50000,
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

let merchant: CurrentUser;
let otherMerchant: CurrentUser;
let tower: CurrentUser;
let rider: CurrentUser;

beforeAll(async () => {
  await db.execute(sql`truncate notifications, exceptions, cod_records, charge_snapshots, events, pieces, outbox, audit_log, tracking_otps, shipments restart identity cascade`);
  await db.execute(sql`delete from roles where not system`);
  merchant = await asUser("ondi|amina.juma", ["merchant_user"], "acc_kariakoo_mart");
  otherMerchant = await asUser("ondi|baraka.mushi", ["merchant_user"], "acc_zuri_fashion");
  tower = await asUser("ondi|neema.mollel", ["control_tower"], "acc_moovit_ops");
  rider = await asUser("ondi|salim.rider", ["rider"], "acc_moovit_ops");
});

afterAll(async () => {
  await db.$client.end();
});

describe("order creation (FR-PCL-01/03, FR-WB-01)", () => {
  it("issues a valid waybill, prices it, opens COD and queues a FinOps billable event", async () => {
    const { shipment } = await createParcel(merchant, order());
    expect(isValidWaybill(shipment.waybill)).toBe(true);
    expect(shipment.state).toBe("AWAITING_HANDOVER");
    expect(shipment.totalCharge).toBeGreaterThan(0);

    const [cod] = await db.select().from(codRecords).where(eq(codRecords.shipmentId, shipment.id));
    expect(cod).toMatchObject({ amountDue: 50000, feeDue: shipment.totalCharge, status: "due" });
    const evts = await db.select().from(events).where(eq(events.shipmentId, shipment.id));
    expect(evts.map((e) => e.stateAfter).sort()).toEqual(["AWAITING_HANDOVER", "CREATED"]);
    const msgs = await db.select().from(outbox).where(eq(outbox.waybill, shipment.waybill));
    expect(msgs.map((m) => m.topic)).toContain("shipment.priced");
  });

  it("warns on a repeated merchant reference without blocking (FR-WB-09)", async () => {
    await createParcel(merchant, order({ merchantRef: "KM-DUP-1" }));
    const second = await createParcel(merchant, order({ merchantRef: "KM-DUP-1" }));
    expect(second.duplicateRef).toBe(true);
  });

  it("refuses service levels outside the contract (FR-CRM-02)", async () => {
    await expect(createParcel(otherMerchant, order({ serviceLevel: "same_day" }))).rejects.toMatchObject({ code: "SERVICE_NOT_IN_CONTRACT" });
  });

  it("refuses door delivery without a landmark or pin (FR-WB-07)", () => {
    const r = parcelOrderSchema.safeParse({ ...order(), consignee: { name: "X Y", phone: "0712000111", address: { region: "Dar es Salaam", district: "Ilala" } } });
    expect(r.success).toBe(false);
  });
});

describe("account isolation (FR-PLT-02)", () => {
  it("hides one merchant's shipments from another", async () => {
    const { shipment } = await createParcel(merchant, order());
    expect(await getShipment(otherMerchant, shipment.waybill)).toBeNull();
    expect(await getShipment(tower, shipment.waybill)).not.toBeNull();
    const list = await listShipments(otherMerchant, {});
    expect(list.items.find((i) => i.waybill === shipment.waybill)).toBeUndefined();
  });
});

describe("lifecycle (FR-WB-04, FR-TRK-01)", () => {
  it("follows the ledger to delivery and collects COD", async () => {
    const { shipment } = await createParcel(merchant, order());
    await transition(rider, shipment.waybill, "RECEIVED", { source: "scan" });
    await transition(rider, shipment.waybill, "OUT_FOR_DELIVERY", { source: "scan" });
    await transition(rider, shipment.waybill, "DELIVERED", { source: "field_app", pod: { method: "otp" } });
    const s = (await getShipment(tower, shipment.waybill))!;
    expect(s.state).toBe("DELIVERED");
    expect(s.cod).toMatchObject({ status: "collected", amountCollected: 50000, feeCollected: s.totalCharge, method: "cash" });
    expect(s.events.at(-1)!.stateAfter).toBe("DELIVERED");
    const topics = (await db.select().from(outbox).where(eq(outbox.waybill, shipment.waybill))).map((m) => m.topic);
    expect(topics).toEqual(expect.arrayContaining(["shipment.delivered", "payment.collected_on_delivery", "notification.request"]));
  });

  it("rejects and audits a transition the state does not allow", async () => {
    const { shipment } = await createParcel(merchant, order());
    await expect(transition(rider, shipment.waybill, "DELIVERED", { source: "scan" })).rejects.toMatchObject({ code: "STATE_NOT_ALLOWED" });
    expect((await getShipment(tower, shipment.waybill))!.state).toBe("AWAITING_HANDOVER");
    const [row] = await db.select().from(auditLog).where(eq(auditLog.entityId, shipment.waybill)).orderBy(sql`id desc`).limit(1);
    expect(row).toMatchObject({ action: "transition.rejected", actorId: rider.id });
  });

  it("rejects a role without the permission", async () => {
    const { shipment } = await createParcel(merchant, order());
    await expect(transition(merchant, shipment.waybill, "RECEIVED", { source: "manual", reasonCode: "OV01" })).rejects.toMatchObject({ code: "ROLE_NOT_ALLOWED" });
  });

  it("does not let a merchant touch another account's shipment", async () => {
    const { shipment } = await createParcel(merchant, order());
    await expect(cancelShipment(otherMerchant, shipment.waybill, "x")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("starts a linked return after three failed attempts (FR-PCL-10/11)", async () => {
    const { shipment } = await createParcel(merchant, order());
    await transition(rider, shipment.waybill, "RECEIVED", { source: "scan" });
    for (let i = 0; i < 3; i++) {
      await transition(rider, shipment.waybill, "OUT_FOR_DELIVERY", { source: "scan" });
      await transition(rider, shipment.waybill, "ATTEMPT_FAILED", { source: "field_app", reasonCode: "FD01" });
    }
    const s = (await getShipment(tower, shipment.waybill))!;
    expect(s.state).toBe("RETURNING");
    expect(s.attempts).toBe(3);
    expect(s.returnWaybill).toMatch(/^[A-Z]{3}\d{3}$/);
    const ret = (await getShipment(tower, s.returnWaybill!))!;
    expect(ret.consignee.name).toBe(s.shipper.name);
    expect(ret.codAmount).toBeNull();
  });
});

describe("payment options", () => {
  it("collects nothing at the door for a prepaid parcel without COD", async () => {
    const { shipment } = await createParcel(merchant, order({ paymentTerms: "prepaid", prepayMethod: "mobile_money", codAmount: undefined }));
    const [cod] = await db.select().from(codRecords).where(eq(codRecords.shipmentId, shipment.id));
    expect(cod).toBeUndefined();
    expect(shipment.prepayMethod).toBe("mobile_money");
  });

  it("requires a prepay method when the sender prepays", () => {
    expect(parcelOrderSchema.safeParse({ ...order(), paymentTerms: "prepaid", prepayMethod: undefined }).success).toBe(false);
  });

  it("collects only the delivery fee on pay-on-delivery without COD, by mobile money", async () => {
    const { shipment } = await createParcel(merchant, order({ codAmount: undefined }));
    await transition(rider, shipment.waybill, "RECEIVED", { source: "scan" });
    await transition(rider, shipment.waybill, "OUT_FOR_DELIVERY", { source: "scan" });
    await transition(rider, shipment.waybill, "DELIVERED", { source: "field_app", collectMethod: "mobile_money" });
    const s = (await getShipment(tower, shipment.waybill))!;
    expect(s.cod).toMatchObject({ amountDue: 0, feeDue: s.totalCharge, feeCollected: s.totalCharge, method: "mobile_money" });
  });

  it("refuses a collection method the shipment does not accept", async () => {
    const { shipment } = await createParcel(merchant, order({ collectMethods: ["mobile_money"] }));
    await transition(rider, shipment.waybill, "RECEIVED", { source: "scan" });
    await transition(rider, shipment.waybill, "OUT_FOR_DELIVERY", { source: "scan" });
    await expect(transition(rider, shipment.waybill, "DELIVERED", { source: "field_app", collectMethod: "cash" })).rejects.toMatchObject({ code: "METHOD_NOT_ACCEPTED" });
  });
});

describe("cancellation (FR-PCL-12)", () => {
  it("is free before handover and charged after", async () => {
    const a = await createParcel(merchant, order());
    expect(await cancelShipment(merchant, a.shipment.waybill, "test")).toEqual({ fee: 0 });
    const b = await createParcel(merchant, order());
    await transition(rider, b.shipment.waybill, "RECEIVED", { source: "scan" });
    const r = await cancelShipment(merchant, b.shipment.waybill, "test");
    expect(r.fee).toBeGreaterThan(0);
  });
});

describe("roles are data (admin-managed)", () => {
  const admin = () => asUser("ondi|admin", ["tuma_admin"], "acc_moovit_ops");

  it("creates a custom role, grants permissions, and the grants take effect", async () => {
    await createRole(await admin(), { key: "cod_auditor", name: "COD auditor", description: "", surface: "console", permissions: ["shipment.read.all", "cod.read"] });
    const perms = await resolvePermissions(["cod_auditor"]);
    expect([...perms].sort()).toEqual(["cod.read", "shipment.read.all"]);
  });

  it("lets a custom role deliver once granted shipment.deliver", async () => {
    await createRole(await admin(), { key: "senior_rider", name: "Senior rider", description: "", surface: "field", permissions: ["shipment.dispatch"] });
    const { shipment } = await createParcel(merchant, order());
    await transition(rider, shipment.waybill, "RECEIVED", { source: "scan" });
    const senior = await asUser("ondi|salim.rider", ["senior_rider"], "acc_moovit_ops");
    await transition(senior, shipment.waybill, "OUT_FOR_DELIVERY", { source: "scan" });
    await expect(transition(senior, shipment.waybill, "DELIVERED", { source: "scan" })).rejects.toMatchObject({ code: "ROLE_NOT_ALLOWED" });
    await updateRole(await admin(), "senior_rider", { name: "Senior rider", description: "", surface: "field", permissions: ["shipment.dispatch", "shipment.deliver"] });
    const upgraded = await asUser("ondi|salim.rider", ["senior_rider"], "acc_moovit_ops");
    await transition(upgraded, shipment.waybill, "DELIVERED", { source: "scan" });
  });

  it("audits role changes with granted and revoked permissions", async () => {
    const [row] = await db.select().from(auditLog).where(eq(auditLog.entityId, "senior_rider")).orderBy(sql`id desc`).limit(1);
    expect(row.action).toBe("role.update");
    expect(row.after).toMatchObject({ granted: ["shipment.deliver"], revoked: [] });
  });

  it("will not let the last role manager lock everyone out", async () => {
    const all = (await import("@/domain/roles")).PERMISSION_KEYS.filter((p) => p !== "roles.manage");
    await expect(updateRole(await admin(), "tuma_admin", { name: "Tuma admin", description: "", surface: "console", permissions: all })).rejects.toMatchObject({ code: "LAST_ADMIN" });
  });

  it("refuses to delete a role that users hold, and system roles", async () => {
    await setUserRoles(await admin(), "ondi|salim.rider", ["rider", "senior_rider"]);
    await expect(deleteRole(await admin(), "senior_rider")).rejects.toMatchObject({ code: "ROLE_IN_USE" });
    await expect(deleteRole(await admin(), "rider")).rejects.toMatchObject({ code: "SYSTEM_ROLE" });
    await setUserRoles(await admin(), "ondi|salim.rider", ["rider"]);
    await deleteRole(await admin(), "senior_rider");
  });

  it("refuses role changes from users without roles.manage", async () => {
    await expect(createRole(tower, { key: "sneaky", name: "Sneaky", description: "", surface: "console", permissions: ["roles.manage"] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("audit chain (NFR-15)", () => {
  it("links every row to the previous hash", async () => {
    const rows = await db.select().from(auditLog).orderBy(auditLog.id);
    expect(rows.length).toBeGreaterThan(5);
    for (let i = 1; i < rows.length; i++) expect(rows[i].prevHash).toBe(rows[i - 1].hash);
  });
});

