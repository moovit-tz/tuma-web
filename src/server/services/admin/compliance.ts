import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import {
  amlScreenings,
  claims,
  customerRatings,
  dsrRequests,
  kycRecords,
  parcelRatings,
  shipments,
  supportRequests,
  users,
  walletEntries,
  watchlistEntries,
} from "../../db/schema";
import { audit } from "../../audit";
import { enqueue } from "../../adapters/outbox";
import { DomainError } from "../shipments";
import { ref } from "./claims";
import { toE164 } from "@/domain/phone";
import type { CurrentUser } from "../../auth/current-user";

/**
 * Compliance: know-your-customer tiers, AML screening against sanctions, PEP and Tuma's own watchlist, and
 * data-subject requests under Tanzania's PDPA (2022).
 */

/* ======================================================================== KYC */

/**
 * What each tier allows in a personal wallet. Tier 0: phone only. Tier 1: name and ID number given. Tier 2: ID checked
 * by Tuma. Tier 3: a business that passed KYB. PLACEHOLDER limits until compliance signs them off.
 */
export const KYC_TIERS = [
  { tier: 0, maxBalance: 500_000 },
  { tier: 1, maxBalance: 2_000_000 },
  { tier: 2, maxBalance: 10_000_000 },
  { tier: 3, maxBalance: null },
] as const;

export function maxBalanceFor(tier: number): number | null {
  return KYC_TIERS.find((t) => t.tier === tier)?.maxBalance ?? null;
}

/** Throws when the wallet would hold more than the person's KYC tier allows. */
export async function assertKycAllows(userId: string, balanceAfter: number) {
  const [u] = await db.select({ tier: users.kycTier }).from(users).where(eq(users.id, userId));
  const max = maxBalanceFor(u?.tier ?? 0);
  if (max !== null && balanceAfter > max) {
    throw new DomainError("KYC_LIMIT", `Your wallet can hold up to TZS ${max.toLocaleString("en-US")} until you verify your identity. Visit a Tuma point with your ID.`, 409);
  }
}

const ID_TYPES = ["nida", "voter", "passport", "driving_licence"] as const;

export const kycSchema = z.object({
  phone: z.string().trim().min(9).max(20),
  fullName: z.string().trim().min(3).max(120),
  idType: z.enum(ID_TYPES),
  idNumber: z.string().trim().min(5).max(40),
  tier: z.coerce.number().int().min(1).max(2),
  note: z.string().trim().max(500).optional(),
});

function need(user: CurrentUser, p: "kyc.review" | "aml.screen" | "dsr.handle") {
  if (!user.permissions.has(p)) throw new DomainError("FORBIDDEN", "You can't do that in compliance.", 403);
}

/** Record an identity check (from a point's counter or a call): it waits for a reviewer. */
export async function submitKyc(user: CurrentUser, raw: unknown) {
  need(user, "kyc.review");
  const k = kycSchema.parse(raw);
  const phone = toE164(k.phone);
  const [u] = phone ? await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)) : [];
  if (!u) throw new DomainError("NOT_FOUND", "Nobody on Tuma has that phone number.", 404);
  const [row] = await db
    .insert(kycRecords)
    .values({ userId: u.id, tier: k.tier, fullName: k.fullName, idType: k.idType, idLast4: k.idNumber.replace(/[^A-Za-z0-9]/g, "").slice(-4), note: k.note || null, submittedBy: user.id })
    .returning();
  return { id: row.id };
}

/** Approve or reject an identity check; approving raises the person's tier (never someone else's own check). */
export async function reviewKyc(user: CurrentUser, id: string, approve: boolean) {
  need(user, "kyc.review");
  return db.transaction(async (tx) => {
    const [k] = await tx.select().from(kycRecords).where(eq(kycRecords.id, id)).for("update");
    if (!k || k.status !== "pending") throw new DomainError("DECIDED", "This check was already decided.", 409);
    if (k.submittedBy === user.id) throw new DomainError("OWN_REQUEST", "Someone else reviews the checks you recorded.", 403);
    await tx.update(kycRecords).set({ status: approve ? "approved" : "rejected", reviewedBy: user.id, reviewedAt: new Date() }).where(eq(kycRecords.id, id));
    if (approve) await tx.update(users).set({ kycTier: sql`greatest(${users.kycTier}, ${k.tier})` }).where(eq(users.id, k.userId));
    await audit(tx, { actorId: user.id, action: `kyc.${approve ? "approved" : "rejected"}`, entity: "user", entityId: k.userId, after: { tier: k.tier, idType: k.idType } });
    await enqueue(tx, { target: "complyos", topic: "kyc.reviewed", idempotencyKey: `kyc:${id}`, payload: { userId: k.userId, tier: k.tier, approved: approve, idType: k.idType } });
    return { id };
  });
}

