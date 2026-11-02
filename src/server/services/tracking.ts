import "server-only";
import { asc, eq } from "drizzle-orm";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, gte, sql } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { db, type Tx } from "../db/client";
import { events, locations, outbox, reasonCodes, shipments, trackingOtps } from "../db/schema";
import { enqueue } from "../adapters/outbox";
import { isValidWaybill, normaliseWaybill } from "@/domain/waybill-number";
import { maskName, maskPhone } from "@/domain/phone";

/**
 * Public tracking (section 7.2, FR-TRK-02). No sign-in. Names, phones and addresses are masked
 * until the last four digits of the receiver's phone are given.
 */

const buckets = new Map<string, { tokens: number; at: number }>();

/** NFR-13: per-IP rate limit (token bucket, 30 lookups / minute). In-memory until a shared store exists. */
export function allowLookup(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip) ?? { tokens: 30, at: now };
  b.tokens = Math.min(30, b.tokens + ((now - b.at) / 60000) * 30);
  b.at = now;
  if (b.tokens < 1) {
    buckets.set(ip, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(ip, b);
  return true;
}

/**
 * @param verified true when the visitor proved, by SMS code, that they are the receiver
 *                 (see requestTrackingOtp / verifyTrackingOtp and the signed tracking cookie).
 */
export async function publicTracking(raw: string, verified = false) {
  const { waybill } = normaliseWaybill(raw);
  if (!isValidWaybill(waybill)) return { status: "invalid" as const, waybill };
  const [s] = await db.select().from(shipments).where(eq(shipments.waybill, waybill));
  if (!s) return { status: "not_found" as const, waybill };

  const evts = await db
    .select({
      type: events.type,
      stateAfter: events.stateAfter,
      occurredAt: events.occurredAt,
      estimated: events.estimated,
      locationName: locations.name,
      locationRegion: locations.region,
      reasonEn: reasonCodes.labelEn,
      reasonSw: reasonCodes.labelSw,
    })
    .from(events)
    .leftJoin(locations, eq(locations.id, events.locationId))
    .leftJoin(reasonCodes, eq(reasonCodes.code, events.reasonCode))
    .where(eq(events.shipmentId, s.id))
    .orderBy(asc(events.occurredAt));

  return {
    status: "ok" as const,
    waybill,
    verified,
    state: s.state,
    serviceLevel: s.serviceLevel,
    promisedAt: s.promisedAt,
    deliveredAt: s.deliveredAt,
    piecesCount: s.piecesCount,
    origin: s.shipper.address.region,
    destination: s.consignee.address.region,
    consignee: verified
      ? { name: s.consignee.name, phone: s.consignee.phone, address: s.consignee.address }
      : { name: maskName(s.consignee.name), phone: maskPhone(s.consignee.phone), address: { region: s.consignee.address.region, district: s.consignee.address.district } },
    // Public timeline: state changes plus estimated milestones (FR-TRK-03), never internal notes or actors.
    timeline: evts.filter((e) => e.stateAfter || e.estimated),
  };
}

/* ------------------------------------------------------- receiver codes */

export const OTP_LENGTH = 6;
const CODE_TTL_MS = 30 * 24 * 3600_000; // valid while the parcel is in the network
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_MS = 60_000;
const OTP_MAX_PER_HOUR = 5;
export const CODE_TEMPLATE = "parcel.tracking_code";

const key = () => new TextEncoder().encode(process.env.SESSION_SECRET ?? "");
export const hashCode = (waybill: string, code: string) =>
  createHash("sha256").update(`${process.env.SESSION_SECRET}:${waybill}:${code}`).digest("hex");

/**
 * Issue the receiver's code and queue the SMS that carries it. Called when a parcel is booked
 * (inside the booking transaction) and on resend. Any earlier code for the waybill stops working.
 */
export async function issueReceiverCode(
  tx: Tx,
  s: { waybill: string; consignee: { phone: string; language?: string } },
  reason: "booked" | "resend",
) {
  const code = String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
  await tx.update(trackingOtps).set({ expiresAt: new Date() }).where(and(eq(trackingOtps.waybill, s.waybill), gte(trackingOtps.expiresAt, new Date())));
  const [otp] = await tx
    .insert(trackingOtps)
    .values({ waybill: s.waybill, codeHash: hashCode(s.waybill, code), expiresAt: new Date(Date.now() + CODE_TTL_MS) })
    .returning({ id: trackingOtps.id });
  await enqueue(tx, {
    target: "hudufeed",
    topic: "notification.request",
    idempotencyKey: `code:${otp.id}`,
    waybill: s.waybill,
    payload: { template: CODE_TEMPLATE, channel: "sms", language: s.consignee.language ?? "sw", to: s.consignee.phone, variables: { code, waybill: s.waybill, reason } },
  });
  return code;
}

export type OtpRequestResult =
  | { ok: true; maskedPhone: string; resendInSec: number; devCode?: string }
  | { ok: false; error: "not_found" | "wait" | "too_many"; retryInSec?: number };

/** "Didn't get it?" — send a fresh code. One per minute, five per hour per waybill. */
export async function requestTrackingOtp(raw: string): Promise<OtpRequestResult> {
  const { waybill } = normaliseWaybill(raw);
  const [s] = await db.select({ waybill: shipments.waybill, consignee: shipments.consignee }).from(shipments).where(eq(shipments.waybill, waybill));
  if (!s) return { ok: false, error: "not_found" };

  const hourAgo = new Date(Date.now() - 3600_000);
  const recent = await db
    .select({ createdAt: trackingOtps.createdAt })
    .from(trackingOtps)
    .where(and(eq(trackingOtps.waybill, waybill), gte(trackingOtps.createdAt, hourAgo)))
    .orderBy(desc(trackingOtps.createdAt));
  if (recent.length >= OTP_MAX_PER_HOUR) return { ok: false, error: "too_many" };
  const sinceLast = recent[0] ? Date.now() - recent[0].createdAt.getTime() : Infinity;
  if (sinceLast < OTP_RESEND_MS) return { ok: false, error: "wait", retryInSec: Math.ceil((OTP_RESEND_MS - sinceLast) / 1000) };

  const code = await db.transaction((tx) => issueReceiverCode(tx, s, "resend"));
  return {
    ok: true,
    maskedPhone: maskPhone(s.consignee.phone),
    resendInSec: OTP_RESEND_MS / 1000,
    ...(process.env.NODE_ENV !== "production" ? { devCode: code } : {}),
  };
}

export type OtpVerifyResult = { ok: true; token: string } | { ok: false; error: "invalid" | "expired" | "locked" };

/**
 * Check a code against the receiver's current code. The code stays usable (the receiver may come back);
 * five wrong tries lock it until a new one is sent. Returns a signed proof for the cookie.
 */
export async function verifyTrackingOtp(raw: string, code: string): Promise<OtpVerifyResult> {
  const { waybill } = normaliseWaybill(raw);
  const clean = code.replace(/\D/g, "");
  const [otp] = await db
    .select()
    .from(trackingOtps)
    .where(and(eq(trackingOtps.waybill, waybill), gte(trackingOtps.expiresAt, new Date())))
    .orderBy(desc(trackingOtps.createdAt))
    .limit(1);
  if (!otp) return { ok: false, error: "expired" };
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: "locked" };

  const a = Buffer.from(otp.codeHash, "hex");
  const b = Buffer.from(hashCode(waybill, clean), "hex");
  if (clean.length !== OTP_LENGTH || !timingSafeEqual(a, b)) {
    await db.update(trackingOtps).set({ attempts: otp.attempts + 1 }).where(eq(trackingOtps.id, otp.id));
    return { ok: false, error: otp.attempts + 1 >= OTP_MAX_ATTEMPTS ? "locked" : "invalid" };
  }
  await db.update(trackingOtps).set({ verifiedAt: new Date(), attempts: 0 }).where(eq(trackingOtps.id, otp.id));
  const token = await new SignJWT({ wb: waybill }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30m").sign(key());
  return { ok: true, token };
}

/** Is this cookie value a valid, unexpired proof for this waybill? */
export async function isTrackingVerified(waybill: string, token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload.wb === waybill;
  } catch {
    return false;
  }
}

/**
 * DEVELOPMENT ONLY: SMS is not connected, so read the current code back from the queued SMS
 * so testers can see it. Always undefined in production.
 */
export async function devReceiverCode(waybill: string): Promise<string | undefined> {
  if (process.env.NODE_ENV === "production") return undefined;
  const [msg] = await db
    .select({ payload: outbox.payload })
    .from(outbox)
    .where(and(eq(outbox.waybill, waybill), sql`${outbox.payload}->>'template' = ${CODE_TEMPLATE}`))
    .orderBy(desc(outbox.id))
    .limit(1);
  return (msg?.payload as { variables?: { code?: string } } | undefined)?.variables?.code;
}
