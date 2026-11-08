import "server-only";
import { and, asc, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { accounts, departments, invoices, kybApplications, kybEvents, shipments, users, walletEntries, type CompanyPolicy } from "../db/schema";
import { audit } from "../audit";
import { enqueue } from "../adapters/outbox";
import { kybSubmission } from "../adapters/complyos";
import { DomainError } from "./shipments";
import { companyOf } from "./corporate";
import { companyKyb } from "./kyb";
import { companyBalance, entryOut } from "./wallet";
import type { CurrentUser } from "../auth/current-user";

/**
 * A sending company's own tools in the app, for its admin (corporate.manage): where its KYC stands, its staff and
 * departments, the policy its team books under, the company wallet, the invoices Tuma points sent it, and reports.
 * Members (corporate.send) see the company card and the departments to charge a parcel to.
 */

const monthStart = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
const live = sql`${shipments.state} <> 'CANCELLED'`;

async function mine(user: CurrentUser) {
  const co = await companyOf(user);
  if (!co) throw new DomainError("NOT_COMPANY", "You don't send for a company on Tuma.", 403);
  return co;
}

async function managed(user: CurrentUser) {
  const co = await mine(user);
  if (!user.permissions.has("corporate.manage")) throw new DomainError("FORBIDDEN", "Only the company's admin can do this.", 403);
  return co;
}

/** The company card: name, KYC, the allowance while it's reviewed, this month at a glance. */
export async function companyHome(user: CurrentUser) {
  const co = await mine(user);
  const admin = user.permissions.has("corporate.manage");
  const scope = admin ? eq(shipments.companyAccountId, co.id) : and(eq(shipments.companyAccountId, co.id), eq(shipments.createdBy, user.id));
  const [[month], kyc, balance, depts, [staff]] = await Promise.all([
    db
      .select({ parcels: sql<number>`count(*)::int`, spend: sql<number>`coalesce(sum(${shipments.totalCharge}), 0)::int` })
      .from(shipments)
      .where(and(scope, gte(shipments.createdAt, monthStart()), live)),
    companyKyb(co.id),
    admin ? companyBalance(db, co.id) : Promise.resolve(null),
    db.select({ id: departments.id, name: departments.name }).from(departments).where(and(eq(departments.accountId, co.id), eq(departments.active, true))).orderBy(asc(departments.name)),
    db.select({ n: sql<number>`count(*)::int` }).from(users).where(eq(users.accountId, co.id)),
  ]);
  const [me] = await db.select({ departmentId: users.departmentId }).from(users).where(eq(users.id, user.id));
  return {
    company: { id: co.id, name: co.name, tin: co.tin, status: co.status, phone: co.phone, region: co.region, district: co.district, address: co.address },
    admin,
    kyc,
    trial: co.status === "pending" ? (user.trial ?? null) : null,
    month: { parcels: month?.parcels ?? 0, spend: month?.spend ?? 0 },
    wallet: balance == null ? null : { balance, open: co.status === "active" },
    staff: staff?.n ?? 0,
    departments: depts,
    myDepartmentId: me?.departmentId ?? null,
    policy: co.policy ?? {},
  };
}

/* ----------------------------------------------------------------- KYC */

const kycSchema = z.object({
  licenceFile: z.string().regex(/^kyb\/\d{4}\/\d{2}\/[0-9A-Z]{26}\.(jpg|png|webp|heic|pdf)$/, "Upload the document again."),
});

/**
 * The admin adds the company's certificate or licence. While the review is open it goes with the application; when the
 * reviewer asked for more (needs info), adding it sends the application back for review.
 */
export async function companyKycDocument(user: CurrentUser, raw: unknown) {
  const co = await managed(user);
  const b = kycSchema.parse(raw);
  await db.transaction(async (tx) => {
    const [a] = await tx
      .select()
      .from(kybApplications)
      .where(and(eq(kybApplications.accountId, co.id), eq(kybApplications.accountKind, "company")))
      .orderBy(desc(kybApplications.submittedAt))
      .limit(1)
      .for("update");
    if (!a) throw new DomainError("NO_KYC", "This company has no application to add a document to.", 404);
    if (a.status === "approved") throw new DomainError("ALREADY_APPROVED", "The company is already approved.", 409);
    const resubmit = a.status === "needs_info" || a.status === "rejected";
    const [u] = await tx
      .update(kybApplications)
      .set({
        licenceFile: b.licenceFile,
        updatedAt: new Date(),
        ...(resubmit ? { status: "submitted" as const, version: a.version + 1, decisionNote: null, decidedAt: null, submittedAt: new Date() } : {}),
      })
      .where(eq(kybApplications.id, a.id))
      .returning();
    await tx.insert(kybEvents).values({ applicationId: a.id, status: u.status, source: "tuma", note: resubmit ? "Resubmitted with a document" : "Document added" });
    await enqueue(tx, {
      target: "complyos",
      topic: resubmit ? "kyb.submitted" : "kyb.document",
      idempotencyKey: `kyb:${u.ref}:v${u.version}:${b.licenceFile}`,
      payload: kybSubmission({ ...u, applicantId: a.userId }),
    });
    await audit(tx, { actorId: user.id, action: "company.kyc_document", entity: "kyb_application", entityId: a.ref, after: { resubmit } });
  });
  return { kyc: await companyKyb(co.id) };
}

/* --------------------------------------------------------------- staff */

/** Everyone in the company: their role, department and what they sent this month. */
export async function companyStaff(user: CurrentUser) {
  const co = await managed(user);
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      roles: users.roles,
      departmentId: users.departmentId,
      department: departments.name,
      parcels: sql<number>`(select count(*)::int from shipments s where s.company_account_id = ${co.id} and s.created_by = "users"."id" and s.created_at >= ${monthStart().toISOString()}::timestamptz and s.state <> 'CANCELLED')`,
    })
    .from(users)
    .leftJoin(departments, eq(departments.id, users.departmentId))
    .where(eq(users.accountId, co.id))
    .orderBy(asc(users.name));
  return {
    staff: rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      admin: r.roles.includes("corporate_admin"),
      department: r.departmentId ? { id: r.departmentId, name: r.department } : null,
      parcelsThisMonth: r.parcels,
      me: r.id === user.id,
    })),
  };
}

