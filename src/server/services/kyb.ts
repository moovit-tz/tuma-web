import "server-only";
import { and, asc, desc, eq, inArray, isNull, ne, notInArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db, type Tx } from "../db/client";
import { accounts, agents, branches, kybApplications, kybEvents, rolePermissions, roles, users } from "../db/schema";
import { audit } from "../audit";
import { ulid } from "../ids";
import { enqueue } from "../adapters/outbox";
import { COMPLYOS_DECISIONS, kybSubmission, searchBusinessRegistry } from "../adapters/complyos";
import { DomainError } from "./shipments";
import type { DriverCtx } from "./drivers";
import { toE164TZ } from "@/domain/phone";
import { cached } from "../adapters/cache";
import type { RegistryRecord } from "@/domain/brela";
import { TZ_REGIONS } from "@/domain/pricing";
import { DEFAULT_ROLES } from "@/domain/roles";
import { BUSINESS_TYPES, DEFAULT_AGENT_COMMISSION_BPS, WORKFLOW_STEPS, normaliseTin, normaliseWorkflow } from "@/domain/agents";

/**
 * Business self-onboarding (KYB) from the Tuma app. Today one account kind is open: parcel agent.
 *
 * submitted → in_review → approved | needs_info | rejected. ComplyOS owns the decision; Tuma records it and tells the
 * applicant by SMS.
 *
 * The business's workspace opens at the first submission, as a *pending* account with its head office, so the owner
 * can invite staff, create roles and add offices while the review runs (pending accounts can only set up: see
 * effectivePermissions). Approval activates the account and opens the agent record, FinOps float wallet and SEAL site.
 */
export const AGENT_ROLE = "parcel_agent";
const KYB_RECEIVED_TEMPLATE = "kyb.received";
const KYB_UPDATED_TEMPLATE = "kyb.updated";

const phone = z
  .string()
  .trim()
  .transform((v, c) => toE164TZ(v) ?? (c.addIssue({ code: "custom", message: "Enter a valid Tanzanian mobile number." }), z.NEVER));

export const kybSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  businessType: z.enum(BUSINESS_TYPES),
  tin: z
    .string()
    .transform((v, c) => normaliseTin(v) ?? (c.addIssue({ code: "custom", message: "A TIN has 9 digits, like 123-456-789." }), z.NEVER)),
  licenceNumber: z.string().trim().max(40).optional().transform((v) => v || null),
  /** The BRELA record picked in the company lookup. Recorded as the applicant's claim; ComplyOS verifies it. */
  registration: z
    .object({
      source: z.literal("brela"),
      number: z.string().trim().min(1).max(40),
      name: z.string().trim().min(2).max(200),
      kind: z.enum(["company", "business_name"]),
      subtype: z.string().trim().max(120).nullish(),
      status: z.string().trim().max(60).nullish(),
      registeredOn: z.string().trim().max(10).nullish(),
      address: z.string().trim().max(300).nullish(),
    })
    .nullish()
    .transform((v) => v ?? null),
  /** Key returned by POST /api/driver/uploads with kind=kyb. */
  licenceFile: z
    .string()
    .regex(/^kyb\/\d{4}\/\d{2}\/[0-9A-Z]{26}\.(jpg|png|webp|heic|pdf)$/, "Upload the licence again.")
    .optional()
    .transform((v) => v || null),
  office: z.object({
    region: z.enum(TZ_REGIONS),
    district: z.string().trim().min(2).max(60),
    street: z.string().trim().min(2).max(120),
    landmark: z.string().trim().max(120).optional().transform((v) => v || undefined),
    phone,
    hours: z.string().trim().max(60).optional().transform((v) => v || undefined),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  }),
  contact: z.object({
    name: z.string().trim().min(3).max(80),
    phone,
    email: z.union([z.email(), z.literal("")]).optional().transform((v) => v || undefined),
    role: z.string().trim().max(60).optional().transform((v) => v || undefined),
  }),
  workflow: z
    .array(z.enum(WORKFLOW_STEPS))
    .min(1, "Choose at least one step.")
    .transform((w) => normaliseWorkflow(w)),
  /** The applicant confirms the details are true and accepts the agent terms. */
  declaration: z.literal(true, "Confirm the declaration to submit."),
});

