import "server-only";
import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { accounts, customerRatings, customerReports, exceptions, kybApplications, shipments, supportRequests, supportUpdates, users, walletEntries } from "../../db/schema";
import { audit } from "../../audit";
import { enqueue } from "../../adapters/outbox";
import { listTickets, type TicketSummary } from "../../adapters/bliss";
import { DomainError } from "../shipments";
import { CASE_STATUSES, CASE_UPDATED_TEMPLATE } from "../support";
import { toE164 } from "@/domain/phone";
import { logReveal, shown } from "./pii";
import type { CurrentUser } from "../../auth/current-user";

/**
 * The support desk: the inbox of cases people filed (lost items, contact, business), and the customer 360, everything
 * Tuma knows about one person in one place. Personal details are masked unless the viewer holds pii.view; support
 * reveals one with a reason, and that goes to the audit trail. Bliss owns the conversation, so its tickets are shown
 * read-only next to Tuma's own records.
 */

function need(user: CurrentUser) {
  if (!user.permissions.has("support.view")) throw new DomainError("FORBIDDEN", "You can't see the support desk.", 403);
}

const OPEN = ["new", "in_review", "searching"];

export async function supportInbox(user: CurrentUser, f: { status?: "open" | "done" | "all"; kind?: string; before?: string } = {}) {
  need(user);
  const s = shown(user);
  const where = and(
    f.status === "done" ? sql`${supportRequests.status} not in ('new','in_review','searching')` : f.status === "all" ? undefined : inArray(supportRequests.status, OPEN),
    f.kind ? eq(supportRequests.kind, f.kind) : undefined,
    f.before ? sql`${supportRequests.createdAt} < ${new Date(f.before).toISOString()}::timestamptz` : undefined,
  );
  const [rows, counts] = await Promise.all([
    db.select().from(supportRequests).where(where).orderBy(desc(supportRequests.createdAt)).limit(50),
    db
      .select({ open: sql<number>`count(*) filter (where ${supportRequests.status} in ('new','in_review','searching'))::int`, fresh: sql<number>`count(*) filter (where ${supportRequests.status} = 'new')::int` })
      .from(supportRequests),
  ]);
  return {
    counts: counts[0] ?? { open: 0, fresh: 0 },
    rows: rows.map((r) => ({
      id: r.id,
      ref: r.ref,
      kind: r.kind,
      status: r.status,
      waybill: r.waybill,
      name: s.name(r.name),
      phone: s.phone(r.phone),
      email: s.email(r.email),
      summary: summaryOf(r.body),
      createdAt: r.createdAt.toISOString(),
    })),
    next: rows.length === 50 ? rows[rows.length - 1].createdAt.toISOString() : null,
  };
}

function summaryOf(body: Record<string, unknown>): string {
  const v = body.itemDescription ?? body.message ?? body.subject ?? body.businessName ?? "";
  return String(v).slice(0, 160);
}

export async function supportCase(user: CurrentUser, id: string) {
  need(user);
  const s = shown(user);
  const [r] = await db.select().from(supportRequests).where(eq(supportRequests.id, id));
  if (!r) throw new DomainError("NOT_FOUND", "No such case.", 404);
  const updates = await db.select().from(supportUpdates).where(eq(supportUpdates.requestId, r.id)).orderBy(desc(supportUpdates.occurredAt));
  const customer = r.phone ? await keyForPhone(r.phone) : null;
  return {
    id: r.id,
    ref: r.ref,
    kind: r.kind,
    status: r.status,
    waybill: r.waybill,
    name: s.name(r.name),
    phone: s.phone(r.phone),
    email: s.email(r.email),
    body: Object.fromEntries(Object.entries(r.body).filter(([k]) => !["phone", "email", "name"].includes(k)).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)])),
    createdAt: r.createdAt.toISOString(),
    updates: updates.map((u) => ({ status: u.status, note: u.note, source: u.source, at: u.occurredAt.toISOString() })),
    customerKey: customer,
  };
}

export const caseStatusSchema = z.object({ status: z.enum(CASE_STATUSES), note: z.string().trim().max(1000).optional() });

