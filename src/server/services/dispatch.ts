import "server-only";
import { and, asc, count, desc, eq, inArray, isNull, notInArray, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { accounts, branches, drivers, jobShipments, jobs, locations, shipments, users } from "../db/schema";
import { audit } from "../audit";
import { ulid } from "../ids";
import type { CurrentUser } from "../auth/current-user";
import { DomainError } from "./shipments";
import { toE164TZ } from "@/domain/phone";
import { TZ_REGIONS } from "@/domain/pricing";
import { VEHICLE_KEYS, VEHICLE_KINDS, addressLine, guidePayout, haversineM, pointFor, roleFor, vehicleAllowedIn, type JobKind, type VehicleKind } from "@/domain/drivers";

/**
 * Dispatch board and driver management for Tuma-X. Tuma staff (dispatch.manage / drivers.manage) run Tuma's own
 * pool; a partner (partner.dispatch.manage) runs its own drivers and jobs only.
 */

type Scope = { staff: true; fleet: string } | { staff: false; fleet: string };

async function scopeOf(user: CurrentUser, need: "dispatch" | "drivers"): Promise<Scope> {
  const staffPerm = need === "dispatch" ? "dispatch.manage" : "drivers.manage";
  if (user.permissions.has(staffPerm)) {
    const [a] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.type, "internal")).orderBy(asc(accounts.id)).limit(1);
    if (!a) throw new DomainError("NO_POOL", "No Tuma operations account is set up.", 500);
    return { staff: true, fleet: a.id };
  }
  if (user.permissions.has("partner.dispatch.manage") && user.accountId) return { staff: false, fleet: user.accountId };
  throw new DomainError("FORBIDDEN", "You don't have access to this.", 403);
}

export const canDispatch = (u: CurrentUser) => u.permissions.has("dispatch.manage") || u.permissions.has("partner.dispatch.manage");
export const canManageDrivers = (u: CurrentUser) => u.permissions.has("drivers.manage") || u.permissions.has("partner.dispatch.manage");

/* ------------------------------------------------------------- drivers */

export async function listDrivers(user: CurrentUser, status?: string) {
  const sc = await scopeOf(user, "drivers");
  const where: (SQL | undefined)[] = [sc.staff ? undefined : eq(drivers.accountId, sc.fleet)];
  if (status === "online") where.push(and(eq(drivers.online, true), eq(drivers.status, "approved")));
  else if (status) where.push(eq(drivers.status, status));
  const rows = await db
    .select({
      d: drivers,
      name: users.name,
      fleet: accounts.name,
      active: sql<number>`(select count(*)::int from ${jobs} j where j.driver_id = ${drivers.userId} and j.status in ('assigned','in_progress'))`,
      done: sql<number>`(select count(*)::int from ${jobs} j where j.driver_id = ${drivers.userId} and j.status = 'completed')`,
    })
    .from(drivers)
    .innerJoin(users, eq(users.id, drivers.userId))
    .leftJoin(accounts, eq(accounts.id, drivers.accountId))
    .where(and(...where))
    .orderBy(sql`case ${drivers.status} when 'pending' then 0 when 'approved' then 1 else 2 end`, desc(drivers.online), asc(users.name));
  return rows;
}

export async function driverCounts(user: CurrentUser) {
  const sc = await scopeOf(user, "drivers");
  const rows = await db
    .select({ status: drivers.status, online: drivers.online, n: count() })
    .from(drivers)
    .where(sc.staff ? undefined : eq(drivers.accountId, sc.fleet))
    .groupBy(drivers.status, drivers.online);
  const c = { all: 0, pending: 0, approved: 0, suspended: 0, online: 0 };
  for (const r of rows) {
    c.all += r.n;
    if (r.status in c) c[r.status as "pending"] += r.n;
    if (r.online && r.status === "approved") c.online += r.n;
  }
  return c;
}

async function driverInScope(user: CurrentUser, driverId: string) {
  const sc = await scopeOf(user, "drivers");
  const [d] = await db.select().from(drivers).where(and(eq(drivers.userId, driverId), sc.staff ? undefined : eq(drivers.accountId, sc.fleet)));
  if (!d) throw new DomainError("NOT_FOUND", "Driver not found.", 404);
  return d;
}

