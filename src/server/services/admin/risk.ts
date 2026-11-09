import "server-only";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { accounts, riskAlerts, riskCases, riskHolds, riskRules, users } from "../../db/schema";
import { audit } from "../../audit";
import { enqueue } from "../../adapters/outbox";
import { DomainError } from "../shipments";
import { requestApproval } from "./approvals";
import { approvalAppliers } from "./approval-registry";
import { ref } from "./claims";
import type { CurrentUser } from "../../auth/current-user";

/**
 * Risk and fraud. Rules look at what happened (bookings, deliveries, cash, agents' reports) and raise alerts; an analyst
 * groups alerts about one subject into a case, notes what they find and closes it with an outcome. A person or business
 * can be frozen (they can then only look); releasing a freeze waits for a second person.
 */

type Hit = { subjectType: "user" | "account"; subjectId: string; subjectLabel: string; score: number; details: Record<string, unknown>; key: string };

const km = (a: [number, number], b: [number, number]) => {
  const r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r;
  const dLng = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

/** Each rule: what it looks for, given its thresholds. Returns the subjects it flags. */
const RULES: Record<string, (p: Record<string, number>, now: string) => Promise<Hit[]>> = {
  async velocity(p, now) {
    const per = Math.max(1, p.perHour ?? 30);
    const rows = await db.execute<{ id: string; label: string; n: number; [k: string]: unknown }>(sql`
      select s.created_by as id, coalesce(u.name, s.created_by) as label, count(*)::int as n
      from shipments s left join users u on u.id = s.created_by
      where s.created_at > ${now}::timestamptz - interval '1 hour'
      group by 1, 2 having count(*) > ${per}`);
    return [...rows].map((r) => ({ subjectType: "user", subjectId: r.id, subjectLabel: r.label, score: Math.min(100, Math.round((r.n / per) * 50)), details: { parcelsLastHour: r.n, limit: per }, key: `velocity:${r.id}:${now.slice(0, 13)}` }));
  },
  async ghost_delivery(p, now) {
    const maxKm = p.maxKm ?? 2;
    const minSec = p.minSeconds ?? 60;
    const rows = await db.execute<{ id: string; waybill: string; actor: string | null; label: string | null; lat: number | null; lng: number | null; dlat: number | null; dlng: number | null; secs: number | null; [k: string]: unknown }>(sql`
      select e.id, s.waybill, e.actor_id as actor, u.name as label, e.lat, e.lng,
        coalesce(dl.lat, (s.consignee->'address'->>'lat')::float8) as dlat,
        coalesce(dl.lng, (s.consignee->'address'->>'lng')::float8) as dlng,
        extract(epoch from (e.occurred_at - (select max(o.occurred_at) from events o
          where o.shipment_id = e.shipment_id and o.state_after = 'OUT_FOR_DELIVERY' and o.occurred_at <= e.occurred_at))) as secs
      from events e join shipments s on s.id = e.shipment_id
      left join locations dl on dl.id = s.delivery_location_id
      left join users u on u.id = e.actor_id
      where e.state_after = 'DELIVERED' and e.occurred_at > ${now}::timestamptz - interval '7 days' and e.actor_id is not null`);
    const hits: Hit[] = [];
    for (const r of rows) {
      const far = r.lat != null && r.lng != null && r.dlat != null && r.dlng != null ? km([r.lat, r.lng], [r.dlat, r.dlng]) : null;
      const quick = r.secs != null && r.secs >= 0 && r.secs < minSec;
      if ((far == null || far <= maxKm) && !quick) continue;
      hits.push({
        subjectType: "user",
        subjectId: r.actor!,
        subjectLabel: r.label ?? r.actor!,
        score: Math.min(100, (far && far > maxKm ? 40 + Math.round(far) : 0) + (quick ? 40 : 0)),
        details: { waybill: r.waybill, kmFromPin: far == null ? null : Math.round(far * 10) / 10, secondsAfterOutForDelivery: r.secs == null ? null : Math.round(r.secs) },
        key: `ghost:${r.id}`,
      });
    }
    return hits;
  },
  async cash_shortfall(p, now) {
    const days = p.days ?? 3;
    const min = p.minAmount ?? 50_000;
    const rows = await db.execute<{ id: string; label: string; amount: number; parcels: number; oldest: string; [k: string]: unknown }>(sql`
      select c.holder_id as id, coalesce(u.name, c.holder_id) as label,
        sum(c.amount_collected + c.fee_collected)::int as amount, count(*)::int as parcels, min(c.collected_at)::text as oldest
      from cod_records c left join users u on u.id = c.holder_id
      where c.status = 'collected' and c.method = 'cash' and c.holder_id is not null
        and c.collected_at < ${now}::timestamptz - make_interval(days => ${days})
      group by 1, 2 having sum(c.amount_collected + c.fee_collected) >= ${min}`);
    return [...rows].map((r) => ({ subjectType: "user", subjectId: r.id, subjectLabel: r.label, score: Math.min(100, 30 + Math.round(r.amount / min) * 10), details: { amount: r.amount, parcels: r.parcels, since: r.oldest, days }, key: `cash:${r.id}:${now.slice(0, 10)}` }));
  },
  async reported_phone(p) {
    const n = Math.max(2, p.reports ?? 2);
    const rows = await db.execute<{ phone: string; name: string; offices: number; reasons: string[]; [k: string]: unknown }>(sql`
      select phone, max(name) as name, count(distinct account_id)::int as offices, array_agg(distinct reason) as reasons
      from customer_reports where status = 'open' group by phone having count(distinct account_id) >= ${n}`);
    // A reported number belongs to a Tuma user when one has it.
    const phones = [...rows].map((r) => r.phone);
    const owners = phones.length ? new Map((await db.select({ id: users.id, phone: users.phone }).from(users).where(inArray(users.phone, phones))).map((u) => [u.phone!, u.id])) : new Map<string, string>();
    return [...rows].map((r) => ({
      subjectType: "user",
      subjectId: owners.get(r.phone) ?? `phone:${r.phone}`,
      subjectLabel: `${r.name} (${r.phone})`,
      score: Math.min(100, r.offices * 25),
      details: { phone: r.phone, offices: r.offices, reasons: r.reasons },
      key: `reported:${r.phone}:${r.offices}`,
    }));
  },
};

function need(user: CurrentUser, p: "risk.view" | "risk.manage" | "risk.freeze") {
  if (!user.permissions.has(p)) throw new DomainError("FORBIDDEN", "You can't do that in risk.", 403);
}

/** Run every enabled rule; new findings become alerts (each finding once). */
export async function runRiskChecks(actorId: string | null, now = new Date()) {
  const rules = await db.select().from(riskRules).where(eq(riskRules.enabled, true));
  const iso = now.toISOString();
  let created = 0;
  for (const r of rules) {
    const fn = RULES[r.key];
    if (!fn) continue;
    const hits = await fn(r.params, iso);
    if (!hits.length) continue;
    const inserted = await db
      .insert(riskAlerts)
      .values(hits.map((h) => ({ rule: r.key, subjectType: h.subjectType, subjectId: h.subjectId, subjectLabel: h.subjectLabel, score: h.score, details: h.details, dedupeKey: h.key })))
      .onConflictDoNothing({ target: riskAlerts.dedupeKey })
      .returning({ id: riskAlerts.id });
    created += inserted.length;
  }
  if (actorId) await db.transaction((tx) => audit(tx, { actorId, action: "risk.run", entity: "risk", entityId: "rules", after: { created } }));
  return { created };
}

export async function runChecksNow(user: CurrentUser) {
  need(user, "risk.manage");
  return runRiskChecks(user.id);
}

export async function riskOverview(user: CurrentUser) {
  need(user, "risk.view");
  const [alerts, cases, holds, rules, [k]] = await Promise.all([
    db.select().from(riskAlerts).where(eq(riskAlerts.status, "open")).orderBy(desc(riskAlerts.score), desc(riskAlerts.createdAt)).limit(100),
    db.select().from(riskCases).orderBy(sql`${riskCases.status} = 'closed'`, desc(riskCases.createdAt)).limit(50),
    db.select().from(riskHolds).where(isNull(riskHolds.releasedAt)).orderBy(desc(riskHolds.placedAt)),
    db.select().from(riskRules).orderBy(riskRules.name),
    db.execute<{ open: number; week: number; fraud: number; closed: number; [k: string]: unknown }>(sql`
      select (select count(*)::int from risk_alerts where status = 'open') as open,
        (select count(*)::int from risk_alerts where created_at > now() - interval '7 days') as week,
        (select count(*)::int from risk_cases where outcome = 'fraud' and closed_at > now() - interval '90 days') as fraud,
        (select count(*)::int from risk_cases where status = 'closed' and closed_at > now() - interval '90 days') as closed`),
  ]);
  return {
    alerts: alerts.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
    cases: cases.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), closedAt: c.closedAt?.toISOString() ?? null })),
    holds: holds.map((h) => ({ ...h, placedAt: h.placedAt.toISOString() })),
    rules: rules.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() })),
    kpis: { ...k, falsePositive: k.closed ? Math.round(((k.closed - k.fraud) / k.closed) * 100) : 0 },
    can: { manage: user.permissions.has("risk.manage"), freeze: user.permissions.has("risk.freeze") },
  };
}

