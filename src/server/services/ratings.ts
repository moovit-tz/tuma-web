import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gte, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, type Tx } from "../db/client";
import { accounts, branches, notifications, parcelRatings, shipments, users, type Party } from "../db/schema";
import { enqueue } from "../adapters/outbox";
import { DomainError } from "./shipments";
import type { CurrentUser } from "../auth/current-user";
import { maskPhone, toE164 } from "@/domain/phone";
import { normaliseWaybill } from "@/domain/waybill-number";

/**
 * Ratings of the Tuma points (parcel agents) by the people they hand parcels to. When a parcel is delivered, the
 * receiver gets one SMS with a link of their own (only its hash is kept) to rate the point 1–5 and say what went
 * wrong, once, within two weeks. The rating engine turns them into a score per point: a Bayesian average that starts
 * every point near the network's prior and moves with its own ratings, so three five-star ratings don't outrank a
 * hundred fours. The agent sees its score and feedback; senders see it when choosing where to drop off; Tuma ranks
 * points for last-mile work with it.
 */

export const RATING_TEMPLATE = "parcel.rate";
export const RATING_ISSUES = ["late", "damaged", "missing", "rude", "overcharged", "other"] as const;
const RATE_WINDOW_MS = 14 * 86400_000;
/** The score's window, prior and how many ratings the prior weighs as. */
const SCORE_DAYS = 180;
const PRIOR_MEAN = 4.0;
const PRIOR_WEIGHT = 5;
/** Below this many ratings a score isn't shown (too few to say). */
export const MIN_RATINGS = 3;

const hash = (token: string) => createHash("sha256").update(`rate:${token}`).digest("hex");

/** Bayesian average, one decimal. */
export function ratingScore(sum: number, n: number) {
  return Math.round(((PRIOR_MEAN * PRIOR_WEIGHT + sum) / (PRIOR_WEIGHT + n)) * 10) / 10;
}

/**
 * On delivery (inside the transition): ask the receiver to rate the point that handled it, when that's a parcel
 * agent. Once per parcel.
 */
export async function requestRating(tx: Tx, s: { id: string; waybill: string; accountId: string; handlingPartnerId: string | null; consignee: Party }) {
  const rated = s.handlingPartnerId ?? s.accountId;
  const [a] = await tx.select({ kind: accounts.partnerKind, name: accounts.name }).from(accounts).where(eq(accounts.id, rated));
  if (a?.kind !== "parcel_agent" || !s.consignee.phone) return;
  const token = randomBytes(18).toString("base64url");
  const [row] = await tx
    .insert(parcelRatings)
    .values({ shipmentId: s.id, accountId: rated, tokenHash: hash(token), phone: s.consignee.phone })
    .onConflictDoNothing()
    .returning({ id: parcelRatings.id });
  if (!row) return;
  const language = s.consignee.language ?? "sw";
  const link = `${process.env.APP_URL ?? "https://tuma.hudumika.tz"}/rate/${token}`;
  await enqueue(tx, {
    target: "hudufeed",
    topic: "notification.request",
    idempotencyKey: `rate:${row.id}`,
    waybill: s.waybill,
    payload: { template: RATING_TEMPLATE, language, channel: "sms", to: s.consignee.phone, variables: { waybill: s.waybill, business: a.name, link } },
  });
  await tx.insert(notifications).values({ shipmentId: s.id, template: RATING_TEMPLATE, language, channel: "sms", recipientMasked: maskPhone(s.consignee.phone) });
  return token;
}

async function byToken(token: string) {
  if (!/^[\w-]{16,64}$/.test(token)) return null;
  const [r] = await db
    .select({
      id: parcelRatings.id,
      stars: parcelRatings.stars,
      sentAt: parcelRatings.sentAt,
      ratedAt: parcelRatings.ratedAt,
      waybill: shipments.waybill,
      deliveredAt: shipments.deliveredAt,
      business: accounts.name,
      point: branches.name,
    })
    .from(parcelRatings)
    .innerJoin(shipments, eq(shipments.id, parcelRatings.shipmentId))
    .innerJoin(accounts, eq(accounts.id, parcelRatings.accountId))
    .leftJoin(branches, eq(branches.id, shipments.handlingBranchId))
    .where(eq(parcelRatings.tokenHash, hash(token)));
  return r ?? null;
}

/** What the rating link is for: the parcel, the point, and whether it's rated or too old. */
export async function ratingByToken(token: string) {
  const r = await byToken(token);
  if (!r) return { status: "not_found" as const };
  return {
    status: r.ratedAt ? ("rated" as const) : Date.now() - r.sentAt.getTime() > RATE_WINDOW_MS ? ("expired" as const) : ("open" as const),
    waybill: r.waybill,
    business: r.business,
    point: r.point && r.point !== r.business ? r.point : null,
    deliveredAt: r.deliveredAt?.toISOString() ?? null,
    stars: r.stars,
  };
}

