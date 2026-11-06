import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, lt, notInArray, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { branches, partnerClients, partnerInvoices, partnerPayments, shipments, vehicles } from "../db/schema";
import { effectiveBranch } from "./branches";
import { nextInvoiceNumber } from "./invoice-numbers";
import { audit } from "../audit";
import { enqueue } from "../adapters/outbox";
import { DomainError } from "./shipments";
import type { CurrentUser } from "../auth/current-user";
import type { Permission } from "@/domain/roles";
import { toE164TZ } from "@/domain/phone";
import { CARGO_STATES, PARCEL_STATES, type ShipmentState } from "@/domain/states";

/**
 * Partner area: warehouses, freight forwarders, parcel companies and transporters running their part of the
 * network on Tuma. Every query is scoped to the signed-in user's partner account.
 */

function partnerOf(user: CurrentUser, permission: Permission): string {
  if (!user.permissions.has(permission) || !user.accountId) throw new DomainError("FORBIDDEN", "You don't have access to this.", 403);
  return user.accountId;
}

const OPEN_INVOICE = ["issued", "partially_paid"] as const;
const RECEIVED_STATES = ["RECEIVED", "AT_HUB", "READY_FOR_COLLECTION"] as const;
const TRANSIT_STATES = ["IN_TRANSIT", "OUT_FOR_DELIVERY", "ATTEMPT_FAILED", "RETURNING"] as const;
const DONE_STATES = ["DELIVERED", "RETURNED"] as const;

/* --------------------------------------------------------------- dashboard */

/**
 * Partner overview. Cargo figures cover shipments booked to the partner since `since` (null = all time), and
 * deliveries made in that period. Fleet and money are as of now.
 */
export async function partnerDashboard(user: CurrentUser, since: Date | null = new Date(Date.now() - 30 * 86400_000), branch?: string | null) {
  const pid = partnerOf(user, "partner.cargo.read");
  const now = new Date();
  const bid = await effectiveBranch(user, branch);
  // Cargo and fleet follow the branch; money is the company's (invoices and payments aren't per branch).
  const mine = and(eq(shipments.handlingPartnerId, pid), bid ? eq(shipments.handlingBranchId, bid) : undefined);
  const booked = since ? gte(shipments.createdAt, since) : undefined;
  const [byState, fleet, receivables, overdue, unmatched, uninvoiced, delivered] = await Promise.all([
    db.select({ state: shipments.state, n: count() }).from(shipments).where(and(mine, booked)).groupBy(shipments.state),
    db.select({ status: vehicles.status, n: count() }).from(vehicles).where(and(eq(vehicles.accountId, pid), bid ? eq(vehicles.branchId, bid) : undefined)).groupBy(vehicles.status),
    db
      .select({ due: sql<number>`coalesce(sum(${partnerInvoices.total} - ${partnerInvoices.amountPaid}), 0)`, n: count() })
      .from(partnerInvoices)
      .where(and(eq(partnerInvoices.partnerAccountId, pid), inArray(partnerInvoices.status, [...OPEN_INVOICE]))),
    db
      .select({ due: sql<number>`coalesce(sum(${partnerInvoices.total} - ${partnerInvoices.amountPaid}), 0)`, n: count() })
      .from(partnerInvoices)
      .where(and(eq(partnerInvoices.partnerAccountId, pid), inArray(partnerInvoices.status, [...OPEN_INVOICE]), lt(partnerInvoices.dueDate, now))),
    db
      .select({ amount: sql<number>`coalesce(sum(${partnerPayments.amount}), 0)`, n: count() })
      .from(partnerPayments)
      .where(and(eq(partnerPayments.partnerAccountId, pid), isNull(partnerPayments.invoiceId))),
    db
      .select({ n: count() })
      .from(shipments)
      .where(and(mine, inArray(shipments.state, [...DONE_STATES]), isNull(shipments.partnerInvoiceId), sql`${shipments.partnerClientId} is not null`)),
    db.select({ n: count() }).from(shipments).where(and(mine, eq(shipments.state, "DELIVERED"), since ? gte(shipments.deliveredAt, since) : undefined)),
  ]);
  const st = Object.fromEntries(byState.map((r) => [r.state, r.n])) as Record<string, number>;
  const sumOf = (keys: readonly string[]) => keys.reduce((a, k) => a + (st[k] ?? 0), 0);
  const fl = Object.fromEntries(fleet.map((r) => [r.status, r.n])) as Record<string, number>;
  return {
    received: sumOf(RECEIVED_STATES),
    inTransit: sumOf(TRANSIT_STATES),
    awaiting: st.AWAITING_HANDOVER ?? 0,
    delivered: delivered[0]?.n ?? 0,
    states: st,
    fleet: { available: fl.available ?? 0, onTrip: fl.on_trip ?? 0, maintenance: fl.maintenance ?? 0, total: fleet.reduce((a, r) => a + r.n, 0) },
    receivables: { amount: Number(receivables[0]?.due ?? 0), invoices: receivables[0]?.n ?? 0 },
    overdue: { amount: Number(overdue[0]?.due ?? 0), invoices: overdue[0]?.n ?? 0 },
    unmatched: { amount: Number(unmatched[0]?.amount ?? 0), payments: unmatched[0]?.n ?? 0 },
    uninvoiced: uninvoiced[0]?.n ?? 0,
  };
}

