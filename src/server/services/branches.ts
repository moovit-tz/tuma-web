import "server-only";
import { and, asc, count, eq, isNull, notInArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { TZ_REGIONS } from "@/domain/pricing";
import { toE164 } from "@/domain/phone";
import { BLOC_CODES } from "@/domain/bloc";
import { db } from "../db/client";
import { branches, shipments, users, vehicles } from "../db/schema";
import { audit } from "../audit";
import { DomainError } from "./shipments";
import type { CurrentUser } from "../auth/current-user";

/**
 * Company branches. A person tied to a branch (users.branch_id) only ever sees that branch; everyone else sees the
 * whole company and may narrow a view to one branch.
 */

/**
 * The branch a query should be limited to: the user's own branch when they're tied to one (whatever was asked),
 * otherwise the requested branch if it belongs to their company, otherwise null (whole company).
 */
export async function effectiveBranch(user: CurrentUser, requested?: string | null): Promise<string | null> {
  if (user.branchId) return user.branchId;
  if (!requested || !user.accountId || !z.uuid().safeParse(requested).success) return null;
  const [b] = await db.select({ id: branches.id }).from(branches).where(and(eq(branches.id, requested), eq(branches.accountId, user.accountId)));
  return b?.id ?? null;
}

/** Branches the user can pick from: their own only when tied to one, else the company's active branches. */
export async function branchOptions(user: CurrentUser) {
  if (!user.accountId) return [];
  return db
    .select({ id: branches.id, name: branches.name, code: branches.code })
    .from(branches)
    .where(and(eq(branches.accountId, user.accountId), eq(branches.active, true), user.branchId ? eq(branches.id, user.branchId) : undefined))
    .orderBy(sql`${branches.isHead} desc`, asc(branches.name));
}

const OPEN = ["DELIVERED", "RETURNED", "CANCELLED", "CLOSED"] as const;

/** Every branch of the company with its live figures. */
export async function listBranches(user: CurrentUser) {
  if (!(user.permissions.has("partner.cargo.read") || user.permissions.has("partner.branches.manage")) || !user.accountId) throw new DomainError("FORBIDDEN", "You don't have access to this.", 403);
  const acc = user.accountId;
  const cargo = db
    .select({ branchId: shipments.handlingBranchId, n: count().as("cargo_n") })
    .from(shipments)
    .where(and(eq(shipments.handlingPartnerId, acc), notInArray(shipments.state, [...OPEN])))
    .groupBy(shipments.handlingBranchId)
    .as("cargo");
  const fleet = db.select({ branchId: vehicles.branchId, n: count().as("fleet_n") }).from(vehicles).where(eq(vehicles.accountId, acc)).groupBy(vehicles.branchId).as("fleet");
  const staff = db.select({ branchId: users.branchId, n: count().as("staff_n") }).from(users).where(and(eq(users.accountId, acc), eq(users.active, true))).groupBy(users.branchId).as("staff");
  const rows = await db
    .select({ b: branches, openCargo: sql<number>`coalesce(${cargo.n}, 0)`, vehicles: sql<number>`coalesce(${fleet.n}, 0)`, staff: sql<number>`coalesce(${staff.n}, 0)` })
    .from(branches)
    .leftJoin(cargo, eq(cargo.branchId, branches.id))
    .leftJoin(fleet, eq(fleet.branchId, branches.id))
    .leftJoin(staff, eq(staff.branchId, branches.id))
    .where(and(eq(branches.accountId, acc), user.branchId ? eq(branches.id, user.branchId) : undefined))
    .orderBy(sql`${branches.isHead} desc`, asc(branches.name));
  // People not tied to an office (the owner, usually) work from the head office, so they count there.
  const [loose] = await db
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.accountId, acc), eq(users.active, true), isNull(users.branchId)));
  return rows.map((r) => (r.b.isHead ? { ...r, staff: Number(r.staff) + (loose?.n ?? 0) } : { ...r, staff: Number(r.staff) }));
}

export const branchSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Enter the branch name").max(80),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,6}$/, "2–6 letters or digits, e.g. ARK"),
  region: z.string().trim().min(2, "Enter the region").max(60),
  district: z.string().trim().max(60).optional().transform((v) => v || null),
  address: z.string().trim().max(160).optional().transform((v) => v || null),
  phone: z.string().trim().max(20).optional().transform((v) => v || null),
  active: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((v) => v === undefined || v === true || v === "true"),
});