export async function dismissAlert(user: CurrentUser, id: string) {
  need(user, "risk.manage");
  await db.update(riskAlerts).set({ status: "dismissed" }).where(and(eq(riskAlerts.id, id), eq(riskAlerts.status, "open")));
  await db.transaction((tx) => audit(tx, { actorId: user.id, action: "risk.alert.dismissed", entity: "risk_alert", entityId: id }));
  return { id };
}

/** Open a case from an alert (joining that subject's other open alerts), or add to the open case on that subject. */
export async function openCase(user: CurrentUser, alertId: string) {
  need(user, "risk.manage");
  return db.transaction(async (tx) => {
    const [a] = await tx.select().from(riskAlerts).where(eq(riskAlerts.id, alertId)).for("update");
    if (!a) throw new DomainError("NOT_FOUND", "No such alert.", 404);
    let [c] = await tx
      .select()
      .from(riskCases)
      .where(and(eq(riskCases.subjectType, a.subjectType), eq(riskCases.subjectId, a.subjectId), eq(riskCases.status, "open")));
    if (!c) {
      [c] = await tx
        .insert(riskCases)
        .values({ ref: ref("RSK"), subjectType: a.subjectType, subjectId: a.subjectId, subjectLabel: a.subjectLabel, title: `${a.rule.replace(/_/g, " ")}: ${a.subjectLabel}`, ownerId: user.id, createdBy: user.id })
        .returning();
      await audit(tx, { actorId: user.id, action: "risk.case.open", entity: "risk_case", entityId: c.id, after: { ref: c.ref, subject: a.subjectId } });
    }
    await tx
      .update(riskAlerts)
      .set({ status: "case", caseId: c.id })
      .where(and(eq(riskAlerts.subjectType, a.subjectType), eq(riskAlerts.subjectId, a.subjectId), eq(riskAlerts.status, "open")));
    return { id: c.id, ref: c.ref };
  });
}