/* ------------------------------------------------------------------- cargo */

export type CargoView = "received" | "transit" | "expected" | "delivered" | "all";

type CargoQuery = { view: CargoView; q?: string; clientId?: string; since?: Date | null; branchId?: string | null; state?: string };

async function cargoWhere(user: CurrentUser, opts: CargoQuery) {
  const pid = partnerOf(user, "partner.cargo.read");
  const bid = await effectiveBranch(user, opts.branchId);
  const where: (SQL | undefined)[] = [eq(shipments.handlingPartnerId, pid)];
  if (bid) where.push(eq(shipments.handlingBranchId, bid));
  if (opts.clientId) where.push(eq(shipments.partnerClientId, opts.clientId));
  // Same periods as the overview: deliveries by delivery date, everything else by booking date.
  if (opts.since) where.push(opts.view === "delivered" ? gte(shipments.deliveredAt, opts.since) : gte(shipments.createdAt, opts.since));
  if (opts.view === "received") where.push(inArray(shipments.state, [...RECEIVED_STATES]));
  if (opts.view === "transit") where.push(inArray(shipments.state, [...TRANSIT_STATES]));
  if (opts.view === "expected") where.push(eq(shipments.state, "AWAITING_HANDOVER"));
  if (opts.view === "delivered") where.push(inArray(shipments.state, [...DONE_STATES]));
  if (opts.state && ([...PARCEL_STATES, ...CARGO_STATES] as readonly string[]).includes(opts.state)) where.push(eq(shipments.state, opts.state as ShipmentState));
  if (opts.q) {
    const term = `%${opts.q.trim()}%`;
    where.push(
      or(
        ilike(shipments.waybill, term),
        ilike(shipments.merchantRef, term),
        sql`${shipments.consignee}->>'name' ilike ${term}`,
        sql`${shipments.consignee}->'address'->>'region' ilike ${term}`,
        ilike(shipments.goodsDescription, term),
      ),
    );
  }
  return and(...where);
}

function cargoSelect() {
  return db
    .select({
      waybill: shipments.waybill,
      state: shipments.state,
      exception: shipments.exception,
      consignee: shipments.consignee,
      goods: shipments.goodsDescription,
      weightG: shipments.chargeableWeightG,
      pieces: shipments.piecesCount,
      promisedAt: shipments.promisedAt,
      updatedAt: shipments.updatedAt,
      totalCharge: shipments.totalCharge,
      vehicleId: shipments.vehicleId,
      plate: vehicles.plate,
      clientName: partnerClients.name,
      branchCode: branches.code,
      branchName: branches.name,
    })
    .from(shipments)
    .leftJoin(vehicles, eq(vehicles.id, shipments.vehicleId))
    .leftJoin(partnerClients, eq(partnerClients.id, shipments.partnerClientId))
    .leftJoin(branches, eq(branches.id, shipments.handlingBranchId));
}

