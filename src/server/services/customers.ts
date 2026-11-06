import "server-only";
import { and, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { customerReports, customers, invoices, shipments } from "../db/schema";
import { audit } from "../audit";
import { DomainError } from "./shipments";
import type { CurrentUser } from "../auth/current-user";

/**
 * A business's customer list (CRM), built from its counter bookings: the people and companies who send parcels and
 * the people who receive them. Booking saves them; the app offers them back so regulars aren't typed twice.
 */

type Sender = { kind: "individual" | "company"; name: string; phone: string; email?: string; tin?: string; regNo?: string; contactName?: string };
type Receiver = { kind?: "individual" | "company"; name: string; phone: string; email?: string; tin?: string; regNo?: string; contactName?: string; region?: string; district?: string; landmark?: string; lat?: number; lng?: number };

/** Saves (or refreshes) the sender and receiver of a booking and counts the parcel against each. Returns their ids. */
/** The number a customer is saved under: a number merged into another customer counts as that customer's. */
async function savedPhone(accountId: string, kind: string, phone: string) {
  const [c] = await db
    .select({ phone: customers.phone })
    .from(customers)
    .where(and(eq(customers.accountId, accountId), eq(customers.kind, kind), sql`${customers.otherPhones} @> ${JSON.stringify([phone])}::jsonb`))
    .limit(1);
  return c?.phone ?? phone;
}

export async function rememberCustomers(accountId: string, p: { sender: Sender; receiver: Receiver }) {
  const now = new Date();
  const s = { ...p.sender, phone: await savedPhone(accountId, p.sender.kind, p.sender.phone) };
  const [sender] = await db
    .insert(customers)
    .values({ accountId, kind: s.kind, name: s.name, phone: s.phone, email: s.email, tin: s.tin, regNo: s.regNo, contactName: s.contactName, sent: 1, lastSeenAt: now })
    .onConflictDoUpdate({
      target: [customers.accountId, customers.kind, customers.phone],
      set: {
        name: s.name,
        // What was typed this time wins; a blank keeps what was saved before.
        email: sql`coalesce(${s.email ?? null}, ${customers.email})`,
        tin: sql`coalesce(${s.tin ?? null}, ${customers.tin})`,
        regNo: sql`coalesce(${s.regNo ?? null}, ${customers.regNo})`,
        contactName: sql`coalesce(${s.contactName ?? null}, ${customers.contactName})`,
        sent: sql`${customers.sent} + 1`,
        lastSeenAt: now,
      },
    })
    .returning({ id: customers.id });
  const r = { ...p.receiver, phone: await savedPhone(accountId, p.receiver.kind ?? "individual", p.receiver.phone) };
  const where = { region: r.region, district: r.district, landmark: r.landmark ?? null, lat: r.lat ?? null, lng: r.lng ?? null };
  const [receiver] = await db
    .insert(customers)
    .values({ accountId, kind: r.kind ?? "individual", name: r.name, phone: r.phone, email: r.email, tin: r.tin, regNo: r.regNo, contactName: r.contactName, ...where, received: 1, lastSeenAt: now })
    .onConflictDoUpdate({
      target: [customers.accountId, customers.kind, customers.phone],
      set: {
        name: r.name,
        ...where,
        email: sql`coalesce(${r.email ?? null}, ${customers.email})`,
        tin: sql`coalesce(${r.tin ?? null}, ${customers.tin})`,
        regNo: sql`coalesce(${r.regNo ?? null}, ${customers.regNo})`,
        contactName: sql`coalesce(${r.contactName ?? null}, ${customers.contactName})`,
        received: sql`${customers.received} + 1`,
        lastSeenAt: now,
      },
    })
    .returning({ id: customers.id });
  return { sender: sender.id, receiver: receiver.id };
}

const listQuery = z.object({
  q: z.string().trim().max(80).optional(),
  kind: z.enum(["individual", "company"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(20),
});

/** The company's customers, most recent first; `q` matches a name, contact, TIN or the phone's digits. */
export async function agentCustomers(user: CurrentUser, raw: unknown) {
  if (!user.permissions.has("agent.workspace") || !user.accountId) throw new DomainError("FORBIDDEN", "You don't have access to customers.", 403);
  const { q, kind, limit } = listQuery.parse(raw);
  const conds = [eq(customers.accountId, user.accountId)];
  if (kind) conds.push(eq(customers.kind, kind));
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    const digits = q.replace(/\D/g, "").replace(/^0/, "");
    const m = [ilike(customers.name, like), ilike(customers.contactName, like)];
    if (digits.length >= 3) m.push(ilike(customers.phone, `%${digits}%`), ilike(customers.tin, `%${digits}%`), sql`${customers.otherPhones}::text like ${`%${digits}%`}`);
    conds.push(or(...m)!);
  }
  const rows = await db
    .select()
    .from(customers)
    .where(and(...conds))
    .orderBy(desc(customers.lastSeenAt))
    .limit(limit);
  const flags = await reportsByOthers(user.accountId, rows.map((c) => c.phone));
  return {
    customers: rows.map((c) => ({
      flagged: flags.get(c.phone) ?? 0,
      id: c.id,
      kind: c.kind,
      name: c.name,
      phone: c.phone,
      email: c.email,
      tin: c.tin,
      regNo: c.regNo,
      contactName: c.contactName,
      region: c.region,
      district: c.district,
      landmark: c.landmark,
      lat: c.lat,
      lng: c.lng,
      sent: c.sent,
      received: c.received,
      otherPhones: c.otherPhones,
      lastSeenAt: c.lastSeenAt,
    })),
  };
}

/* ------------------------------------------------------------------ merging */

function businessOf(user: CurrentUser) {
  if (!user.permissions.has("agent.workspace") || !user.accountId) throw new DomainError("FORBIDDEN", "You don't have access to customers.", 403);
  return user.accountId;
}

/** Same name, ignoring case and spacing. */
const sameName = sql<string>`lower(regexp_replace(trim(${customers.name}), '\\s+', ' ', 'g'))`;

/**
 * Customers who might be the same person or company: the same name (and kind) under different numbers. Offered as
 * merge suggestions; a group told "not the same" isn't offered again until another one with that name turns up.
 */
export async function duplicateCustomers(user: CurrentUser) {
  const acct = businessOf(user);
  const groups = await db
    .select({ kind: customers.kind, key: sameName, ids: sql<string[]>`array_agg(${customers.id} order by ${customers.lastSeenAt} desc)` })
    .from(customers)
    .where(eq(customers.accountId, acct))
    .groupBy(customers.kind, sameName)
    .having(sql`count(*) > 1 and bool_or(not ${customers.dupDismissed})`)
    .limit(50);
  const ids = groups.flatMap((g) => g.ids);
  const rows = ids.length ? await db.select().from(customers).where(inArray(customers.id, ids)) : [];
  const byId = new Map(rows.map((c) => [c.id, c]));
  return {
    canMerge: user.permissions.has("partner.clients.manage"),
    groups: groups.map((g) => ({
      kind: g.kind,
      name: byId.get(g.ids[0])?.name ?? g.key,
      customers: g.ids.map((id) => byId.get(id)!).map((c) => ({ id: c.id, name: c.name, phone: c.phone, otherPhones: c.otherPhones, sent: c.sent, received: c.received, district: c.district, region: c.region, tin: c.tin, lastSeenAt: c.lastSeenAt })),
    })),
  };
}

const mergeSchema = z.object({ keepId: z.uuid(), mergeIds: z.array(z.uuid()).min(1).max(20) });

/**
 * Merges customers into one (the one kept): its parcels' counts add up, their numbers are kept as other numbers (a
 * booking with one still lands here), blanks are filled from the others, and their invoices move over.
 */
export async function mergeCustomers(user: CurrentUser, raw: unknown) {
  const acct = businessOf(user);
  if (!user.permissions.has("partner.clients.manage")) throw new DomainError("FORBIDDEN", "You can't merge customers.", 403);
  const { keepId, mergeIds } = mergeSchema.parse(raw);
  const others = [...new Set(mergeIds)].filter((id) => id !== keepId);
  if (!others.length) throw new DomainError("NOTHING_TO_MERGE", "Choose at least one other customer to merge.", 400);
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(customers).where(and(eq(customers.accountId, acct), inArray(customers.id, [keepId, ...others]))).for("update");
    const keep = rows.find((c) => c.id === keepId);
    const gone = rows.filter((c) => c.id !== keepId);
    if (!keep || gone.length !== others.length) throw new DomainError("NOT_FOUND", "Those customers aren't all yours.", 404);
    if (gone.some((c) => c.kind !== keep.kind)) throw new DomainError("KIND_MISMATCH", "A person and a company can't be merged.", 400);
    const pick = <K extends keyof typeof keep>(k: K) => keep[k] ?? gone.find((c) => c[k] != null)?.[k] ?? null;
    const phones = [...new Set([...keep.otherPhones, ...gone.flatMap((c) => [c.phone, ...c.otherPhones])])].filter((p) => p !== keep.phone);
    await tx.update(invoices).set({ customerId: keepId }).where(inArray(invoices.customerId, others));
    await tx.delete(customers).where(inArray(customers.id, others));
    const [merged] = await tx
      .update(customers)
      .set({
        otherPhones: phones,
        sent: keep.sent + gone.reduce((n, c) => n + c.sent, 0),
        received: keep.received + gone.reduce((n, c) => n + c.received, 0),
        email: pick("email"),
        tin: pick("tin"),
        regNo: pick("regNo"),
        contactName: pick("contactName"),
        region: pick("region"),
        district: pick("district"),
        landmark: pick("landmark"),
        lat: pick("lat"),
        lng: pick("lng"),
        dupDismissed: false,
      })
      .where(eq(customers.id, keepId))
      .returning();
    await audit(tx, { actorId: user.id, action: "customer.merge", entity: "customer", entityId: keepId, before: gone.map((c) => ({ id: c.id, name: c.name, phone: c.phone })), after: { phones: [merged.phone, ...phones] } });
    return { customer: { id: merged.id, name: merged.name, phone: merged.phone, otherPhones: merged.otherPhones, sent: merged.sent, received: merged.received } };
  });
}