export const ratingSchema = z.object({
  stars: z.coerce.number().int().min(1, "Choose 1 to 5 stars").max(5),
  issue: z.enum(RATING_ISSUES).optional(),
  comment: z.string().trim().max(300).optional(),
});

export async function submitRating(token: string, raw: unknown) {
  const r = await byToken(token);
  if (!r) throw new DomainError("NOT_FOUND", "This rating link isn't valid.", 404);
  if (r.ratedAt) throw new DomainError("ALREADY_RATED", "Thank you, you've already rated this parcel.", 409);
  if (Date.now() - r.sentAt.getTime() > RATE_WINDOW_MS) throw new DomainError("EXPIRED", "This rating link has expired.", 410);
  const v = ratingSchema.parse(raw);
  await db
    .update(parcelRatings)
    .set({ stars: v.stars, issue: v.stars <= 3 ? (v.issue ?? null) : null, comment: v.comment || null, ratedAt: new Date() })
    .where(and(eq(parcelRatings.id, r.id), sql`${parcelRatings.ratedAt} is null`));
  return ratingByToken(token);
}

/* ------------------------------------------------------------- the engine */

/** Each point's score over the window: { score, count } per account, score null under MIN_RATINGS. */
export async function ratingScores(accountIds: string[]) {
  const out = new Map<string, { score: number | null; count: number }>();
  if (!accountIds.length) return out;
  const since = new Date(Date.now() - SCORE_DAYS * 86400_000);
  const rows = await db
    .select({ accountId: parcelRatings.accountId, n: sql<number>`count(*)::int`, sum: sql<number>`coalesce(sum(${parcelRatings.stars}), 0)::int` })
    .from(parcelRatings)
    .where(and(inArray(parcelRatings.accountId, accountIds), isNotNull(parcelRatings.ratedAt), gte(parcelRatings.ratedAt, since)))
    .groupBy(parcelRatings.accountId);
  for (const r of rows) out.set(r.accountId, { score: r.n >= MIN_RATINGS ? ratingScore(r.sum, r.n) : null, count: r.n });
  return out;
}

/** A rating summary over the ratings `where` picks: score, how many, stars, issues, how many answered, latest. */
async function ratingSummary(where: SQL, since: Date, withRecent: boolean) {
  const inWindow = and(where, gte(parcelRatings.sentAt, since));
  const [[t], stars, issues, recent] = await Promise.all([
    db
      .select({
        asked: sql<number>`count(*)::int`,
        n: sql<number>`count(${parcelRatings.ratedAt})::int`,
        sum: sql<number>`coalesce(sum(${parcelRatings.stars}), 0)::int`,
      })
      .from(parcelRatings)
      .innerJoin(shipments, eq(shipments.id, parcelRatings.shipmentId))
      .where(inWindow),
    db
      .select({ stars: parcelRatings.stars, n: sql<number>`count(*)::int` })
      .from(parcelRatings)
      .innerJoin(shipments, eq(shipments.id, parcelRatings.shipmentId))
      .where(and(inWindow, isNotNull(parcelRatings.ratedAt)))
      .groupBy(parcelRatings.stars),
    db
      .select({ issue: parcelRatings.issue, n: sql<number>`count(*)::int` })
      .from(parcelRatings)
      .innerJoin(shipments, eq(shipments.id, parcelRatings.shipmentId))
      .where(and(inWindow, isNotNull(parcelRatings.issue)))
      .groupBy(parcelRatings.issue),
    withRecent
      ? db
          .select({ stars: parcelRatings.stars, issue: parcelRatings.issue, comment: parcelRatings.comment, at: parcelRatings.ratedAt, waybill: shipments.waybill })
          .from(parcelRatings)
          .innerJoin(shipments, eq(shipments.id, parcelRatings.shipmentId))
          .where(and(where, isNotNull(parcelRatings.ratedAt)))
          .orderBy(desc(parcelRatings.ratedAt))
          .limit(20)
      : Promise.resolve([]),
  ]);
  const n = t?.n ?? 0;
  return {
    score: n >= MIN_RATINGS ? ratingScore(t.sum, n) : null,
    average: n ? Math.round((t.sum / n) * 10) / 10 : null,
    count: n,
    asked: t?.asked ?? 0,
    minRatings: MIN_RATINGS,
    stars: Object.fromEntries([1, 2, 3, 4, 5].map((s) => [s, stars.find((x) => x.stars === s)?.n ?? 0])),
    issues: Object.fromEntries(issues.map((i) => [i.issue!, i.n])),
    recent: recent.map((r) => ({ ...r, at: r.at!.toISOString() })),
  };
}

