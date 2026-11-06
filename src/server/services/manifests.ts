import "server-only";
import { and, asc, desc, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { accounts, branches, jobShipments, jobs, manifestItems, manifests, rolePermissions, roles, shipments, users } from "../db/schema";
import { audit } from "../audit";
import { ulid } from "../ids";
import type { CurrentUser } from "../auth/current-user";
import { DomainError, transition } from "./shipments";
import { smallestFor } from "./dispatch";
import { normaliseWaybill } from "@/domain/waybill-number";
import { canTransition, type ShipmentState } from "@/domain/states";
import { toE164TZ } from "@/domain/phone";
import { guidePayout, haversineM, pointFor } from "@/domain/drivers";

/**
 * Sending parcels on from an office (SRS 21.1 "prepare dispatch batches, hand cargo to drivers"): pick parcels in
 * hand, choose who carries them and where, and they're on their way under one manifest. A door run goes to the
 * receivers' doors with one of the office's couriers (out for delivery now) or a Tuma courier (a job in Tuma's pool;
 * the parcels move when the courier picks them up, and receivers can follow them live). A point run takes them to
 * another Tuma point with the office's own person or a transporter (a bus, lorry, boda); they're in transit until
 * that point offloads them against the manifest.
 */

const DOOR_FROM: readonly ShipmentState[] = ["RECEIVED", "AT_HUB", "ATTEMPT_FAILED"];
const POINT_FROM: readonly ShipmentState[] = ["RECEIVED", "AT_HUB"];

function businessOf(user: CurrentUser): string {
  if (!user.accountId) throw new DomainError("NO_BUSINESS", "Set up your business first.", 403);
  return user.accountId;
}

function canSend(user: CurrentUser) {
  if (!user.permissions.has("shipment.dispatch")) throw new DomainError("FORBIDDEN", "You can't send parcels on from this office.", 403);
}

/** The office this person sends from: their own, or the head office. */
async function hereOf(user: CurrentUser, acct: string) {
  const [b] = await db
    .select()
    .from(branches)
    .where(and(eq(branches.accountId, acct), eq(branches.active, true), user.branchId ? eq(branches.id, user.branchId) : eq(branches.isHead, true)));
  if (!b) throw new DomainError("NO_OFFICE", "Your office isn't set up yet.", 409);
  return b;
}

/** People of this business (at this office, or not tied to one) who may carry parcels out. */
async function couriersOf(acct: string, branchId: string | null) {
  return db
    .select({ id: users.id, name: users.name, phone: users.phone })
    .from(users)
    .where(
      and(
        eq(users.accountId, acct),
        eq(users.active, true),
        branchId ? or(eq(users.branchId, branchId), isNull(users.branchId)) : undefined,
        sql`exists (select 1 from jsonb_array_elements_text(${users.roles}) k join ${rolePermissions} rp on rp.role_key = k join ${roles} r on r.key = k and r.active where rp.permission = 'shipment.dispatch')`,
      ),
    )
    .orderBy(asc(users.name));
}

async function tumaPool() {
  const [a] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.type, "internal")).orderBy(asc(accounts.id)).limit(1);
  return a?.id ?? null;
}

/** Who can carry parcels out of this office. */
export async function dispatchOptions(user: CurrentUser) {
  const acct = businessOf(user);
  canSend(user);
  const here = await hereOf(user, acct);
  return {
    from: { id: here.id, name: here.name, region: here.region },
    couriers: (await couriersOf(acct, user.branchId ?? null)).map((c) => ({ ...c, you: c.id === user.id })),
    tumaCourier: !!(await tumaPool()),
  };
}

export const manifestSchema = z.object({
  waybills: z.array(z.string().trim().min(1)).min(1, "Choose the parcels to send").max(60, "Up to 60 parcels on one manifest"),
  mode: z.enum(["door", "point"]),
  /** The Tuma point a point run goes to; defaults to the parcels' collection point when they share one. */
  toBranchId: z.string().uuid().optional(),
  carrier: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("staff"), userId: z.string().min(1) }),
    z.object({ kind: z.literal("tuma") }),
    z.object({
      kind: z.literal("transporter"),
      name: z.string().trim().min(2, "Enter who carries them (the bus or transporter)").max(80),
      phone: z.string().trim().max(20).optional(),
      plate: z.string().trim().max(20).optional(),
      ref: z.string().trim().max(40).optional(),
    }),
  ]),
  note: z.string().trim().max(300).optional(),
});