/** Cargo handled by the partner (scoped to the user's branch when they have one), latest activity first. */
export async function listCargo(user: CurrentUser, opts: CargoQuery & { limit?: number }) {
  return cargoSelect()
    .where(await cargoWhere(user, opts))
    .orderBy(desc(shipments.updatedAt), desc(shipments.id))
    .limit(opts.limit ?? 200);
}

export const CARGO_PAGE_SIZE = 25;

/** One page of cargo with the total, for the All cargo list. Pages past the end fall back to the last page. */
export async function pageCargo(user: CurrentUser, opts: CargoQuery & { page?: number; pageSize?: number }) {
  const where = await cargoWhere(user, opts);
  const size = Math.min(Math.max(opts.pageSize ?? CARGO_PAGE_SIZE, 5), 100);
  const [{ n }] = await db.select({ n: count() }).from(shipments).where(where);
  const pages = Math.max(1, Math.ceil(n / size));
  const page = Math.min(Math.max(1, Math.floor(opts.page ?? 1)), pages);
  const rows = await cargoSelect()
    .where(where)
    .orderBy(desc(shipments.updatedAt), desc(shipments.id))
    .limit(size)
    .offset((page - 1) * size);
  return { rows, total: n, page, pages, size };
}

/** Cargo figures per branch for the period (booked in it; deliveries made in it). Branch staff get their branch only. */
export async function cargoByBranch(user: CurrentUser, since: Date | null) {
  const pid = partnerOf(user, "partner.cargo.read");
  const bid = user.branchId ?? null;
  const from = since?.toISOString();
  const booked = from ? sql`${shipments.createdAt} >= ${from}::timestamptz` : sql`true`;
  const deliveredIn = from ? sql`${shipments.deliveredAt} >= ${from}::timestamptz` : sql`true`;
  const inStates = (list: readonly string[]) => sql.join(list.map((x) => sql`${x}`), sql`, `);
  const rows = await db
    .select({
      id: branches.id,
      name: branches.name,
      code: branches.code,
      received: sql<number>`count(${shipments.id}) filter (where ${booked} and ${shipments.state} in (${inStates(RECEIVED_STATES)}))`,
      transit: sql<number>`count(${shipments.id}) filter (where ${booked} and ${shipments.state} in (${inStates(TRANSIT_STATES)}))`,
      expected: sql<number>`count(${shipments.id}) filter (where ${booked} and ${shipments.state} = 'AWAITING_HANDOVER')`,
      delivered: sql<number>`count(${shipments.id}) filter (where ${deliveredIn} and ${shipments.state} = 'DELIVERED')`,
    })
    .from(branches)
    .leftJoin(shipments, and(eq(shipments.handlingBranchId, branches.id), eq(shipments.handlingPartnerId, pid)))
    .where(and(eq(branches.accountId, pid), eq(branches.active, true), bid ? eq(branches.id, bid) : undefined))
    .groupBy(branches.id)
    .orderBy(sql`${branches.isHead} desc`, asc(branches.name));
  return rows.map((r) => ({ ...r, received: Number(r.received), transit: Number(r.transit), expected: Number(r.expected), delivered: Number(r.delivered) }));
}

/** Load cargo onto one of the partner's vehicles (or unload with null). */
export async function assignVehicle(user: CurrentUser, waybill: string, vehicleId: string | null) {
  const pid = partnerOf(user, "partner.cargo.operate");
  await db.transaction(async (tx) => {
    const [s] = await tx
      .select()
      .from(shipments)
      .where(and(eq(shipments.waybill, waybill), eq(shipments.handlingPartnerId, pid), user.branchId ? eq(shipments.handlingBranchId, user.branchId) : undefined));
    if (!s) throw new DomainError("NOT_FOUND", "Shipment not found.", 404);
    if (vehicleId) {
      const [v] = await tx
        .select()
        .from(vehicles)
        .where(and(eq(vehicles.id, vehicleId), eq(vehicles.accountId, pid), user.branchId ? eq(vehicles.branchId, user.branchId) : undefined));
      if (!v) throw new DomainError("NOT_FOUND", "Vehicle not found.", 404);
      if (v.status === "maintenance" || v.status === "inactive") throw new DomainError("VEHICLE_UNAVAILABLE", `${v.plate} is not available.`);
    }
    await tx.update(shipments).set({ vehicleId, updatedAt: new Date() }).where(eq(shipments.id, s.id));
    await audit(tx, { actorId: user.id, action: vehicleId ? "partner.cargo.load" : "partner.cargo.unload", entity: "shipment", entityId: waybill, before: { vehicleId: s.vehicleId }, after: { vehicleId } });
  });
}

