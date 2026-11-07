import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, type Tx } from "../db/client";
import { shipments, users, walletEntries } from "../db/schema";
import { collect, collection } from "../adapters/hudupay";
import { enqueue } from "../adapters/outbox";
import { DomainError } from "./shipments";
import { markPaid, receiveOnceFor } from "./counter-payments";
import { queuePush } from "./push";
import type { CurrentUser } from "../auth/current-user";
import { toE164 } from "@/domain/phone";
import { normaliseWaybill } from "@/domain/waybill-number";

/**
 * A sender's Tuma wallet. They put money in ahead with a mobile-money push (HuduPay, Tanzania only), and their
 * parcels are paid from it: automatically when a Tuma point prices a parcel booked "from my wallet", or from the
 * parcel's screen when it waits for payment. A parcel cancelled after it was paid from the wallet is refunded back
 * into it. The balance is the sum of the settled entries, so a top-up counts once HuduPay confirms it. Tuma holds
 * the money; the point is paid out as for mobile money (FinOps gets the entries through the outbox).
 */

type Shipment = typeof shipments.$inferSelect;
type Entry = typeof walletEntries.$inferSelect;
type Q = Tx | typeof db;
const money = (n: number) => n.toLocaleString("en-US");

export const TOPUP_MIN = 1_000;
export const TOPUP_MAX = 2_000_000;
/** Top-up references start with this so the HuduPay callback knows they're wallet money, not a parcel. */
export const TOPUP_PREFIX = "WT-";

/** Serialises wallet writes for one person inside a transaction (no overdrawing from two phones at once). */
const lock = (tx: Tx, userId: string) => tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`wallet:${userId}`}))`);

export async function walletBalance(q: Q, userId: string) {
  const [r] = await q
    .select({ n: sql<number>`coalesce(sum(${walletEntries.amount}), 0)::int` })
    .from(walletEntries)
    .where(and(eq(walletEntries.userId, userId), eq(walletEntries.status, "paid")));
  return r?.n ?? 0;
}

const entryOut = (e: Entry) => ({
  id: e.id,
  kind: e.kind as "topup" | "parcel" | "refund",
  amount: e.amount,
  status: e.status as "pending" | "paid" | "failed",
  waybill: e.waybill,
  phone: e.msisdn ? `+${e.msisdn}` : null,
  failureMessage: e.failureMessage,
  createdAt: e.createdAt.toISOString(),
  settledAt: e.settledAt?.toISOString() ?? null,
});

/** The wallet screen: balance, money on its way in, and the latest entries. */
export async function myWallet(user: CurrentUser) {
  const [balance, entries, [me]] = await Promise.all([
    walletBalance(db, user.id),
    db.select().from(walletEntries).where(eq(walletEntries.userId, user.id)).orderBy(desc(walletEntries.createdAt)).limit(50),
    db.select({ phone: users.phone }).from(users).where(eq(users.id, user.id)),
  ]);
  return {
    balance,
    currency: "TZS",
    pending: entries.filter((e) => e.kind === "topup" && e.status === "pending").reduce((n, e) => n + e.amount, 0),
    phone: me?.phone ?? null,
    limits: { min: TOPUP_MIN, max: TOPUP_MAX },
    entries: entries.map(entryOut),
  };
}

const topUpSchema = z.object({
  amount: z.coerce.number().int().min(TOPUP_MIN, `Top up at least TZS ${TOPUP_MIN.toLocaleString("en-US")}`).max(TOPUP_MAX, `Top up at most TZS ${TOPUP_MAX.toLocaleString("en-US")}`),
  phone: z.string().trim().min(9).max(20),
});

/** Push a prompt to the phone for the top-up; the app polls [walletTopUpStatus] until it's paid or failed. */
export async function walletTopUp(user: CurrentUser, raw: unknown) {
  const b = topUpSchema.parse(raw);
  const e164 = toE164(b.phone);
  if (!e164 || !e164.startsWith("+255")) throw new DomainError("BAD_PHONE", "Mobile money works with Tanzanian numbers for now.");
  const msisdn = e164.slice(1);
  const reference = `${TOPUP_PREFIX}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const base = process.env.APP_URL ?? "https://tuma.hudumika.tz";
  // The adapter's wording is for the counter ("take cash"); someone topping up their own wallet hears it plainly.
  const c = await collect({ reference, amount: b.amount, msisdn, narration: "Tuma wallet top-up", callbackUrl: `${base}/api/hooks/hudupay` }).catch((e) => {
    if (e instanceof DomainError && e.code === "MOMO_UNAVAILABLE") throw new DomainError("MOMO_UNAVAILABLE", "Topping up by mobile money isn't available just yet. Please try again a little later.", 503);
    throw e;
  });
  const failed = c.status === "FAILED";
  const [e] = await db
    .insert(walletEntries)
    .values({
      userId: user.id,
      kind: "topup",
      amount: b.amount,
      status: failed ? "failed" : "pending",
      reference,
      providerId: c.id,
      msisdn,
      failureMessage: c.failureMessage,
      settledAt: failed ? new Date() : null,
    })
    .returning();
  return { topUp: entryOut(e) };
}