export async function setDriverStatus(user: CurrentUser, driverId: string, status: "approved" | "suspended") {
  const d = await driverInScope(user, driverId);
  if (status === "suspended") {
    const [busy] = await db.select({ ref: jobs.ref }).from(jobs).where(and(eq(jobs.driverId, d.userId), inArray(jobs.status, ["assigned", "in_progress"])));
    if (busy) throw new DomainError("JOB_ACTIVE", `The driver is on job ${busy.ref}. Cancel or finish it first.`, 409);
  }
  await db.transaction(async (tx) => {
    await tx.update(drivers).set({ status, reviewedBy: user.id, reviewedAt: new Date(), ...(status === "suspended" ? { online: false } : {}) }).where(eq(drivers.userId, d.userId));
    await audit(tx, { actorId: user.id, action: `driver.${status === "approved" ? "approve" : "suspend"}`, entity: "driver", entityId: d.userId, before: { status: d.status }, after: { status } });
  });
}

export const addDriverSchema = z.object({
  name: z.string().trim().min(3, "Enter the driver's full name").max(80),
  phone: z.string().trim().min(9, "Enter a mobile number"),
  region: z.enum(TZ_REGIONS, { message: "Choose a region" }),
  vehicleKind: z.enum(VEHICLE_KEYS as [VehicleKind, ...VehicleKind[]], { message: "Choose a vehicle" }),
  plate: z.string().trim().max(16).default(""),
});

/** Adds a driver to the fleet, already approved; they sign in to Tuma-X with this phone number. */
export async function addDriver(user: CurrentUser, input: z.output<typeof addDriverSchema>) {
  const sc = await scopeOf(user, "drivers");
  const phone = toE164TZ(input.phone);
  if (!phone) throw new DomainError("BAD_PHONE", "Enter a valid mobile number.");
  if (!vehicleAllowedIn(input.region, input.vehicleKind)) throw new DomainError("VEHICLE_NOT_ALLOWED", `A ${VEHICLE_KINDS[input.vehicleKind].label} can't work in ${input.region}.`);
  const [taken] = await db.select({ id: drivers.userId }).from(drivers).where(eq(drivers.phone, phone));
  if (taken) throw new DomainError("DUPLICATE", "A driver with this phone number is already registered.", 409);
  const id = `tumax|${phone}`;
  const plate = input.plate.toUpperCase().replace(/\s+/g, " ");
  await db.transaction(async (tx) => {
    await tx
      .insert(users)
      .values({ id, name: input.name, phone, roles: [roleFor(input.vehicleKind)], locale: "sw", accountId: sc.staff ? null : sc.fleet })
      .onConflictDoUpdate({ target: users.id, set: { name: input.name, roles: [roleFor(input.vehicleKind)] } });
    await tx.insert(drivers).values({ userId: id, accountId: sc.fleet, phone, region: input.region, vehicleKind: input.vehicleKind, plate, status: "approved", profile: { fullName: input.name, addedBy: user.id }, reviewedBy: user.id, reviewedAt: new Date() });
    await audit(tx, { actorId: user.id, action: "driver.add", entity: "driver", entityId: id, before: null, after: { region: input.region, vehicleKind: input.vehicleKind, plate, fleet: sc.fleet } });
  });
  return id;
}

/* ---------------------------------------------------------------- jobs */

export type JobTab = "open" | "active" | "done" | "all";

export async function listJobs(user: CurrentUser, tab: JobTab) {
  const sc = await scopeOf(user, "dispatch");
  const status = tab === "open" ? ["open"] : tab === "active" ? ["assigned", "in_progress"] : tab === "done" ? ["completed", "cancelled"] : null;
  return db
    .select({
      j: jobs,
      driver: users.name,
      driverPhone: drivers.phone,
      stops: sql<number>`(select count(*)::int from ${jobShipments} js where js.job_id = ${jobs.id})`,
      delivered: sql<number>`(select count(*)::int from ${jobShipments} js where js.job_id = ${jobs.id} and js.outcome = 'delivered')`,
      failed: sql<number>`(select count(*)::int from ${jobShipments} js where js.job_id = ${jobs.id} and js.outcome = 'failed')`,
      waybills: sql<string[]>`(select coalesce(array_agg(s.waybill order by js.seq), '{}') from ${jobShipments} js join ${shipments} s on s.id = js.shipment_id where js.job_id = ${jobs.id})`,
    })
    .from(jobs)
    .leftJoin(users, eq(users.id, jobs.driverId))
    .leftJoin(drivers, eq(drivers.userId, jobs.driverId))
    .where(and(eq(jobs.accountId, sc.fleet), status ? inArray(jobs.status, status) : undefined))
    .orderBy(desc(jobs.createdAt))
    .limit(200);
}

export async function jobCounts(user: CurrentUser) {
  const sc = await scopeOf(user, "dispatch");
  const rows = await db.select({ status: jobs.status, n: count() }).from(jobs).where(eq(jobs.accountId, sc.fleet)).groupBy(jobs.status);
  const by = Object.fromEntries(rows.map((r) => [r.status, r.n])) as Record<string, number>;
  return { open: by.open ?? 0, active: (by.assigned ?? 0) + (by.in_progress ?? 0), done: (by.completed ?? 0) + (by.cancelled ?? 0), all: rows.reduce((a, r) => a + r.n, 0) };
}