/**
 * Ratings in the app. The business's rating is shared with everyone in it (its score, stars and issues); the
 * customers' words on every parcel are for team managers. Each person also gets their own: the ratings on parcels
 * they booked or handed over, with that feedback.
 */
export async function agentRatings(user: CurrentUser) {
  if (!user.accountId || !user.permissions.has("agent.workspace")) throw new DomainError("FORBIDDEN", "You don't have access to this.", 403);
  const acct = user.accountId;
  const since = new Date(Date.now() - SCORE_DAYS * 86400_000);
  const business = eq(parcelRatings.accountId, acct);
  const served = and(
    business,
    sql`(${shipments.createdBy} = ${user.id} or exists (select 1 from events e where e.shipment_id = ${shipments.id} and e.actor_id = ${user.id} and e.state_after = 'DELIVERED'))`,
  )!;
  const [company, mine] = await Promise.all([ratingSummary(business, since, user.permissions.has("team.manage")), ratingSummary(served, since, true)]);
  // The top level stays the business's, as before, for older apps.
  return { ...company, mine };
}

/* ---------------------------------------------- in the app, for the receiver */

/** The signed-in person's number (E.164), which their rating links went to. */
async function myPhone(user: CurrentUser) {
  const [u] = await db.select({ phone: users.phone }).from(users).where(eq(users.id, user.id));
  return u?.phone ? toE164(u.phone) : null;
}

type Mine = { waybill: string; business: string; point: string | null; status: "open" | "rated" | "expired"; stars: number | null; issue: string | null; deliveredAt: string | null };

function mineOf(r: { waybill: string; business: string; point: string | null; stars: number | null; issue: string | null; sentAt: Date; ratedAt: Date | null; deliveredAt: Date | null }): Mine {
  return {
    waybill: r.waybill,
    business: r.business,
    point: r.point && r.point !== r.business ? r.point : null,
    status: r.ratedAt ? "rated" : Date.now() - r.sentAt.getTime() > RATE_WINDOW_MS ? "expired" : "open",
    stars: r.stars,
    issue: r.issue,
    deliveredAt: r.deliveredAt?.toISOString() ?? null,
  };
}

const mineQuery = () =>
  db
    .select({
      waybill: shipments.waybill,
      business: accounts.name,
      point: branches.name,
      stars: parcelRatings.stars,
      issue: parcelRatings.issue,
      sentAt: parcelRatings.sentAt,
      ratedAt: parcelRatings.ratedAt,
      deliveredAt: shipments.deliveredAt,
      id: parcelRatings.id,
    })
    .from(parcelRatings)
    .innerJoin(shipments, eq(shipments.id, parcelRatings.shipmentId))
    .innerJoin(accounts, eq(accounts.id, parcelRatings.accountId))
    .leftJoin(branches, eq(branches.id, shipments.handlingBranchId));

/** The rating asked of this number for one parcel (on the parcel screen), or null when none was asked. */
export async function myRatingFor(shipmentId: string, phone: string): Promise<Mine | null> {
  const [r] = await mineQuery().where(and(eq(parcelRatings.shipmentId, shipmentId), eq(parcelRatings.phone, phone)));
  return r ? mineOf(r) : null;
}

/** Everything this person was asked to rate: still to rate first, then what they rated. */
export async function myRatings(user: CurrentUser) {
  const phone = await myPhone(user);
  if (!phone) return { toRate: [], rated: [] };
  const rows = await mineQuery().where(eq(parcelRatings.phone, phone)).orderBy(desc(parcelRatings.sentAt)).limit(50);
  const all = rows.map(mineOf);
  return { toRate: all.filter((r) => r.status === "open"), rated: all.filter((r) => r.status === "rated") };
}

/** Rate the point from the app instead of the SMS link: the same rules, matched by the person's number. */
export async function rateMine(user: CurrentUser, rawWaybill: string, raw: unknown) {
  const phone = await myPhone(user);
  const [r] = phone ? await mineQuery().where(and(eq(shipments.waybill, normaliseWaybill(rawWaybill).waybill), eq(parcelRatings.phone, phone))) : [];
  if (!r) throw new DomainError("NOT_FOUND", "There's nothing to rate on this parcel.", 404);
  if (r.ratedAt) throw new DomainError("ALREADY_RATED", "Thank you, you've already rated this parcel.", 409);
  if (Date.now() - r.sentAt.getTime() > RATE_WINDOW_MS) throw new DomainError("EXPIRED", "Rating this parcel has closed.", 410);
  const v = ratingSchema.parse(raw);
  await db
    .update(parcelRatings)
    .set({ stars: v.stars, issue: v.stars <= 3 ? (v.issue ?? null) : null, comment: v.comment || null, ratedAt: new Date() })
    .where(and(eq(parcelRatings.id, r.id), sql`${parcelRatings.ratedAt} is null`));
  return { ok: true, stars: v.stars };
}
