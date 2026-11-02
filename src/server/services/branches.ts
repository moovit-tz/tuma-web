import "server-only";
import { and, asc, count, eq, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
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
  if (!user.permissions.has("partner.cargo.read") || !user.accountId) throw new DomainError("FORBIDDEN", "You don't have access to this.", 403);
  const acc = user.accountId;
  const cargo = db
    .select({ branchId: shipments.handlingBranchId, n: count().as("cargo_n") })
    .from(shipments)
    .where(and(eq(shipments.handlingPartnerId, acc), notInArray(shipments.state, [...OPEN])))
    .groupBy(shipments.handlingBranchId)
    .as("cargo");
  const fleet = db.select({ branchId: vehicles.branchId, n: count().as("fleet_n") }).from(vehicles).where(eq(vehicles.accountId, acc)).groupBy(vehicles.branchId).as("fleet");
  const staff = db.select({ branchId: users.branchId, n: count().as("staff_n") }).from(users).where(and(eq(users.accountId, acc), eq(users.active, true))).groupBy(users.branchId).as("staff");
  return db
    .select({ b: branches, openCargo: sql<number>`coalesce(${cargo.n}, 0)`, vehicles: sql<number>`coalesce(${fleet.n}, 0)`, staff: sql<number>`coalesce(${staff.n}, 0)` })
    .from(branches)
    .leftJoin(cargo, eq(cargo.branchId, branches.id))
    .leftJoin(fleet, eq(fleet.branchId, branches.id))
    .leftJoin(staff, eq(staff.branchId, branches.id))
    .where(and(eq(branches.accountId, acc), user.branchId ? eq(branches.id, user.branchId) : undefined))
    .orderBy(sql`${branches.isHead} desc`, asc(branches.name));
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