const READY = ["CREATED", "AWAITING_HANDOVER", "RECEIVED", "AT_HUB", "ATTEMPT_FAILED"] as const;

/** Waybills that can go on a new job: not delivered or closed, and not already on an open or running job. */
export async function dispatchable(user: CurrentUser) {
  const sc = await scopeOf(user, "dispatch");
  const onJob = db
    .select({ id: jobShipments.shipmentId })
    .from(jobShipments)
    .innerJoin(jobs, eq(jobs.id, jobShipments.jobId))
    .where(and(inArray(jobs.status, ["open", "assigned", "in_progress"]), eq(jobShipments.outcome, "pending")));
  return db
    .select({ waybill: shipments.waybill, state: shipments.state, consignee: shipments.consignee, shipper: shipments.shipper, weightG: shipments.chargeableWeightG, pieces: shipments.piecesCount, codAmount: shipments.codAmount })
    .from(shipments)
    .where(and(inArray(shipments.state, [...READY]), sc.staff ? isNull(shipments.handlingPartnerId) : eq(shipments.handlingPartnerId, sc.fleet), notInArray(shipments.id, onJob)))
    .orderBy(asc(shipments.createdAt))
    .limit(200);
}

/** Where a job can start: Tuma hubs and wakala points (staff), or the partner's branches. */
export async function pickupPoints(user: CurrentUser) {
  const sc = await scopeOf(user, "dispatch");
  if (sc.staff) {
    const rows = await db.select().from(locations).where(eq(locations.active, true)).orderBy(asc(locations.name));
    return rows.map((l) => ({ id: `loc:${l.id}`, label: l.name, region: l.region }));
  }
  const rows = await db.select().from(branches).where(and(eq(branches.accountId, sc.fleet), eq(branches.active, true))).orderBy(desc(branches.isHead), asc(branches.name));
  return rows.map((b) => ({ id: `br:${b.id}`, label: `${b.code} · ${b.name}`, region: b.region ?? "" }));
}

export const createJobSchema = z.object({
  waybills: z.array(z.string()).min(1, "Choose at least one waybill").max(40),
  kind: z.enum(["parcel", "cargo"]),
  /** loc:<id> | br:<uuid> | sender */
  pickup: z.string().min(1),
  requiredVehicle: z.union([z.enum(VEHICLE_KEYS as [VehicleKind, ...VehicleKind[]]), z.literal("")]).default(""),
  payout: z.coerce.number().int().min(0).max(50_000_000).optional(),
  note: z.string().trim().max(300).optional(),
});

/** Default vehicle for a load: the smallest one of the right kind it fits. */
export function smallestFor(kind: JobKind, kg: number): VehicleKind {
  const fits = (Object.keys(VEHICLE_KINDS) as VehicleKind[]).filter((v) => VEHICLE_KINDS[v].jobKind === kind && VEHICLE_KINDS[v].capacityKg >= kg);
  return fits[0] ?? (kind === "parcel" ? "van" : "trailer");
}