/* ---------------------------------------------------------------- vehicles */

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v ? new Date(v) : null));

export const vehicleSchema = z.object({
  id: z.string().uuid().optional(),
  plate: z.string().trim().toUpperCase().min(3, "Enter the plate number").max(20),
  kind: z.enum(["truck", "van", "motorbike", "trailer"]),
  make: z.string().trim().max(60).optional(),
  capacityKg: z.coerce.number().int().positive("Enter the payload").max(60000),
  volumeM3: z.union([z.coerce.number().positive().max(200), z.literal("")]).optional().transform((v) => (v === "" || v === undefined ? null : v)),
  status: z.enum(["available", "on_trip", "maintenance", "inactive"]).default("available"),
  driverName: z.string().trim().max(80).optional(),
  driverPhone: z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const e = toE164TZ(v);
      if (!e) {
        ctx.addIssue({ code: "custom", message: "Enter a Tanzanian mobile number" });
        return z.NEVER;
      }
      return e;
    }),
  insuranceExpiry: optionalDate,
  inspectionExpiry: optionalDate,
  branchId: z.union([z.uuid(), z.literal("")]).optional().transform((v) => v || null),
});

export async function listVehicles(user: CurrentUser, branch?: string | null) {
  const pid = partnerOf(user, "partner.cargo.read");
  const bid = await effectiveBranch(user, branch);
  const loads = db
    .select({ vehicleId: shipments.vehicleId, n: count().as("n"), kg: sql<number>`sum(${shipments.chargeableWeightG}) / 1000`.as("kg") })
    .from(shipments)
    .where(and(eq(shipments.handlingPartnerId, pid), notInArray(shipments.state, ["DELIVERED", "RETURNED", "CANCELLED"])))
    .groupBy(shipments.vehicleId)
    .as("loads");
  return db
    .select({ v: vehicles, loadCount: sql<number>`coalesce(${loads.n}, 0)`, loadKg: sql<number>`coalesce(${loads.kg}, 0)`, branchName: branches.name, branchCode: branches.code })
    .from(vehicles)
    .leftJoin(loads, eq(loads.vehicleId, vehicles.id))
    .leftJoin(branches, eq(branches.id, vehicles.branchId))
    .where(and(eq(vehicles.accountId, pid), bid ? eq(vehicles.branchId, bid) : undefined))
    .orderBy(asc(vehicles.plate));
}

export async function saveVehicle(user: CurrentUser, input: z.output<typeof vehicleSchema>) {
  const pid = partnerOf(user, "partner.vehicles.manage");
  const { id, ...rest } = input;
  // Branch staff keep vehicles at their own branch; others may base a vehicle at any of the company's branches.
  const data = { ...rest, branchId: user.branchId ?? (await effectiveBranch(user, rest.branchId)) };
  await db.transaction(async (tx) => {
    if (id) {
      const [before] = await tx.select().from(vehicles).where(and(eq(vehicles.id, id), eq(vehicles.accountId, pid)));
      if (!before) throw new DomainError("NOT_FOUND", "Vehicle not found.", 404);
      await tx.update(vehicles).set(data).where(eq(vehicles.id, id));
      await audit(tx, { actorId: user.id, action: "partner.vehicle.update", entity: "vehicle", entityId: id, before, after: data });
    } else {
      const [dup] = await tx.select({ id: vehicles.id }).from(vehicles).where(and(eq(vehicles.accountId, pid), eq(vehicles.plate, data.plate)));
      if (dup) throw new DomainError("DUPLICATE", "A vehicle with this plate already exists.", 409);
      const [v] = await tx.insert(vehicles).values({ ...data, accountId: pid }).returning({ id: vehicles.id });
      await audit(tx, { actorId: user.id, action: "partner.vehicle.create", entity: "vehicle", entityId: v.id, after: data });
    }
  });
}

/* ----------------------------------------------------------------- clients */