export async function kycQueue(user: CurrentUser) {
  need(user, "kyc.review");
  const rows = await db
    .select({ k: kycRecords, name: users.name, phone: users.phone, current: users.kycTier })
    .from(kycRecords)
    .innerJoin(users, eq(users.id, kycRecords.userId))
    .orderBy(sql`${kycRecords.status} <> 'pending'`, desc(kycRecords.submittedAt))
    .limit(100);
  const [t] = await db.execute<{ t0: number; t1: number; t2: number; t3: number; [k: string]: unknown }>(sql`
    select count(*) filter (where kyc_tier = 0)::int as t0, count(*) filter (where kyc_tier = 1)::int as t1,
      count(*) filter (where kyc_tier = 2)::int as t2, count(*) filter (where kyc_tier = 3)::int as t3
    from users where active and deleted_at is null`);
  return {
    rows: rows.map(({ k, name, phone, current }) => ({ ...k, name, phone, current, submittedAt: k.submittedAt.toISOString(), canReview: k.status === "pending" && k.submittedBy !== user.id })),
    tiers: t,
  };
}

/* ======================================================================== AML */

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

/** How alike two names are (0–100): shared words over the longer name, so word order and middle names matter less. */
export function nameScore(a: string, b: string) {
  const x = new Set(norm(a));
  const y = new Set(norm(b));
  if (!x.size || !y.size) return 0;
  let same = 0;
  for (const w of x) if (y.has(w)) same++;
  return Math.round((same / Math.max(x.size, y.size)) * 100);
}

export const MATCH_AT = 60;

export const screenSchema = z.object({
  name: z.string().trim().min(3).max(160),
  subjectType: z.enum(["user", "account", "name"]).default("name"),
  subjectId: z.string().trim().max(120).optional(),
});

/** Screen a name against the watchlist; possible matches wait for a reviewer. Sent to ComplyOS too. */
export async function screenName(user: CurrentUser, raw: unknown) {
  need(user, "aml.screen");
  const s = screenSchema.parse(raw);
  const list = await db.select({ id: watchlistEntries.id, name: watchlistEntries.name, kind: watchlistEntries.kind }).from(watchlistEntries);
  const matches = list
    .map((w) => ({ ...w, score: nameScore(s.name, w.name) }))
    .filter((m) => m.score >= MATCH_AT)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(amlScreenings)
      .values({ subjectType: s.subjectType, subjectId: s.subjectId || null, name: s.name, result: matches.length ? "possible_match" : "clear", matches, screenedBy: user.id })
      .returning();
    await enqueue(tx, { target: "complyos", topic: "aml.screened", idempotencyKey: `aml:${row.id}`, payload: { name: s.name, subjectType: s.subjectType, subjectId: s.subjectId ?? null, local: row.result } });
    return { id: row.id, result: row.result, matches: matches.length };
  });
}

export async function reviewScreening(user: CurrentUser, id: string, raw: unknown) {
  need(user, "aml.screen");
  const { verdict, note } = z.object({ verdict: z.enum(["confirmed", "false_positive"]), note: z.string().trim().min(10, "Explain the verdict (at least 10 characters)").max(1000) }).parse(raw);
  await db.transaction(async (tx) => {
    const [s] = await tx.select().from(amlScreenings).where(eq(amlScreenings.id, id)).for("update");
    if (!s || s.result !== "possible_match") throw new DomainError("DECIDED", "Only possible matches are reviewed.", 409);
    if (s.screenedBy === user.id) throw new DomainError("OWN_REQUEST", "Someone else reviews the screenings you ran.", 403);
    await tx.update(amlScreenings).set({ result: verdict, note, reviewedBy: user.id, reviewedAt: new Date() }).where(eq(amlScreenings.id, id));
    await audit(tx, { actorId: user.id, action: `aml.${verdict}`, entity: s.subjectType, entityId: s.subjectId ?? s.name, after: { note } });
  });
  return { id };
}

