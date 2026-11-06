import "server-only";
import { createHash } from "node:crypto";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { db } from "../db/client";
import { drivers, jobShipments, jobs, shipments } from "../db/schema";

/**
 * Real-time tracking for parcels a Tuma courier is carrying: where the courier is, what they're doing and, once
 * they're heading to the receiver, a rough ETA. Published two ways: in the tracking response (the app's live map)
 * and as GTFS-Realtime VehiclePositions (one feed per parcel, and the whole fleet for dispatch), so maps and
 * partner systems that speak GTFS-RT can follow parcels too. A job is a trip; each parcel on it is a stop.
 */

const ACTIVE = ["assigned", "in_progress"];

/** Older than this, the position is shown as last seen rather than live. */
const STALE_MS = 5 * 60_000;

/** Typical city speed per Tuma-X vehicle (km/h), for the ETA. Roads aren't straight: distance × 1.35. */
const SPEED: Record<string, number> = { boda: 25, bajaji: 20, van: 28, pickup: 30, lorry: 35, trailer: 35 };

/** What the courier is doing, from the driver app's phase. */
export type LiveStage = "to_pickup" | "at_pickup" | "on_the_way" | "arriving";

export type Live = {
  job: string;
  stage: LiveStage;
  vehicle: string;
  position: { lat: number; lng: number; at: string; exact: boolean };
  stale: boolean;
  /** Minutes to the receiver, when the courier is heading there and both ends are known. */
  etaMin: number | null;
  destination: { lat: number; lng: number } | null;
};

const stageOf = (phase: string | null): LiveStage =>
  phase === "toPickup" ? "to_pickup" : phase === "atPickup" ? "at_pickup" : phase === "atDropoff" || phase === "arrived" ? "arriving" : "on_the_way";

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** ~1 km: enough to see the parcel moving without pinpointing the courier for someone who only has the number. */
const coarse = (v: number) => Math.round(v * 100) / 100;

type Row = {
  shipmentId: string;
  waybill: string;
  consignee: (typeof shipments.$inferSelect)["consignee"];
  jobRef: string;
  phase: string | null;
  driverId: string;
  vehicleKind: string;
  lat: number | null;
  lng: number | null;
  lastSeenAt: Date | null;
};

async function activeRows(filter: { shipmentId?: string; fleet?: string }): Promise<Row[]> {
  return db
    .select({
      shipmentId: shipments.id,
      waybill: shipments.waybill,
      consignee: shipments.consignee,
      jobRef: jobs.ref,
      phase: jobs.phase,
      driverId: drivers.userId,
      vehicleKind: drivers.vehicleKind,
      lat: drivers.lat,
      lng: drivers.lng,
      lastSeenAt: drivers.lastSeenAt,
    })
    .from(jobShipments)
    .innerJoin(jobs, eq(jobs.id, jobShipments.jobId))
    .innerJoin(drivers, eq(drivers.userId, jobs.driverId))
    .innerJoin(shipments, eq(shipments.id, jobShipments.shipmentId))
    .where(
      and(
        inArray(jobs.status, ACTIVE),
        eq(jobShipments.outcome, "pending"),
        isNotNull(drivers.lat),
        filter.shipmentId ? eq(jobShipments.shipmentId, filter.shipmentId) : undefined,
        filter.fleet ? eq(jobs.accountId, filter.fleet) : undefined,
      ),
    )
    .orderBy(desc(jobs.acceptedAt));
}

function toLive(r: Row, exact: boolean): Live {
  const at = r.lastSeenAt ?? new Date(0);
  const stage = stageOf(r.phase);
  const here = { lat: r.lat!, lng: r.lng! };
  const dest = r.consignee.address.lat != null && r.consignee.address.lng != null ? { lat: r.consignee.address.lat, lng: r.consignee.address.lng } : null;
  const heading = stage === "on_the_way" || stage === "arriving";
  const eta = heading && dest ? Math.max(1, Math.round(((km(here, dest) * 1.35) / (SPEED[r.vehicleKind] ?? 25)) * 60)) : null;
  return {
    job: r.jobRef,
    stage,
    vehicle: r.vehicleKind,
    position: { lat: exact ? here.lat : coarse(here.lat), lng: exact ? here.lng : coarse(here.lng), at: at.toISOString(), exact },
    stale: Date.now() - at.getTime() > STALE_MS,
    etaMin: eta,
    destination: exact ? dest : null,
  };
}

/** The courier carrying this parcel right now, or null when no Tuma courier has it. Exact only when verified. */
export async function liveFor(shipmentId: string, exact: boolean): Promise<Live | null> {
  const [r] = await activeRows({ shipmentId });
  return r ? toLive(r, exact) : null;
}

/* -------------------------------------------------------------- GTFS-Realtime */

const rt = GtfsRealtimeBindings.transit_realtime;

/** A stable id for the courier's vehicle that doesn't reveal who they are. */
const vehicleId = (driverId: string) => `v-${createHash("sha256").update(`tuma-veh:${driverId}`).digest("hex").slice(0, 12)}`;

const STATUS: Record<LiveStage, number> = {
  to_pickup: rt.VehiclePosition.VehicleStopStatus.IN_TRANSIT_TO,
  at_pickup: rt.VehiclePosition.VehicleStopStatus.STOPPED_AT,
  on_the_way: rt.VehiclePosition.VehicleStopStatus.IN_TRANSIT_TO,
  arriving: rt.VehiclePosition.VehicleStopStatus.INCOMING_AT,
};

function feed(rows: Row[], exact: boolean) {
  const entity = rows.map((r) => {
    const l = toLive(r, exact);
    return {
      id: `${r.jobRef}:${r.waybill}`,
      vehicle: {
        trip: { tripId: r.jobRef, scheduleRelationship: rt.TripDescriptor.ScheduleRelationship.UNSCHEDULED },
        vehicle: { id: vehicleId(r.driverId), label: r.vehicleKind },
        position: { latitude: l.position.lat, longitude: l.position.lng },
        currentStatus: STATUS[l.stage],
        // The parcel is the stop the courier is heading to.
        stopId: r.waybill,
        timestamp: Math.floor(new Date(l.position.at).getTime() / 1000),
      },
    };
  });
  return rt.FeedMessage.fromObject({
    header: { gtfsRealtimeVersion: "2.0", incrementality: rt.FeedHeader.Incrementality.FULL_DATASET, timestamp: Math.floor(Date.now() / 1000) },
    entity,
  });
}

/** GTFS-RT VehiclePositions for one parcel (coarse unless verified) or a fleet (exact, for dispatch). */
export async function gtfsFeed(f: { shipmentId: string; exact: boolean } | { fleet: string }) {
  const rows = "fleet" in f ? await activeRows({ fleet: f.fleet }) : await activeRows({ shipmentId: f.shipmentId });
  return feed(rows, "fleet" in f ? true : f.exact);
}

/** The feed as protobuf (the GTFS-RT wire format) or its JSON form, by what the caller asked for. */
export function encodeFeed(msg: ReturnType<typeof feed>, wantsJson: boolean): { body: Uint8Array | string; type: string } {
  if (wantsJson) return { body: JSON.stringify(rt.FeedMessage.toObject(msg, { enums: String, longs: Number })), type: "application/json" };
  return { body: rt.FeedMessage.encode(msg).finish(), type: "application/x-protobuf" };
}
