import { describe, expect, it } from "vitest";
import { canTransition, isBeforeHandover } from "../states";
import { DEFAULT_ROLES, type Permission } from "../roles";

const permsOf = (key: string) => new Set<Permission>(DEFAULT_ROLES.find((r) => r.key === key)!.permissions);
import { promisedAt, quote, weights, zoneFor } from "../pricing";
import { maskPhone, toE164TZ } from "../phone";

describe("lifecycle (FR-WB-04)", () => {
  it("allows a rider to mark out-for-delivery parcels delivered", () => {
    expect(canTransition("OUT_FOR_DELIVERY", "DELIVERED", permsOf("rider")).ok).toBe(true);
  });
  it("rejects skipping states", () => {
    const r = canTransition("CREATED", "DELIVERED", permsOf("control_tower"));
    expect(r).toMatchObject({ ok: false, code: "STATE_NOT_ALLOWED" });
  });
  it("rejects roles that may not set a state", () => {
    expect(canTransition("CREATED", "CANCELLED", permsOf("rider"))).toMatchObject({ ok: false, code: "ROLE_NOT_ALLOWED" });
    expect(canTransition("CREATED", "CANCELLED", permsOf("merchant_user")).ok).toBe(true);
  });
  it("follows permissions, not role names, so custom roles work", () => {
    const custom = new Set<Permission>(["shipment.deliver"]);
    expect(canTransition("OUT_FOR_DELIVERY", "DELIVERED", custom).ok).toBe(true);
    expect(canTransition("OUT_FOR_DELIVERY", "ATTEMPT_FAILED", custom).ok).toBe(false);
  });
  it("knows when cancellation is free (FR-PCL-12)", () => {
    expect(isBeforeHandover("AWAITING_HANDOVER")).toBe(true);
    expect(isBeforeHandover("RECEIVED")).toBe(false);
  });
});

describe("pricing (FR-PCL-03)", () => {
  it("uses the greater of actual and volumetric weight per piece", () => {
    const w = weights([
      { weightKg: 1, lengthCm: 50, widthCm: 40, heightCm: 30 }, // volumetric 12 kg
      { weightKg: 5, lengthCm: 10, widthCm: 10, heightCm: 10 }, // volumetric 0.2 kg
    ]);
    expect(w).toEqual({ actualG: 6000, volumetricG: 12200, chargeableG: 17000 });
  });
  it("derives zones", () => {
    expect(zoneFor("Dar es Salaam", "Dar es Salaam")).toBe("local");
    expect(zoneFor("Dar es Salaam", "Arusha")).toBe("core");
    expect(zoneFor("Dar es Salaam", "Kigoma")).toBe("national");
    expect(zoneFor("Dar es Salaam", "Mjini Magharibi")).toBe("island");
  });
  it("prices a local next-day COD parcel with VAT estimate", () => {
    const q = quote({
      originRegion: "Dar es Salaam",
      destRegion: "Dar es Salaam",
      serviceLevel: "next_day",
      deliveryMode: "door",
      codAmount: 120000,
      pieces: [{ weightKg: 2.4, lengthCm: 30, widthCm: 20, heightCm: 10 }],
    });
    expect(q.ok).toBe(true);
    if (!q.ok) return;
    expect(q.chargeableKg).toBe(3);
    expect(q.lines.map((l) => l.code)).toEqual(["BASE", "WEIGHT", "COD_FEE"]);
    expect(q.subtotal).toBe(4500 + 1200 + 2400);
    expect(q.total).toBe(q.subtotal + q.tax);
  });
  it("refuses same-day outside the local zone and over-weight pieces", () => {
    const base = { originRegion: "Dar es Salaam", destRegion: "Arusha", deliveryMode: "door" as const };
    expect(quote({ ...base, serviceLevel: "same_day", pieces: [{ weightKg: 1, lengthCm: 1, widthCm: 1, heightCm: 1 }] })).toMatchObject({ ok: false, code: "SERVICE_NOT_AVAILABLE" });
    expect(quote({ ...base, serviceLevel: "standard", pieces: [{ weightKg: 31, lengthCm: 1, widthCm: 1, heightCm: 1 }] })).toMatchObject({ ok: false, code: "PIECE_TOO_HEAVY" });
  });
  it("promises same-day by 21:00 EAT when ordered before 14:00 EAT", () => {
    const p = promisedAt("same_day", "local", new Date("2026-11-02T08:00:00Z")); // 11:00 EAT
    expect(p.toISOString()).toBe("2026-11-02T18:00:00.000Z");
  });
});

describe("phones (FR-WB-07)", () => {
  it("normalises to E.164", () => {
    expect(toE164TZ("0712 345 678")).toBe("+255712345678");
    expect(toE164TZ("+255 654 321 000")).toBe("+255654321000");
    expect(toE164TZ("0222123456")).toBeNull();
  });
  it("masks", () => {
    expect(maskPhone("+255712345678")).toBe("+255 7•• ••• 678");
  });
});

import { amountToCollect, senderPays } from "../payments";

describe("payments", () => {
  it("adds the delivery fee to COD only when the receiver pays delivery", () => {
    expect(amountToCollect({ paymentTerms: "pay_on_delivery", codAmount: 20000, totalCharge: 5900 })).toEqual({ goods: 20000, fee: 5900, total: 25900 });
    expect(amountToCollect({ paymentTerms: "account", codAmount: 20000, totalCharge: 5900 })).toEqual({ goods: 20000, fee: 0, total: 20000 });
    expect(amountToCollect({ paymentTerms: "prepaid", codAmount: null, totalCharge: 5900 }).total).toBe(0);
  });
  it("checks sender standing only when the sender pays", () => {
    expect(senderPays("pay_on_delivery")).toBe(false);
    expect(senderPays("account")).toBe(true);
  });
});