/** Where a top-up stands; asks HuduPay while it's pending. */
export async function walletTopUpStatus(user: CurrentUser, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new DomainError("NOT_FOUND", "That top-up isn't yours.", 404);
  const [e] = await db.select().from(walletEntries).where(and(eq(walletEntries.id, id), eq(walletEntries.userId, user.id), eq(walletEntries.kind, "topup")));
  if (!e) throw new DomainError("NOT_FOUND", "That top-up isn't yours.", 404);
  if (e.status !== "pending" || !e.providerId) return { topUp: entryOut(e), balance: await walletBalance(db, user.id) };
  const c = await collection(e.providerId, e.createdAt).catch(() => null);
  const settled = c ? await settleWalletTopUp(e.reference, c.status, c.failureMessage) : null;
  return { topUp: entryOut(settled ?? e), balance: await walletBalance(db, user.id) };
}

/** HuduPay's outcome for a top-up (callback or poll). Settles once; a success posts to FinOps. */
export async function settleWalletTopUp(reference: string, status: "SUCCESS" | "FAILED" | "PENDING", failureMessage: string | null) {
  if (status === "PENDING") return null;
  return db.transaction(async (tx) => {
    const [e] = await tx.select().from(walletEntries).where(eq(walletEntries.reference, reference)).for("update");
    if (!e || e.kind !== "topup") return null;
    if (e.status !== "pending") return e;
    const [u] = await tx
      .update(walletEntries)
      .set({ status: status === "SUCCESS" ? "paid" : "failed", failureMessage, settledAt: new Date() })
      .where(eq(walletEntries.id, e.id))
      .returning();
    if (status === "SUCCESS") {
      await enqueue(tx, {
        target: "finops",
        topic: "wallet.topup",
        idempotencyKey: `wallet:${e.id}`,
        payload: { userId: e.userId, amount: e.amount, currency: e.currency, reference: e.reference, providerId: e.providerId },
      });
      await queuePush(tx, {
        key: `wallet:${e.id}`,
        to: { userIds: [e.userId] },
        template: "push.wallet_topup",
        variables: { amount: money(e.amount), balance: money(await walletBalance(tx, e.userId)) },
        data: { type: "wallet" },
      });
    }
    return u;
  });
}

/**
 * Inside a transaction: pay the parcel from its booker's wallet if the balance covers it. False (nothing changed)
 * when it doesn't, or the parcel is already paid.
 */