export async function createJob(user: CurrentUser, raw: z.input<typeof createJobSchema>) {
  const input = createJobSchema.parse(raw);
  const sc = await scopeOf(user, "dispatch");
  const ready = await dispatchable(user);
  const wanted = [...new Set(input.waybills)];
  const missing = wanted.filter((w) => !ready.some((r) => r.waybill === w));
  if (missing.length) throw new DomainError("NOT_DISPATCHABLE", `${missing.join(", ")} can't go on a job (delivered, closed or already on one).`, 409);
  const rows = await db.select().from(shipments).where(inArray(shipments.waybill, wanted));
  const byWb = new Map(rows.map((r) => [r.waybill, r]));
  const ordered = wanted.map((w) => byWb.get(w)!);

  // Pickup point
  let pickup: { name: string; address: string; phone?: string; lat: number; lng: number; region: string };
  if (input.pickup.startsWith("loc:") && sc.staff) {
    const [l] = await db.select().from(locations).where(eq(locations.id, input.pickup.slice(4)));
    if (!l) throw new DomainError("BAD_PICKUP", "Choose where the driver picks up.");
    const p = pointFor({ region: l.region, lat: l.lat ?? undefined, lng: l.lng ?? undefined });
    pickup = { name: l.name, address: [l.street, l.ward, l.district, l.region].filter(Boolean).join(", ") + (l.landmark ? ` (${l.landmark})` : ""), phone: l.phone ?? undefined, lat: p.lat, lng: p.lng, region: l.region };
  } else if (input.pickup.startsWith("br:") && !sc.staff) {
    const [b] = await db.select().from(branches).where(and(eq(branches.accountId, sc.fleet), eq(branches.id, input.pickup.slice(3))));
    if (!b || !b.region) throw new DomainError("BAD_PICKUP", "Choose where the driver picks up.");
    const p = pointFor({ region: b.region });
    pickup = { name: b.name, address: [b.address, b.district, b.region].filter(Boolean).join(", "), phone: b.phone ?? undefined, lat: p.lat, lng: p.lng, region: b.region };
  } else if (input.pickup === "sender") {
    const s = ordered[0];
    const p = pointFor(s.shipper.address);
    pickup = { name: s.shipper.name, address: addressLine(s.shipper.address), phone: s.shipper.phone, lat: p.lat, lng: p.lng, region: s.shipper.address.region };
  } else {
    throw new DomainError("BAD_PICKUP", "Choose where the driver picks up.");
  }

  const weightG = ordered.reduce((a, s) => a + s.chargeableWeightG, 0);
  const kg = weightG / 1000;
  const vehicle = input.requiredVehicle || smallestFor(input.kind, kg);
  if (VEHICLE_KINDS[vehicle].jobKind !== input.kind) throw new DomainError("BAD_VEHICLE", `A ${VEHICLE_KINDS[vehicle].label} doesn't do ${input.kind === "parcel" ? "courier" : "truck"} runs.`);
  if (kg > VEHICLE_KINDS[vehicle].capacityKg) throw new DomainError("TOO_HEAVY", `${Math.round(kg)} kg is more than a ${VEHICLE_KINDS[vehicle].label} carries.`);
  if (!vehicleAllowedIn(pickup.region, vehicle)) throw new DomainError("VEHICLE_NOT_ALLOWED", `A ${VEHICLE_KINDS[vehicle].label} can't work in ${pickup.region}.`);

  // Guide payout: pickup → each drop in order, straight line × 1.3 for roads.
  let km = 0;
  let from = { lat: pickup.lat, lng: pickup.lng };
  for (const s of ordered) {
    const to = pointFor(s.consignee.address);
    km += (haversineM(from, to) * 1.3) / 1000;
    from = to;
  }
  const payout = input.payout ?? guidePayout(vehicle, km);
  const ref = `JOB-${ulid().slice(-8)}`;
  const slaAt = ordered.map((s) => s.promisedAt).filter((d): d is Date => !!d).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

  const [job] = await db.transaction(async (tx) => {
    const created = await tx
      .insert(jobs)
      .values({
        ref,
        accountId: sc.fleet,
        kind: input.kind,
        region: pickup.region,
        requiredVehicle: input.requiredVehicle || null,
        pickup: { name: pickup.name, address: pickup.address, phone: pickup.phone, lat: pickup.lat, lng: pickup.lng },
        weightG,
        payout,
        slaAt,
        note: input.note || null,
        createdBy: user.id,
      })
      .returning();
    await tx.insert(jobShipments).values(ordered.map((s, i) => ({ jobId: created[0].id, shipmentId: s.id, seq: i + 1 })));
    await audit(tx, { actorId: user.id, action: "job.create", entity: "job", entityId: ref, before: null, after: { waybills: wanted, kind: input.kind, region: pickup.region, payout, vehicle: input.requiredVehicle || null } });
    return created;
  });
  return { id: job.id, ref, payout, km: Math.round(km), vehicle };
}

/** Cancels a job that hasn't been picked up. Its waybills go back to the dispatchable list. */
export async function cancelJob(user: CurrentUser, jobId: string, reason: string) {
  const sc = await scopeOf(user, "dispatch");
  const [j] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.accountId, sc.fleet)));
  if (!j) throw new DomainError("NOT_FOUND", "Job not found.", 404);
  if (j.status === "in_progress") throw new DomainError("JOB_RUNNING", "The driver has already picked up. Ask them to hand the job back in the app.", 409);
  if (j.status !== "open" && j.status !== "assigned") throw new DomainError("JOB_CLOSED", "This job is already closed.", 409);
  await db.transaction(async (tx) => {
    await tx.update(jobs).set({ status: "cancelled", cancelReason: reason, completedAt: new Date() }).where(eq(jobs.id, j.id));
    await tx.delete(jobShipments).where(eq(jobShipments.jobId, j.id));
    await audit(tx, { actorId: user.id, action: "job.cancel", entity: "job", entityId: j.ref, before: { status: j.status }, after: { status: "cancelled", reason } });
  });
}