export async function createManifest(user: CurrentUser, raw: unknown) {
  const acct = businessOf(user);
  canSend(user);
  const m = manifestSchema.parse(raw);
  // A Tuma courier and the office's own courier go to doors; a transporter or the office's own person to a point.
  if (m.carrier.kind === "tuma" && m.mode !== "door")
    throw new DomainError("BAD_CARRIER", "A Tuma courier takes parcels to the receivers' doors. Send them to a point with your own person or a transporter.");
  if (m.carrier.kind === "transporter" && m.mode !== "point") throw new DomainError("BAD_CARRIER", "To the door, send them with your own courier or a Tuma courier.");
  const here = await hereOf(user, acct);

  // The parcels: ours, in hand here, not already on their way with someone.
  const wanted = [...new Set(m.waybills.map((w) => normaliseWaybill(w).waybill))];
  const ours = or(eq(shipments.accountId, acct), eq(shipments.handlingPartnerId, acct))!;
  const rows = await db
    .select()
    .from(shipments)
    .where(and(inArray(shipments.waybill, wanted), ours, user.branchId ? or(eq(shipments.handlingBranchId, user.branchId), isNull(shipments.handlingBranchId)) : undefined));
  const byWb = new Map(rows.map((r) => [r.waybill, r]));
  const missing = wanted.filter((w) => !byWb.has(w));
  if (missing.length) throw new DomainError("NOT_FOUND", `We couldn't find ${missing.join(", ")} among this office's parcels.`, 404);
  const parcels = wanted.map((w) => byWb.get(w)!);
  const from = m.mode === "door" ? DOOR_FROM : POINT_FROM;
  const notHere = parcels.filter((p) => !from.includes(p.state));
  if (notHere.length) throw new DomainError("NOT_SENDABLE", `${notHere.map((p) => p.waybill).join(", ")} can't be sent on now (not in hand here).`, 409);
  const ids = parcels.map((p) => p.id);
  const busy = await db.execute(sql`
    select s.waybill from ${shipments} s
    where s.id in (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})
      and (exists (select 1 from ${manifestItems} mi join ${manifests} mf on mf.id = mi.manifest_id where mi.shipment_id = s.id and mf.status = 'on_the_way' and mi.arrived_at is null)
        or exists (select 1 from ${jobShipments} js join ${jobs} j on j.id = js.job_id where js.shipment_id = s.id and js.outcome = 'pending' and j.status in ('open','assigned','in_progress')))`);
  const onOne = (busy as unknown as { waybill: string }[]).map((r) => r.waybill);
  if (onOne.length) throw new DomainError("ON_MANIFEST", `${onOne.join(", ")} ${onOne.length === 1 ? "is" : "are"} already on their way with someone.`, 409);

  // Where to.
  let to: typeof branches.$inferSelect | null = null;
  if (m.mode === "door") {
    const notDoor = parcels.filter((p) => p.deliveryMode !== "door");
    if (notDoor.length) throw new DomainError("NOT_DOOR", `${notDoor.map((p) => p.waybill).join(", ")} ${notDoor.length === 1 ? "is" : "are"} for collection at a point, not the door.`);
  } else {
    const shared = [...new Set(parcels.map((p) => p.deliveryBranchId))];
    const toId = m.toBranchId ?? (shared.length === 1 ? shared[0] : null);
    if (!toId) throw new DomainError("DESTINATION_REQUIRED", "Choose the Tuma point they're going to.");
    const [b] = await db
      .select({ b: branches, kind: accounts.partnerKind })
      .from(branches)
      .innerJoin(accounts, eq(accounts.id, branches.accountId))
      .where(and(eq(branches.id, toId), eq(branches.active, true)));
    if (!b || (b.b.accountId !== acct && b.kind !== "parcel_agent")) throw new DomainError("BAD_DESTINATION", "That Tuma point isn't open.");
    if (b.b.id === here.id) throw new DomainError("SAME_OFFICE", "They're already at this office. Choose where they're going.");
    to = b.b;
  }

  // Who carries them.
  let carrier: (typeof manifests.$inferInsert)["carrier"];
  if (m.carrier.kind === "staff") {
    const c = (await couriersOf(acct, user.branchId ?? null)).find((x) => x.id === (m.carrier as { userId: string }).userId);
    if (!c) throw new DomainError("BAD_CARRIER", "Choose someone from your team who carries parcels.");
    carrier = { kind: "staff", userId: c.id, name: c.name ?? "", phone: c.phone ?? undefined };
  } else if (m.carrier.kind === "tuma") {
    carrier = { kind: "tuma", name: "Tuma courier" };
  } else {
    const phone = m.carrier.phone ? toE164TZ(m.carrier.phone) : undefined;
    if (m.carrier.phone && !phone) throw new DomainError("BAD_PHONE", "Enter a valid Tanzanian mobile number for the transporter.");
    carrier = { kind: "transporter", name: m.carrier.name, phone: phone ?? undefined, plate: m.carrier.plate?.toUpperCase() || undefined, ref: m.carrier.ref || undefined };
  }

  // Only what this person may do (a Tuma courier moves them when it picks them up).
  const next: ShipmentState | null = m.carrier.kind === "tuma" ? null : m.mode === "door" ? "OUT_FOR_DELIVERY" : "IN_TRANSIT";
  if (next) {
    const no = parcels.find((p) => !canTransition(p.state, next, user.permissions).ok);
    if (no) throw new DomainError("NOT_SENDABLE", `${no.waybill} can't be sent on now.`, 409);
  }

  const ref = `MAN-${ulid().slice(-8)}`;
  const pool = m.carrier.kind === "tuma" ? await tumaPool() : null;
  if (m.carrier.kind === "tuma" && !pool) throw new DomainError("NO_TUMA_COURIERS", "Tuma couriers aren't available yet. Send them with your own courier.", 409);

  const id = await db.transaction(async (tx) => {
    let jobId: string | null = null;
    if (pool) {
      // A courier run in Tuma's pool: from this office to each door, in the order chosen.
      const start = pointFor({ region: here.region, lat: here.lat ?? undefined, lng: here.lng ?? undefined });
      let km = 0;
      let at = start;
      for (const p of parcels) {
        const d = pointFor(p.consignee.address);
        km += (haversineM(at, d) * 1.3) / 1000;
        at = d;
      }
      const weightG = parcels.reduce((a, p) => a + p.chargeableWeightG, 0);
      const [biz] = await tx.select({ name: accounts.name }).from(accounts).where(eq(accounts.id, acct));
      const [job] = await tx
        .insert(jobs)
        .values({
          ref: `JOB-${ulid().slice(-8)}`,
          accountId: pool,
          kind: "parcel",
          region: here.region,
          pickup: {
            name: biz && biz.name !== here.name ? `${biz.name} · ${here.name}` : here.name,
            address: [here.address, here.district, here.region].filter(Boolean).join(", "),
            phone: here.phone ?? undefined,
            lat: start.lat,
            lng: start.lng,
          },
          weightG,
          payout: guidePayout(smallestFor("parcel", weightG / 1000), km),
          note: m.note || `Manifest ${ref}`,
          createdBy: user.id,
        })
        .returning({ id: jobs.id });
      await tx.insert(jobShipments).values(parcels.map((p, i) => ({ jobId: job.id, shipmentId: p.id, seq: i + 1 })));
      jobId = job.id;
    }
    const [mf] = await tx
      .insert(manifests)
      .values({ ref, accountId: acct, fromBranchId: here.id, mode: m.mode, toAccountId: to?.accountId ?? null, toBranchId: to?.id ?? null, carrier, jobId, note: m.note || null, createdBy: user.id })
      .returning({ id: manifests.id });
    await tx.insert(manifestItems).values(parcels.map((p, i) => ({ manifestId: mf.id, shipmentId: p.id, seq: i + 1 })));
    await audit(tx, { actorId: user.id, action: "manifest.create", entity: "manifest", entityId: ref, before: null, after: { waybills: wanted, mode: m.mode, to: to?.id ?? null, carrier: carrier.kind } });
    return mf.id;
  });

  if (next) {
    const note = m.mode === "door" ? `With ${carrier.name} (${ref})` : `To ${to!.name} with ${carrier.name} (${ref})`;
    for (const p of parcels) await transition(user, p.waybill, next, { source: "field_app", note, data: { manifest: ref } });
  }
  return manifestDetail(user, id);
}