export async function saveBranch(user: CurrentUser, input: z.output<typeof branchSchema>) {
  if (!user.permissions.has("partner.branches.manage") || !user.accountId) throw new DomainError("FORBIDDEN", "You cannot manage branches.", 403);
  const acc = user.accountId;
  const { id, ...data } = input;
  await db.transaction(async (tx) => {
    const [dup] = await tx.select({ id: branches.id }).from(branches).where(and(eq(branches.accountId, acc), eq(branches.code, data.code)));
    if (dup && dup.id !== id) throw new DomainError("DUPLICATE", `Another branch already uses the code ${data.code}.`, 409);
    if (id) {
      const [before] = await tx.select().from(branches).where(and(eq(branches.id, id), eq(branches.accountId, acc)));
      if (!before) throw new DomainError("NOT_FOUND", "Branch not found.", 404);
      if (!data.active && before.active) {
        const [{ n }] = await tx.select({ n: count() }).from(shipments).where(and(eq(shipments.handlingBranchId, id), notInArray(shipments.state, [...OPEN])));
        if (n > 0) throw new DomainError("BRANCH_BUSY", `This branch still handles ${n} open shipments. Move them first.`, 409);
      }
      await tx.update(branches).set(data).where(eq(branches.id, id));
      await audit(tx, { actorId: user.id, action: "branch.update", entity: "branch", entityId: id, before, after: data });
    } else {
      const [b] = await tx.insert(branches).values({ ...data, accountId: acc }).returning({ id: branches.id });
      await audit(tx, { actorId: user.id, action: "branch.create", entity: "branch", entityId: b.id, after: data });
    }
  });
}

/* ------------------------------------------------------------ offices from the Tuma app */

/** The company's offices for the app: head office first. */
export async function listOffices(user: CurrentUser) {
  const rows = await listBranches(user);
  return rows.map(({ b, staff }) => ({ id: b.id, name: b.name, code: b.code, country: b.country, region: b.region, district: b.district, address: b.address, lat: b.lat, lng: b.lng, phone: b.phone, isHead: b.isHead, active: b.active, staff }));
}

const PIN_MSG = "Pin the office on the map: customers drop off and collect parcels there.";

/**
 * An office from the app. Its place is pinned on the map; the country, region and district come from that pin
 * (a Tanzanian office's region must be one of Tanzania's). Offices are in SADC/EAC countries only.
 */
export const officeSchema = z
  .object({
    name: z.string().trim().min(2, "Enter the office name").max(80),
    country: z
      .string()
      .trim()
      .toUpperCase()
      .default("TZ")
      .refine((c) => BLOC_CODES.has(c), "Tuma works in SADC and EAC countries for now."),
    region: z.string().trim().min(2, "Choose a region").max(60),
    district: z.string().trim().min(2, "Choose a district").max(60),
    address: z.string().trim().min(2, "Enter the street or landmark").max(160),
    // Required: an agent's offices are Tuma's drop-off and collection points, found by customers on the map.
    lat: z.coerce.number({ message: PIN_MSG }).min(-35.5, PIN_MSG).max(13, PIN_MSG),
    lng: z.coerce.number({ message: PIN_MSG }).min(11, PIN_MSG).max(64, PIN_MSG),
    phone: z
      .string()
      .trim()
      .optional()
      .transform((v, c) => (!v ? null : (toE164(v) ?? (c.addIssue({ code: "custom", message: "Enter a mobile number from an SADC or EAC country." }), z.NEVER)))),
  })
  .refine((o) => o.country !== "TZ" || (TZ_REGIONS as readonly string[]).includes(o.region), { path: ["region"], message: "Choose a region" });

/** Adds an office; its short code is made from the name (ARK, ARK2, …). */
export async function addOffice(user: CurrentUser, raw: unknown) {
  if (!user.permissions.has("partner.branches.manage") || !user.accountId) throw new DomainError("FORBIDDEN", "You cannot add offices.", 403);
  const input = officeSchema.parse(raw);
  const acc = user.accountId;
  const base = (input.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3) || "OFC").padEnd(3, "X");
  return db.transaction(async (tx) => {
    const taken = new Set((await tx.select({ code: branches.code }).from(branches).where(eq(branches.accountId, acc))).map((r) => r.code));
    let code = base;
    for (let i = 2; taken.has(code); i++) code = `${base}${i}`.slice(0, 6);
    const [b] = await tx.insert(branches).values({ accountId: acc, code, ...input }).returning();
    await audit(tx, { actorId: user.id, action: "branch.create", entity: "branch", entityId: b.id, after: { ...input, code } });
    return { id: b.id, name: b.name, code: b.code, country: b.country, region: b.region, district: b.district, address: b.address, lat: b.lat, lng: b.lng, phone: b.phone, isHead: b.isHead, active: b.active, staff: 0 };
  });
}

/** Changes an office: its name, place (pin, region, district, street) or phone. The code stays the same. */
export async function updateOffice(user: CurrentUser, id: string, raw: unknown) {
  if (!user.permissions.has("partner.branches.manage") || !user.accountId) throw new DomainError("FORBIDDEN", "You cannot change offices.", 403);
  const input = officeSchema.parse(raw);
  const acc = user.accountId;
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(branches).where(and(eq(branches.id, id), eq(branches.accountId, acc))).for("update");
    if (!before) throw new DomainError("NOT_FOUND", "That office isn't one of yours.", 404);
    const [b] = await tx.update(branches).set(input).where(eq(branches.id, id)).returning();
    await audit(tx, {
      actorId: user.id,
      action: "branch.update",
      entity: "branch",
      entityId: id,
      before: { name: before.name, region: before.region, district: before.district, address: before.address, lat: before.lat, lng: before.lng, phone: before.phone },
      after: input,
    });
    return { id: b.id, name: b.name, code: b.code, country: b.country, region: b.region, district: b.district, address: b.address, lat: b.lat, lng: b.lng, phone: b.phone, isHead: b.isHead, active: b.active };
  });
}