/** Support moves a case on from Tuma (Bliss can too); the customer gets a text when the status changes. */
export async function updateSupportCase(user: CurrentUser, id: string, raw: unknown) {
  need(user);
  const u = caseStatusSchema.parse(raw);
  return db.transaction(async (tx) => {
    const [r] = await tx.select().from(supportRequests).where(eq(supportRequests.id, id)).for("update");
    if (!r) throw new DomainError("NOT_FOUND", "No such case.", 404);
    const eventId = crypto.randomUUID();
    await tx.insert(supportUpdates).values({ requestId: r.id, status: u.status, note: u.note || null, source: "tuma", externalId: `tuma:${eventId}` });
    const changed = r.status !== u.status;
    if (changed) await tx.update(supportRequests).set({ status: u.status }).where(eq(supportRequests.id, r.id));
    if (changed && r.phone && r.kind !== "business") {
      await enqueue(tx, {
        target: "hudufeed",
        topic: "notification.request",
        idempotencyKey: `case-updated:tuma:${eventId}`,
        waybill: r.waybill ?? undefined,
        payload: { template: CASE_UPDATED_TEMPLATE, channel: "sms", language: r.locale, to: r.phone, variables: { ref: r.ref, status: u.status, note: u.note ?? "" } },
      });
    }
    await audit(tx, { actorId: user.id, action: "support.update", entity: "support_request", entityId: r.ref, before: { status: r.status }, after: { status: u.status } });
    return { status: u.status };
  });
}

/* -------------------------------------------------------------- customer 360 */

/**
 * A customer is a Tuma user (`u:<id>`) or, for someone who never signed up, a party on a parcel (`p:<shipment>:<side>`).
 * Keys, not phone numbers, go in links, so nothing personal ends up in a URL.
 */
type Key = { kind: "user"; userId: string } | { kind: "party"; shipmentId: string; side: "shipper" | "consignee" };

function parseKey(key: string): Key {
  const [k, a, b] = key.split(":");
  if (k === "u" && a) return { kind: "user", userId: a };
  if (k === "p" && a && (b === "shipper" || b === "consignee")) return { kind: "party", shipmentId: a, side: b };
  throw new DomainError("BAD_KEY", "That customer link isn't valid.", 400);
}

async function keyForPhone(phone: string) {
  const [u] = await db.select({ id: users.id }).from(users).where(and(eq(users.phone, phone), isNull(users.deletedAt))).limit(1);
  if (u) return `u:${u.id}`;
  const [p] = await db
    .select({ id: shipments.id, side: sql<string>`case when ${shipments.shipper}->>'phone' = ${phone} then 'shipper' else 'consignee' end` })
    .from(shipments)
    .where(or(sql`${shipments.shipper}->>'phone' = ${phone}`, sql`${shipments.consignee}->>'phone' = ${phone}`))
    .orderBy(desc(shipments.createdAt))
    .limit(1);
  return p ? `p:${p.id}:${p.side}` : null;
}