export async function chargeWallet(tx: Tx, userId: string, s: Shipment) {
  if (s.paidAt || s.totalCharge <= 0) return false;
  await lock(tx, userId);
  if ((await walletBalance(tx, userId)) < s.totalCharge) return false;
  const [e] = await tx
    .insert(walletEntries)
    .values({ userId, kind: "parcel", amount: -s.totalCharge, reference: `WP-${s.waybill}`, shipmentId: s.id, waybill: s.waybill, settledAt: new Date() })
    .onConflictDoNothing()
    .returning({ id: walletEntries.id });
  if (!e) return false;
  const paid = await markPaid(tx, s, { method: "wallet", reference: `WP-${s.waybill}`, actorId: userId });
  await queuePush(tx, {
    key: `walletpaid:${s.id}`,
    to: { userIds: [userId] },
    template: "push.wallet_paid",
    variables: { amount: money(s.totalCharge), waybill: s.waybill, balance: money(await walletBalance(tx, userId)) },
    data: { type: "parcel", waybill: s.waybill },
    waybill: s.waybill,
  });
  return paid;
}

/** Inside a transaction: a parcel paid from the wallet was cancelled, so its charge goes back in. Once. */
export async function refundToWallet(tx: Tx, s: Shipment) {
  const [charge] = await tx.select().from(walletEntries).where(and(eq(walletEntries.shipmentId, s.id), eq(walletEntries.kind, "parcel")));
  if (!charge) return 0;
  const [e] = await tx
    .insert(walletEntries)
    .values({ userId: charge.userId, kind: "refund", amount: -charge.amount, reference: `WR-${s.waybill}`, shipmentId: s.id, waybill: s.waybill, settledAt: new Date() })
    .onConflictDoNothing()
    .returning({ id: walletEntries.id });
  if (!e) return 0;
  await enqueue(tx, {
    target: "finops",
    topic: "wallet.refund",
    idempotencyKey: `walletrefund:${s.id}`,
    waybill: s.waybill,
    payload: { userId: charge.userId, accountId: s.accountId, waybill: s.waybill, amount: -charge.amount, currency: s.currency },
  });
  await queuePush(tx, {
    key: `walletrefund:${s.id}`,
    to: { userIds: [charge.userId] },
    template: "push.wallet_refund",
    variables: { amount: money(-charge.amount), waybill: s.waybill },
    data: { type: "wallet" },
    waybill: s.waybill,
  });
  return -charge.amount;
}

/** The sender pays a priced parcel that waits for payment from their wallet (from the parcel's screen). */
export async function payFromWallet(user: CurrentUser, rawWaybill: string) {
  const waybill = normaliseWaybill(rawWaybill).waybill;
  const paid = await db.transaction(async (tx) => {
    const [s] = await tx.select().from(shipments).where(eq(shipments.waybill, waybill)).for("update");
    if (!s || s.createdBy !== user.id) throw new DomainError("NOT_FOUND", "We couldn't find that parcel among yours.", 404);
    if (s.paidAt) throw new DomainError("ALREADY_PAID", "This parcel is already paid for.", 409);
    if (s.paymentTerms !== "prepaid" || !s.receiveOnPayment || s.totalCharge <= 0) throw new DomainError("NOTHING_DUE", "There's nothing to pay for this parcel yet.");
    const ok = await chargeWallet(tx, user.id, s);
    if (!ok) throw new DomainError("LOW_BALANCE", "Your wallet doesn't cover this parcel. Top it up first.", 402);
    return s.id;
  });
  await receiveOnceFor(paid);
  return { balance: await walletBalance(db, user.id) };
}

/** After the point prices a parcel booked "from my wallet": pay it now if the wallet covers it. */
export async function autoPayFromWallet(shipmentId: string) {
  const paid = await db.transaction(async (tx) => {
    const [s] = await tx.select().from(shipments).where(eq(shipments.id, shipmentId)).for("update");
    if (!s || s.prepayMethod !== "wallet" || !s.receiveOnPayment || !s.createdBy) return false;
    return chargeWallet(tx, s.createdBy, s);
  });
  if (paid) await receiveOnceFor(shipmentId);
  return paid;
}
