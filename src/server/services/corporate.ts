import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { accounts, branches, kybApplications, rolePermissions, roles, users } from "../db/schema";
import { audit } from "../audit";
import { ulid } from "../ids";
import { DomainError } from "./shipments";
import type { CurrentUser } from "../auth/current-user";
import { toE164TZ } from "@/domain/phone";
import { TZ_REGIONS } from "@/domain/pricing";
import { DEFAULT_ROLES } from "@/domain/roles";
import { normaliseTin } from "@/domain/agents";
import { submitCompanyKyb } from "./kyb";
import { getSetting } from "../settings";

/**
 * Companies that send parcels on Tuma (not agents: they don't handle parcels). The person who registers it becomes its
 * admin (corporate_admin): they book parcels in the company's name at Tuma points, may put them on the company's
 * account (the point invoices the company) and add their team (corporate_sender). A member chooses per parcel
 * whether it goes on the company's account or is their own; the admin sees every company parcel.
 *
 * The company is vetted (KYC with ComplyOS) before it sends freely: it starts pending and may send
 * pendingCompanyParcelAllowance parcels on its account meanwhile. Approval opens it fully.
 */

export const CORPORATE_ADMIN = "corporate_admin";
export const CORPORATE_SENDER = "corporate_sender";
export const CORPORATE_ROLES = [CORPORATE_ADMIN, CORPORATE_SENDER] as const;

export const companySchema = z.object({
  name: z.string().trim().min(2, "Enter the company's name").max(120),
  tin: z
    .string()
    .transform((v, c) => normaliseTin(v) ?? (c.addIssue({ code: "custom", message: "A TIN is 9 digits" }), z.NEVER)),
  regNo: z.string().trim().max(40).optional().transform((v) => v || undefined),
  region: z.enum(TZ_REGIONS),
  district: z.string().trim().min(2).max(60),
  street: z.string().trim().min(2, "Enter the street or building").max(120),
  phone: z
    .string()
    .trim()
    .transform((v, c) => toE164TZ(v) ?? (c.addIssue({ code: "custom", message: "Enter a valid Tanzanian mobile number." }), z.NEVER)),
  email: z.union([z.email(), z.literal("")]).optional().transform((v) => v || undefined),
  /** The head office's pin on the map. */
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  /** Certificate of incorporation or business licence: key from the kyb upload. */
  licenceFile: z
    .string()
    .regex(/^kyb\/\d{4}\/\d{2}\/[0-9A-Z]{26}\.(jpg|png|webp|heic|pdf)$/, "Upload the document again.")
    .optional(),
});

/** A company already on Tuma by its TIN (any kind of account), or a business application with it. */
async function companyOnTuma(tin: string) {
  const [a] = await db.select({ name: accounts.name }).from(accounts).where(and(eq(accounts.tin, tin), eq(accounts.status, "active")));
  if (a) return a.name;
  const [k] = await db.select({ name: kybApplications.businessName }).from(kybApplications).where(eq(kybApplications.tin, tin));
  return k?.name ?? null;
}

export async function companyCheck(raw: { tin?: string | null }) {
  const tin = raw.tin ? normaliseTin(raw.tin) : null;
  const name = tin ? await companyOnTuma(tin) : null;
  return name ? { taken: true as const, name } : { taken: false as const };
}

/** Register the company and make this person its admin. */
export async function registerCompany(user: CurrentUser, raw: unknown) {
  if (user.accountId) throw new DomainError("ALREADY_IN_BUSINESS", "You're already part of a business on Tuma.", 409);
  const c = companySchema.parse(raw);
  const other = await companyOnTuma(c.tin);
  if (other) throw new DomainError("COMPANY_ON_TUMA", `${other} is already on Tuma. Ask its admin to add you to the team with your phone number.`, 409);
  const accountId = `acc_co_${ulid().toLowerCase()}`;
  let ref = "";
  await db.transaction(async (tx) => {
    await tx.insert(accounts).values({ id: accountId, type: "shipper", name: c.name, tin: c.tin, status: "pending" });
    await tx.insert(branches).values({
      accountId,
      name: c.name,
      code: (c.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3) || "CO").padEnd(3, "X"),
      isHead: true,
      region: c.region,
      district: c.district,
      address: c.street,
      phone: c.phone,
      ...(c.lat != null && c.lng != null ? { lat: c.lat, lng: c.lng } : {}),
    });
    for (const key of CORPORATE_ROLES) {
      const seed = DEFAULT_ROLES.find((r) => r.key === key)!;
      const added = await tx.insert(roles).values({ key, name: seed.name, description: seed.description, surface: seed.surface, system: true }).onConflictDoNothing().returning({ key: roles.key });
      if (added.length) await tx.insert(rolePermissions).values(seed.permissions.map((p) => ({ roleKey: key, permission: p })));
    }
    const [u] = await tx.select({ roles: users.roles }).from(users).where(eq(users.id, user.id));
    await tx
      .update(users)
      .set({ accountId, branchId: null, roles: [...new Set([...(u?.roles ?? []), CORPORATE_ADMIN])] })
      .where(eq(users.id, user.id));
    const [me] = await tx.select({ name: users.name, phone: users.phone, email: users.email }).from(users).where(eq(users.id, user.id));
    const kyb = await submitCompanyKyb(tx, {
      userId: user.id,
      accountId,
      locale: user.locale,
      name: c.name,
      tin: c.tin,
      regNo: c.regNo,
      licenceFile: c.licenceFile,
      office: { region: c.region, district: c.district, street: c.street, phone: c.phone },
      contact: { name: me?.name || c.name, phone: me?.phone || c.phone, email: c.email ?? me?.email ?? undefined },
    });
    ref = kyb.ref;
    await audit(tx, { actorId: user.id, action: "company.register", entity: "account", entityId: accountId, after: { name: c.name, tin: c.tin, kyb: kyb.ref } });
  });
  return { accountId, name: c.name, status: "pending" as const, kybRef: ref, allowance: await getSetting("pendingCompanyParcelAllowance") };
}

/** The company this person sends for: its name, TIN, head office, and where its KYC stands. Null when they don't. */
export async function companyOf(user: CurrentUser) {
  if (!user.accountId || !user.permissions.has("corporate.send")) return null;
  const [a] = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      tin: accounts.tin,
      status: accounts.status,
      policy: accounts.companyPolicy,
      phone: branches.phone,
      region: branches.region,
      district: branches.district,
      address: branches.address,
    })
    .from(accounts)
    .leftJoin(branches, and(eq(branches.accountId, accounts.id), eq(branches.isHead, true)))
    .where(and(eq(accounts.id, user.accountId), eq(accounts.type, "shipper")));
  return a ?? null;
}