const staffSchema = z.object({ departmentId: z.uuid().nullable() });

export async function setStaffDepartment(user: CurrentUser, staffId: string, raw: unknown) {
  const co = await managed(user);
  const b = staffSchema.parse(raw);
  if (b.departmentId) await department(co.id, b.departmentId);
  const [u] = await db.update(users).set({ departmentId: b.departmentId }).where(and(eq(users.id, staffId), eq(users.accountId, co.id))).returning({ id: users.id });
  if (!u) throw new DomainError("NOT_FOUND", "That person isn't in your company.", 404);
  return companyStaff(user);
}

/* --------------------------------------------------------- departments */

async function department(accountId: string, id: string) {
  const [d] = await db.select().from(departments).where(and(eq(departments.id, id), eq(departments.accountId, accountId)));
  if (!d) throw new DomainError("NOT_FOUND", "That department isn't in your company.", 404);
  return d;
}

/** Departments with their people, what they sent this month and what's left of the budget. */
export async function companyDepartments(user: CurrentUser) {
  const co = await mine(user);
  const rows = await db
    .select({
      id: departments.id,
      name: departments.name,
      monthlyBudget: departments.monthlyBudget,
      active: departments.active,
      staff: sql<number>`(select count(*)::int from users u where u.department_id = "departments"."id")`,
      parcels: sql<number>`(select count(*)::int from shipments s where s.department_id = "departments"."id" and s.created_at >= ${monthStart().toISOString()}::timestamptz and s.state <> 'CANCELLED')`,
      spent: sql<number>`(select coalesce(sum(s.total_charge), 0)::int from shipments s where s.department_id = "departments"."id" and s.created_at >= ${monthStart().toISOString()}::timestamptz and s.state <> 'CANCELLED')`,
    })
    .from(departments)
    .where(and(eq(departments.accountId, co.id), user.permissions.has("corporate.manage") ? undefined : eq(departments.active, true)))
    .orderBy(asc(departments.name));
  return { departments: rows };
}