/** Find a customer by phone, name, email or waybill. */
export async function searchCustomers(user: CurrentUser, q: string) {
  // Finance finds whose wallet to adjust with the same search.
  if (!user.permissions.has("finance.reconcile")) need(user);
  const s = shown(user);
  const term = q.trim();
  if (term.length < 3) return [];
  const phone = toE164(term);
  const out = new Map<string, { key: string; name: string | null; phone: string | null; kind: "user" | "party"; note: string | null }>();
  const people = await db
    .select({ id: users.id, name: users.name, phone: users.phone, email: users.email, accountId: users.accountId })
    .from(users)
    .where(and(isNull(users.deletedAt), phone ? eq(users.phone, phone) : or(ilike(users.name, `%${term}%`), ilike(users.email, `%${term}%`))))
    .limit(10);
  for (const p of people) out.set(`u:${p.id}`, { key: `u:${p.id}`, name: s.name(p.name), phone: s.phone(p.phone), kind: "user", note: null });

  const wb = term.toUpperCase().replace(/\s+/g, "");
  const parcels = await db
    .select({ id: shipments.id, waybill: shipments.waybill, shipper: shipments.shipper, consignee: shipments.consignee })
    .from(shipments)
    .where(
      phone
        ? or(sql`${shipments.shipper}->>'phone' = ${phone}`, sql`${shipments.consignee}->>'phone' = ${phone}`)
        : /\d/.test(wb)
          ? eq(shipments.waybill, wb)
          : or(sql`${shipments.shipper}->>'name' ilike ${`%${term}%`}`, sql`${shipments.consignee}->>'name' ilike ${`%${term}%`}`),
    )
    .orderBy(desc(shipments.createdAt))
    .limit(10);
  const parties = parcels.flatMap((p) => [
    { side: "shipper" as const, p, party: p.shipper },
    { side: "consignee" as const, p, party: p.consignee },
  ]);
  const phones = [...new Set(parties.map((x) => x.party.phone).filter(Boolean))];
  const known = phones.length ? await db.select({ id: users.id, name: users.name, phone: users.phone }).from(users).where(and(inArray(users.phone, phones), isNull(users.deletedAt))) : [];
  const byPhone = new Map(known.map((k) => [k.phone, k]));
  const seen = new Set<string>();
  for (const { side, p, party } of parties) {
    if (phone && party.phone !== phone) continue;
    if (!phone && !/\d/.test(wb) && !party.name.toLowerCase().includes(term.toLowerCase())) continue;
    if (seen.has(party.phone)) continue;
    seen.add(party.phone);
    const u = byPhone.get(party.phone);
    const key = u ? `u:${u.id}` : `p:${p.id}:${side}`;
    if (!out.has(key)) out.set(key, { key, name: s.name(u?.name ?? party.name), phone: s.phone(party.phone), kind: u ? "user" : "party", note: p.waybill });
  }
  return [...out.values()].slice(0, 15);
}

async function resolve(key: Key) {
  if (key.kind === "user") {
    const [u] = await db.select().from(users).where(eq(users.id, key.userId));
    if (!u) throw new DomainError("NOT_FOUND", "No such customer.", 404);
    return { user: u, phone: u.phone, name: u.name, email: u.email };
  }
  const [p] = await db.select({ shipper: shipments.shipper, consignee: shipments.consignee }).from(shipments).where(eq(shipments.id, key.shipmentId));
  if (!p) throw new DomainError("NOT_FOUND", "No such customer.", 404);
  const party = p[key.side];
  const [u] = party.phone ? await db.select().from(users).where(and(eq(users.phone, party.phone), isNull(users.deletedAt))).limit(1) : [];
  return { user: u ?? null, phone: party.phone, name: u?.name ?? party.name, email: u?.email ?? party.email ?? null };
}