export const clientSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Enter the client's name").max(120),
  contactName: z.string().trim().max(80).optional(),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const e = toE164TZ(v);
      if (!e) {
        ctx.addIssue({ code: "custom", message: "Enter a Tanzanian mobile number" });
        return z.NEVER;
      }
      return e;
    }),
  email: z.union([z.email(), z.literal("")]).optional().transform((v) => v || null),
  tin: z.string().trim().max(30).optional(),
  region: z.string().trim().max(60).optional(),
  creditTermsDays: z.coerce.number().int().min(0).max(120).default(14),
});

export async function listClients(user: CurrentUser) {
  const pid = partnerOf(user, "partner.cargo.read");
  const ship = db
    .select({ clientId: shipments.partnerClientId, n: count().as("n") })
    .from(shipments)
    .where(eq(shipments.handlingPartnerId, pid))
    .groupBy(shipments.partnerClientId)
    .as("ship");
  const owed = db
    .select({ clientId: partnerInvoices.clientId, due: sql<number>`sum(${partnerInvoices.total} - ${partnerInvoices.amountPaid})`.as("due") })
    .from(partnerInvoices)
    .where(and(eq(partnerInvoices.partnerAccountId, pid), inArray(partnerInvoices.status, [...OPEN_INVOICE])))
    .groupBy(partnerInvoices.clientId)
    .as("owed");
  return db
    .select({ c: partnerClients, shipments: sql<number>`coalesce(${ship.n}, 0)`, outstanding: sql<number>`coalesce(${owed.due}, 0)` })
    .from(partnerClients)
    .leftJoin(ship, eq(ship.clientId, partnerClients.id))
    .leftJoin(owed, eq(owed.clientId, partnerClients.id))
    .where(eq(partnerClients.partnerAccountId, pid))
    .orderBy(asc(partnerClients.name));
}

export async function saveClient(user: CurrentUser, input: z.output<typeof clientSchema>) {
  const pid = partnerOf(user, "partner.clients.manage");
  const { id, ...data } = input;
  await db.transaction(async (tx) => {
    if (id) {
      const [before] = await tx.select().from(partnerClients).where(and(eq(partnerClients.id, id), eq(partnerClients.partnerAccountId, pid)));
      if (!before) throw new DomainError("NOT_FOUND", "Client not found.", 404);
      await tx.update(partnerClients).set(data).where(eq(partnerClients.id, id));
      await audit(tx, { actorId: user.id, action: "partner.client.update", entity: "partner_client", entityId: id, before, after: data });
    } else {
      const [c] = await tx.insert(partnerClients).values({ ...data, partnerAccountId: pid }).returning({ id: partnerClients.id });
      await audit(tx, { actorId: user.id, action: "partner.client.create", entity: "partner_client", entityId: c.id, after: data });
    }
  });
}

/** One client of the partner, with the figures shown on its page. Scoped to the user's company. */
export async function getClient(user: CurrentUser, id: string) {
  const pid = partnerOf(user, "partner.clients.manage");
  if (!z.uuid().safeParse(id).success) return null;
  const [c] = await db.select().from(partnerClients).where(and(eq(partnerClients.id, id), eq(partnerClients.partnerAccountId, pid)));
  if (!c) return null;
  const [ship] = await db
    .select({
      total: count(),
      received: sql<number>`count(*) filter (where ${inArray(shipments.state, [...RECEIVED_STATES])})`,
      transit: sql<number>`count(*) filter (where ${inArray(shipments.state, [...TRANSIT_STATES])})`,
      delivered: sql<number>`count(*) filter (where ${inArray(shipments.state, [...DONE_STATES])})`,
      lastAt: sql<Date | null>`max(${shipments.createdAt})`,
    })
    .from(shipments)
    .where(and(eq(shipments.handlingPartnerId, pid), eq(shipments.partnerClientId, id)));
  const [owed] = await db
    .select({
      outstanding: sql<number>`coalesce(sum(${partnerInvoices.total} - ${partnerInvoices.amountPaid}), 0)`,
      overdue: sql<number>`coalesce(sum(${partnerInvoices.total} - ${partnerInvoices.amountPaid}) filter (where ${partnerInvoices.dueDate} < now()), 0)`,
      open: count(),
    })
    .from(partnerInvoices)
    .where(and(eq(partnerInvoices.partnerAccountId, pid), eq(partnerInvoices.clientId, id), inArray(partnerInvoices.status, [...OPEN_INVOICE])));
  return {
    c,
    shipments: { total: Number(ship.total), received: Number(ship.received), transit: Number(ship.transit), delivered: Number(ship.delivered), lastAt: ship.lastAt ? new Date(ship.lastAt) : null },
    finance: { outstanding: Number(owed.outstanding), overdue: Number(owed.overdue), openInvoices: Number(owed.open) },
  };
}