const departmentSchema = z.object({
  name: z.string().trim().min(2, "Name the department").max(60),
  monthlyBudget: z.coerce.number().int().min(0).max(1_000_000_000).nullable().optional(),
  active: z.boolean().optional(),
});

export async function createDepartment(user: CurrentUser, raw: unknown) {
  const co = await managed(user);
  const b = departmentSchema.parse(raw);
  const [d] = await db
    .insert(departments)
    .values({ accountId: co.id, name: b.name, monthlyBudget: b.monthlyBudget || null })
    .onConflictDoNothing()
    .returning();
  if (!d) throw new DomainError("DEPARTMENT_EXISTS", `There's already a department called ${b.name}.`, 409);
  return companyDepartments(user);
}

export async function updateDepartment(user: CurrentUser, id: string, raw: unknown) {
  const co = await managed(user);
  await department(co.id, id);
  const b = departmentSchema.partial().parse(raw);
  await db
    .update(departments)
    .set({ ...(b.name ? { name: b.name } : {}), ...(b.monthlyBudget !== undefined ? { monthlyBudget: b.monthlyBudget || null } : {}), ...(b.active !== undefined ? { active: b.active } : {}) })
    .where(eq(departments.id, id));
  return companyDepartments(user);
}

/* -------------------------------------------------------------- policy */

export const policySchema = z.object({
  payWith: z.array(z.enum(["account", "point", "wallet"])).min(1, "Allow at least one way to pay").optional(),
  maxDeclaredValue: z.coerce.number().int().min(1).max(1_000_000_000).nullable().optional(),
  requireDepartment: z.boolean().optional(),
  monthlyParcelsPerSender: z.coerce.number().int().min(1).max(10_000).nullable().optional(),
});

export async function companyPolicy(user: CurrentUser) {
  const co = await mine(user);
  return { policy: co.policy ?? {} };
}

export async function setCompanyPolicy(user: CurrentUser, raw: unknown) {
  const co = await managed(user);
  const policy: CompanyPolicy = { ...(co.policy ?? {}), ...policySchema.parse(raw) };
  await db.transaction(async (tx) => {
    await tx.update(accounts).set({ companyPolicy: policy }).where(eq(accounts.id, co.id));
    await audit(tx, { actorId: user.id, action: "company.policy", entity: "account", entityId: co.id, before: co.policy ?? {}, after: policy });
  });
  return { policy };
}

/* -------------------------------------------------------------- wallet */

/** The company wallet: its balance, deposits on their way, and the latest money in and out. */
export async function companyWallet(user: CurrentUser) {
  const co = await managed(user);
  const [balance, entries, [me]] = await Promise.all([
    companyBalance(db, co.id),
    db.select().from(walletEntries).where(eq(walletEntries.accountId, co.id)).orderBy(desc(walletEntries.createdAt)).limit(50),
    db.select({ phone: users.phone }).from(users).where(eq(users.id, user.id)),
  ]);
  const by = await names(entries.map((e) => e.userId));
  return {
    balance,
    currency: "TZS",
    open: co.status === "active",
    pending: entries.filter((e) => e.kind === "topup" && e.status === "pending").reduce((n, e) => n + e.amount, 0),
    phone: me?.phone ?? null,
    entries: entries.map((e) => ({ ...entryOut(e), by: by.get(e.userId) ?? null })),
  };
}

async function names(ids: string[]) {
  const uniq = [...new Set(ids)];
  if (!uniq.length) return new Map<string, string>();
  const rows = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, uniq));
  return new Map(rows.map((r) => [r.id, r.name]));
}

/* ------------------------------------------------------------ invoices */