/** "Not the same": stop suggesting these together. */
export async function dismissDuplicates(user: CurrentUser, raw: unknown) {
  const acct = businessOf(user);
  const { ids } = z.object({ ids: z.array(z.uuid()).min(2).max(50) }).parse(raw);
  await db.update(customers).set({ dupDismissed: true }).where(and(eq(customers.accountId, acct), inArray(customers.id, ids)));
  return { ok: true };
}

/* ----------------------------------------------------------------- profile */

/**
 * One customer's page: who they are, their parcels with this business (sent and received, newest first, by any of
 * their numbers) and how they use it: totals, the last six months, where they send to, and what they still owe.
 */
export async function customerProfile(user: CurrentUser, id: string) {
  const acct = businessOf(user);
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new DomainError("NOT_FOUND", "That customer isn't in your list.", 404);
  const [c] = await db.select().from(customers).where(and(eq(customers.accountId, acct), eq(customers.id, id)));
  if (!c) throw new DomainError("NOT_FOUND", "That customer isn't in your list.", 404);
  const phones = [c.phone, ...c.otherPhones];
  const list = sql.join(phones.map((p) => sql`${p}`), sql`, `);
  const sent = sql<boolean>`(${shipments.shipper}->>'phone') in (${list})`;
  const received = sql<boolean>`(${shipments.consignee}->>'phone') in (${list})`;
  const mine = and(eq(shipments.accountId, acct), or(sent, received));
  const month = sql<string>`to_char(${shipments.createdAt} at time zone 'Africa/Dar_es_Salaam', 'YYYY-MM')`;
  const since6 = new Date(Date.now() - 183 * 86400_000);
  const companyContact = sql<string | null>`nullif(trim(${shipments.shipper}->'company'->>'contactName'), '')`;
  const [rows, [tot], months, places, [owed], openInvoices, payLater, people, flagged, mineReported] = await Promise.all([
    db
      .select({
        waybill: shipments.waybill,
        state: shipments.state,
        sent,
        from: sql<string | null>`${shipments.shipper}->>'name'`,
        to: sql<string | null>`${shipments.consignee}->>'name'`,
        region: sql<string | null>`${shipments.consignee}->'address'->>'region'`,
        district: sql<string | null>`${shipments.consignee}->'address'->>'district'`,
        total: shipments.totalCharge,
        paidAt: shipments.paidAt,
        createdAt: shipments.createdAt,
      })
      .from(shipments)
      .where(mine)
      .orderBy(desc(shipments.createdAt))
      .limit(50),
    db
      .select({
        parcels: sql<number>`count(*)::int`,
        sent: sql<number>`count(*) filter (where ${sent})::int`,
        received: sql<number>`count(*) filter (where ${received} and not ${sent})::int`,
        spent: sql<number>`coalesce(sum(${shipments.totalCharge}) filter (where ${sent} and ${shipments.paidAt} is not null), 0)::int`,
        first: sql<string | null>`min(${shipments.createdAt})`,
        last: sql<string | null>`max(${shipments.createdAt})`,
        last30: sql<number>`count(*) filter (where ${shipments.createdAt} > now() - interval '30 days')::int`,
      })
      .from(shipments)
      .where(and(mine, sql`${shipments.state} <> 'CANCELLED'`)),
    db
      .select({ month, n: sql<number>`count(*)::int`, value: sql<number>`coalesce(sum(${shipments.totalCharge}), 0)::int` })
      .from(shipments)
      .where(and(mine, sql`${shipments.createdAt} >= ${since6.toISOString()}::timestamptz`, sql`${shipments.state} <> 'CANCELLED'`))
      .groupBy(month),
    db
      .select({ region: sql<string>`${shipments.consignee}->'address'->>'region'`, n: sql<number>`count(*)::int` })
      .from(shipments)
      .where(and(eq(shipments.accountId, acct), sent))
      .groupBy(sql`${shipments.consignee}->'address'->>'region'`)
      .orderBy(sql`count(*) desc`)
      .limit(3),
    db
      .select({ amount: sql<number>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}), 0)::int`, n: sql<number>`count(*)::int` })
      .from(invoices)
      .where(and(eq(invoices.accountId, acct), eq(invoices.customerId, c.id), sql`${invoices.status} in ('issued', 'partially_paid')`)),
    db
      .select({ id: invoices.id, number: invoices.number, total: invoices.total, paid: invoices.amountPaid, status: invoices.status, at: invoices.issueDate, due: invoices.dueDate })
      .from(invoices)
      .where(and(eq(invoices.accountId, acct), eq(invoices.customerId, c.id), sql`${invoices.status} in ('issued', 'partially_paid')`))
      .orderBy(invoices.dueDate)
      .limit(50),
    // Parcels still to be paid for (pay on delivery, or on the account) that aren't on an open invoice above.
    db
      .select({ waybill: shipments.waybill, total: shipments.totalCharge, terms: shipments.paymentTerms, state: shipments.state, createdAt: shipments.createdAt })
      .from(shipments)
      .where(and(mine, sql`${shipments.paidAt} is null`, sql`${shipments.state} not in ('CANCELLED', 'RETURNED')`, sql`${shipments.paymentTerms} <> 'prepaid'`))
      .orderBy(desc(shipments.createdAt))
      .limit(50),
    // A company's people: whoever brought its parcels in, with how many each.
    c.kind === "company"
      ? db
          .select({ name: companyContact, parcels: sql<number>`count(*)::int`, last: sql<string>`max(${shipments.createdAt})` })
          .from(shipments)
          .where(and(eq(shipments.accountId, acct), sent, sql`${companyContact} is not null`))
          .groupBy(companyContact)
          .orderBy(sql`count(*) desc`)
          .limit(20)
      : Promise.resolve([]),
    reportsByOthers(acct, phones),
    db.select({ reason: customerReports.reason }).from(customerReports).where(and(eq(customerReports.accountId, acct), inArray(customerReports.phone, phones))),
  ]);
  // The last six months, oldest first, with empty months as zero.
  const byMonth = new Map(months.map((m) => [m.month, m]));
  const eat = new Date(Date.now() + 3 * 3600_000);
  const chart = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(eat.getUTCFullYear(), eat.getUTCMonth() - (5 - i), 1));
    const k = d.toISOString().slice(0, 7);
    return { month: k, parcels: byMonth.get(k)?.n ?? 0, value: byMonth.get(k)?.value ?? 0 };
  });
  return {
    customer: {
      id: c.id, kind: c.kind, name: c.name, phone: c.phone, otherPhones: c.otherPhones, email: c.email, tin: c.tin, regNo: c.regNo,
      contactName: c.contactName, region: c.region, district: c.district, landmark: c.landmark, lat: c.lat, lng: c.lng,
    },
    stats: {
      parcels: tot?.parcels ?? 0,
      sent: tot?.sent ?? 0,
      received: tot?.received ?? 0,
      spent: tot?.spent ?? 0,
      last30: tot?.last30 ?? 0,
      firstAt: tot?.first ? new Date(tot.first).toISOString() : null,
      lastAt: tot?.last ? new Date(tot.last).toISOString() : null,
      owed: owed?.amount ?? 0,
      unpaidInvoices: owed?.n ?? 0,
      months: chart,
      topRegions: places.filter((p) => p.region).map((p) => ({ region: p.region, parcels: p.n })),
    },
    parcels: rows.map((r) => ({ ...r, paidAt: r.paidAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString() })),
    unpaid: {
      invoices: openInvoices.map((i) => ({ ...i, owed: i.total - i.paid, at: i.at.toISOString(), due: i.due.toISOString(), overdue: i.due.getTime() < Date.now() })),
      parcels: payLater.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
    },
    people: people.map((p) => ({ name: p.name!, parcels: p.parcels, lastAt: new Date(p.last).toISOString() })),
    // Reports by other businesses on these numbers (never who), and what this business has reported.
    reports: { byOthers: [...flagged.values()].reduce((a, b) => a + b, 0), mine: mineReported.map((r) => r.reason) },
    canManage: user.permissions.has("partner.clients.manage"),
  };
}

/** Open reports by other businesses, per phone. */
async function reportsByOthers(acct: string, phones: string[]) {
  if (!phones.length) return new Map<string, number>();
  const rows = await db
    .select({ phone: customerReports.phone, n: sql<number>`count(distinct ${customerReports.accountId})::int` })
    .from(customerReports)
    .where(and(inArray(customerReports.phone, [...new Set(phones)]), ne(customerReports.accountId, acct), eq(customerReports.status, "open")))
    .groupBy(customerReports.phone);
  return new Map(rows.map((r) => [r.phone, r.n]));
}

function manageable(user: CurrentUser) {
  const acct = businessOf(user);
  if (!user.permissions.has("partner.clients.manage")) throw new DomainError("FORBIDDEN", "You can't change customers.", 403);
  return acct;
}

async function ownCustomer(acct: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new DomainError("NOT_FOUND", "That customer isn't in your list.", 404);
  const [c] = await db.select().from(customers).where(and(eq(customers.accountId, acct), eq(customers.id, id)));
  if (!c) throw new DomainError("NOT_FOUND", "That customer isn't in your list.", 404);
  return c;
}

const blank = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);
const editSchema = z.object({
  name: z.string().trim().min(2, "Enter the name").max(120),
  email: z.string().trim().email("Enter a valid email address").max(120).nullish().or(z.literal("")).transform((v) => blank(v)),
  tin: z.string().trim().max(20).nullish().transform((v) => (blank(v) ? v!.replace(/\D/g, "") : null)),
  regNo: z.string().trim().max(40).nullish().transform(blank),
  contactName: z.string().trim().max(120).nullish().transform(blank),
  landmark: z.string().trim().max(160).nullish().transform(blank),
});

/** Corrects a customer's details (name, email, TIN, registration, contact person, landmark). The phone stays. */
export async function updateCustomer(user: CurrentUser, id: string, raw: unknown) {
  const acct = manageable(user);
  const input = editSchema.parse(raw);
  if (input.tin && input.tin.length !== 9) throw new DomainError("BAD_TIN", "A TIN has 9 digits, like 123-456-789.");
  return db.transaction(async (tx) => {
    const before = await ownCustomer(acct, id);
    const [c] = await tx.update(customers).set(input).where(eq(customers.id, id)).returning();
    await audit(tx, { actorId: user.id, action: "customer.update", entity: "customer", entityId: id, before: { name: before.name, email: before.email, tin: before.tin }, after: input });
    return { customer: { id: c.id, kind: c.kind, name: c.name, phone: c.phone, email: c.email, tin: c.tin, regNo: c.regNo, contactName: c.contactName, landmark: c.landmark } };
  });
}

/**
 * Removes a customer from the business's list. Their parcels and invoices stay (invoices keep who they were billed
 * to); booking with the number again adds them back.
 */
export async function deleteCustomer(user: CurrentUser, id: string) {
  const acct = manageable(user);
  await db.transaction(async (tx) => {
    const c = await ownCustomer(acct, id);
    await tx.update(invoices).set({ customerId: null }).where(eq(invoices.customerId, id));
    await tx.delete(customers).where(eq(customers.id, id));
    await audit(tx, { actorId: user.id, action: "customer.delete", entity: "customer", entityId: id, before: { name: c.name, phone: c.phone, kind: c.kind } });
  });
  return { deleted: true };
}

export const REPORT_REASONS = ["fake_payment", "prohibited_goods", "abuse", "no_show", "identity", "other"] as const;
const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  note: z.string().trim().max(500).nullish().transform(blank),
});

/**
 * Reports a customer for fraud or abuse. Other businesses booking with the same number are warned (without
 * saying who reported it), and Tuma ops review it. Once per reason.
 */
export async function reportCustomer(user: CurrentUser, id: string, raw: unknown) {
  const acct = businessOf(user);
  const input = reportSchema.parse(raw);
  if (input.reason === "other" && !input.note) throw new DomainError("NOTE_REQUIRED", "Say what happened.", 400);
  return db.transaction(async (tx) => {
    const c = await ownCustomer(acct, id);
    const [r] = await tx
      .insert(customerReports)
      .values({ accountId: acct, customerId: c.id, phone: c.phone, name: c.name, reason: input.reason, note: input.note, reportedBy: user.id })
      .onConflictDoNothing()
      .returning({ id: customerReports.id });
    if (!r) throw new DomainError("ALREADY_REPORTED", "You've already reported this customer for that.", 409);
    await audit(tx, { actorId: user.id, action: "customer.report", entity: "customer", entityId: c.id, after: { reason: input.reason, phone: c.phone } });
    return { reported: true };
  });
}
