import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { outbox } from "../db/schema";
import { enqueue } from "../adapters/outbox";
import { deliverToHuduBI } from "../adapters/hudubi";

/**
 * Parcel pricing analytics for Hudumika's admins, published to HuduBI. Agents set their own prices, so Tuma watches
 * them: per lane (from region → to region) and weight band, what parcels cost globally, at each agent and for each
 * company sending, over a trailing window, plus signals worth a look (an agent far above or below the market, a
 * sudden change in an agent's prices, parcels let go for nothing, a company paying very different prices for the same
 * lane). Runs in the background (POST /api/cron/pricing); nothing here is shown to agents or customers.
 */

export const WINDOW_DAYS = 30;
/** The recent part of the window, compared with the rest for price changes. */
const RECENT_DAYS = 7;
/** Fewer parcels than this in a group and its figures aren't compared. */
const MIN_PARCELS = 3;
const OUTLIER = 0.4;
const JUMP = 0.3;
const SPREAD = 1.5;

export const WEIGHT_BANDS = ["0-1", "1-3", "3-5", "5-10", "10-30"] as const;
const band = sql<string>`case
  when s.chargeable_weight_g <= 1000 then '0-1'
  when s.chargeable_weight_g <= 3000 then '1-3'
  when s.chargeable_weight_g <= 5000 then '3-5'
  when s.chargeable_weight_g <= 10000 then '5-10'
  else '10-30' end`;

export type Scope = "global" | "agent" | "company";

export type PriceRow = {
  scope: Scope;
  scopeId: string;
  scopeName: string;
  laneFrom: string;
  laneTo: string;
  weightBand: string;
  parcels: number;
  median: number;
  p25: number;
  p75: number;
  min: number;
  max: number;
  avgPerKg: number;
  revenue: number;
};

export type Signal = {
  kind: "agent_above_market" | "agent_below_market" | "agent_price_jump" | "zero_priced" | "company_price_spread";
  severity: "info" | "warn" | "high";
  scope: Scope;
  scopeId: string;
  scopeName: string;
  lane: string | null;
  weightBand: string | null;
  message: string;
  data: Record<string, unknown>;
};

/** Midnight in Dar es Salaam (UTC+3) at the start of the given day (YYYY-MM-DD). */
const darDay = (d: string) => new Date(`${d}T00:00:00+03:00`);
export const darToday = () => new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);

/**
 * Priced parcels an agent handled in the window ending at the close of `asOf`: not cancelled, with a price set at a
 * counter (Tuma's own rate card isn't an agent's price). A company sender is keyed by its TIN, else its name.
 */
function priced(asOf: string, days: number) {
  const end = new Date(darDay(asOf).getTime() + 24 * 3600_000);
  const start = new Date(end.getTime() - days * 24 * 3600_000);
  return sql`
    select s.id, s.total_charge as price, s.chargeable_weight_g as weight_g, s.created_at,
      s.shipper->'address'->>'region' as lane_from, s.consignee->'address'->>'region' as lane_to,
      ${band} as weight_band,
      s.handling_partner_id as agent_id, a.name as agent_name,
      case when s.shipper ? 'company' then coalesce(nullif(s.shipper->'company'->>'tin', ''), lower(s.shipper->>'name')) end as company_id,
      case when s.shipper ? 'company' then s.shipper->>'name' end as company_name
    from shipments s
    join accounts a on a.id = s.handling_partner_id
    where s.type = 'parcel' and s.state <> 'CANCELLED' and s.handling_partner_id is not null
      and a.partner_kind = 'parcel_agent'
      and exists (select 1 from charge_snapshots c where c.shipment_id = s.id and c.tax_ref = 'AGENT-RATE')
      and s.created_at >= ${start.toISOString()}::timestamptz and s.created_at < ${end.toISOString()}::timestamptz`;
}

type Raw = Record<string, unknown>;
const n = (v: unknown) => Math.round(Number(v ?? 0));