/** Archive a client (hidden from new invoices and cargo) or bring it back. History stays. */
export async function setClientActive(user: CurrentUser, id: string, active: boolean) {
  const pid = partnerOf(user, "partner.clients.manage");
  await db.transaction(async (tx) => {
    const [before] = await tx.select().from(partnerClients).where(and(eq(partnerClients.id, id), eq(partnerClients.partnerAccountId, pid)));
    if (!before) throw new DomainError("NOT_FOUND", "Client not found.", 404);
    await tx.update(partnerClients).set({ active }).where(eq(partnerClients.id, id));
    await audit(tx, { actorId: user.id, action: active ? "partner.client.activate" : "partner.client.archive", entity: "partner_client", entityId: id, before: { active: before.active }, after: { active } });
  });
}

/* ---------------------------------------------------------------- invoices */

const VAT = 0.18;

export async function listInvoices(user: CurrentUser, status?: "open" | "overdue" | "paid" | "all", clientId?: string) {
  const pid = partnerOf(user, "partner.finance.manage");
  const where: (SQL | undefined)[] = [eq(partnerInvoices.partnerAccountId, pid)];
  if (clientId) where.push(eq(partnerInvoices.clientId, clientId));
  if (status === "open") where.push(inArray(partnerInvoices.status, [...OPEN_INVOICE]));
  if (status === "overdue") where.push(inArray(partnerInvoices.status, [...OPEN_INVOICE]), lt(partnerInvoices.dueDate, new Date()));
  if (status === "paid") where.push(eq(partnerInvoices.status, "paid"));
  return db
    .select({ i: partnerInvoices, clientName: partnerClients.name })
    .from(partnerInvoices)
    .innerJoin(partnerClients, eq(partnerClients.id, partnerInvoices.clientId))
    .where(and(...where))
    .orderBy(desc(partnerInvoices.issueDate))
    .limit(200);
}

/** Delivered shipments for a client that have not been invoiced yet. */
export async function uninvoicedShipments(user: CurrentUser, clientId: string) {
  const pid = partnerOf(user, "partner.finance.manage");
  return db
    .select({ waybill: shipments.waybill, goods: shipments.goodsDescription, deliveredAt: shipments.deliveredAt, amount: shipments.totalCharge })
    .from(shipments)
    .where(
      and(
        eq(shipments.handlingPartnerId, pid),
        eq(shipments.partnerClientId, clientId),
        inArray(shipments.state, [...DONE_STATES]),
        isNull(shipments.partnerInvoiceId),
      ),
    )
    .orderBy(asc(shipments.deliveredAt));
}

