import { z } from "zod";
import { toE164TZ } from "./phone";
import { MAX_PIECE_WEIGHT_KG, TZ_REGIONS } from "./pricing";
import { COLLECT_METHODS, DELIVERY_PAYERS, PREPAY_METHODS } from "./payments";

/** Parcel order input — FR-PCL-01, address rules FR-WB-07. Shared by the portal form, server and API. */

const phone = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const e164 = toE164TZ(v);
    if (!e164) {
      ctx.addIssue({ code: "custom", message: "Enter a Tanzanian mobile number, e.g. 0712 345 678" });
      return z.NEVER;
    }
    return e164;
  });

const optionalText = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : undefined));

const coord = (min: number, max: number) =>
  z
    .union([z.coerce.number().min(min).max(max), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v));

export const addressSchema = z.object({
  region: z.enum(TZ_REGIONS, { message: "Choose a region" }),
  district: z.string().trim().min(2, "Enter the district (wilaya)"),
  ward: optionalText,
  street: optionalText,
  landmark: optionalText,
  lat: coord(-12, 0),
  lng: coord(29, 41),
});

export const partySchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(120),
  phone,
  email: z.union([z.email(), z.literal("")]).optional().transform((v) => v || undefined),
  language: z.enum(["en", "sw"]).default("sw"),
  address: addressSchema,
});

export const pieceSchema = z.object({
  weightKg: z.coerce.number().positive("Enter the weight").max(MAX_PIECE_WEIGHT_KG, `Max ${MAX_PIECE_WEIGHT_KG} kg per piece. Book heavier goods as cargo.`),
  lengthCm: z.coerce.number().int().positive().max(200),
  widthCm: z.coerce.number().int().positive().max(200),
  heightCm: z.coerce.number().int().positive().max(200),
  description: optionalText,
});

export const parcelOrderSchema = z
  .object({
    merchantRef: optionalText,
    serviceLevel: z.enum(["same_day", "next_day", "standard"]),
    /** Who pays delivery: sender prepaid, sender on account, or receiver on delivery. */
    paymentTerms: z.enum(DELIVERY_PAYERS),
    prepayMethod: z.enum(PREPAY_METHODS).optional(),
    collectMethods: z.array(z.enum(COLLECT_METHODS)).default(["cash", "mobile_money"]),
    handoverMode: z.enum(["pickup", "wakala_dropoff", "hub_bulk"]),
    deliveryMode: z.enum(["door", "wakala_collect"]),
    pickupLocationId: optionalText,
    deliveryLocationId: optionalText,
    shipper: partySchema,
    consignee: partySchema,
    deliveryInstructions: z.string().trim().max(500).optional(),
    goodsDescription: z.string().trim().min(3, "Describe the goods").max(200),
    goodsCategory: z.string().trim().min(2),
    declaredValue: z.coerce.number().int().min(0).optional(),
    codAmount: z.coerce.number().int().min(0).optional(),
    specialHandling: z.array(z.enum(["fragile", "perishable", "liquid", "oversize"])).default([]),
    prohibitedDeclared: z.literal(true, { message: "Confirm the goods contain no prohibited items" }),
    pieces: z.array(pieceSchema).min(1).max(20),
  })
  .superRefine((o, ctx) => {
    // FR-WB-07: a pin or landmark is required for door delivery.
    const a = o.consignee.address;
    if (o.deliveryMode === "door" && !a.landmark && (a.lat === undefined || a.lng === undefined)) {
      ctx.addIssue({ code: "custom", path: ["consignee", "address", "landmark"], message: "Add a landmark or a map pin for door delivery" });
    }
    if (o.deliveryMode === "wakala_collect" && !o.deliveryLocationId) {
      ctx.addIssue({ code: "custom", path: ["deliveryLocationId"], message: "Choose the Wakala point for collection" });
    }
    if (o.handoverMode === "wakala_dropoff" && !o.pickupLocationId) {
      ctx.addIssue({ code: "custom", path: ["pickupLocationId"], message: "Choose the Wakala point for drop-off" });
    }
    if (o.paymentTerms === "prepaid" && !o.prepayMethod) {
      ctx.addIssue({ code: "custom", path: ["prepayMethod"], message: "Choose how you will prepay" });
    }
    const collecting = o.paymentTerms === "pay_on_delivery" || (o.codAmount ?? 0) > 0;
    if (collecting && o.collectMethods.length === 0) {
      ctx.addIssue({ code: "custom", path: ["collectMethods"], message: "Choose at least one way the receiver can pay" });
    }
  });

export type ParcelOrderInput = z.input<typeof parcelOrderSchema>;
export type ParcelOrder = z.output<typeof parcelOrderSchema>;