/** The figures for each scope, lane and weight band over the window ending `asOf`. */
export async function pricingStats(asOf: string): Promise<PriceRow[]> {
  const base = priced(asOf, WINDOW_DAYS);
  const agg = sql`count(*)::int as parcels,
    percentile_cont(0.5) within group (order by price) as median,
    percentile_cont(0.25) within group (order by price) as p25,
    percentile_cont(0.75) within group (order by price) as p75,
    min(price) as min, max(price) as max,
    avg(price::float / greatest(weight_g, 1000) * 1000) as per_kg, sum(price)::bigint as revenue`;
  const res = await db.execute(sql`
    with p as (select * from (${base}) x where x.price > 0)
    select 'global' as scope, 'all' as scope_id, 'All agents' as scope_name, lane_from, lane_to, weight_band, ${agg}
      from p group by lane_from, lane_to, weight_band
    union all
    select 'agent', agent_id, max(agent_name), lane_from, lane_to, weight_band, ${agg}
      from p group by agent_id, lane_from, lane_to, weight_band
    union all
    select 'company', company_id, max(company_name), lane_from, lane_to, weight_band, ${agg}
      from p where company_id is not null group by company_id, lane_from, lane_to, weight_band`);
  return (res as unknown as Raw[]).map((r) => ({
    scope: r.scope as Scope,
    scopeId: String(r.scope_id),
    scopeName: String(r.scope_name ?? ""),
    laneFrom: String(r.lane_from),
    laneTo: String(r.lane_to),
    weightBand: String(r.weight_band),
    parcels: n(r.parcels),
    median: n(r.median),
    p25: n(r.p25),
    p75: n(r.p75),
    min: n(r.min),
    max: n(r.max),
    avgPerKg: n(r.per_kg),
    revenue: n(r.revenue),
  }));
}

const key = (r: { laneFrom: string; laneTo: string; weightBand: string }) => `${r.laneFrom}→${r.laneTo}|${r.weightBand}`;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const tzs = (x: number) => `TZS ${x.toLocaleString("en-US")}`;