/* ------------------------------------------------------------------ lists */

export const manifestListSchema = z.object({ dir: z.enum(["out", "in"]).default("out"), limit: z.coerce.number().int().min(1).max(100).default(30) });

/** Manifests this office sent (out) or that are coming to it (in), newest first. */
export async function listManifests(user: CurrentUser, raw: unknown) {
  const acct = businessOf(user);
  const f = manifestListSchema.parse(raw);
  const where: SQL =
    f.dir === "out"
      ? and(eq(manifests.accountId, acct), user.branchId ? eq(manifests.fromBranchId, user.branchId) : undefined)!
      : and(eq(manifests.toAccountId, acct), user.branchId ? eq(manifests.toBranchId, user.branchId) : undefined)!;
  const rows = await db
    .select({
      id: manifests.id,
      ref: manifests.ref,
      mode: manifests.mode,
      status: manifests.status,
      carrier: manifests.carrier,
      createdAt: manifests.createdAt,
      arrivedAt: manifests.arrivedAt,
      parcels: sql<number>`(select count(*)::int from ${manifestItems} mi where mi.manifest_id = ${manifests.id})`,
      arrived: sql<number>`(select count(*)::int from ${manifestItems} mi where mi.manifest_id = ${manifests.id} and mi.arrived_at is not null)`,
      fromName: sql<string | null>`(select b.name from ${branches} b where b.id = ${manifests.fromBranchId})`,
      toName: sql<string | null>`(select b.name from ${branches} b where b.id = ${manifests.toBranchId})`,
    })
    .from(manifests)
    .where(where)
    .orderBy(sql`case ${manifests.status} when 'on_the_way' then 0 else 1 end`, desc(manifests.createdAt))
    .limit(f.limit);
  return { manifests: rows.map((r) => ({ ...r, carrier: { kind: r.carrier.kind, name: r.carrier.name, plate: r.carrier.plate ?? null } })) };
}