/**
 * One office in the app: its details and how it's doing. Parcels in hand now (by stage), parcels waiting to be
 * collected here, the last 30 days' parcels, takings and handovers, the last 7 days day by day, and who works there.
 * The head office also counts parcels handled by people not tied to an office.
 */
export async function officeDetail(user: CurrentUser, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new DomainError("NOT_FOUND", "That office isn't one of yours.", 404);
  const row = (await listBranches(user)).find((r) => r.b.id === id);
  if (!row) throw new DomainError("NOT_FOUND", "That office isn't one of yours.", 404);
  const { b } = row;
  const acc = user.accountId!;
  const here = and(
    eq(shipments.accountId, acc),
    b.isHead ? or(eq(shipments.handlingBranchId, id), sql`${shipments.handlingBranchId} is null`) : eq(shipments.handlingBranchId, id),
  );
  const since30 = sql`now() - interval '30 days'`;
  const day = sql<string>`to_char(${shipments.createdAt} at time zone 'Africa/Dar_es_Salaam', 'YYYY-MM-DD')`;
  const [[tot], stages, [collect], week, people] = await Promise.all([
    db
      .select({
        parcels30: sql<number>`count(*) filter (where ${shipments.createdAt} > ${since30} and ${shipments.state} <> 'CANCELLED')::int`,
        booked30: sql<number>`coalesce(sum(${shipments.totalCharge}) filter (where ${shipments.createdAt} > ${since30} and ${shipments.state} <> 'CANCELLED'), 0)::int`,
        takings30: sql<number>`coalesce(sum(${shipments.totalCharge}) filter (where ${shipments.paidAt} > ${since30}), 0)::int`,
        takingsToday: sql<number>`coalesce(sum(${shipments.totalCharge}) filter (where ${shipments.paidAt} >= date_trunc('day', now() at time zone 'Africa/Dar_es_Salaam') at time zone 'Africa/Dar_es_Salaam'), 0)::int`,
        delivered30: sql<number>`count(*) filter (where ${shipments.deliveredAt} > ${since30})::int`,
        parcels: sql<number>`count(*)::int`,
      })
      .from(shipments)
      .where(here),
    db
      .select({ state: shipments.state, n: sql<number>`count(*)::int` })
      .from(shipments)
      .where(and(here, sql`${shipments.state} in ('AWAITING_HANDOVER', 'RECEIVED', 'READY_FOR_COLLECTION', 'ATTEMPT_FAILED')`))
      .groupBy(shipments.state),
    db
      .select({
        waiting: sql<number>`count(*) filter (where ${shipments.state} not in ('DELIVERED', 'CANCELLED', 'RETURNED', 'CLOSED'))::int`,
        collected30: sql<number>`count(*) filter (where ${shipments.deliveredAt} > ${since30})::int`,
      })
      .from(shipments)
      .where(eq(shipments.deliveryBranchId, id)),
    db
      .select({ day, n: sql<number>`count(*)::int` })
      .from(shipments)
      .where(and(here, sql`${shipments.createdAt} > now() - interval '7 days'`, sql`${shipments.state} <> 'CANCELLED'`))
      .groupBy(day),
    db
      .select({ id: users.id, name: users.name, phone: users.phone, roles: users.roles })
      .from(users)
      .where(and(eq(users.accountId, acc), b.isHead ? or(eq(users.branchId, id), isNull(users.branchId)) : eq(users.branchId, id), eq(users.active, true)))
      .orderBy(asc(users.name)),
  ]);
  const byDay = new Map(week.map((w) => [w.day, w.n]));
  const eat = Date.now() + 3 * 3600_000;
  const days = Array.from({ length: 7 }, (_, i) => {
    const k = new Date(eat - (6 - i) * 86400_000).toISOString().slice(0, 10);
    return { day: k, parcels: byDay.get(k) ?? 0 };
  });
  return {
    office: { id: b.id, name: b.name, code: b.code, country: b.country, region: b.region, district: b.district, address: b.address, lat: b.lat, lng: b.lng, phone: b.phone, isHead: b.isHead, active: b.active, staff: row.staff },
    stats: {
      inHand: Object.fromEntries(stages.map((s) => [s.state, s.n])),
      inHandTotal: stages.reduce((n, s) => n + s.n, 0),
      toCollect: collect?.waiting ?? 0,
      collected30: collect?.collected30 ?? 0,
      parcels30: tot?.parcels30 ?? 0,
      booked30: tot?.booked30 ?? 0,
      takings30: tot?.takings30 ?? 0,
      takingsToday: tot?.takingsToday ?? 0,
      delivered30: tot?.delivered30 ?? 0,
      parcels: tot?.parcels ?? 0,
      days,
    },
    staff: people.map((p) => ({ id: p.id, name: p.name, phone: p.phone, roles: p.roles })),
  };
}