export async function customer360(user: CurrentUser, rawKey: string) {
  need(user);
  const s = shown(user);
  const key = parseKey(rawKey);
  const c = await resolve(key);
  const u = c.user;
  const phone = c.phone;
  const parcelWhere = or(
    phone ? sql`${shipments.shipper}->>'phone' = ${phone}` : undefined,
    phone ? sql`${shipments.consignee}->>'phone' = ${phone}` : undefined,
    u ? eq(shipments.createdBy, u.id) : undefined,
  );
  const [parcels, wallet, entries, cases, reports, ratings, account, kyb, tickets] = await Promise.all([
    db
      .select({
        id: shipments.id,
        waybill: shipments.waybill,
        state: shipments.state,
        exception: shipments.exception,
        total: shipments.totalCharge,
        createdAt: shipments.createdAt,
        sent: sql<boolean>`(${shipments.shipper}->>'phone' = ${phone ?? ""} or ${shipments.createdBy} = ${u?.id ?? ""})`,
        other: sql<string>`case when ${shipments.shipper}->>'phone' = ${phone ?? ""} then ${shipments.consignee}->>'name' else ${shipments.shipper}->>'name' end`,
        openExceptions: sql<number>`(select count(*)::int from ${exceptions} x where x.shipment_id = ${shipments.id} and x.status <> 'resolved')`,
      })
      .from(shipments)
      .where(parcelWhere)
      .orderBy(desc(shipments.createdAt))
      .limit(30),
    u
      ? db
          .select({ balance: sql<number>`coalesce(sum(${walletEntries.amount}) filter (where ${walletEntries.status} = 'paid'), 0)::int` })
          .from(walletEntries)
          .where(and(eq(walletEntries.userId, u.id), isNull(walletEntries.accountId)))
      : Promise.resolve([]),
    u ? db.select().from(walletEntries).where(eq(walletEntries.userId, u.id)).orderBy(desc(walletEntries.createdAt)).limit(10) : Promise.resolve([]),
    db
      .select()
      .from(supportRequests)
      .where(or(phone ? eq(supportRequests.phone, phone) : undefined, c.email ? eq(supportRequests.email, c.email) : undefined) ?? sql`false`)
      .orderBy(desc(supportRequests.createdAt))
      .limit(10),
    phone
      ? db.select({ reason: customerReports.reason, status: customerReports.status, n: sql<number>`count(*)::int` }).from(customerReports).where(eq(customerReports.phone, phone)).groupBy(customerReports.reason, customerReports.status)
      : Promise.resolve([]),
    phone
      ? db.select({ avg: sql<number | null>`avg(${customerRatings.stars})::float`, n: sql<number>`count(*)::int` }).from(customerRatings).where(eq(customerRatings.phone, phone))
      : Promise.resolve([]),
    u?.accountId ? db.select({ id: accounts.id, name: accounts.name, status: accounts.status, type: accounts.type }).from(accounts).where(eq(accounts.id, u.accountId)) : Promise.resolve([]),
    u ? db.select({ ref: kybApplications.ref, status: kybApplications.status, businessName: kybApplications.businessName }).from(kybApplications).where(eq(kybApplications.userId, u.id)).orderBy(desc(kybApplications.ref)).limit(3) : Promise.resolve([]),
    u ? listTickets(u.id).then((t): TicketSummary[] | null => t).catch(() => null) : Promise.resolve([] as TicketSummary[]),
  ]);
  return {
    key: rawKey,
    unmasked: s.unmasked,
    profile: {
      kind: key.kind,
      name: s.name(c.name),
      phone: s.phone(phone),
      email: s.email(c.email),
      onTuma: !!u,
      active: u?.active ?? null,
      lastSeenAt: u?.lastSeenAt?.toISOString() ?? null,
      area: u?.senderProfile ? [u.senderProfile.district, u.senderProfile.region].filter(Boolean).join(", ") : null,
    },
    parcels: parcels.map((p) => ({ ...p, createdAt: p.createdAt.toISOString(), other: s.name(p.other) })),
    wallet: u ? { balance: wallet[0]?.balance ?? 0, entries: entries.map((e) => ({ kind: e.kind, amount: e.amount, status: e.status, reference: e.reference, waybill: e.waybill, at: e.createdAt.toISOString(), company: !!e.accountId })) } : null,
    cases: cases.map((r) => ({ id: r.id, ref: r.ref, kind: r.kind, status: r.status, waybill: r.waybill, at: r.createdAt.toISOString() })),
    reports,
    rating: ratings[0]?.n ? { avg: Math.round((ratings[0].avg ?? 0) * 10) / 10, n: ratings[0].n } : null,
    account: account[0] ?? null,
    kyb,
    tickets,
  };
}

export const revealInput = z.object({ key: z.string().min(3).max(200), field: z.enum(["phone", "name", "email"]), reason: z.string().trim().min(5).max(300) });

/** One personal detail, in full, with a reason that goes to the audit trail. */
export async function revealCustomerField(user: CurrentUser, raw: unknown) {
  need(user);
  const r = revealInput.parse(raw);
  const key = parseKey(r.key);
  const c = await resolve(key);
  await logReveal(user, {
    entity: key.kind === "user" ? "user" : "shipment",
    entityId: key.kind === "user" ? key.userId : `${key.shipmentId}:${key.side}`,
    field: r.field,
    reason: r.reason,
  });
  return { value: (r.field === "phone" ? c.phone : r.field === "name" ? c.name : c.email) ?? null };
}