export async function getCase(user: CurrentUser, id: string) {
  need(user, "risk.view");
  const [c] = await db.select().from(riskCases).where(eq(riskCases.id, id));
  if (!c) throw new DomainError("NOT_FOUND", "No such case.", 404);
  const [alerts, holds] = await Promise.all([
    db.select().from(riskAlerts).where(eq(riskAlerts.caseId, id)).orderBy(desc(riskAlerts.createdAt)),
    db
      .select()
      .from(riskHolds)
      .where(and(eq(riskHolds.subjectType, c.subjectType), eq(riskHolds.subjectId, c.subjectId)))
      .orderBy(desc(riskHolds.placedAt)),
  ]);
  return {
    case: { ...c, createdAt: c.createdAt.toISOString(), closedAt: c.closedAt?.toISOString() ?? null },
    alerts: alerts.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
    holds: holds.map((h) => ({ ...h, placedAt: h.placedAt.toISOString(), releasedAt: h.releasedAt?.toISOString() ?? null })),
    can: { manage: user.permissions.has("risk.manage"), freeze: user.permissions.has("risk.freeze") },
  };
}

export async function addCaseNote(user: CurrentUser, id: string, raw: unknown) {
  need(user, "risk.manage");
  const { text } = z.object({ text: z.string().trim().min(3).max(2000) }).parse(raw);
  await db.transaction(async (tx) => {
    const [c] = await tx.select().from(riskCases).where(eq(riskCases.id, id)).for("update");
    if (!c) throw new DomainError("NOT_FOUND", "No such case.", 404);
    await tx
      .update(riskCases)
      .set({ notes: [...c.notes, { by: user.id, name: user.name, at: new Date().toISOString(), text }] })
      .where(eq(riskCases.id, id));
  });
  return { id };
}