export const watchSchema = z.object({
  name: z.string().trim().min(3).max(160),
  kind: z.enum(["sanctions", "pep", "internal"]),
  country: z.string().trim().max(2).optional(),
  source: z.string().trim().min(2).max(120),
  note: z.string().trim().max(500).optional(),
});

export async function addWatchlist(user: CurrentUser, raw: unknown) {
  need(user, "aml.screen");
  const w = watchSchema.parse(raw);
  const [row] = await db
    .insert(watchlistEntries)
    .values({ ...w, country: w.country?.toUpperCase() || null, note: w.note || null, addedBy: user.id })
    .returning();
  await db.transaction((tx) => audit(tx, { actorId: user.id, action: "aml.watchlist.add", entity: "watchlist", entityId: row.id, after: w }));
  return { id: row.id };
}

export async function amlOverview(user: CurrentUser) {
  need(user, "aml.screen");
  const [screenings, list] = await Promise.all([
    db.select().from(amlScreenings).orderBy(sql`${amlScreenings.result} <> 'possible_match'`, desc(amlScreenings.screenedAt)).limit(100),
    db.select().from(watchlistEntries).orderBy(desc(watchlistEntries.createdAt)).limit(200),
  ]);
  return {
    screenings: screenings.map((s) => ({ ...s, screenedAt: s.screenedAt.toISOString(), canReview: s.result === "possible_match" && s.screenedBy !== user.id })),
    watchlist: list.map((w) => ({ ...w, createdAt: w.createdAt.toISOString() })),
  };
}

/* ======================================================================== DSR */

export const DSR_DAYS = 30;

export const dsrSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(9).max(20),
  kind: z.enum(["access", "correction", "erasure"]),
  detail: z.string().trim().max(2000).optional(),
});

export async function openDsr(user: CurrentUser, raw: unknown) {
  need(user, "dsr.handle");
  const d = dsrSchema.parse(raw);
  const phone = toE164(d.phone);
  if (!phone) throw new DomainError("BAD_PHONE", "Enter a valid phone number.", 400);
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone));
  const [row] = await db
    .insert(dsrRequests)
    .values({ ref: ref("DSR"), userId: u?.id ?? null, name: d.name, phone, kind: d.kind, detail: d.detail ?? "", dueAt: new Date(Date.now() + DSR_DAYS * 86_400_000), createdBy: user.id })
    .returning();
  await db.transaction((tx) => audit(tx, { actorId: user.id, action: "dsr.open", entity: "dsr", entityId: row.id, after: { ref: row.ref, kind: d.kind } }));
  return { id: row.id, ref: row.ref };
}

export async function listDsr(user: CurrentUser) {
  need(user, "dsr.handle");
  const rows = await db.select().from(dsrRequests).orderBy(sql`${dsrRequests.status} <> 'open'`, dsrRequests.dueAt).limit(200);
  const now = Date.now();
  return rows.map((r) => ({ ...r, dueAt: r.dueAt.toISOString(), createdAt: r.createdAt.toISOString(), closedAt: r.closedAt?.toISOString() ?? null, overdue: r.status === "open" && r.dueAt.getTime() < now }));
}

