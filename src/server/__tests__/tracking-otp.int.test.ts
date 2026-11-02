import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { outbox, trackingOtps } from "../db/schema";
import { createParcel } from "../services/shipments";
import { devReceiverCode, isTrackingVerified, publicTracking, requestTrackingOtp, verifyTrackingOtp } from "../services/tracking";
import { resolvePermissions } from "../rbac";
import { parcelOrderSchema } from "@/domain/order-schema";

afterAll(async () => {
  await db.$client.end();
});

async function newParcel() {
  const merchant = { id: "ondi|amina.juma", name: "Amina", accountId: "acc_kariakoo_mart", roles: ["merchant_user"], permissions: await resolvePermissions(["merchant_user"]), locale: "en" };
  const order = parcelOrderSchema.parse({
    serviceLevel: "next_day",
    paymentTerms: "pay_on_delivery",
    handoverMode: "pickup",
    deliveryMode: "door",
    shipper: { name: "Kariakoo Mart", phone: "0754100200", address: { region: "Dar es Salaam", district: "Ilala" } },
    consignee: { name: "Rehema Test", phone: "0712 345 678", address: { region: "Dar es Salaam", district: "Kinondoni", landmark: "Sinza Mori" } },
    goodsDescription: "Shoes",
    goodsCategory: "apparel",
    prohibitedDeclared: true,
    pieces: [{ weightKg: 1, lengthCm: 20, widthCm: 20, heightCm: 10 }],
  });
  return (await createParcel(merchant, order)).shipment.waybill;
}

describe("receiver code from the booking SMS", () => {
  it("is issued at booking, hashed, sent via HuduFeed, and unlocks full details", async () => {
    const wb = await newParcel();
    const masked = (await publicTracking(wb, false)) as { consignee: { name: string } };
    expect(masked.consignee.name).not.toBe("Rehema Test");

    const code = await devReceiverCode(wb);
    expect(code).toMatch(/^\d{6}$/);
    const [row] = await db.select().from(trackingOtps).where(eq(trackingOtps.waybill, wb));
    expect(row.codeHash).not.toContain(code!);
    const msgs = await db.select().from(outbox).where(eq(outbox.waybill, wb));
    expect(msgs.some((m) => (m.payload as { template?: string }).template === "parcel.tracking_code")).toBe(true);

    expect(await verifyTrackingOtp(wb, code === "000000" ? "111111" : "000000")).toEqual({ ok: false, error: "invalid" });
    const ok = await verifyTrackingOtp(wb, code!);
    expect(ok.ok).toBe(true);
    const token = (ok as { token: string }).token;
    expect(await isTrackingVerified(wb, token)).toBe(true);
    expect(await isTrackingVerified("TMP-2611-OTHER00", token)).toBe(false);
    const full = (await publicTracking(wb, true)) as { consignee: { name: string; phone: string } };
    expect(full.consignee).toMatchObject({ name: "Rehema Test", phone: "+255712345678" });
  });

  it("can be used again later (the receiver may come back)", async () => {
    const wb = await newParcel();
    const code = (await devReceiverCode(wb))!;
    expect((await verifyTrackingOtp(wb, code)).ok).toBe(true);
    expect((await verifyTrackingOtp(wb, code)).ok).toBe(true);
  });

  it("is replaced by a resend, and resends wait a minute", async () => {
    const wb = await newParcel();
    const first = (await devReceiverCode(wb))!;
    expect(await requestTrackingOtp(wb)).toMatchObject({ ok: false, error: "wait" }); // booking SMS just went out
    await db.update(trackingOtps).set({ createdAt: new Date(Date.now() - 120_000) }).where(eq(trackingOtps.waybill, wb));
    const resent = (await requestTrackingOtp(wb)) as { ok: true; devCode: string };
    expect(resent.ok).toBe(true);
    if (resent.devCode !== first) expect((await verifyTrackingOtp(wb, first)).ok).toBe(false);
    expect((await verifyTrackingOtp(wb, resent.devCode)).ok).toBe(true);
  });

  it("locks after five wrong attempts until a new code is sent", async () => {
    const wb = await newParcel();
    const code = (await devReceiverCode(wb))!;
    const wrong = code === "123456" ? "654321" : "123456";
    for (let i = 0; i < 4; i++) expect((await verifyTrackingOtp(wb, wrong)).ok).toBe(false);
    expect(await verifyTrackingOtp(wb, wrong)).toEqual({ ok: false, error: "locked" });
    expect(await verifyTrackingOtp(wb, code)).toEqual({ ok: false, error: "locked" });
  });

  it("stops working once expired", async () => {
    const wb = await newParcel();
    const code = (await devReceiverCode(wb))!;
    await db.update(trackingOtps).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(trackingOtps.waybill, wb));
    expect(await verifyTrackingOtp(wb, code)).toEqual({ ok: false, error: "expired" });
  });
});
