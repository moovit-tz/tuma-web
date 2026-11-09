import "server-only";
import { sql } from "drizzle-orm";
import { db } from "../../db/client";
import { DomainError } from "../shipments";
import { regionScope } from "./grants";
import type { CurrentUser } from "../../auth/current-user";

/**
 * Control tower: what's moving right now and what is about to go wrong. A parcel is "at risk" when it has sat in its
 * state for most of the time that state should take (or its promise is close), and "late" when it went over. The
 * hours per state are Tuma's working targets; a parcel's own promise, when it has one, wins.
 */
export const STATE_HOURS: Record<string, number> = {
  CREATED: 24,
  AWAITING_HANDOVER: 24,
  RECEIVED: 12,
  AT_HUB: 12,
  IN_TRANSIT: 48,
  OUT_FOR_DELIVERY: 8,
  ATTEMPT_FAILED: 24,
  READY_FOR_COLLECTION: 72,
  RETURNING: 72,
  BOOKED: 24,
  ALLOCATED: 24,
  LOADING: 12,
  AT_CHECKPOINT: 12,
  ARRIVED: 24,
  OFFLOADING: 12,
};
const LIVE = Object.keys(STATE_HOURS);
const RISK_SHARE = 0.75;
const ONLINE_MINUTES = 10;

const liveList = sql.raw(LIVE.map((s) => `'${s}'`).join(","));
const hoursCase = sql.raw(`case s.state ${LIVE.map((k) => `when '${k}' then ${STATE_HOURS[k]}`).join(" ")} else 24 end`);

type RiskRow = {
  id: string;
  waybill: string;
  state: string;
  region: string | null;
  since: string;
  promised_at: string | null;
  hours: number;
  age_h: number;
  exception: boolean;
  lat: number | null;
  lng: number | null;
  [k: string]: unknown;
};

export async function towerView(user: CurrentUser) {
  if (!user.permissions.has("tower.view")) throw new DomainError("FORBIDDEN", "You can't see the control tower.", 403);
  const now = new Date().toISOString();
  // Every live parcel, with when it entered its state, its target and its last known position.
  const live = sql`
    select s.id, s.waybill, s.state::text as state, s.exception, s.promised_at,
      coalesce(dl.region, s.consignee->'address'->>'region') as region,
      coalesce((select max(e.received_at) from events e where e.shipment_id = s.id and e.state_after = s.state), s.updated_at) as since,
      ${hoursCase} as hours,
      (select e.lat from events e where e.shipment_id = s.id and e.lat is not null order by e.occurred_at desc limit 1) as lat,
      (select e.lng from events e where e.shipment_id = s.id and e.lng is not null order by e.occurred_at desc limit 1) as lng
    from shipments s left join locations dl on dl.id = s.delivery_location_id
    where s.state::text in (${liveList})
      and ${regionScope(user, "tower.view", sql`coalesce(dl.region, s.consignee->'address'->>'region')`)}`;
  const [risk, kpis, regions, couriers] = await Promise.all([
    db.execute<RiskRow>(sql`
      with l as (${live})
      select l.*, extract(epoch from (${now}::timestamptz - l.since)) / 3600 as age_h from l
      where extract(epoch from (${now}::timestamptz - l.since)) / 3600 >= l.hours * ${sql.raw(String(RISK_SHARE))}
         or (l.promised_at is not null and l.promised_at < ${now}::timestamptz + interval '4 hours')
      order by (extract(epoch from (${now}::timestamptz - l.since)) / 3600) / l.hours desc
      limit 100`),
    db.execute<{ in_flight: number; late: number; at_risk: number; open_ex: number; overdue_ex: number; cash_held: number; cash_parcels: number; online: number; [k: string]: unknown }>(sql`
      with l as (${live}),
      a as (select extract(epoch from (${now}::timestamptz - since)) / 3600 as age_h, hours, promised_at from l)
      select
        (select count(*)::int from l) as in_flight,
        (select count(*)::int from a where age_h >= hours or (promised_at is not null and promised_at < ${now}::timestamptz)) as late,
        (select count(*)::int from a where age_h >= hours * ${sql.raw(String(RISK_SHARE))} and age_h < hours and (promised_at is null or promised_at >= ${now}::timestamptz)) as at_risk,
        (select count(*)::int from exceptions where status <> 'resolved') as open_ex,
        (select count(*)::int from exceptions where status <> 'resolved' and sla_due_at < ${now}::timestamptz) as overdue_ex,
        (select coalesce(sum(amount_collected + fee_collected), 0)::int from cod_records where status = 'collected') as cash_held,
        (select count(*)::int from cod_records where status = 'collected') as cash_parcels,
        (select count(*)::int from drivers where online and last_seen_at > ${now}::timestamptz - interval '${sql.raw(String(ONLINE_MINUTES))} minutes') as online`),
    db.execute<{ region: string | null; live: number; late: number; exceptions: number; [k: string]: unknown }>(sql`
      with l as (${live})
      select region, count(*)::int as live,
        count(*) filter (where extract(epoch from (${now}::timestamptz - since)) / 3600 >= hours or (promised_at is not null and promised_at < ${now}::timestamptz))::int as late,
        count(*) filter (where exception)::int as exceptions
      from l group by region order by count(*) desc limit 40`),
    db.execute<{ user_id: string; region: string; vehicle_kind: string; lat: number; lng: number; [k: string]: unknown }>(sql`
      select user_id, region, vehicle_kind, lat, lng from drivers
      where online and lat is not null and lng is not null and last_seen_at > ${now}::timestamptz - interval '${sql.raw(String(ONLINE_MINUTES))} minutes'
      limit 500`),
  ]);
  const k = kpis[0];
  return {
    kpis: {
      inFlight: k?.in_flight ?? 0,
      late: k?.late ?? 0,
      atRisk: k?.at_risk ?? 0,
      openExceptions: k?.open_ex ?? 0,
      overdueExceptions: k?.overdue_ex ?? 0,
      cashHeld: k?.cash_held ?? 0,
      cashParcels: k?.cash_parcels ?? 0,
      couriersOnline: k?.online ?? 0,
    },
    risk: [...risk].map((r) => {
      const age = Number(r.age_h);
      const promised = r.promised_at ? new Date(r.promised_at) : null;
      const late = age >= r.hours || (!!promised && promised.getTime() < Date.now());
      return {
        id: r.id,
        waybill: r.waybill,
        state: r.state,
        region: r.region,
        since: new Date(r.since).toISOString(),
        ageHours: Math.round(age * 10) / 10,
        targetHours: r.hours,
        promisedAt: promised?.toISOString() ?? null,
        level: late ? ("late" as const) : ("risk" as const),
        exception: r.exception,
        lat: r.lat == null ? null : Number(r.lat),
        lng: r.lng == null ? null : Number(r.lng),
      };
    }),
    regions: [...regions].map((r) => ({ region: r.region ?? "—", live: r.live, late: r.late, exceptions: r.exceptions })),
    couriers: [...couriers].map((c) => ({ id: c.user_id, region: c.region, vehicle: c.vehicle_kind, lat: Number(c.lat), lng: Number(c.lng) })),
  };
}
