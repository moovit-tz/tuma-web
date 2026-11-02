import "server-only";
import { z } from "zod";
import { db } from "../db/client";
import { supportRequests } from "../db/schema";
import { enqueue } from "../adapters/outbox";
import { audit } from "../audit";
import { toE164TZ } from "@/domain/phone";
import { isValidWaybill, normaliseWaybill } from "@/domain/waybill-number";

const phone = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const e = toE164TZ(v);
    if (!e) {
      ctx.addIssue({ code: "custom", message: "phone" });
      return z.NEVER;
    }
    return e;
  });
const optEmail = z.union([z.email(), z.literal("")]).optional().transform((v) => v || undefined);
const waybill = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return undefined;
    const { waybill } = normaliseWaybill(v);
    if (!isValidWaybill(waybill)) {
      ctx.addIssue({ code: "custom", message: "waybill" });
      return z.NEVER;
    }
    return waybill;
  });

export const lostItemSchema = z.object({
  waybill,
  name: z.string().trim().min(2).max(120),
  phone,
  email: optEmail,
  itemDescription: z.string().trim().min(5).max(1000),
  lastSeen: z.string().trim().max(300).optional(),
  lostOn: z.string().trim().max(20).optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone,
  email: optEmail,
  topic: z.enum(["tracking", "delivery", "cod", "account", "other"]),
  waybill,
  message: z.string().trim().min(5).max(2000),
});

export const businessSchema = z.object({
  company: z.string().trim().min(2).max(160),
  name: z.string().trim().min(2).max(120),
  phone,
  email: z.email(),
  monthlyVolume: z.enum(["lt_100", "100_1000", "1000_10000", "gt_10000"]),
  services: z.array(z.enum(["parcel", "cargo", "cod", "api"])).default([]),
  message: z.string().trim().max(2000).optional(),
  /** Answers and recommendation from the solution discovery walkthrough, passed to CRM with the lead. */
  discovery: z.record(z.string(), z.unknown()).optional(),
});

export type SupportKind = "lost_item" | "contact" | "business";

function newRef(kind: SupportKind) {
  const prefix = kind === "lost_item" ? "LI" : kind === "business" ? "BZ" : "CS";
  const now = new Date();
  const yymm = `${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => "0123456789ABCDEFGHJKMNPQRSTVWXYZ"[b & 31]).join("");
  return `${prefix}-${yymm}-${rand}`;
}

/** Records the request and queues it for the owning system: Bliss for cases, CRM for leads. */
export async function submitSupportRequest(
  kind: SupportKind,
  data: { name: string; phone?: string; email?: string; waybill?: string } & Record<string, unknown>,
  locale: string,
) {
  const ref = newRef(kind);
  await db.transaction(async (tx) => {
    const { name, phone, email, waybill, ...body } = data;
    await tx.insert(supportRequests).values({ ref, kind, name, phone, email, waybill, body, locale });
    if (kind === "business") {
      await enqueue(tx, { target: "crm", topic: "lead.create", idempotencyKey: `lead:${ref}`, payload: { ref, ...data } });
    } else {
      await enqueue(tx, {
        target: "bliss",
        topic: "case.create",
        idempotencyKey: `case:${ref}`,
        waybill,
        payload: { ref, kind, ...data, priority: kind === "lost_item" ? "high" : "normal" },
      });
    }
    await audit(tx, { actorId: "public", action: `support.${kind}`, entity: "support_request", entityId: ref, after: { waybill } });
  });
  return ref;
}