export async function closeCase(user: CurrentUser, id: string, raw: unknown) {
  need(user, "risk.manage");
  const { outcome, note } = z.object({ outcome: z.enum(["fraud", "not_fraud", "inconclusive"]), note: z.string().trim().min(10, "Sum up what you found (at least 10 characters)").max(2000) }).parse(raw);
  await db.transaction(async (tx) => {
    const [c] = await tx.select().from(riskCases).where(eq(riskCases.id, id)).for("update");
    if (!c || c.status === "closed") throw new DomainError("CLOSED", "This case is already closed.", 409);
    await tx
      .update(riskCases)
      .set({ status: "closed", outcome, closedAt: new Date(), notes: [...c.notes, { by: user.id, name: user.name, at: new Date().toISOString(), text: note }] })
      .where(eq(riskCases.id, id));
    await audit(tx, { actorId: user.id, action: "risk.case.closed", entity: "risk_case", entityId: id, after: { outcome } });
  });
  return { id };
}

/* ------------------------------------------------------------------ holds */

export const holdSchema = z.object({
  subjectType: z.enum(["user", "account"]),
  subjectId: z.string().trim().min(3).max(120),
  reason: z.string().trim().min(10, "Say why (at least 10 characters)").max(1000),
  caseId: z.string().uuid().optional(),
});

/** Freeze a person or a business: one person can do it at once. */
export async function placeHold(user: CurrentUser, raw: unknown) {
  need(user, "risk.freeze");
  const h = holdSchema.parse(raw);
  if (h.subjectType === "user" && h.subjectId === user.id) throw new DomainError("OWN", "You can't freeze yourself.", 400);
  const label =
    h.subjectType === "user"
      ? (await db.select({ name: users.name }).from(users).where(eq(users.id, h.subjectId)))[0]?.name
      : (await db.select({ name: accounts.name }).from(accounts).where(eq(accounts.id, h.subjectId)))[0]?.name;
  if (!label) throw new DomainError("NOT_FOUND", h.subjectType === "user" ? "No such person." : "No such business.", 404);
  return db.transaction(async (tx) => {
    const [open] = await tx
      .select({ id: riskHolds.id })
      .from(riskHolds)
      .where(and(eq(riskHolds.subjectType, h.subjectType), eq(riskHolds.subjectId, h.subjectId), isNull(riskHolds.releasedAt)));
    if (open) throw new DomainError("ALREADY", "They're already frozen.", 409);
    const [row] = await tx.insert(riskHolds).values({ ...h, subjectLabel: label, placedBy: user.id }).returning();
    await audit(tx, { actorId: user.id, action: "risk.freeze", entity: h.subjectType, entityId: h.subjectId, after: { reason: h.reason, hold: row.id } });
    await enqueue(tx, { target: "seal", topic: "risk.freeze", idempotencyKey: `freeze:${row.id}`, payload: { subjectType: h.subjectType, subjectId: h.subjectId, reason: h.reason } });
    return { id: row.id };
  });
}

