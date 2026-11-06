import "server-only";
import { z } from "zod";
import { db } from "../db/client";
import { supportRequests, supportUpdates } from "../db/schema";
import { and, asc, eq, ne } from "drizzle-orm";
import { DomainError } from "./shipments";
import { enqueue } from "../adapters/outbox";
import { audit } from "../audit";
import { maskPhone, toE164TZ } from "@/domain/phone";
import { isValidWaybill, normaliseWaybill } from "@/domain/waybill-number";
import { normaliseReference } from "@/domain/reference-number";
import { issueReference } from "../adapters/references";
import { randomUUID } from "node:crypto";

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

/** Business leads go to CRM, not Bliss, so they are not cases and keep their own lead number. */
function leadRef() {
  const prefix = "BZ";
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
  const id = randomUUID();
  return db.transaction(async (tx) => {
    // Lost-item and contact cases get a Hudumika global case reference (AAA001), from the same sequence as parcels
    // and Bliss's own cases; the related waybill is stored alongside it, never in place of it.
    const ref = kind === "business" ? leadRef() : (await issueReference({ type: "CASE", entityId: id, createdBy: "public" }, tx)).referenceNumber;
    const { name, phone, email, waybill, ...body } = data;
    const [req] = await tx.insert(supportRequests).values({ id, ref, kind, name, phone, email, waybill, body, locale }).returning({ id: supportRequests.id });
    if (kind !== "business") {
      await tx.insert(supportUpdates).values({ requestId: req.id, status: "new", source: "tuma" });
      // Confirmation with the case number: the only thing a guest needs to follow the case later (Feed sends it).
      if (phone) {
        await enqueue(tx, {
          target: "hudufeed",
          topic: "notification.request",
          idempotencyKey: `case-received:${ref}`,
          waybill,
          payload: { template: CASE_RECEIVED_TEMPLATE, channel: "sms", language: locale, to: phone, variables: { ref, kind } },
        });
      }
    }
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
    return ref;
  });
}

/* ------------------------------------------------------------ case status (public) */

export const CASE_RECEIVED_TEMPLATE = "support.case_received";
export const CASE_UPDATED_TEMPLATE = "support.case_updated";

/** Statuses a customer can see. Bliss statuses are mapped onto these by the hook; anything else is kept as "in_review". */
export const CASE_STATUSES = ["new", "in_review", "searching", "found", "not_found", "resolved", "closed"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];
const FINAL: CaseStatus[] = ["found", "not_found", "resolved", "closed"];

/**
 * A guest's view of their own case: needs the case number and the phone it was filed with, and answers
 * "not found" for any mismatch so case numbers can't be probed. Notes are the customer-facing ones Bliss sent.
 */
export async function publicCase(rawRef: string, rawPhone: string) {
  const ref = normaliseReference(rawRef);
  const phone = toE164TZ(rawPhone);
  const [r] = await db
    .select()
    .from(supportRequests)
    .where(and(eq(supportRequests.ref, ref), ne(supportRequests.kind, "business")));
  if (!r || !phone || r.phone !== phone) throw new DomainError("NOT_FOUND", "No report matches that case number and phone.", 404);
  const updates = await db
    .select({ status: supportUpdates.status, note: supportUpdates.note, at: supportUpdates.occurredAt })
    .from(supportUpdates)
    .where(eq(supportUpdates.requestId, r.id))
    .orderBy(asc(supportUpdates.occurredAt));
  const body = r.body as { itemDescription?: string; lastSeen?: string; lostOn?: string };
  return {
    ref: r.ref,
    kind: r.kind,
    status: r.status,
    final: FINAL.includes(r.status as CaseStatus),
    createdAt: r.createdAt,
    waybill: r.waybill,
    item: body.itemDescription ?? null,
    lastSeen: body.lastSeen ?? null,
    lostOn: body.lostOn ?? null,
    phone: maskPhone(r.phone ?? ""),
    updates: updates.length ? updates : [{ status: "new", note: null, at: r.createdAt }],
  };
}

export const caseUpdateSchema = z.object({
  /** Bliss's event id; a repeat is ignored. */
  eventId: z.string().min(1).max(120),
  ref: z.string().trim().min(3).max(40),
  status: z.string().trim().min(1).max(40),
  /** Customer-facing note only; internal notes stay in Bliss. */
  note: z.string().trim().max(1000).optional(),
  occurredAt: z.coerce.date().optional(),
});

/** Bliss → Tuma: record a case update, move the status, and text the customer when it changes. */
export async function applyCaseUpdate(raw: unknown) {
  const u = caseUpdateSchema.parse(raw);
  const status: CaseStatus = (CASE_STATUSES as readonly string[]).includes(u.status) ? (u.status as CaseStatus) : "in_review";
  return db.transaction(async (tx) => {
    const [r] = await tx.select().from(supportRequests).where(eq(supportRequests.ref, normaliseReference(u.ref)));
    if (!r) throw new DomainError("NOT_FOUND", "Unknown case.", 404);
    const [ins] = await tx
      .insert(supportUpdates)
      .values({ requestId: r.id, status, note: u.note || null, source: "bliss", externalId: `bliss:${u.eventId}`, occurredAt: u.occurredAt ?? new Date() })
      .onConflictDoNothing({ target: supportUpdates.externalId })
      .returning({ id: supportUpdates.id });
    if (!ins) return { ok: true, duplicate: true };
    const changed = r.status !== status;
    if (changed) await tx.update(supportRequests).set({ status }).where(eq(supportRequests.id, r.id));
    if (changed && r.phone) {
      await enqueue(tx, {
        target: "hudufeed",
        topic: "notification.request",
        idempotencyKey: `case-updated:${u.eventId}`,
        waybill: r.waybill ?? undefined,
        payload: { template: CASE_UPDATED_TEMPLATE, channel: "sms", language: r.locale, to: r.phone, variables: { ref: r.ref, status, note: u.note ?? "" } },
      });
    }
    await audit(tx, { actorId: "bliss", action: "support.update", entity: "support_request", entityId: r.ref, before: { status: r.status }, after: { status } });
    return { ok: true, duplicate: false };
  });
}
