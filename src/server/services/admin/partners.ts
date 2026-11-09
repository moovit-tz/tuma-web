import "server-only";
import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { platformPartners } from "../../db/schema";
import { audit } from "../../audit";
import { DomainError } from "../../errors";
import type { CurrentUser } from "../../auth/current-user";
import { toE164 } from "@/domain/phone";
import { TZ_REGIONS } from "@/domain/pricing";

/**
 * The platform's partners and suppliers: packaging, supplies, insurance, fuel, vehicle care, telecoms. The Tuma team
 * keeps the list (settings.manage); finance can read it.
 */

export const PARTNER_KINDS = ["packaging", "supplies", "insurance", "fuel", "vehicles", "telecom", "other"] as const;
export type PartnerKind = (typeof PARTNER_KINDS)[number];
export const PARTNER_STATUSES = ["active", "paused", "ended"] as const;

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

export const partnerSchema = z.object({
  kind: z.enum(PARTNER_KINDS),
  name: z.string().trim().min(2, "Enter the partner's name").max(120),
  contactName: opt(120),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v, c) => {
      if (!v) return null;
      const e = toE164(v);
      if (!e) {
        c.addIssue({ code: "custom", message: "Enter a valid phone number." });
        return z.NEVER;
      }
      return e;
    }),
  email: z
    .union([z.email("Enter a valid email"), z.literal("")])
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null)),
  website: z
    .union([z.url("Enter a full web address, starting with https://"), z.literal("")])
    .optional()
    .transform((v) => v || null),
  regions: z.array(z.enum(TZ_REGIONS as unknown as [string, ...string[]])).max(40).default([]),
  offer: opt(1000),
  notes: opt(2000),
  status: z.enum(PARTNER_STATUSES).default("active"),
  contractEndsAt: z
    .union([z.coerce.date(), z.literal("")])
    .optional()
    .transform((v) => (v instanceof Date ? v : null)),
});

export const partnerListSchema = z.object({
  kind: z.enum(PARTNER_KINDS).optional(),
  status: z.enum(PARTNER_STATUSES).optional(),
  q: z.string().trim().max(80).optional(),
});

const canRead = (u: CurrentUser) => u.permissions.has("settings.manage") || u.permissions.has("finance.view");
function canManage(u: CurrentUser) {
  if (!u.permissions.has("settings.manage")) throw new DomainError("FORBIDDEN", "Only the platform team can change partners.", 403);
}

export async function listPartners(user: CurrentUser, raw: unknown) {
  if (!canRead(user)) throw new DomainError("FORBIDDEN", "You don't have access to partners.", 403);
  const f = partnerListSchema.parse(raw);
  const term = f.q ? `%${f.q}%` : null;
  const [rows, counts] = await Promise.all([
    db
      .select()
      .from(platformPartners)
      .where(
        and(
          f.kind ? eq(platformPartners.kind, f.kind) : undefined,
          f.status ? eq(platformPartners.status, f.status) : undefined,
          term ? or(ilike(platformPartners.name, term), ilike(platformPartners.contactName, term), ilike(platformPartners.offer, term)) : undefined,
        ),
      )
      .orderBy(sql`case ${platformPartners.status} when 'active' then 0 when 'paused' then 1 else 2 end`, asc(platformPartners.name))
      .limit(500),
    db
      .select({ kind: platformPartners.kind, n: sql<number>`count(*) filter (where ${platformPartners.status} = 'active')::int` })
      .from(platformPartners)
      .groupBy(platformPartners.kind),
  ]);
  return {
    partners: rows.map(out),
    activeByKind: Object.fromEntries(counts.map((c) => [c.kind, c.n])) as Partial<Record<PartnerKind, number>>,
    canManage: user.permissions.has("settings.manage"),
  };
}

function out(p: typeof platformPartners.$inferSelect) {
  const ends = p.contractEndsAt;
  return {
    ...p,
    kind: p.kind as PartnerKind,
    contractEndsAt: ends?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    /** Ends within 30 days (or has ended) while still marked active: time to renew. */
    renewSoon: !!ends && p.status === "active" && ends.getTime() < Date.now() + 30 * 86400_000,
  };
}
export type PartnerRow = ReturnType<typeof out>;

export async function createPartner(user: CurrentUser, raw: unknown) {
  canManage(user);
  const b = partnerSchema.parse(raw);
  return db.transaction(async (tx) => {
    const [p] = await tx
      .insert(platformPartners)
      .values({ ...b, createdBy: user.id })
      .returning();
    await audit(tx, { actorId: user.id, action: "partner.create", entity: "platform_partner", entityId: p.id, after: { kind: p.kind, name: p.name } });
    return out(p);
  });
}

export async function updatePartner(user: CurrentUser, id: string, raw: unknown) {
  canManage(user);
  if (!z.uuid().safeParse(id).success) throw new DomainError("NOT_FOUND", "Partner not found.", 404);
  const b = partnerSchema.parse(raw);
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(platformPartners).where(eq(platformPartners.id, id)).for("update");
    if (!before) throw new DomainError("NOT_FOUND", "Partner not found.", 404);
    const [p] = await tx
      .update(platformPartners)
      .set({ ...b, updatedAt: new Date() })
      .where(eq(platformPartners.id, id))
      .returning();
    await audit(tx, {
      actorId: user.id,
      action: "partner.update",
      entity: "platform_partner",
      entityId: id,
      before: { name: before.name, status: before.status, kind: before.kind },
      after: { name: p.name, status: p.status, kind: p.kind },
    });
    return out(p);
  });
}