/** One manifest, for the office that sent it or the point it's going to: the list to load, carry and check in. */
export async function manifestDetail(user: CurrentUser, id: string) {
  const acct = businessOf(user);
  if (!z.string().uuid().safeParse(id).success) throw new DomainError("NOT_FOUND", "We couldn't find that manifest.", 404);
  const [mf] = await db
    .select()
    .from(manifests)
    .where(and(eq(manifests.id, id), or(eq(manifests.accountId, acct), eq(manifests.toAccountId, acct))));
  if (!mf) throw new DomainError("NOT_FOUND", "We couldn't find that manifest.", 404);
  const [items, offices, biz, job] = await Promise.all([
    db
      .select({
        seq: manifestItems.seq,
        arrivedAt: manifestItems.arrivedAt,
        waybill: shipments.waybill,
        state: shipments.state,
        consignee: shipments.consignee,
        shipper: shipments.shipper,
        goods: shipments.goodsDescription,
        pieces: shipments.piecesCount,
        weightG: shipments.chargeableWeightG,
        deliveryMode: shipments.deliveryMode,
      })
      .from(manifestItems)
      .innerJoin(shipments, eq(shipments.id, manifestItems.shipmentId))
      .where(eq(manifestItems.manifestId, mf.id))
      .orderBy(asc(manifestItems.seq)),
    db
      .select({ id: branches.id, name: branches.name, code: branches.code, region: branches.region, district: branches.district, address: branches.address, phone: branches.phone })
      .from(branches)
      .where(inArray(branches.id, [mf.fromBranchId, mf.toBranchId].filter((x): x is string => !!x))),
    db.select({ id: accounts.id, name: accounts.name }).from(accounts).where(inArray(accounts.id, [mf.accountId, mf.toAccountId].filter((x): x is string => !!x))),
    mf.jobId ? db.select({ ref: jobs.ref, status: jobs.status, driverId: jobs.driverId }).from(jobs).where(eq(jobs.id, mf.jobId)) : Promise.resolve([]),
  ]);
  const office = (bid: string | null) => offices.find((o) => o.id === bid) ?? null;
  const name = (aid: string | null) => biz.find((b) => b.id === aid)?.name ?? null;
  const [creator] = await db.select({ name: users.name }).from(users).where(eq(users.id, mf.createdBy));
  return {
    id: mf.id,
    ref: mf.ref,
    mode: mf.mode as "door" | "point",
    status: mf.status,
    outgoing: mf.accountId === acct,
    from: { ...office(mf.fromBranchId), business: name(mf.accountId) },
    to: mf.toBranchId ? { ...office(mf.toBranchId), business: name(mf.toAccountId) } : null,
    carrier: mf.carrier,
    job: job[0] ? { ref: job[0].ref, status: job[0].status, assigned: !!job[0].driverId } : null,
    note: mf.note,
    createdBy: creator?.name ?? null,
    createdAt: mf.createdAt,
    arrivedAt: mf.arrivedAt,
    totals: {
      parcels: items.length,
      pieces: items.reduce((a, i) => a + i.pieces, 0),
      weightKg: Math.round(items.reduce((a, i) => a + i.weightG, 0) / 100) / 10,
      arrived: items.filter((i) => i.arrivedAt).length,
    },
    parcels: items.map((i) => ({
      seq: i.seq,
      waybill: i.waybill,
      state: i.state,
      to: { name: i.consignee.name, phone: i.consignee.phone, region: i.consignee.address.region, district: i.consignee.address.district },
      from: i.shipper.name,
      goods: i.goods,
      pieces: i.pieces,
      weightKg: i.weightG / 1000,
      deliveryMode: i.deliveryMode,
      arrived: !!i.arrivedAt,
    })),
  };
}
