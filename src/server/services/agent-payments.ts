import "server-only";
import { and, desc, eq, gte, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { accounts, agents, invoices, parcelPayments, paymentSettings, shipments } from "../db/schema";
import { enqueue } from "../adapters/outbox";
import { audit } from "../audit";
import { DomainError } from "../errors";
import type { CurrentUser } from "../auth/current-user";
import { toE164 } from "@/domain/phone";
import { DEFAULT_AGENT_COMMISSION_BPS } from "@/domain/agents";

/**
 * A business's payment set-up in the app (More → Payments): mobile money with where its takings are paid out, and
 * the pay-on-delivery add-on. Changed by whoever manages the float (agent.wallet.manage).
 */

export const PAYOUT_SCHEDULES = ["instant", "daily", "weekly"] as const;

const payoutSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("mobile_money"),
    phone: z.string().trim().min(9).max(20),
    name: z.string().trim().min(2, "Enter the name on the wallet").max(120),
  }),
  z.object({
    method: z.literal("bank"),
    bank: z.string().trim().min(2, "Choose the bank").max(80),
    accountName: z.string().trim().min(2, "Enter the account name").max(120),
    accountNumber: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s-]/g, ""))
      .pipe(z.string().regex(/^\d{6,20}$/, "Enter the account number")),
    branch: z.string().trim().max(80).optional().transform((v) => v || undefined),
  }),
]);

const updateSchema = z.object({
  momo: z
    .object({
      enabled: z.boolean(),
      payout: payoutSchema.optional(),
      schedule: z.enum(PAYOUT_SCHEDULES).default("daily"),
    })
    .optional(),
  payOnDelivery: z.boolean().optional(),
});

function accountOf(user: CurrentUser) {
  if (!user.permissions.has("agent.workspace") || !user.accountId) throw new DomainError("FORBIDDEN", "You don't have access to payments.", 403);
  return user.accountId;
}

/** Tuma's commission on a parcel's charge, at this business's rate. */
export async function commissionBpsFor(accountId: string) {
  const [a] = await db.select({ bps: agents.commissionBps }).from(agents).where(eq(agents.accountId, accountId));
  return a?.bps ?? (Number(process.env.AGENT_COMMISSION_BPS) || DEFAULT_AGENT_COMMISSION_BPS);
}

export async function momoEnabled(accountId: string) {
  const [s] = await db.select({ on: paymentSettings.momoEnabled }).from(paymentSettings).where(eq(paymentSettings.accountId, accountId));
  return !!s?.on;
}

/** Midnight in Dar es Salaam, [daysAgo] days back. */
function darMidnight(daysAgo: number) {
  const eat = new Date(Date.now() + 3 * 3600_000);
  return new Date(Date.UTC(eat.getUTCFullYear(), eat.getUTCMonth(), eat.getUTCDate() - daysAgo) - 3 * 3600_000);
}

/**
 * Money taken for the business's parcels: today, the last 7 and 30 days, split by how it was paid, with Tuma's
 * commission on the mobile-money part (deducted before the payout). Plus what's still to come in: receivers paying
 * on delivery, and companies' unpaid invoices.
 */
