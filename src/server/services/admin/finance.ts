import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { parcelPayments, walletEntries } from "../../db/schema";
import { audit } from "../../audit";
import { collection } from "../../adapters/hudupay";
import { settlePayment } from "../counter-payments";
import { settleWalletTopUp } from "../wallet";
import { DomainError } from "../shipments";
import { maskPhone } from "./pii";
import type { CurrentUser } from "../../auth/current-user";

/**
 * One ledger for Tuma's money: wallet movements (top-ups, parcels paid from a wallet, refunds, adjustments), mobile
 * money taken at counters (HuduPay), cash and mobile money collected on delivery, and business invoices. FinOps keeps
 * the books; this is the operational view finance works from, plus the reconciliation against HuduPay.
 */

export type LedgerSource = "wallet" | "momo" | "cod" | "invoice";
export const STUCK_MINUTES = 10;

function need(user: CurrentUser, p: "finance.view" | "finance.reconcile" = "finance.view") {
  if (!user.permissions.has(p)) throw new DomainError("FORBIDDEN", "You can't see Tuma's finance.", 403);
}

type LedgerRow = { source: LedgerSource; kind: string; reference: string; waybill: string | null; amount: number; status: string; party: string | null; at: string; [k: string]: unknown };

export async function financeLedger(user: CurrentUser, f: { days?: number; source?: LedgerSource; before?: string } = {}) {
  need(user);
  const days = Math.min(Math.max(f.days ?? 30, 1), 366);
  const from = new Date(Date.now() - days * 86400_000).toISOString();
  const before = f.before ? new Date(f.before).toISOString() : new Date(Date.now() + 60_000).toISOString();
  const parts = {
    wallet: sql`select 'wallet' as source, w.kind, w.reference, w.waybill, w.amount, w.status, w.msisdn as party, w.created_at as at from wallet_entries w`,
    momo: sql`select 'momo' as source, 'counter' as kind, p.reference, s.waybill, p.amount, p.status, p.msisdn as party, p.created_at as at from parcel_payments p join shipments s on s.id = p.shipment_id`,
    cod: sql`select 'cod' as source, coalesce(c.method, 'cash') as kind, s.waybill as reference, s.waybill, (c.amount_collected + c.fee_collected) as amount, c.status::text as status, null as party, c.collected_at as at from cod_records c join shipments s on s.id = c.shipment_id where c.collected_at is not null`,
    invoice: sql`select 'invoice' as source, i.status::text as kind, i.number as reference, s.waybill, i.total as amount, case when i.amount_paid >= i.total then 'paid' else 'open' end as status, i.bill_to->>'name' as party, i.created_at as at from invoices i left join shipments s on s.id = i.shipment_id`,
  } satisfies Record<LedgerSource, ReturnType<typeof sql>>;
  const chosen = f.source ? [parts[f.source]] : Object.values(parts);
  const union = sql.join(chosen, sql` union all `);
  const [rows, totals] = await Promise.all([
    db.execute<LedgerRow>(sql`select * from (${union}) l where l.at >= ${from}::timestamptz and l.at < ${before}::timestamptz order by l.at desc limit 100`),
    db.execute<{ [k: string]: unknown; topups: number; wallet_spend: number; refunds: number; adjustments: number; momo: number; cod_collected: number; cod_held: number; invoiced: number; invoice_open: number }>(sql`
      select
        (select coalesce(sum(amount), 0)::int from wallet_entries where kind = 'topup' and status = 'paid' and created_at >= ${from}::timestamptz) as topups,
        (select coalesce(-sum(amount), 0)::int from wallet_entries where kind = 'parcel' and status = 'paid' and created_at >= ${from}::timestamptz) as wallet_spend,
        (select coalesce(sum(amount), 0)::int from wallet_entries where kind = 'refund' and status = 'paid' and created_at >= ${from}::timestamptz) as refunds,
        (select coalesce(sum(amount), 0)::int from wallet_entries where kind = 'adjustment' and created_at >= ${from}::timestamptz) as adjustments,
        (select coalesce(sum(amount), 0)::int from parcel_payments where status = 'paid' and created_at >= ${from}::timestamptz) as momo,
        (select coalesce(sum(amount_collected + fee_collected), 0)::int from cod_records where collected_at >= ${from}::timestamptz) as cod_collected,
        (select coalesce(sum(amount_collected + fee_collected), 0)::int from cod_records where status = 'collected') as cod_held,
        (select coalesce(sum(total), 0)::int from invoices where created_at >= ${from}::timestamptz and status <> 'void') as invoiced,
        (select coalesce(sum(total - amount_paid), 0)::int from invoices where status in ('issued', 'partially_paid')) as invoice_open`),
  ]);
  const list = [...rows].map((r) => ({ ...r, amount: Number(r.amount), party: r.source === "invoice" ? r.party : maskPhone(r.party), at: new Date(r.at).toISOString() }));
  const t = totals[0];
  return {
    days,
    rows: list,
    next: list.length === 100 ? list[list.length - 1].at : null,
    totals: {
      topups: t?.topups ?? 0,
      walletSpend: t?.wallet_spend ?? 0,
      refunds: t?.refunds ?? 0,
      adjustments: t?.adjustments ?? 0,
      momo: t?.momo ?? 0,
      codCollected: t?.cod_collected ?? 0,
      codHeld: t?.cod_held ?? 0,
      invoiced: t?.invoiced ?? 0,
      invoiceOpen: t?.invoice_open ?? 0,
    },
  };
}