/** What's worth an admin's look in the window ending `asOf`. */
export async function pricingSignals(asOf: string, rows: PriceRow[]): Promise<Signal[]> {
  const out: Signal[] = [];

  // An agent well above or below the rest of the market (every other agent) for the same lane and weight.
  const others = await db.execute(sql`
    with p as (select * from (${priced(asOf, WINDOW_DAYS)}) x where x.price > 0),
    groups as (select distinct agent_id, lane_from, lane_to, weight_band from p)
    select g.agent_id, g.lane_from, g.lane_to, g.weight_band,
      (select percentile_cont(0.5) within group (order by o.price) from p o
        where o.agent_id <> g.agent_id and o.lane_from = g.lane_from and o.lane_to = g.lane_to and o.weight_band = g.weight_band) as market,
      (select count(*)::int from p o
        where o.agent_id <> g.agent_id and o.lane_from = g.lane_from and o.lane_to = g.lane_to and o.weight_band = g.weight_band) as n_market
    from groups g`);
  const rest = new Map((others as unknown as Raw[]).map((r) => [`${r.agent_id}|${r.lane_from}→${r.lane_to}|${r.weight_band}`, { median: n(r.market), parcels: n(r.n_market) }]));
  for (const r of rows.filter((x) => x.scope === "agent" && x.parcels >= MIN_PARCELS)) {
    const m = rest.get(`${r.scopeId}|${key(r)}`);
    if (!m || m.parcels < MIN_PARCELS || m.median <= 0) continue;
    const d = (r.median - m.median) / m.median;
    if (Math.abs(d) < OUTLIER) continue;
    const lane = `${r.laneFrom} → ${r.laneTo}`;
    out.push({
      kind: d > 0 ? "agent_above_market" : "agent_below_market",
      severity: Math.abs(d) >= 2 * OUTLIER ? "high" : "warn",
      scope: "agent",
      scopeId: r.scopeId,
      scopeName: r.scopeName,
      lane,
      weightBand: r.weightBand,
      message: `${r.scopeName} charges ${tzs(r.median)} for ${lane} (${r.weightBand} kg), ${pct(Math.abs(d))} ${d > 0 ? "above" : "below"} other agents' ${tzs(m.median)}.`,
      data: { median: r.median, market: m.median, deviation: Math.round(d * 1000) / 1000, parcels: r.parcels, marketParcels: m.parcels },
    });
  }

  // An agent's recent prices against the rest of the window, same lane and weight.
  const end = new Date(darDay(asOf).getTime() + 24 * 3600_000);
  const cut = new Date(end.getTime() - RECENT_DAYS * 24 * 3600_000);
  const jumps = await db.execute(sql`
    with p as (select * from (${priced(asOf, WINDOW_DAYS)}) x where x.price > 0)
    select agent_id, max(agent_name) as agent_name, lane_from, lane_to, weight_band,
      percentile_cont(0.5) within group (order by price) filter (where created_at >= ${cut.toISOString()}::timestamptz) as recent,
      percentile_cont(0.5) within group (order by price) filter (where created_at < ${cut.toISOString()}::timestamptz) as before,
      count(*) filter (where created_at >= ${cut.toISOString()}::timestamptz)::int as n_recent,
      count(*) filter (where created_at < ${cut.toISOString()}::timestamptz)::int as n_before
    from p group by agent_id, lane_from, lane_to, weight_band`);
  for (const r of jumps as unknown as Raw[]) {
    if (n(r.n_recent) < MIN_PARCELS || n(r.n_before) < MIN_PARCELS || !Number(r.before)) continue;
    const d = (Number(r.recent) - Number(r.before)) / Number(r.before);
    if (Math.abs(d) < JUMP) continue;
    const lane = `${r.lane_from} → ${r.lane_to}`;
    out.push({
      kind: "agent_price_jump",
      severity: Math.abs(d) >= 2 * JUMP ? "high" : "warn",
      scope: "agent",
      scopeId: String(r.agent_id),
      scopeName: String(r.agent_name),
      lane,
      weightBand: String(r.weight_band),
      message: `${r.agent_name}'s price for ${lane} (${r.weight_band} kg) ${d > 0 ? "rose" : "fell"} ${pct(Math.abs(d))} in the last ${RECENT_DAYS} days: ${tzs(n(r.before))} → ${tzs(n(r.recent))}.`,
      data: { before: n(r.before), recent: n(r.recent), change: Math.round(d * 1000) / 1000, parcels: { recent: n(r.n_recent), before: n(r.n_before) } },
    });
  }

  // Parcels an agent let go for nothing: a promotion, a favour, or money kept off the books.
  const zero = await db.execute(sql`
    with p as (${priced(asOf, WINDOW_DAYS)})
    select agent_id, max(agent_name) as agent_name, count(*) filter (where price = 0)::int as free, count(*)::int as total
    from p group by agent_id having count(*) filter (where price = 0) > 0`);
  for (const r of zero as unknown as Raw[]) {
    const share = n(r.free) / Math.max(1, n(r.total));
    out.push({
      kind: "zero_priced",
      severity: share >= 0.2 ? "high" : share >= 0.05 ? "warn" : "info",
      scope: "agent",
      scopeId: String(r.agent_id),
      scopeName: String(r.agent_name),
      lane: null,
      weightBand: null,
      message: `${r.agent_name} took ${n(r.free)} of ${n(r.total)} parcels for free in the last ${WINDOW_DAYS} days.`,
      data: { free: n(r.free), total: n(r.total), share: Math.round(share * 1000) / 1000 },
    });
  }

  // A company paying very different prices at different agents for the same lane and weight.
  const spread = await db.execute(sql`
    with p as (select * from (${priced(asOf, WINDOW_DAYS)}) x where x.price > 0 and x.company_id is not null),
    by_agent as (
      select company_id, max(company_name) as company_name, agent_id, lane_from, lane_to, weight_band,
        percentile_cont(0.5) within group (order by price) as median, count(*)::int as parcels
      from p group by company_id, agent_id, lane_from, lane_to, weight_band)
    select company_id, max(company_name) as company_name, lane_from, lane_to, weight_band,
      min(median) as low, max(median) as high, count(*)::int as agents
    from by_agent where parcels >= 2
    group by company_id, lane_from, lane_to, weight_band having count(*) > 1`);
  for (const r of spread as unknown as Raw[]) {
    const lo = Number(r.low);
    const hi = Number(r.high);
    if (!lo || hi / lo < SPREAD) continue;
    const lane = `${r.lane_from} → ${r.lane_to}`;
    out.push({
      kind: "company_price_spread",
      severity: hi / lo >= 2 * SPREAD ? "high" : "info",
      scope: "company",
      scopeId: String(r.company_id),
      scopeName: String(r.company_name),
      lane,
      weightBand: String(r.weight_band),
      message: `${r.company_name} pays from ${tzs(n(lo))} to ${tzs(n(hi))} for ${lane} (${r.weight_band} kg) across ${n(r.agents)} agents.`,
      data: { low: n(lo), high: n(hi), agents: n(r.agents) },
    });
  }
  return out;
}