async function collectedFor(acct: string, bps: number) {
  const since = { today: darMidnight(0), week: darMidnight(6), month: darMidnight(29) };
  const f = (from: Date, method?: string) =>
    sql<number>`coalesce(sum(${shipments.totalCharge}) filter (where ${shipments.paidAt} >= ${from.toISOString()}::timestamptz${
      method ? sql` and coalesce(${shipments.prepayMethod}, 'cash') = ${method}` : sql``
    }), 0)::int`;
  const n = (from: Date) => sql<number>`count(*) filter (where ${shipments.paidAt} >= ${from.toISOString()}::timestamptz)::int`;
  // Booked: the charge on every parcel taken in (as Home's earnings counts it), paid or not yet.
  const b = (from: Date) => sql<number>`coalesce(sum(${shipments.totalCharge}) filter (where ${shipments.createdAt} >= ${from.toISOString()}::timestamptz), 0)::int`;
  const [[row], [pod], [inv], [booked]] = await Promise.all([
    db
      .select({
        today: f(since.today), todayCash: f(since.today, "cash"), todayMomo: f(since.today, "mobile_money"), todayN: n(since.today),
        week: f(since.week), weekCash: f(since.week, "cash"), weekMomo: f(since.week, "mobile_money"), weekN: n(since.week),
        month: f(since.month), monthCash: f(since.month, "cash"), monthMomo: f(since.month, "mobile_money"), monthN: n(since.month),
      })
      .from(shipments)
      .where(and(eq(shipments.accountId, acct), isNotNull(shipments.paidAt), gte(shipments.paidAt, since.month))),
    db
      .select({ amount: sql<number>`coalesce(sum(${shipments.totalCharge}), 0)::int`, n: sql<number>`count(*)::int` })
      .from(shipments)
      .where(and(eq(shipments.accountId, acct), eq(shipments.paymentTerms, "pay_on_delivery"), isNull(shipments.paidAt), ne(shipments.state, "CANCELLED"))),
    db
      .select({ amount: sql<number>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}), 0)::int`, n: sql<number>`count(*)::int` })
      .from(invoices)
      .where(and(eq(invoices.accountId, acct), ne(invoices.status, "paid"), ne(invoices.status, "void"))),
    db
      .select({ today: b(since.today), week: b(since.week), month: b(since.month) })
      .from(shipments)
      .where(and(eq(shipments.accountId, acct), gte(shipments.createdAt, since.month), ne(shipments.state, "CANCELLED"))),
  ]);
  const period = (k: "today" | "week" | "month") => {
    const momo = row?.[`${k}Momo`] ?? 0;
    return {
      total: row?.[k] ?? 0,
      parcels: row?.[`${k}N`] ?? 0,
      cash: row?.[`${k}Cash`] ?? 0,
      mobileMoney: momo,
      commission: Math.round((momo * bps) / 10_000),
      booked: booked?.[k] ?? 0,
    };
  };
  return {
    today: period("today"),
    week: period("week"),
    month: period("month"),
    toCollect: { payOnDelivery: { amount: pod?.amount ?? 0, parcels: pod?.n ?? 0 }, invoices: { amount: inv?.amount ?? 0, count: inv?.n ?? 0 } },
  };
}

export async function paymentSettingsFor(user: CurrentUser) {
  const acct = accountOf(user);
  const [[s], [a], bps] = await Promise.all([
    db.select().from(paymentSettings).where(eq(paymentSettings.accountId, acct)),
    db.select({ payOnDelivery: accounts.payOnDelivery, status: accounts.status }).from(accounts).where(eq(accounts.id, acct)),
    commissionBpsFor(acct),
  ]);
  const collected = await collectedFor(acct, bps);
  return {
    collected,
    momo: { enabled: !!s?.momoEnabled, payout: s?.payout ?? null, schedule: s?.payoutSchedule ?? "daily" },
    payOnDelivery: !!a?.payOnDelivery,
    commissionBps: bps,
    canManage: user.permissions.has("agent.wallet.manage"),
    /** Why it can't be changed here: the business is still being reviewed, or this person doesn't manage the float. */
    blockedBy: user.permissions.has("agent.wallet.manage") ? null : a?.status === "pending" ? "review" : "permission",
  };
}

export async function updatePaymentSettings(user: CurrentUser, raw: unknown) {
  const acct = accountOf(user);
  if (!user.permissions.has("agent.wallet.manage")) throw new DomainError("FORBIDDEN", "Only whoever manages the float can change payments.", 403);
  const b = updateSchema.parse(raw);
  await db.transaction(async (tx) => {
    if (b.momo) {
      const [cur] = await tx.select().from(paymentSettings).where(eq(paymentSettings.accountId, acct));
      let payout: Record<string, string> | null = cur?.payout ?? null;
      if (b.momo.payout) {
        if (b.momo.payout.method === "mobile_money") {
          const e164 = toE164(b.momo.payout.phone);
          if (!e164?.startsWith("+255")) throw new DomainError("BAD_PHONE", "Payouts go to Tanzanian mobile money numbers for now.");
          payout = { method: "mobile_money", phone: e164, name: b.momo.payout.name };
        } else {
          payout = Object.fromEntries(Object.entries(b.momo.payout).filter(([, v]) => v !== undefined)) as Record<string, string>;
        }
      }
      if (b.momo.enabled && !payout) throw new DomainError("PAYOUT_REQUIRED", "Choose where your mobile money takings are paid out first.");
      const row = { momoEnabled: b.momo.enabled, payout, payoutSchedule: b.momo.schedule, updatedBy: user.id, updatedAt: new Date() };
      await tx.insert(paymentSettings).values({ accountId: acct, ...row }).onConflictDoUpdate({ target: paymentSettings.accountId, set: row });
      // FinOps pays the takings out (less Tuma's commission) to where the business says.
      await enqueue(tx, {
        target: "finops",
        topic: "agent.payout.configured",
        idempotencyKey: `payout:${acct}:${Date.now()}`,
        payload: { accountId: acct, momoEnabled: b.momo.enabled, payout, schedule: b.momo.schedule, commissionFrom: "collection" },
      });
      await audit(tx, { actorId: user.id, action: "payments.momo", entity: "account", entityId: acct, before: { enabled: cur?.momoEnabled ?? false }, after: { enabled: b.momo.enabled, method: payout?.method, schedule: b.momo.schedule } });
    }
    if (b.payOnDelivery !== undefined) {
      await tx.update(accounts).set({ payOnDelivery: b.payOnDelivery }).where(eq(accounts.id, acct));
      await audit(tx, { actorId: user.id, action: "payments.pay_on_delivery", entity: "account", entityId: acct, after: { on: b.payOnDelivery } });
    }
  });
  return paymentSettingsFor(user);
}

/* ---------------------------------------------------------------- records */

export const recordsSchema = z.object({
  kind: z.enum(["payments", "invoices"]).default("payments"),
  /** Invoices only: open (still owed), paid, or all. */
  status: z.enum(["all", "open", "paid"]).default("all"),
  /** Payments only: just cash, or just mobile money. */
  method: z.enum(["cash", "mobile_money"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  /** Older than this time (the last row's `at`), for the next page. */
  before: z.coerce.date().optional(),
});

/**
 * The business's payment records in the app (Payments → Records): every parcel payment taken (cash or mobile money,
 * newest first), and the invoices issued to companies with what's still owed on each.
 */
export async function paymentRecords(user: CurrentUser, raw: unknown) {
  const acct = accountOf(user);
  const f = recordsSchema.parse(raw);
  if (f.kind === "payments") {
    const rows = await db
      .select({
        waybill: shipments.waybill,
        amount: shipments.totalCharge,
        method: sql<string>`coalesce(${shipments.prepayMethod}, 'cash')`,
        at: shipments.paidAt,
        payer: sql<string | null>`${shipments.shipper}->>'name'`,
        receiver: sql<string | null>`${shipments.consignee}->>'name'`,
        terms: shipments.paymentTerms,
      })
      .from(shipments)
      .where(
        and(
          eq(shipments.accountId, acct),
          isNotNull(shipments.paidAt),
          f.method ? sql`coalesce(${shipments.prepayMethod}, 'cash') = ${f.method}` : undefined,
          f.before ? sql`${shipments.paidAt} < ${f.before.toISOString()}::timestamptz` : undefined,
        ),
      )
      .orderBy(sql`${shipments.paidAt} desc`)
      .limit(f.limit);
    return {
      payments: rows.map((r) => ({
        ...r,
        // Paid on delivery means the receiver paid.
        paidBy: r.terms === "pay_on_delivery" ? r.receiver : r.payer,
        at: r.at!.toISOString(),
      })),
    };
  }
  const rows = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.accountId, acct),
        ne(invoices.status, "draft"),
        f.status === "paid" ? eq(invoices.status, "paid") : f.status === "open" ? sql`${invoices.status} in ('issued', 'partially_paid')` : undefined,
        f.before ? sql`${invoices.issueDate} < ${f.before.toISOString()}::timestamptz` : undefined,
      ),
    )
    .orderBy(sql`${invoices.issueDate} desc`)
    .limit(f.limit);
  return { invoices: rows.map(invoiceOut) };
}

function invoiceOut(i: typeof invoices.$inferSelect) {
  return {
    id: i.id,
    number: i.number,
    customerId: i.customerId,
    billTo: i.billTo,
    status: i.status,
    total: i.total,
    tax: i.tax,
    paid: i.amountPaid,
    owed: i.status === "void" ? 0 : i.total - i.amountPaid,
    paidWith: i.paidWith,
    lines: i.lines,
    at: i.issueDate.toISOString(),
    due: i.dueDate.toISOString(),
    overdue: i.status !== "paid" && i.status !== "void" && i.dueDate.getTime() < Date.now(),
  };
}

/** One invoice of the business. */
export async function invoiceDetail(user: CurrentUser, id: string) {
  const acct = accountOf(user);
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new DomainError("NOT_FOUND", "That invoice isn't one of yours.", 404);
  const [i] = await db.select().from(invoices).where(and(eq(invoices.accountId, acct), eq(invoices.id, id)));
  if (!i) throw new DomainError("NOT_FOUND", "That invoice isn't one of yours.", 404);
  return { invoice: invoiceOut(i) };
}

/**
 * One payment (Payments → Records → a payment): what was paid, how, when and by whom, Tuma's commission on it and
 * what the business keeps, the mobile-money reference, and the invoice it settled.
 */
export async function paymentDetail(user: CurrentUser, waybill: string) {
  const acct = accountOf(user);
  const [s] = await db
    .select()
    .from(shipments)
    .where(and(eq(shipments.accountId, acct), eq(shipments.waybill, waybill.toUpperCase()), isNotNull(shipments.paidAt)));
  if (!s) throw new DomainError("NOT_FOUND", "There's no payment on that parcel.", 404);
  const method = s.prepayMethod ?? "cash";
  const [[push], [inv], bps] = await Promise.all([
    db
      .select({ reference: parcelPayments.reference, providerId: parcelPayments.providerId })
      .from(parcelPayments)
      .where(and(eq(parcelPayments.shipmentId, s.id), eq(parcelPayments.status, "paid")))
      .orderBy(desc(parcelPayments.completedAt))
      .limit(1),
    db.select({ id: invoices.id, number: invoices.number }).from(invoices).where(eq(invoices.shipmentId, s.id)),
    commissionBpsFor(acct),
  ]);
  const commission = Math.round((s.totalCharge * bps) / 10_000);
  const pod = s.paymentTerms === "pay_on_delivery";
  const payer = pod ? s.consignee : s.shipper;
  return {
    payment: {
      waybill: s.waybill,
      amount: s.totalCharge,
      method,
      at: s.paidAt!.toISOString(),
      terms: s.paymentTerms,
      paidBy: { name: payer.name, phone: payer.phone },
      sender: { name: s.shipper.name, phone: s.shipper.phone },
      receiver: { name: s.consignee.name, phone: s.consignee.phone, region: s.consignee.address.region, district: s.consignee.address.district },
      goods: s.goodsDescription,
      state: s.state,
      commission,
      // Mobile money: the commission comes off before the payout. Cash: the business holds it all and the
      // commission comes from the float.
      keep: s.totalCharge - commission,
      commissionFrom: method === "mobile_money" ? "collection" : "float",
      reference: push?.providerId ?? push?.reference ?? null,
      invoice: inv ?? null,
    },
  };
}