/** What Tuma points invoiced the company for its parcels: on account (to pay) and the paid ones. */
export async function companyInvoices(user: CurrentUser) {
  const co = await managed(user);
  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      issuer: accounts.name,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      status: invoices.status,
      waybill: shipments.waybill,
      lines: invoices.lines,
      subtotal: invoices.subtotal,
      tax: invoices.tax,
      billTo: invoices.billTo,
    })
    .from(invoices)
    .innerJoin(accounts, eq(accounts.id, invoices.accountId))
    .leftJoin(shipments, eq(shipments.id, invoices.shipmentId))
    .where(or(eq(shipments.companyAccountId, co.id), co.tin ? sql`${invoices.billTo}->>'tin' = ${co.tin}` : undefined))
    .orderBy(desc(invoices.issueDate))
    .limit(200);
  const out = rows.map((r) => ({ ...r, issueDate: r.issueDate.toISOString(), dueDate: r.dueDate.toISOString(), due: Math.max(0, r.total - r.amountPaid) }));
  return {
    invoices: out,
    owed: out.filter((i) => i.status !== "void").reduce((n, i) => n + i.due, 0),
    overdue: out.filter((i) => i.status !== "void" && i.due > 0 && new Date(i.dueDate) < new Date()).reduce((n, i) => n + i.due, 0),
  };
}

/* ------------------------------------------------------------- reports */

const reportSchema = z.object({ months: z.coerce.number().int().min(1).max(12).default(6) });

/** Parcels and spend by month, by department and by person, and where they went. */
export async function companyReport(user: CurrentUser, raw: unknown) {
  const co = await managed(user);
  const { months } = reportSchema.parse(raw ?? {});
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const scope = and(eq(shipments.companyAccountId, co.id), gte(shipments.createdAt, from), live);
  const [byMonth, byDept, byPerson, byRegion, [totals]] = await Promise.all([
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${shipments.createdAt}), 'YYYY-MM')`,
        parcels: sql<number>`count(*)::int`,
        spend: sql<number>`coalesce(sum(${shipments.totalCharge}), 0)::int`,
      })
      .from(shipments)
      .where(scope)
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    db
      .select({ id: departments.id, name: departments.name, parcels: sql<number>`count(${shipments.id})::int`, spend: sql<number>`coalesce(sum(${shipments.totalCharge}), 0)::int` })
      .from(shipments)
      .leftJoin(departments, eq(departments.id, shipments.departmentId))
      .where(scope)
      .groupBy(departments.id, departments.name)
      .orderBy(desc(sql`3`)),
    db
      .select({ id: users.id, name: users.name, parcels: sql<number>`count(${shipments.id})::int`, spend: sql<number>`coalesce(sum(${shipments.totalCharge}), 0)::int` })
      .from(shipments)
      .innerJoin(users, eq(users.id, shipments.createdBy))
      .where(scope)
      .groupBy(users.id, users.name)
      .orderBy(desc(sql`3`))
      .limit(20),
    db
      .select({ region: sql<string>`${shipments.consignee}->'address'->>'region'`, parcels: sql<number>`count(*)::int` })
      .from(shipments)
      .where(scope)
      .groupBy(sql`1`)
      .orderBy(desc(sql`2`))
      .limit(10),
    db
      .select({
        parcels: sql<number>`count(*)::int`,
        spend: sql<number>`coalesce(sum(${shipments.totalCharge}), 0)::int`,
        delivered: sql<number>`count(*) filter (where ${shipments.state} = 'DELIVERED')::int`,
        onTheWay: sql<number>`count(*) filter (where ${shipments.state} not in ('DELIVERED','RETURNED'))::int`,
      })
      .from(shipments)
      .where(scope),
  ]);
  return {
    from: from.toISOString(),
    months,
    totals: totals ?? { parcels: 0, spend: 0, delivered: 0, onTheWay: 0 },
    byMonth,
    byDepartment: byDept.map((d) => ({ id: d.id, name: d.name ?? null, parcels: d.parcels, spend: d.spend })),
    byPerson,
    byRegion,
  };
}
