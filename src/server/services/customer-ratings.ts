import "server-only";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { customerRatings, jobShipments, jobs, shipments, users } from "../db/schema";
import type { CurrentUser } from "../auth/current-user";
import { DomainError } from "./shipments";
import { ratingScore, MIN_RATINGS } from "./ratings";
import { toE164 } from "@/domain/phone";
import { normaliseWaybill } from "@/domain/waybill-number";

/**
 * The other way round from parcel ratings: the Tuma point or courier that served someone rates them on that parcel
 * (the sender who brought it, the receiver who collected it). 1–5 stars and an optional note, once per business,
 * parcel and person. The person's score is the same Bayesian average as the points' (see ratings.ts), over 180 days,
 * and shows in their app once there are enough ratings to say.
 */

const SCORE_DAYS = 180;
/** Ratings once the parcel has reached the counter: before that nobody met them. */
const RATEABLE = ["RECEIVED", "AT_HUB", "IN_TRANSIT", "OUT_FOR_DELIVERY", "ATTEMPT_FAILED", "DELIVERED", "RETURNED", "RETURNED_TO_SENDER"];

export const customerRatingSchema = z.object({
  role: z.enum(["sender", "receiver"], { error: "Choose who you're rating" }),
  stars: z.coerce.number({ error: "Choose 1 to 5 stars" }).int().min(1, "Choose 1 to 5 stars").max(5),
  note: z.string().trim().max(300).optional(),
});

/** The parcel and the business rating on it: an agent's (booked or handled it), or the courier's job fleet. */
async function rater(user: CurrentUser, rawWaybill: string) {
  const { waybill } = normaliseWaybill(rawWaybill);
  const [s] = await db.select().from(shipments).where(eq(shipments.waybill, waybill));
  if (!s) throw new DomainError("NOT_FOUND", "We couldn't find that parcel.", 404);
  if (user.accountId && user.permissions.has("agent.workspace") && (s.accountId === user.accountId || s.handlingPartnerId === user.accountId)) {
    return { s, accountId: user.accountId };
  }
  const [j] = await db
    .select({ accountId: jobs.accountId })
    .from(jobShipments)
    .innerJoin(jobs, eq(jobs.id, jobShipments.jobId))
    .where(and(eq(jobShipments.shipmentId, s.id), eq(jobs.driverId, user.id)))
    .limit(1);
  if (j?.accountId) return { s, accountId: j.accountId };
  throw new DomainError("FORBIDDEN", "Only the business that served this parcel can rate its customers.", 403);
}

/** What this business already gave the sender and the receiver on this parcel. */
export async function customerRatingsOn(accountId: string, shipmentId: string) {
  const rows = await db
    .select({ role: customerRatings.role, stars: customerRatings.stars })
    .from(customerRatings)
    .where(and(eq(customerRatings.accountId, accountId), eq(customerRatings.shipmentId, shipmentId)));
  return { sender: rows.find((r) => r.role === "sender")?.stars ?? null, receiver: rows.find((r) => r.role === "receiver")?.stars ?? null };
}

export async function rateCustomer(user: CurrentUser, rawWaybill: string, raw: unknown) {
  const { s, accountId } = await rater(user, rawWaybill);
  if (!RATEABLE.includes(s.state)) throw new DomainError("NOT_YET", "You can rate them once the parcel is at the counter.", 409);
  const v = customerRatingSchema.parse(raw);
  const phone = toE164((v.role === "sender" ? s.shipper.phone : s.consignee.phone) ?? "");
  if (!phone) throw new DomainError("NO_PHONE", "This customer has no phone number on the parcel.", 422);
  await db
    .insert(customerRatings)
    .values({ accountId, shipmentId: s.id, phone, role: v.role, stars: v.stars, note: v.note || null, ratedBy: user.id })
    .onConflictDoUpdate({
      target: [customerRatings.accountId, customerRatings.shipmentId, customerRatings.phone],
      set: { stars: v.stars, note: v.note || null, ratedBy: user.id, createdAt: new Date() },
    });
  return { ok: true, ratings: await customerRatingsOn(accountId, s.id) };
}

/** A person's score from the businesses that served them: null until there are enough ratings. */
export async function customerScore(phones: string | string[]) {
  const list = (Array.isArray(phones) ? phones : [phones]).filter(Boolean);
  if (!list.length) return { score: null, count: 0, minRatings: MIN_RATINGS };
  const since = new Date(Date.now() - SCORE_DAYS * 86400_000);
  const [t] = await db
    .select({ n: sql<number>`count(*)::int`, sum: sql<number>`coalesce(sum(${customerRatings.stars}), 0)::int` })
    .from(customerRatings)
    .where(and(inArray(customerRatings.phone, list), gte(customerRatings.createdAt, since)));
  const n = t?.n ?? 0;
  return { score: n >= MIN_RATINGS ? ratingScore(t.sum, n) : null, count: n, minRatings: MIN_RATINGS };
}

/** The signed-in person's own score (their app's profile). */
export async function myCustomerScore(user: CurrentUser) {
  const [u] = await db.select({ phone: users.phone }).from(users).where(eq(users.id, user.id));
  const phone = u?.phone ? toE164(u.phone) : null;
  return customerScore(phone ? [phone] : []);
}