/** Invoice a client for delivered shipments. Amounts are VAT-inclusive; the VAT share is shown separately. */
export async function createInvoice(user: CurrentUser, clientId: string, waybills: string[]) {
  const pid = partnerOf(user, "partner.finance.manage");
  if (!waybills.length) throw new DomainError("EMPTY", "Choose at least one shipment.");
  return db.transaction(async (tx) => {
    const [client] = await tx.select().from(partnerClients).where(and(eq(partnerClients.id, clientId), eq(partnerClients.partnerAccountId, pid)));
    if (!client) throw new DomainError("NOT_FOUND", "Client not found.", 404);
    const rows = await tx
      .select()
      .from(shipments)
      .where(and(inArray(shipments.waybill, waybills), eq(shipments.handlingPartnerId, pid), eq(shipments.partnerClientId, clientId), isNull(shipments.partnerInvoiceId)))
      .for("update");
    if (rows.length !== waybills.length) throw new DomainError("STALE", "Some shipments were already invoiced or are not this client's. Refresh and try again.", 409);

    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${pid}))`);
    const now = new Date();
    const number = await nextInvoiceNumber(tx, pid, now);
    const lines = rows.map((r) => ({ waybill: r.waybill, description: r.goodsDescription, amount: r.totalCharge }));
    const total = lines.reduce((a, l) => a + l.amount, 0);
    const tax = Math.round((total * VAT) / (1 + VAT));
    const [inv] = await tx
      .insert(partnerInvoices)
      .values({
        partnerAccountId: pid,
        clientId,
        number,
        issueDate: now,
        dueDate: new Date(now.getTime() + client.creditTermsDays * 86400_000),
        lines,
        subtotal: total - tax,
        tax,
        total,
        createdBy: user.id,
      })
      .returning();
    await tx.update(shipments).set({ partnerInvoiceId: inv.id }).where(inArray(shipments.id, rows.map((r) => r.id)));
    await enqueue(tx, { target: "finops", topic: "partner.invoice.issued", idempotencyKey: `pinv:${inv.id}`, payload: { partner: pid, client: client.name, number, total, tax, currency: "TZS", waybills } });
    await audit(tx, { actorId: user.id, action: "partner.invoice.create", entity: "partner_invoice", entityId: inv.id, after: { number, total, waybills } });
    return inv;
  });
}

/* ---------------------------------------------------------------- payments */

export const paymentSchema = z.object({
  clientId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  amount: z.coerce.number().int().positive("Enter the amount"),
  method: z.enum(["mobile_money", "bank_transfer", "cash", "card"]),
  reference: z.string().trim().max(80).optional(),
  receivedAt: z.string().optional().transform((v) => (v ? new Date(v) : new Date())),
});

export async function listPayments(user: CurrentUser, filter: "unmatched" | "all" = "all", clientId?: string) {
  const pid = partnerOf(user, "partner.finance.manage");
  return db
    .select({ p: partnerPayments, clientName: partnerClients.name, invoiceNumber: partnerInvoices.number })
    .from(partnerPayments)
    .leftJoin(partnerClients, eq(partnerClients.id, partnerPayments.clientId))
    .leftJoin(partnerInvoices, eq(partnerInvoices.id, partnerPayments.invoiceId))
    .where(and(eq(partnerPayments.partnerAccountId, pid), filter === "unmatched" ? isNull(partnerPayments.invoiceId) : undefined, clientId ? eq(partnerPayments.clientId, clientId) : undefined))
    .orderBy(desc(partnerPayments.receivedAt))
    .limit(200);
}

/** Open invoices that could take this payment, best match first: invoice number in the reference, then same client, then closest amount. */
export async function matchCandidates(user: CurrentUser, paymentId: string) {
  const pid = partnerOf(user, "partner.finance.manage");
  const [p] = await db.select().from(partnerPayments).where(and(eq(partnerPayments.id, paymentId), eq(partnerPayments.partnerAccountId, pid)));
  if (!p) throw new DomainError("NOT_FOUND", "Payment not found.", 404);
  const open = await db
    .select({ i: partnerInvoices, clientName: partnerClients.name })
    .from(partnerInvoices)
    .innerJoin(partnerClients, eq(partnerClients.id, partnerInvoices.clientId))
    .where(and(eq(partnerInvoices.partnerAccountId, pid), inArray(partnerInvoices.status, [...OPEN_INVOICE])));
  const ref = (p.reference ?? "").toUpperCase();
  return open
    .map((o) => {
      const remaining = o.i.total - o.i.amountPaid;
      const refMatch = ref.includes(o.i.number);
      const sameClient = Boolean(p.clientId && o.i.clientId === p.clientId);
      const exact = remaining === p.amount;
      // Rank: quoted invoice number, then same client, then exact balance, then closest amount.
      const score = (refMatch ? 1000 : 0) + (sameClient ? 100 : 0) + (exact ? 50 : 0) - Math.min(49, Math.abs(remaining - p.amount) / 1000);
      return { id: o.i.id, number: o.i.number, clientName: o.clientName, remaining, dueDate: o.i.dueDate, score, exact, refMatch, sameClient };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

/** Allocate a payment to an invoice and update the invoice's paid amount and status. */
export async function reconcile(user: CurrentUser, paymentId: string, invoiceId: string) {
  const pid = partnerOf(user, "partner.finance.manage");
  await db.transaction(async (tx) => {
    const [p] = await tx.select().from(partnerPayments).where(and(eq(partnerPayments.id, paymentId), eq(partnerPayments.partnerAccountId, pid))).for("update");
    if (!p) throw new DomainError("NOT_FOUND", "Payment not found.", 404);
    if (p.invoiceId) throw new DomainError("ALREADY_MATCHED", "This payment is already matched.", 409);
    const [inv] = await tx.select().from(partnerInvoices).where(and(eq(partnerInvoices.id, invoiceId), eq(partnerInvoices.partnerAccountId, pid))).for("update");
    if (!inv) throw new DomainError("NOT_FOUND", "Invoice not found.", 404);
    if (inv.status === "paid" || inv.status === "void") throw new DomainError("CLOSED", `${inv.number} is already ${inv.status}.`, 409);
    const paid = inv.amountPaid + p.amount;
    await tx.update(partnerInvoices).set({ amountPaid: paid, status: paid >= inv.total ? "paid" : "partially_paid" }).where(eq(partnerInvoices.id, inv.id));
    await tx.update(partnerPayments).set({ invoiceId: inv.id, clientId: p.clientId ?? inv.clientId, reconciledAt: new Date(), reconciledBy: user.id }).where(eq(partnerPayments.id, p.id));
    await enqueue(tx, { target: "finops", topic: "partner.payment.reconciled", idempotencyKey: `prec:${p.id}`, payload: { partner: pid, invoice: inv.number, amount: p.amount, method: p.method, reference: p.reference } });
    await audit(tx, { actorId: user.id, action: "partner.payment.reconcile", entity: "partner_payment", entityId: p.id, after: { invoice: inv.number, amount: p.amount, invoicePaid: paid } });
  });
}

/** Record a payment and match it automatically when the evidence is unambiguous. */
export async function recordPayment(user: CurrentUser, input: z.output<typeof paymentSchema>) {
  const pid = partnerOf(user, "partner.finance.manage");
  if (input.clientId) {
    const [c] = await db.select({ id: partnerClients.id }).from(partnerClients).where(and(eq(partnerClients.id, input.clientId), eq(partnerClients.partnerAccountId, pid)));
    if (!c) throw new DomainError("NOT_FOUND", "Client not found.", 404);
  }
  const [p] = await db
    .insert(partnerPayments)
    .values({ partnerAccountId: pid, clientId: input.clientId, amount: input.amount, method: input.method, reference: input.reference, receivedAt: input.receivedAt, recordedBy: user.id })
    .returning();
  await db.transaction((tx) => audit(tx, { actorId: user.id, action: "partner.payment.record", entity: "partner_payment", entityId: p.id, after: input }));

  // Auto-match: invoice number in the reference, or the only open invoice of this client with exactly this balance.
  const candidates = await matchCandidates(user, p.id);
  const byRef = candidates.filter((c) => c.refMatch);
  const exactForClient = candidates.filter((c) => c.exact && c.sameClient);
  const pick = byRef.length === 1 ? byRef[0] : exactForClient.length === 1 ? exactForClient[0] : undefined;
  if (pick) {
    await reconcile(user, p.id, pick.id);
    return { matched: pick.number };
  }
  return { matched: null as string | null };
}

export async function clientOptions(user: CurrentUser) {
  const pid = partnerOf(user, "partner.cargo.read");
  return db.select({ id: partnerClients.id, name: partnerClients.name }).from(partnerClients).where(and(eq(partnerClients.partnerAccountId, pid), eq(partnerClients.active, true))).orderBy(asc(partnerClients.name));
}

export async function vehicleOptions(user: CurrentUser) {
  const pid = partnerOf(user, "partner.cargo.read");
  return db
    .select({ id: vehicles.id, plate: vehicles.plate, kind: vehicles.kind, status: vehicles.status, capacityKg: vehicles.capacityKg })
    .from(vehicles)
    .where(and(eq(vehicles.accountId, pid), user.branchId ? eq(vehicles.branchId, user.branchId) : undefined))
    .orderBy(asc(vehicles.plate));
}