/** Mobile money HuduPay hasn't settled after STUCK_MINUTES, and what failed this week. */
export async function reconciliation(user: CurrentUser) {
  need(user);
  const stuck = new Date(Date.now() - STUCK_MINUTES * 60_000).toISOString();
  const week = new Date(Date.now() - 7 * 86400_000).toISOString();
  type R = { source: "momo" | "topup"; reference: string; provider_id: string | null; waybill: string | null; amount: number; status: string; msisdn: string | null; failure: string | null; at: string; [k: string]: unknown };
  const rows = await db.execute<R>(sql`
    select * from (
      select 'momo' as source, p.reference, p.provider_id, s.waybill, p.amount, p.status, p.msisdn, p.failure_message as failure, p.created_at as at
        from parcel_payments p join shipments s on s.id = p.shipment_id
        where (p.status = 'pending' and p.created_at < ${stuck}::timestamptz) or (p.status = 'failed' and p.created_at >= ${week}::timestamptz)
      union all
      select 'topup', w.reference, w.provider_id, null, w.amount, w.status, w.msisdn, w.failure_message, w.created_at
        from wallet_entries w
        where w.kind = 'topup' and ((w.status = 'pending' and w.created_at < ${stuck}::timestamptz) or (w.status = 'failed' and w.created_at >= ${week}::timestamptz))
    ) r order by (r.status = 'pending') desc, r.at desc limit 200`);
  const list = [...rows].map((r) => ({
    source: r.source,
    reference: r.reference,
    checkable: !!r.provider_id,
    waybill: r.waybill,
    amount: Number(r.amount),
    status: r.status,
    phone: maskPhone(r.msisdn),
    failure: r.failure,
    at: new Date(r.at).toISOString(),
  }));
  return {
    canReconcile: user.permissions.has("finance.reconcile"),
    stuckMinutes: STUCK_MINUTES,
    pending: list.filter((r) => r.status === "pending"),
    failed: list.filter((r) => r.status === "failed"),
  };
}

export const recheckSchema = z.object({ source: z.enum(["momo", "topup"]), reference: z.string().min(3).max(120) });

/** Ask HuduPay again where one payment stands, and settle it if it has (exactly as its callback would). */
export async function recheckPayment(user: CurrentUser, raw: unknown) {
  need(user, "finance.reconcile");
  const r = recheckSchema.parse(raw);
  const [row] =
    r.source === "momo"
      ? await db.select({ providerId: parcelPayments.providerId, createdAt: parcelPayments.createdAt, status: parcelPayments.status }).from(parcelPayments).where(eq(parcelPayments.reference, r.reference))
      : await db
          .select({ providerId: walletEntries.providerId, createdAt: walletEntries.createdAt, status: walletEntries.status })
          .from(walletEntries)
          .where(and(eq(walletEntries.reference, r.reference), eq(walletEntries.kind, "topup")));
  if (!row) throw new DomainError("NOT_FOUND", "No such payment.", 404);
  if (row.status !== "pending") return { status: row.status, changed: false };
  if (!row.providerId) throw new DomainError("NO_PROVIDER_ID", "HuduPay never took this request, so there's nothing to check.", 409);
  const c = await collection(row.providerId, row.createdAt).catch(() => {
    throw new DomainError("HUDUPAY_DOWN", "HuduPay didn't answer. Try again in a minute.", 502);
  });
  if (r.source === "momo") await settlePayment(r.reference, c.status, c.failureMessage);
  else await settleWalletTopUp(r.reference, c.status, c.failureMessage);
  const status = c.status === "SUCCESS" ? "paid" : c.status === "FAILED" ? "failed" : "pending";
  await db.transaction((tx) => audit(tx, { actorId: user.id, action: "finance.recheck", entity: r.source === "momo" ? "parcel_payment" : "wallet_entry", entityId: r.reference, after: { status } }));
  return { status, changed: status !== "pending" };
}