type App = typeof kybApplications.$inferSelect;
const OPEN = ["submitted", "in_review"] as const;
const EDITABLE = ["needs_info", "rejected"] as const;

function newRef() {
  const now = new Date();
  const yymm = `${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => "0123456789ABCDEFGHJKMNPQRSTVWXYZ"[b & 31]).join("");
  return `KYB-${yymm}-${rand}`;
}

async function eventsOf(applicationId: string) {
  return db
    .select({ status: kybEvents.status, note: kybEvents.note, at: kybEvents.occurredAt })
    .from(kybEvents)
    .where(eq(kybEvents.applicationId, applicationId))
    .orderBy(asc(kybEvents.occurredAt));
}

/** What the applicant sees: status, the note from the reviewer, and their own answers (to correct and resubmit). */
export async function kybView(a: App) {
  return {
    ref: a.ref,
    accountKind: a.accountKind,
    status: a.status,
    note: a.decisionNote,
    canEdit: (EDITABLE as readonly string[]).includes(a.status),
    submittedAt: a.submittedAt.toISOString(),
    decidedAt: a.decidedAt?.toISOString() ?? null,
    version: a.version,
    application: {
      businessName: a.businessName,
      businessType: a.businessType,
      tin: a.tin,
      licenceNumber: a.licenceNumber,
      registration: a.registration,
      licenceFile: a.licenceFile,
      office: a.office,
      contact: a.contact,
      workflow: a.workflow,
    },
    events: (await eventsOf(a.id)).map((e) => ({ status: e.status, note: e.note, at: e.at.toISOString() })),
  };
}

export async function myKyb(ctx: DriverCtx) {
  const [a] = await db.select().from(kybApplications).where(eq(kybApplications.userId, ctx.user.id));
  return a ? kybView(a) : null;
}

/**
 * Whether a business is already on Tuma, by its TIN or BRELA number: an account, or someone else's application
 * that wasn't turned down. Its owner adds people to the team; nobody registers the same business twice.
 */
export async function businessOnTuma(userId: string, raw: { tin?: string | null; regNo?: string | null }) {
  const tin = raw.tin ? normaliseTin(raw.tin) : null;
  const reg = raw.regNo?.trim() || null;
  if (!tin && !reg) return { taken: false as const };
  const [acct] = tin
    ? await db.select({ name: accounts.name }).from(accounts).where(and(eq(accounts.tin, tin), eq(accounts.type, "partner")))
    : [];
  const [app] = acct
    ? []
    : await db
        .select({ name: kybApplications.businessName, status: kybApplications.status })
        .from(kybApplications)
        .where(
          and(
            ne(kybApplications.userId, userId),
            notInArray(kybApplications.status, ["rejected"]),
            or(tin ? eq(kybApplications.tin, tin) : undefined, reg ? sql`${kybApplications.registration}->>'number' = ${reg}` : undefined),
          ),
        )
        .limit(1);
  const hit = acct ?? app;
  if (!hit) return { taken: false as const };
  return { taken: true as const, name: hit.name, by: tin && acct ? ("tin" as const) : ("registration" as const) };
}

/** Submit (or, after ComplyOS asked for changes, resubmit) the signed-in user's application. */
export async function submitKyb(ctx: DriverCtx, raw: unknown) {
  const input = kybSchema.parse(raw);
  noBacklog.delete(ctx.user.id);
  const [existing] = await db.select().from(kybApplications).where(eq(kybApplications.userId, ctx.user.id));
  // Their own pending workspace doesn't count; belonging to any other business does.
  if (ctx.user.accountId && ctx.user.accountId !== existing?.accountId) throw new DomainError("HAS_ACCOUNT", "You already belong to a business on Tuma.", 409);
  if (existing && (OPEN as readonly string[]).includes(existing.status)) {
    throw new DomainError("ALREADY_SUBMITTED", "Your application is already being reviewed.", 409);
  }
  if (existing?.status === "approved") throw new DomainError("ALREADY_APPROVED", "Your business is already approved.", 409);
  const other = await businessOnTuma(ctx.user.id, { tin: input.tin, regNo: input.registration?.number });
  if (other.taken) {
    throw new DomainError("BUSINESS_ON_TUMA", `${other.name} is already on Tuma. Ask its owner to add you to the team with your phone number.`, 409);
  }

  const fields = {
    businessName: input.businessName,
    businessType: input.businessType,
    tin: input.tin,
    licenceNumber: input.licenceNumber,
    licenceFile: input.licenceFile,
    registration: input.registration,
    office: input.office,
    contact: input.contact,
    workflow: input.workflow,
  };
  const app = await db.transaction(async (tx) => {
    const [a] = existing
      ? await tx
          .update(kybApplications)
          .set({ ...fields, status: "submitted", version: existing.version + 1, decisionNote: null, decidedAt: null, submittedAt: new Date(), updatedAt: new Date() })
          .where(eq(kybApplications.id, existing.id))
          .returning()
      : await tx.insert(kybApplications).values({ ...fields, ref: newRef(), userId: ctx.user.id }).returning();
    const accountId = await openWorkspace(tx, a);
    a.accountId = accountId;
    await tx.insert(kybEvents).values({ applicationId: a.id, status: "submitted", source: "tuma", note: existing ? "Resubmitted with changes" : null });
    await enqueue(tx, {
      target: "complyos",
      topic: "kyb.submitted",
      idempotencyKey: `kyb:${a.ref}:v${a.version}`,
      payload: kybSubmission({ ...a, applicantId: ctx.user.id }),
    });
    await enqueue(tx, {
      target: "hudufeed",
      topic: "notify.send",
      idempotencyKey: `kyb-received:${a.ref}:v${a.version}`,
      payload: { template: KYB_RECEIVED_TEMPLATE, channel: "sms", language: ctx.user.locale, to: a.contact.phone, variables: { ref: a.ref, business: a.businessName } },
    });
    await audit(tx, { actorId: ctx.user.id, action: existing ? "kyb.resubmit" : "kyb.submit", entity: "kyb_application", entityId: a.ref, after: { tin: a.tin, workflow: a.workflow } });
    return a;
  });
  return kybView(app);
}

/* ------------------------------------------------------------- decisions */

export const kybDecisionSchema = z.object({
  eventId: z.string().min(6).max(120),
  ref: z.string().regex(/^KYB-\d{4}-[0-9A-Z]{5}$/),
  decision: z.enum(COMPLYOS_DECISIONS),
  note: z.string().trim().max(1000).optional(),
  complyRef: z.string().max(120).optional(),
  occurredAt: z.coerce.date().optional(),
});

/**
 * Applies a ComplyOS decision (webhook or the dev stand-in). Redelivered events are applied once. Approved is final;
 * a decision on an application that isn't under review any more is recorded but doesn't change it.
 */
export async function applyKybDecision(raw: unknown, actorId = "complyos") {
  const d = kybDecisionSchema.parse(raw);
  return db.transaction(async (tx) => {
    const [a] = await tx.select().from(kybApplications).where(eq(kybApplications.ref, d.ref)).for("update");
    if (!a) throw new DomainError("NOT_FOUND", "No application with that reference.", 404);
    const [ev] = await tx
      .insert(kybEvents)
      .values({ applicationId: a.id, status: d.decision, note: d.note ?? null, source: "complyos", externalId: `complyos:${d.eventId}`, occurredAt: d.occurredAt ?? new Date() })
      .onConflictDoNothing({ target: kybEvents.externalId })
      .returning({ id: kybEvents.id });
    if (!ev) return { ref: a.ref, status: a.status, duplicate: true };
    if (!(OPEN as readonly string[]).includes(a.status)) return { ref: a.ref, status: a.status, ignored: true };

    const final = d.decision === "approved" || d.decision === "rejected";
    let accountId: string | null = null;
    if (d.decision === "approved") accountId = a.accountKind === "company" ? await activateCompany(tx, a) : await activateAgent(tx, a);
    await tx
      .update(kybApplications)
      .set({
        status: d.decision,
        decisionNote: d.note ?? null,
        complyRef: d.complyRef ?? a.complyRef,
        decidedAt: final || d.decision === "needs_info" ? new Date() : null,
        accountId: accountId ?? a.accountId,
        updatedAt: new Date(),
      })
      .where(eq(kybApplications.id, a.id));
    if (d.decision !== "in_review") {
      const [u] = await tx.select({ locale: users.locale }).from(users).where(eq(users.id, a.userId));
      await enqueue(tx, {
        target: "hudufeed",
        topic: "notify.send",
        idempotencyKey: `kyb-updated:${a.ref}:${d.eventId}`,
        payload: { template: KYB_UPDATED_TEMPLATE, channel: "sms", language: u?.locale ?? "sw", to: a.contact.phone, variables: { ref: a.ref, status: d.decision, note: d.note ?? "" } },
      });
    }
    await audit(tx, { actorId, action: `kyb.${d.decision}`, entity: "kyb_application", entityId: a.ref, before: { status: a.status }, after: { status: d.decision, accountId } });
    return { ref: a.ref, status: d.decision, accountId };
  });
}

/** Seeds a default role on first use (the seed script normally does this), so approval never depends on it. */
async function ensureRole(tx: Tx, key: string) {
  const seed = DEFAULT_ROLES.find((r) => r.key === key);
  if (!seed) throw new Error(`Unknown default role ${key}`);
  const inserted = await tx
    .insert(roles)
    .values({ key: seed.key, name: seed.name, description: seed.description, surface: seed.surface, system: true })
    .onConflictDoNothing()
    .returning({ key: roles.key });
  if (inserted.length) await tx.insert(rolePermissions).values(seed.permissions.map((p) => ({ roleKey: key, permission: p })));
}

function branchCode(name: string) {
  return (name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3) || "AGT").padEnd(3, "X");
}

/**
 * The business's workspace: a pending account, its head office from the application, and the owner linked to it with
 * the parcel agent role (kept across Ondi sign-ins). Called at every submission: the first opens it, a resubmission
 * brings the name, TIN and head office up to date. Returns the account id.
 */
async function openWorkspace(tx: Tx, a: App): Promise<string> {
  const office = {
    region: a.office.region,
    district: a.office.district,
    address: [a.office.street, a.office.landmark].filter(Boolean).join(", "),
    phone: a.office.phone,
    // The pin from the application: the office is a Tuma point customers find on the map.
    ...(a.office.lat != null && a.office.lng != null ? { lat: a.office.lat, lng: a.office.lng } : {}),
  };
  let accountId = a.accountId;
  if (accountId) {
    // Closed (its owner deleted their account, then came back): start a new business rather than reopen it.
    const [prev] = await tx.select({ status: accounts.status }).from(accounts).where(eq(accounts.id, accountId));
    if (prev?.status === "closed") accountId = null;
  }
  if (accountId) {
    await tx.update(accounts).set({ name: a.businessName, tin: a.tin, syncedAt: new Date() }).where(eq(accounts.id, accountId));
    await tx.update(branches).set({ name: a.businessName, ...office }).where(and(eq(branches.accountId, accountId), eq(branches.isHead, true)));
  } else {
    accountId = `acc_agt_${ulid().toLowerCase()}`;
    await tx.insert(accounts).values({ id: accountId, type: "partner", partnerKind: "parcel_agent", name: a.businessName, tin: a.tin, status: "pending" });
    await tx.insert(branches).values({ accountId, name: a.businessName, code: branchCode(a.businessName), isHead: true, ...office });
    await tx.update(kybApplications).set({ accountId }).where(eq(kybApplications.id, a.id));
  }
  await ensureRole(tx, AGENT_ROLE);
  const [u] = await tx.select().from(users).where(eq(users.id, a.userId));
  const add = (list: string[]) => [...new Set([...list, AGENT_ROLE])];
  await tx
    .update(users)
    .set({ accountId, roles: add(u.roles), grantedRoles: add(u.grantedRoles), phone: u.phone ?? a.contact.phone })
    .where(eq(users.id, a.userId));
  return accountId;
}

/**
 * Applications sent before workspaces existed have none, so their owners would land on the application instead of
 * their home. On sign-in, open the workspace for a person who has an open application but no business yet. Returns
 * true when it opened one (the caller re-reads the user).
 */
const noBacklog = new Set<string>();
export async function ensureWorkspace(userId: string): Promise<boolean> {
  // New applications open their workspace when sent, so a person found with nothing to open stays that way.
  if (noBacklog.has(userId)) return false;
  const [a] = await db
    .select()
    .from(kybApplications)
    .where(and(
          eq(kybApplications.userId, userId),
          ne(kybApplications.accountKind, "company"),
          inArray(kybApplications.status, ["submitted", "in_review", "needs_info"]),
          isNull(kybApplications.accountId),
        ))
    .orderBy(desc(kybApplications.submittedAt))
    .limit(1);
  if (!a) {
    if (noBacklog.size > 50_000) noBacklog.clear();
    noBacklog.add(userId);
    return false;
  }
  await db.transaction(async (tx) => {
    // Another request may have opened it meanwhile.
    const [fresh] = await tx.select().from(kybApplications).where(eq(kybApplications.id, a.id)).for("update");
    if (!fresh.accountId) await openWorkspace(tx, fresh);
  });
  return true;
}

/** Approval: activates the workspace (opening it first for applications from before workspaces) and the agent. */
async function activateAgent(tx: Tx, a: App): Promise<string> {
  const accountId = await openWorkspace(tx, a);
  await tx.update(accounts).set({ status: "active", syncedAt: new Date() }).where(eq(accounts.id, accountId));
  const [branch] = await tx
    .select({ id: branches.id })
    .from(branches)
    .where(and(eq(branches.accountId, accountId), eq(branches.isHead, true)))
    .limit(1);
  const commissionBps = Number(process.env.AGENT_COMMISSION_BPS) || DEFAULT_AGENT_COMMISSION_BPS;
  await tx.insert(agents).values({ accountId, ownerId: a.userId, kybId: a.id, branchId: branch.id, workflow: a.workflow, commissionBps }).onConflictDoNothing();

  const base = { accountId, ref: a.ref, name: a.businessName };
  await enqueue(tx, { target: "crm", topic: "account.create", idempotencyKey: `crm-account:${accountId}`, payload: { ...base, type: "partner", partnerKind: "parcel_agent", tin: a.tin, contact: a.contact } });
  await enqueue(tx, { target: "finops", topic: "wallet.open", idempotencyKey: `wallet-open:${accountId}`, payload: { ...base, purpose: "agent_float", currency: "TZS", commissionBps } });
  await enqueue(tx, {
    target: "seal",
    topic: "site.register",
    idempotencyKey: `seal-site:${branch.id}`,
    payload: { ...base, siteId: branch.id, office: a.office, workflow: a.workflow },
  });
  return accountId;
}

/** Approval of a sending company: its account opens fully (the parcel allowance no longer applies). */
async function activateCompany(tx: Tx, a: App): Promise<string> {
  if (!a.accountId) throw new DomainError("NO_ACCOUNT", "This company has no account to approve.", 409);
  await tx.update(accounts).set({ status: "active", syncedAt: new Date() }).where(eq(accounts.id, a.accountId));
  await enqueue(tx, {
    target: "crm",
    topic: "account.create",
    idempotencyKey: `crm-account:${a.accountId}`,
    payload: { accountId: a.accountId, ref: a.ref, name: a.businessName, type: "shipper", tin: a.tin, contact: a.contact },
  });
  return a.accountId;
}

/**
 * Inside the company's registration: its KYC application, sent to ComplyOS for review. The company may send a few
 * parcels on its account while it waits (pendingCompanyParcelAllowance). Reuses a closed application of the same
 * person (one turned down before), as the table keeps one per person.
 */
export async function submitCompanyKyb(
  tx: Tx,
  c: {
    userId: string;
    accountId: string;
    locale: string;
    name: string;
    tin: string;
    regNo?: string;
    licenceFile?: string | null;
    office: { region: string; district: string; street: string; phone: string };
    contact: { name: string; phone: string; email?: string };
  },
) {
  const fields = {
    accountKind: "company",
    businessName: c.name,
    businessType: "company",
    tin: c.tin,
    licenceNumber: null,
    licenceFile: c.licenceFile ?? null,
    registration: c.regNo ? { source: "brela" as const, number: c.regNo, name: c.name, kind: "company" as const } : null,
    office: c.office as App["office"],
    contact: c.contact,
    workflow: [] as string[],
    accountId: c.accountId,
    status: "submitted" as const,
    decisionNote: null,
    decidedAt: null,
    submittedAt: new Date(),
    updatedAt: new Date(),
  };
  const [existing] = await tx.select().from(kybApplications).where(eq(kybApplications.userId, c.userId)).for("update");
  if (existing && ((OPEN as readonly string[]).includes(existing.status) || existing.status === "approved")) {
    throw new DomainError("ALREADY_SUBMITTED", "You already have a business application on Tuma.", 409);
  }
  const [a] = existing
    ? await tx.update(kybApplications).set({ ...fields, version: existing.version + 1 }).where(eq(kybApplications.id, existing.id)).returning()
    : await tx.insert(kybApplications).values({ ...fields, ref: newRef(), userId: c.userId }).returning();
  await tx.insert(kybEvents).values({ applicationId: a.id, status: "submitted", source: "tuma", note: "Company registered" });
  await enqueue(tx, { target: "complyos", topic: "kyb.submitted", idempotencyKey: `kyb:${a.ref}:v${a.version}`, payload: kybSubmission({ ...a, applicantId: c.userId }) });
  await enqueue(tx, {
    target: "hudufeed",
    topic: "notify.send",
    idempotencyKey: `kyb-received:${a.ref}:v${a.version}`,
    payload: { template: KYB_RECEIVED_TEMPLATE, channel: "sms", language: c.locale, to: c.contact.phone, variables: { ref: a.ref, business: a.businessName } },
  });
  return a;
}

/** A company's KYC as its admin sees it: where the review is and what the reviewer said. Null before it applied. */
export async function companyKyb(accountId: string) {
  const [a] = await db
    .select()
    .from(kybApplications)
    .where(and(eq(kybApplications.accountId, accountId), eq(kybApplications.accountKind, "company")))
    .orderBy(desc(kybApplications.submittedAt))
    .limit(1);
  return a ? { ref: a.ref, status: a.status, note: a.decisionNote, submittedAt: a.submittedAt.toISOString(), decidedAt: a.decidedAt?.toISOString() ?? null, hasDocument: !!a.licenceFile } : null;
}

/* --------------------------------------------------------- review (staff) */

/** Applications for the dev stand-in and, later, the console: open ones first. */
export async function listKyb(statuses?: string[]) {
  const rows = await db
    .select()
    .from(kybApplications)
    .where(statuses?.length ? inArray(kybApplications.status, statuses as App["status"][]) : sql`true`)
    .orderBy(desc(kybApplications.submittedAt))
    .limit(100);
  return rows;
}

/* ------------------------------------------------------------ company lookup */

export const lookupSchema = z.object({
  /** Which BRELA register. Left out: both (companies first), for search-as-you-type on the business name. */
  kind: z.enum(["company", "business_name"]).optional(),
  /** A registered name (at least 3 letters) or the registration / incorporation number. */
  query: z
    .string()
    .trim()
    .min(3, "Type at least 3 characters of the name, or the registration number.")
    .max(120),
});

/**
 * Finds the business in the BRELA register (through ComplyOS) so the applicant can pick it and have step one, and the
 * office address, filled in. A lookup that can't reach the register says so; the applicant can still type it all in.
 */
/** Recent answers, so search-as-you-type, retyping and switching register don't ask BRELA again. In-memory, 5 minutes. */
/** Register entries hardly change: a search is reused for a day. */
const LOOKUP_TTL = 24 * 60 * 60_000;

export async function lookupBusiness(raw: unknown) {
  const input = lookupSchema.parse(raw);
  const key = `brela:v2:${input.kind ?? "any"}:${input.query.trim().toLowerCase().replace(/\s+/g, " ")}`;
  try {
    // Shared cache (Redis): the same name searched again, by anyone, doesn't go back to the register.
    const { value } = await cached(key, LOOKUP_TTL / 1000, async () => {
      let results: RegistryRecord[];
      if (input.kind) results = (await searchBusinessRegistry({ kind: input.kind, query: input.query })).results;
      else {
        // Both registers at once; one being down still answers with the other.
        const both = await Promise.allSettled([
          searchBusinessRegistry({ kind: "company", query: input.query }),
          searchBusinessRegistry({ kind: "business_name", query: input.query }),
        ]);
        const ok = both.flatMap((r) => (r.status === "fulfilled" ? [r.value.results] : []));
        if (!ok.length) throw (both[0] as PromiseRejectedResult).reason;
        results = ok.flat();
      }
      return results.slice(0, 10);
    });
    return { results: value };
  } catch (e) {
    console.warn("[kyb] company lookup failed", (e as Error).message);
    throw new DomainError("REGISTRY_UNAVAILABLE", "We couldn't reach the BRELA register just now. Try again, or fill in your details yourself.", 503);
  }
}