/** Everything Tuma holds about the person: their profile, parcels they sent or received, wallet, claims, tickets, ratings. */
export async function dsrExport(user: CurrentUser, id: string) {
  need(user, "dsr.handle");
  const [d] = await db.select().from(dsrRequests).where(eq(dsrRequests.id, id));
  if (!d) throw new DomainError("NOT_FOUND", "No such request.", 404);
  const phone = d.phone;
  const [profile] = d.userId ? await db.select().from(users).where(eq(users.id, d.userId)) : [];
  const [parcels, wallet, theirClaims, tickets, given, received] = await Promise.all([
    db
      .select({ waybill: shipments.waybill, state: shipments.state, createdAt: shipments.createdAt, shipper: shipments.shipper, consignee: shipments.consignee, goods: shipments.goodsDescription, charge: shipments.totalCharge })
      .from(shipments)
      .where(sql`${shipments.shipper}->>'phone' = ${phone} or ${shipments.consignee}->>'phone' = ${phone}`)
      .limit(5000),
    d.userId ? db.select().from(walletEntries).where(eq(walletEntries.userId, d.userId)) : Promise.resolve([]),
    db.select().from(claims).where(d.userId ? sql`${claims.claimantUserId} = ${d.userId} or ${claims.claimantPhone} = ${phone}` : eq(claims.claimantPhone, phone)),
    db.select().from(supportRequests).where(sql`${supportRequests}::text ilike ${"%" + phone.slice(-9) + "%"}`).limit(500),
    db.select().from(parcelRatings).where(sql`${parcelRatings}::text ilike ${"%" + phone.slice(-9) + "%"}`).limit(500),
    db.select().from(customerRatings).where(sql`${customerRatings}::text ilike ${"%" + phone.slice(-9) + "%"}`).limit(500),
  ]);
  await db.transaction((tx) => audit(tx, { actorId: user.id, action: "dsr.export", entity: "dsr", entityId: id, after: { parcels: parcels.length } }));
  return {
    request: { ref: d.ref, kind: d.kind, name: d.name, phone, made: d.createdAt.toISOString() },
    profile: profile
      ? { id: profile.id, name: profile.name, email: profile.email, phone: profile.phone, locale: profile.locale, kycTier: profile.kycTier, roles: profile.roles, lastSeenAt: profile.lastSeenAt, senderProfile: profile.senderProfile }
      : null,
    parcels,
    wallet,
    claims: theirClaims,
    supportRequests: tickets,
    ratingsGiven: given,
    ratingsAboutThem: received,
    exportedAt: new Date().toISOString(),
  };
}

/** Close a request with what was done. Erasure wipes the person's details the way deleting their account does. */
export async function closeDsr(user: CurrentUser, id: string, raw: unknown) {
  need(user, "dsr.handle");
  const { outcome, response } = z.object({ outcome: z.enum(["done", "rejected"]), response: z.string().trim().min(10, "Say what was done (at least 10 characters)").max(2000) }).parse(raw);
  const [d] = await db.select().from(dsrRequests).where(eq(dsrRequests.id, id));
  if (!d || d.status !== "open") throw new DomainError("CLOSED", "This request is already closed.", 409);
  if (outcome === "done" && d.kind === "erasure" && d.userId) {
    const [u] = await db.select().from(users).where(eq(users.id, d.userId));
    if (u && !u.deletedAt) {
      const { deleteMyAccount } = await import("../account-deletion");
      await deleteMyAccount({ user: { id: u.id, name: u.name, accountId: u.accountId, roles: u.roles, permissions: new Set(), locale: u.locale }, driver: null });
    }
  }
  await db.transaction(async (tx) => {
    await tx.update(dsrRequests).set({ status: outcome, response, handledBy: user.id, closedAt: new Date() }).where(eq(dsrRequests.id, id));
    await audit(tx, { actorId: user.id, action: `dsr.${outcome}`, entity: "dsr", entityId: id, after: { kind: d.kind, response } });
    await enqueue(tx, { target: "complyos", topic: "dsr.closed", idempotencyKey: `dsr:${id}`, payload: { ref: d.ref, kind: d.kind, outcome } });
  });
  return { id };
}

export async function complianceCounts() {
  const [r] = await db.execute<{ kyc: number; aml: number; dsr: number; overdue: number; [k: string]: unknown }>(sql`
    select (select count(*)::int from kyc_records where status = 'pending') as kyc,
      (select count(*)::int from aml_screenings where result = 'possible_match') as aml,
      (select count(*)::int from dsr_requests where status = 'open') as dsr,
      (select count(*)::int from dsr_requests where status = 'open' and due_at < now()) as overdue`);
  return r;
}