/** The day's snapshot, as HuduBI ingests it. */
export async function pricingSnapshot(asOf = darToday()) {
  const rows = await pricingStats(asOf);
  const signals = await pricingSignals(asOf, rows);
  return { source: "tuma", kind: "parcel_pricing", version: 1, asOf, windowDays: WINDOW_DAYS, currency: "TZS", generatedAt: new Date().toISOString(), rows, signals };
}

/**
 * The background run: today's snapshot (replacing an earlier one of the same day) goes into the outbox for HuduBI,
 * then every pending HuduBI message is delivered. A failed delivery stays pending and is tried on the next run.
 */
export async function publishPricing(asOf = darToday()) {
  const snap = await pricingSnapshot(asOf);
  const idem = `hudubi:pricing:${asOf}`;
  await db.transaction(async (tx) => {
    // Re-running the same day sends the newer figures: replace the day's message if it hasn't gone yet.
    await tx.delete(outbox).where(and(eq(outbox.idempotencyKey, idem), eq(outbox.status, "pending")));
    await enqueue(tx, { target: "hudubi", topic: "tuma.pricing.snapshot", idempotencyKey: idem, payload: snap });
    // Already sent today: send the update under the same key (HuduBI upserts by day).
    await tx.update(outbox).set({ payload: snap, status: "pending", attempts: 0, lastError: null }).where(and(eq(outbox.idempotencyKey, idem), eq(outbox.status, "sent")));
  });
  const delivered = await flushHuduBI();
  return { asOf, rows: snap.rows.length, signals: snap.signals.length, ...delivered };
}

export async function flushHuduBI() {
  const pending = await db
    .select()
    .from(outbox)
    .where(and(eq(outbox.target, "hudubi"), inArray(outbox.status, ["pending", "failed"])))
    .orderBy(outbox.createdAt)
    .limit(20);
  let sent = 0;
  let failed = 0;
  for (const m of pending) {
    const r = await deliverToHuduBI(m.topic, m.idempotencyKey, m.payload);
    if (r.ok) {
      sent++;
      await db.update(outbox).set({ status: "sent", sentAt: new Date(), attempts: m.attempts + 1, lastError: null }).where(eq(outbox.id, m.id));
    } else {
      failed++;
      await db.update(outbox).set({ status: "failed", attempts: m.attempts + 1, lastError: r.error.slice(0, 500) }).where(eq(outbox.id, m.id));
    }
  }
  return { sent, failed };
}