/** Ask to release a freeze; a second person approves. */
export async function requestRelease(user: CurrentUser, holdId: string, raw: unknown) {
  need(user, "risk.freeze");
  const { reason } = z.object({ reason: z.string().trim().min(10, "Say why it's safe to release (at least 10 characters)").max(1000) }).parse(raw);
  const [h] = await db.select().from(riskHolds).where(eq(riskHolds.id, holdId));
  if (!h || h.releasedAt) throw new DomainError("NOT_FOUND", "No active freeze with that id.", 404);
  return db.transaction(async (tx) => {
    const row = await requestApproval(tx, user, { kind: "risk_release", subjectId: h.subjectId, payload: { holdId, summary: `${h.subjectLabel}` }, reason }, (t) => release(t, holdId, user.id, null));
    return { pending: !!row };
  });
}

async function release(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], holdId: string, approverId: string, approvalId: string | null) {
  const [h] = await tx
    .update(riskHolds)
    .set({ releasedAt: new Date(), releasedBy: approverId, approvalId })
    .where(and(eq(riskHolds.id, holdId), isNull(riskHolds.releasedAt)))
    .returning();
  if (h) await audit(tx, { actorId: approverId, action: "risk.release", entity: h.subjectType, entityId: h.subjectId, after: { hold: holdId, approval: approvalId } });
}

approvalAppliers.set("risk_release", async (tx, r, approverId) => {
  await release(tx, (r.payload as { holdId: string }).holdId, approverId, r.id);
});

/** What a frozen person keeps: seeing things, never changing them. */
export const lookOnly = (p: string) => /\.(read|view)(\.|$)/.test(p) || p === "agent.workspace";

/** Is this person (or their business) frozen right now? Read on every request. */
export async function activeHold(userId: string, accountId: string | null) {
  const [h] = await db
    .select({ id: riskHolds.id, reason: riskHolds.reason })
    .from(riskHolds)
    .where(
      and(
        isNull(riskHolds.releasedAt),
        accountId
          ? or(and(eq(riskHolds.subjectType, "user"), eq(riskHolds.subjectId, userId)), and(eq(riskHolds.subjectType, "account"), eq(riskHolds.subjectId, accountId)))
          : and(eq(riskHolds.subjectType, "user"), eq(riskHolds.subjectId, userId)),
      ),
    )
    .limit(1);
  return h ?? null;
}

/* ------------------------------------------------------------------ rules */

export async function updateRule(user: CurrentUser, key: string, raw: Record<string, string>) {
  need(user, "risk.manage");
  const [r] = await db.select().from(riskRules).where(eq(riskRules.key, key));
  if (!r) throw new DomainError("NOT_FOUND", "No such rule.", 404);
  const params: Record<string, number> = {};
  for (const k of Object.keys(r.params)) {
    const n = Number(raw[k]);
    if (!Number.isFinite(n) || n < 0) throw new DomainError("BAD_VALUE", `Enter a number for ${k}.`, 400);
    params[k] = n;
  }
  const enabled = raw.enabled === undefined ? r.enabled : raw.enabled === "on";
  await db.transaction(async (tx) => {
    await tx.update(riskRules).set({ params, enabled, updatedBy: user.id, updatedAt: new Date() }).where(eq(riskRules.key, key));
    await audit(tx, { actorId: user.id, action: "risk.rule", entity: "risk_rule", entityId: key, before: { params: r.params, enabled: r.enabled }, after: { params, enabled } });
  });
  return { key };
}
