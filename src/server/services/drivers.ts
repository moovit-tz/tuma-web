import { seesBusiness } from "@/domain/roles";
import type { OndiClaims } from "../adapters/ondi";
import { activeHold, lookOnly } from "./admin/risk";
import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db } from "../db/client";
import { accounts, agents, branches, codRecords, driverHandoffs, drivers, jobShipments, jobs, kybApplications, paymentSettings, reasonCodes, shipments, supportRequests, trackingOtps, users } from "../db/schema";
import { ensureWorkspace } from "./kyb";
import { audit } from "../audit";
import { ulid } from "../ids";
import { enqueue } from "../adapters/outbox";
import { effectivePermissions } from "../rbac";
import { invitesFor } from "./team-invites";
import { signDriverToken } from "../auth/driver-token";
import type { CurrentUser } from "../auth/current-user";
import { DomainError, transition } from "./shipments";
import { hashCode as receiverCodeHash } from "./tracking";
import { toE164TZ } from "@/domain/phone";
import { TZ_REGIONS } from "@/domain/pricing";
import { amountToCollect } from "@/domain/payments";
import { nextStates, type ShipmentState } from "@/domain/states";
import { JOB_PHASES, VEHICLE_KEYS, VEHICLE_KINDS, addressLine, haversineM, ineligible, isVehicleKind, pointFor, roleFor, vehicleAllowedIn, type VehicleKind } from "@/domain/drivers";

/**
 * Tuma-X, the driver app: sign-in by SMS code, registration, presence, job offers and the run itself.
 * Every shipment change goes through `transition()`, so the state machine, permissions, COD, notifications
 * and audit are the same as for any other actor.
 */

const ACTIVE = ["assigned", "in_progress"];

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export type DriverRow = typeof drivers.$inferSelect;
export type DriverCtx = { user: CurrentUser; driver: DriverRow | null };

/* ------------------------------------------------------------- sign-in */

/**
 * Tuma-X signs in with Ondi SSO, like the portal. The browser part (Ondi's sign-in page) runs in the app's
 * secure browser tab; the portal finishes the OIDC exchange and hands the app a one-time code bound to the app's
 * own PKCE challenge, which the app swaps for a bearer token. No token ever travels in a URL.
 */
const HANDOFF_TTL_MS = 2 * 60_000;
const sha = (v: string) => createHash("sha256").update(v).digest("hex");
const s256 = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");

/** Redirect URIs the app may ask to be sent back to (custom scheme). */
export function allowedAppRedirect(uri: string | null): string | null {
  if (!uri) return null;
  const allowed = (process.env.TUMAX_REDIRECT_URIS ?? "tumax://auth").split(",").map((u) => u.trim()).filter(Boolean);
  return allowed.includes(uri) ? uri : null;
}

/**
 * After Ondi: refresh the identity snapshot and issue the hand-off code. With real Ondi the role keys come from
 * the claim; a registered driver keeps the field role Tuma gave them (Tuma owns the driver relationship).
 */
export async function finishDriverLogin(claims: OndiClaims, appChallenge: string) {
  let [existing] = await db.select().from(users).where(eq(users.id, claims.sub));
  // They deleted their Tuma account before: start afresh (no roles, business or driver record carried over).
  const fresh = !!existing?.deletedAt;
  if (fresh) {
    await db
      .update(users)
      .set({ active: true, deletedAt: null, roles: [], grantedRoles: [], accountId: null, branchId: null })
      .where(eq(users.id, claims.sub));
    existing = { ...existing, active: true, deletedAt: null, roles: [], grantedRoles: [], accountId: null, branchId: null };
  }
  if (existing && !existing.active) throw new DomainError("SUSPENDED", "This account is suspended. Call Tuma support.", 403);
  const [driverRow] = await db.select().from(drivers).where(eq(drivers.userId, claims.sub));
  const d = driverRow?.status === "closed" ? undefined : driverRow;
  const stub = process.env.ONDI_MODE === "stub";
  const fieldRole = d && isVehicleKind(d.vehicleKind) ? [roleFor(d.vehicleKind)] : [];
  // Roles Tuma granted itself (KYB approval) survive a fresh Ondi claim.
  const roles = stub && existing ? existing.roles : [...new Set([...claims.roles, ...fieldRole, ...(existing?.grantedRoles ?? [])])];
  await db
    .insert(users)
    .values({ id: claims.sub, name: claims.name, email: claims.email, phone: claims.phone, avatarUrl: claims.picture ?? null, accountId: claims.accountId ?? null, roles, locale: claims.locale ?? "sw", lastSeenAt: new Date() })
    .onConflictDoUpdate({
      target: users.id,
      set: { name: claims.name, email: claims.email, roles, lastSeenAt: new Date(), ...(claims.phone ? { phone: claims.phone } : {}), ...(claims.picture ? { avatarUrl: claims.picture } : {}) },
    });

  const code = randomBytes(32).toString("base64url");
  await db.insert(driverHandoffs).values({ codeHash: sha(code), challenge: appChallenge, userId: claims.sub, expiresAt: new Date(Date.now() + HANDOFF_TTL_MS) });
  return code;
}

/** The app swaps the hand-off code (once, within two minutes, with its PKCE verifier) for a token. */
export async function swapHandoff(code: string, verifier: string) {
  if (!code || !verifier) throw new DomainError("BAD_CODE", "Sign in again.", 400);
  const [h] = await db.select().from(driverHandoffs).where(eq(driverHandoffs.codeHash, sha(code)));
  if (!h || h.usedAt || h.expiresAt < new Date()) throw new DomainError("CODE_EXPIRED", "The sign-in expired. Sign in again.", 400);
  // Burn it first, so a replay can't race the check.
  const [burned] = await db.update(driverHandoffs).set({ usedAt: new Date() }).where(and(eq(driverHandoffs.id, h.id), isNull(driverHandoffs.usedAt))).returning({ id: driverHandoffs.id });
  if (!burned) throw new DomainError("CODE_EXPIRED", "The sign-in expired. Sign in again.", 400);
  if (!same(h.challenge, s256(verifier))) throw new DomainError("BAD_VERIFIER", "Sign in again.", 400);
  const [u] = await db.select().from(users).where(eq(users.id, h.userId));
  if (!u?.active) throw new DomainError("SUSPENDED", "This account is suspended. Call Tuma support.", 403);
  const [d] = await db.select().from(drivers).where(eq(drivers.userId, h.userId));
  return { token: await signDriverToken(h.userId), user: { id: u.id, name: u.name, email: u.email, phone: u.phone ?? null, picture: u.avatarUrl ?? null }, driver: d ? await driverView(d) : null };
}

/** Resolves the bearer token's user, re-checked on every request. */
export async function driverContext(userId: string | null): Promise<DriverCtx | null> {
  if (!userId) return null;
  let [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u || !u.active) return null;
  if (!u.accountId && (await ensureWorkspace(u.id))) [u] = await db.select().from(users).where(eq(users.id, userId));
  const [[d], eff, hold] = await Promise.all([db.select().from(drivers).where(eq(drivers.userId, userId)), effectivePermissions(u.roles, u.accountId), activeHold(u.id, u.accountId)]);
  // Frozen by risk: the app can still show things, but nothing can be done.
  const permissions = hold ? new Set([...eff.permissions].filter(lookOnly)) : eff.permissions;
  return {
    user: { id: u.id, name: u.name, accountId: u.accountId, branchId: u.branchId, roles: u.roles, permissions, frozen: hold?.reason ?? null, accountStatus: eff.accountStatus, trial: eff.trial, locale: u.locale },
    driver: d ?? null,
  };
}

function needDriver(ctx: DriverCtx, approved = true): DriverRow {
  if (!ctx.driver) throw new DomainError("NOT_REGISTERED", "Finish registering first.", 403);
  if (approved && ctx.driver.status !== "approved") {
    throw new DomainError(ctx.driver.status === "suspended" ? "SUSPENDED" : "NOT_APPROVED", ctx.driver.status === "suspended" ? "Your account is suspended. Call Tuma support." : "Your registration is still being reviewed.", 403);
  }
  if (approved && !ctx.user.permissions.has("driver.jobs")) throw new DomainError("FORBIDDEN", "Your role can't take jobs.", 403);
  return ctx.driver;
}

/* ------------------------------------------------------------ profile */

export const registrationSchema = z.object({
  fullName: z.string().trim().min(3).max(80),
  /** Mobile number customers and dispatch call; Ondi doesn't supply one. */
  phone: z.string().trim().min(9).max(20),
  region: z.enum(TZ_REGIONS),
  vehicleKind: z.enum(VEHICLE_KEYS as [VehicleKind, ...VehicleKind[]]),
  plate: z.string().trim().max(16).default(""),
  /** Everything else the app collects; stored as-is for the reviewer. */
  profile: z.record(z.string(), z.unknown()).default({}),
});

async function poolAccount(): Promise<string> {
  const [a] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.type, "internal")).orderBy(asc(accounts.id)).limit(1);
  if (!a) throw new DomainError("NO_POOL", "No Tuma operations account is set up.", 500);
  return a.id;
}

/**
 * First registration, or a change of details. A new driver joins Tuma's pool, pending review.
 * Changing region, vehicle or plate sends an approved driver back for review.
 */
export async function registerDriver(ctx: DriverCtx, raw: unknown) {
  const input = registrationSchema.parse(raw);
  if (!vehicleAllowedIn(input.region, input.vehicleKind)) throw new DomainError("VEHICLE_NOT_ALLOWED", `A ${VEHICLE_KINDS[input.vehicleKind].label} can't work in ${input.region}.`);
  const phone = toE164TZ(input.phone);
  if (!phone) throw new DomainError("BAD_PHONE", "Enter a valid mobile number.", 400);
  const [taken] = await db.select({ id: drivers.userId }).from(drivers).where(eq(drivers.phone, phone));
  if (taken && taken.id !== ctx.user.id) throw new DomainError("PHONE_TAKEN", "Another driver uses this number.", 409);
  const plate = input.plate.toUpperCase().replace(/\s+/g, " ");
  const prev = ctx.driver;
  const changed = !prev || prev.region !== input.region || prev.vehicleKind !== input.vehicleKind || prev.plate !== plate || prev.phone !== phone;
  const status = prev?.status === "suspended" ? "suspended" : changed ? (process.env.DRIVER_AUTO_APPROVE === "1" ? "approved" : "pending") : prev.status;
  if (prev && changed && (await activeJob(ctx.user.id))) throw new DomainError("JOB_ACTIVE", "Finish your current job before changing vehicle or region.", 409);

  await db.transaction(async (tx) => {
    const values = { phone, region: input.region, vehicleKind: input.vehicleKind, plate, status, profile: { ...(prev?.profile ?? {}), ...input.profile, fullName: input.fullName }, ...(changed ? { online: false } : {}) };
    if (prev) await tx.update(drivers).set(values).where(eq(drivers.userId, ctx.user.id));
    else await tx.insert(drivers).values({ userId: ctx.user.id, accountId: await poolAccount(), ...values });
    // The vehicle decides the field role (riders take parcels, truck drivers cargo); any other roles stay.
    const roles = [...ctx.user.roles.filter((r) => r !== "rider" && r !== "truck_driver"), roleFor(input.vehicleKind)];
    await tx.update(users).set({ name: input.fullName, phone, roles }).where(eq(users.id, ctx.user.id));
    await audit(tx, { actorId: ctx.user.id, action: prev ? "driver.update" : "driver.register", entity: "driver", entityId: ctx.user.id, before: prev ? { region: prev.region, vehicleKind: prev.vehicleKind, plate: prev.plate, status: prev.status } : null, after: { region: input.region, vehicleKind: input.vehicleKind, plate, status } });
  });
  const [d] = await db.select().from(drivers).where(eq(drivers.userId, ctx.user.id));
  return driverView(d);
}

async function driverView(d: DriverRow) {
  const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, d.userId));
  const [acc] = await db.select({ name: accounts.name, type: accounts.type }).from(accounts).where(eq(accounts.id, d.accountId));
  return {
    id: d.userId,
    name: u?.name ?? "",
    phone: d.phone,
    region: d.region,
    vehicleKind: d.vehicleKind,
    role: isVehicleKind(d.vehicleKind) ? roleFor(d.vehicleKind) : null,
    plate: d.plate,
    status: d.status,
    online: d.online,
    fleet: acc ? { name: acc.name, tuma: acc.type === "internal" } : null,
    profile: d.profile,
  };
}

/**
 * The Tuma app's view of whoever is signed in (customer, driver or both). `modules` drives the app's home:
 * everyone can send and track; "drive" opens the driver tools once registered (registration is open to all).
 */
/**
 * Who the signed-in person is to Tuma, so the app can route them: their business account (if any), where their
 * business application stands, and which modules their permissions open.
 */
export async function appMe(ctx: DriverCtx) {
  const modules = ["send", "track", "lost", "drive"];
  if (ctx.user.permissions.has("dispatch.manage") || ctx.user.permissions.has("partner.dispatch.manage")) modules.push("dispatch");
  if (ctx.user.permissions.has("agent.workspace") && ctx.user.accountId) modules.push("agent");
  // Set-up tools; open while the business is being reviewed, and after.
  if (ctx.user.permissions.has("team.manage") && ctx.user.accountId) modules.push("team");
  if (ctx.user.permissions.has("partner.branches.manage") && ctx.user.accountId) modules.push("offices");
  // The business itself (approval, documents, details) is for team managers and whoever they allow; everyone in a
  // business sees their teammates and the offices' locations.
  const business = seesBusiness(ctx.user.permissions) && !!ctx.user.accountId;
  if (business) modules.push("business");
  if (ctx.user.accountId) modules.push("team_view");
  // Counter work in the app: booking parcels, and the reports kept in the portal.
  if (ctx.user.permissions.has("agent.workspace") && ctx.user.permissions.has("shipment.create") && ctx.user.accountId) modules.push("book");
  // The whole business's report with report.view; counter staff get one of their own work.
  if ((ctx.user.permissions.has("report.view") || ctx.user.permissions.has("agent.workspace")) && ctx.user.accountId) modules.push("reports");
  // Sending parcels on under a manifest, and checking in what arrives against one.
  if (ctx.user.permissions.has("agent.workspace") && ctx.user.permissions.has("shipment.dispatch") && ctx.user.accountId) modules.push("send_on");
  if (ctx.user.permissions.has("agent.workspace") && ctx.user.permissions.has("shipment.receive") && ctx.user.accountId) modules.push("offload");
  // Everyone at the business can read it; changing it needs agent.wallet.manage (checked by the screen and the API).
  if (ctx.user.permissions.has("agent.workspace") && ctx.user.accountId) modules.push("payments");
  // Sending for a company: the company's sender home.
  if (ctx.user.permissions.has("corporate.send") && ctx.user.accountId) modules.push("corporate");
  // Running the company: staff, departments, policies, wallet, invoices, reports.
  if (ctx.user.permissions.has("corporate.manage") && ctx.user.accountId) modules.push("company_admin");
  const [[u], [acct], [kyb]] = await Promise.all([
    db.select({ email: users.email, phone: users.phone, avatarUrl: users.avatarUrl, sender: users.senderProfile }).from(users).where(eq(users.id, ctx.user.id)),
    ctx.user.accountId
      ? db.select({ id: accounts.id, name: accounts.name, type: accounts.type, partnerKind: accounts.partnerKind, status: accounts.status, payOnDelivery: accounts.payOnDelivery, momo: paymentSettings.momoEnabled }).from(accounts).leftJoin(paymentSettings, eq(paymentSettings.accountId, accounts.id)).where(eq(accounts.id, ctx.user.accountId))
      : Promise.resolve([]),
    db.select({ ref: kybApplications.ref, status: kybApplications.status, accountKind: kybApplications.accountKind, note: kybApplications.decisionNote, submittedAt: kybApplications.submittedAt }).from(kybApplications).where(eq(kybApplications.userId, ctx.user.id)),
  ]);
  return {
    user: { id: ctx.user.id, name: ctx.user.name, email: u?.email ?? null, phone: u?.phone ?? null, picture: u?.avatarUrl ?? null, locale: ctx.user.locale },
    driver: ctx.driver ? await driverView(ctx.driver) : null,
    account: acct
      ? {
          id: acct.id,
          name: acct.name,
          kind: acct.partnerKind ?? acct.type,
          // Staff don't follow the approval: they see the business as working unless it is suspended.
          status: business || acct.status === "suspended" ? acct.status : "active",
          trial: business ? (ctx.user.trial ?? null) : null,
          payOnDelivery: acct.payOnDelivery,
          momo: !!acct.momo,
        }
      : null,
    agent: modules.includes("agent") ? await agentProfile(ctx.user.accountId!) : null,
    // Someone not in a business yet may have been invited to one.
    invites: ctx.user.accountId ? [] : await invitesFor(ctx.user),
    onboarding: kyb ? { ref: kyb.ref, status: kyb.status, accountKind: kyb.accountKind, note: kyb.note, submittedAt: kyb.submittedAt.toISOString() } : null,
    // Set up as a sender (their home is the sender's app); null until they do.
    sender: u?.sender ?? null,
    modules,
  };
}

async function agentProfile(accountId: string) {
  const [g] = await db
    .select({ workflow: agents.workflow, commissionBps: agents.commissionBps, walletRef: agents.walletRef, status: agents.status, office: branches.name, region: branches.region, district: branches.district, address: branches.address })
    .from(agents)
    .innerJoin(branches, eq(branches.id, agents.branchId))
    .where(eq(agents.accountId, accountId));
  if (g) return { workflow: g.workflow, commissionBps: g.commissionBps, walletOpen: !!g.walletRef, status: g.status, office: { name: g.office, region: g.region, district: g.district, address: g.address } };
  // Still under review: no agent record yet. Show the applied-for workflow and the head office; no wallet.
  const [[k], [b]] = await Promise.all([
    db.select({ workflow: kybApplications.workflow }).from(kybApplications).where(eq(kybApplications.accountId, accountId)).limit(1),
    db.select().from(branches).where(and(eq(branches.accountId, accountId), eq(branches.isHead, true))).limit(1),
  ]);
  if (!k && !b) return null;
  return { workflow: k?.workflow ?? [], commissionBps: null, walletOpen: false, status: "pending", office: b ? { name: b.name, region: b.region, district: b.district, address: b.address } : null };
}

export async function driverMe(ctx: DriverCtx) {
  const d = needDriver(ctx, false);
  const today = new Date(Date.now() - ((Date.now() + 3 * 3600_000) % 86400_000)); // EAT midnight
  const [[earn], held] = await Promise.all([
    db
      .select({ jobs: sql<number>`count(*)::int`, payout: sql<number>`coalesce(sum(${jobs.payout}), 0)::int` })
      .from(jobs)
      .where(and(eq(jobs.driverId, d.userId), eq(jobs.status, "completed"), gte(jobs.completedAt, today))),
    cashHeld(ctx),
  ]);
  return { driver: await driverView(d), today: { jobs: earn.jobs, payout: earn.payout, currency: "TZS" }, cashHeld: held.total, activeJobId: (await activeJob(d.userId))?.id ?? null };
}

/* ----------------------------------------------------------- presence */

const pointSchema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

export async function setPresence(ctx: DriverCtx, raw: unknown) {
  const input = z.object({ online: z.boolean() }).and(pointSchema.partial()).parse(raw);
  const d = needDriver(ctx, input.online);
  await db
    .update(drivers)
    .set({ online: input.online, lastSeenAt: new Date(), ...(input.lat !== undefined && input.lng !== undefined ? { lat: input.lat, lng: input.lng } : {}) })
    .where(eq(drivers.userId, d.userId));
  return { online: input.online };
}

/* -------------------------------------------------------------- jobs */

type JobRow = typeof jobs.$inferSelect;

async function activeJob(driverId: string) {
  const [j] = await db.select().from(jobs).where(and(eq(jobs.driverId, driverId), inArray(jobs.status, ACTIVE))).limit(1);
  return j ?? null;
}

/** The job as the app's JobOffer: pickup, one drop-off per waybill, COD due per stop. */
async function offerView(j: JobRow) {
  const rows = await db
    .select({ s: shipments, seq: jobShipments.seq, outcome: jobShipments.outcome, merchant: accounts.name })
    .from(jobShipments)
    .innerJoin(shipments, eq(shipments.id, jobShipments.shipmentId))
    .leftJoin(accounts, eq(accounts.id, shipments.accountId))
    .where(eq(jobShipments.jobId, j.id))
    .orderBy(asc(jobShipments.seq));
  const dropoffs = rows.map(({ s, outcome }) => {
    const p = pointFor(s.consignee.address);
    return {
      id: s.waybill,
      address: addressLine(s.consignee.address),
      lat: p.lat,
      lng: p.lng,
      approximate: p.approx,
      contactName: s.consignee.name,
      contactPhone: s.consignee.phone,
      instructions: s.deliveryInstructions,
      waybills: [s.waybill],
      codDue: amountToCollect(s).total,
      collectMethods: s.collectMethods,
      state: s.state,
      outcome,
    };
  });
  return {
    id: j.id,
    ref: j.ref,
    kind: j.kind,
    status: j.status,
    phase: j.phase,
    merchantName: rows[0]?.merchant ?? rows[0]?.s.shipper.name ?? "Tuma",
    pickup: { id: "pickup", address: j.pickup.address, lat: j.pickup.lat, lng: j.pickup.lng, contactName: j.pickup.name, contactPhone: j.pickup.phone ?? "", instructions: j.pickup.instructions ?? null, waybills: rows.map((r) => r.s.waybill), codDue: 0 },
    dropoffs,
    pieces: rows.reduce((a, r) => a + r.s.piecesCount, 0),
    weightKg: Math.round(j.weightG / 100) / 10,
    cargoDescription: j.kind === "cargo" ? [...new Set(rows.map((r) => r.s.goodsDescription))].slice(0, 3).join(", ") : null,
    requiredVehicle: j.requiredVehicle,
    region: j.region,
    payout: j.payout,
    currency: j.currency,
    slaDeadline: j.slaAt?.toISOString() ?? null,
    note: j.note,
  };
}

/** Open jobs this driver may take, nearest pickup first. Asking for offers also marks the driver online here. */
export async function offersFor(ctx: DriverCtx, raw: unknown) {
  const d = needDriver(ctx);
  const at = pointSchema.partial().parse(raw ?? {});
  await db.update(drivers).set({ online: true, lastSeenAt: new Date(), ...(at.lat !== undefined && at.lng !== undefined ? { lat: at.lat, lng: at.lng } : {}) }).where(eq(drivers.userId, d.userId));
  if (!isVehicleKind(d.vehicleKind) || (await activeJob(d.userId))) return [];
  const open = await db.select().from(jobs).where(and(eq(jobs.accountId, d.accountId), eq(jobs.status, "open"), eq(jobs.region, d.region), eq(jobs.kind, VEHICLE_KINDS[d.vehicleKind].jobKind)));
  const here = at.lat !== undefined && at.lng !== undefined ? { lat: at.lat, lng: at.lng } : d.lat !== null && d.lng !== null ? { lat: d.lat, lng: d.lng } : null;
  const fit = open
    .filter((j) => !ineligible({ kind: j.kind, region: j.region, requiredVehicle: j.requiredVehicle, weightG: j.weightG }, { region: d.region, vehicleKind: d.vehicleKind as VehicleKind }))
    .sort((a, b) => (here ? haversineM(here, a.pickup) - haversineM(here, b.pickup) : a.createdAt.getTime() - b.createdAt.getTime()))
    .slice(0, 5);
  return Promise.all(fit.map(offerView));
}

async function ownJob(ctx: DriverCtx, jobId: string) {
  const d = needDriver(ctx);
  if (!z.string().uuid().safeParse(jobId).success) throw new DomainError("NOT_FOUND", "Job not found.", 404);
  const [j] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.driverId, d.userId)));
  if (!j) throw new DomainError("NOT_FOUND", "Job not found.", 404);
  if (!ACTIVE.includes(j.status)) throw new DomainError("JOB_CLOSED", "This job is already closed.", 409);
  return { d, j };
}

/** First driver to accept gets the job; everyone else gets TAKEN. */
export async function acceptJob(ctx: DriverCtx, jobId: string) {
  const d = needDriver(ctx);
  if (!z.string().uuid().safeParse(jobId).success) throw new DomainError("NOT_FOUND", "Job not found.", 404);
  if (await activeJob(d.userId)) throw new DomainError("JOB_ACTIVE", "Finish your current job first.", 409);
  const [j] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!j || j.accountId !== d.accountId) throw new DomainError("NOT_FOUND", "Job not found.", 404);
  const why = isVehicleKind(d.vehicleKind) ? ineligible({ kind: j.kind, region: j.region, requiredVehicle: j.requiredVehicle, weightG: j.weightG }, { region: d.region, vehicleKind: d.vehicleKind }) : "VEHICLE";
  if (why) throw new DomainError("NOT_ELIGIBLE", "This job isn't for your vehicle or area.", 403);
  const won = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(jobs)
      .set({ status: "assigned", driverId: d.userId, acceptedAt: new Date(), phase: "toPickup" })
      .where(and(eq(jobs.id, jobId), eq(jobs.status, "open")))
      .returning();
    if (row) await audit(tx, { actorId: d.userId, action: "job.accept", entity: "job", entityId: row.ref, before: { status: "open" }, after: { status: "assigned", driver: d.userId } });
    return row;
  });
  if (!won) throw new DomainError("TAKEN", "Another driver took this job.", 409);
  return offerView(won);
}

export async function currentJob(ctx: DriverCtx) {
  const d = needDriver(ctx, false);
  const j = await activeJob(d.userId);
  return j ? offerView(j) : null;
}

/* --------------------------------------------- moving shipments along */

/** Order of the states a driver moves a shipment through; used to skip steps already done. */
const RANK: Partial<Record<ShipmentState, number>> = { CREATED: 0, AWAITING_HANDOVER: 0, RECEIVED: 1, AT_HUB: 1, ATTEMPT_FAILED: 1, IN_TRANSIT: 2, OUT_FOR_DELIVERY: 3, READY_FOR_COLLECTION: 3, DELIVERED: 4 };
const DRIVER_STEPS = new Set<ShipmentState>(["RECEIVED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "ATTEMPT_FAILED"]);

/** Shortest legal path from one state to another through states a driver sets. Null when there is none. */
export function driverPath(from: ShipmentState, to: ShipmentState): ShipmentState[] | null {
  if (from === to) return [];
  const prev = new Map<ShipmentState, ShipmentState>();
  const queue: ShipmentState[] = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of nextStates(cur)) {
      if (!DRIVER_STEPS.has(n) || prev.has(n) || n === from) continue;
      prev.set(n, cur);
      if (n === to) {
        const path = [n];
        let p = cur;
        while (p !== from) {
          path.unshift(p);
          p = prev.get(p)!;
        }
        return path;
      }
      queue.push(n);
    }
  }
  return null;
}

type Step = { lat?: number; lng?: number; occurredAt?: Date; jobRef: string };

/** Moves one waybill to `to`, setting any states in between. Does nothing when it is already there or past it. */
async function walk(user: CurrentUser, waybill: string, to: ShipmentState, step: Step, last?: Parameters<typeof transition>[3]) {
  const [s] = await db.select({ state: shipments.state }).from(shipments).where(eq(shipments.waybill, waybill));
  if (!s) throw new DomainError("NOT_FOUND", "Shipment not found.", 404);
  const from = s.state as ShipmentState;
  const path = driverPath(from, to);
  if (!path) {
    // Pick-up and line-haul steps are best effort (a re-run of a failed parcel skips them);
    // handing over must really be possible.
    if (to === "RECEIVED" || to === "IN_TRANSIT" || (RANK[from] ?? -1) >= (RANK[to] ?? 99)) return;
    throw new DomainError("STATE_NOT_ALLOWED", `${waybill} is ${from.replaceAll("_", " ").toLowerCase()} and can't be moved to ${to.replaceAll("_", " ").toLowerCase()}.`, 409);
  }
  for (const [i, st] of path.entries()) {
    const base = { source: "field_app" as const, lat: step.lat, lng: step.lng, occurredAt: step.occurredAt, data: { job: step.jobRef } };
    await transition(user, waybill, st, i === path.length - 1 && last ? { ...base, ...last, data: { ...base.data, ...last.data } } : base);
  }
}

async function jobWaybills(jobId: string, outcome?: string) {
  return db
    .select({ waybill: shipments.waybill, outcome: jobShipments.outcome })
    .from(jobShipments)
    .innerJoin(shipments, eq(shipments.id, jobShipments.shipmentId))
    .where(and(eq(jobShipments.jobId, jobId), outcome ? eq(jobShipments.outcome, outcome) : undefined))
    .orderBy(asc(jobShipments.seq));
}

const progressSchema = z.object({
  phase: z.enum(JOB_PHASES),
  /** The drop-off (waybill) the phase is about, for per-stop phases. */
  stopId: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  at: z.coerce.date().optional(),
});

/**
 * The app reports its phase; the server turns it into shipment states:
 * leaving the pickup → RECEIVED (picked up) then IN_TRANSIT (cargo) or OUT_FOR_DELIVERY (parcel, per stop).
 * Arrivals and checkpoints are recorded on the job only.
 */
export async function reportProgress(ctx: DriverCtx, jobId: string, raw: unknown) {
  const { j } = await ownJob(ctx, jobId);
  const p = progressSchema.parse(raw);
  const step: Step = { lat: p.lat, lng: p.lng, occurredAt: p.at, jobRef: j.ref };
  const pending = (await jobWaybills(j.id, "pending")).map((r) => r.waybill);
  if (p.stopId && !pending.includes(p.stopId)) throw new DomainError("NOT_FOUND", "That stop isn't open on this job.", 404);

  if (p.phase === "inTransit") for (const wb of pending) await walk(ctx.user, wb, j.kind === "cargo" ? "IN_TRANSIT" : "RECEIVED", step);
  if (p.phase === "outForDelivery") for (const wb of p.stopId ? [p.stopId] : pending) await walk(ctx.user, wb, "OUT_FOR_DELIVERY", step);
  // Past the pickup, the shipments are with the driver even if the app skipped a phase.
  if (p.phase === "atCheckpoint" || p.phase === "atDropoff") for (const wb of pending) await walk(ctx.user, wb, "RECEIVED", step);

  await db
    .update(jobs)
    .set({ phase: p.phase, status: p.phase === "toPickup" ? j.status : "in_progress" })
    .where(eq(jobs.id, j.id));
  if (p.lat !== undefined && p.lng !== undefined) await db.update(drivers).set({ lat: p.lat, lng: p.lng, lastSeenAt: new Date() }).where(eq(drivers.userId, ctx.user.id));
  return offerView((await db.select().from(jobs).where(eq(jobs.id, j.id)))[0]);
}

const deliverSchema = z.object({
  recipientName: z.string().trim().max(80).optional(),
  /** Receiver's code from the booking SMS. */
  otp: z.string().regex(/^\d{6}$/).optional(),
  /** Stored photo reference (see the upload route). */
  photo: z.string().max(300).optional(),
  method: z.enum(["cash", "mobile_money", "card"]).optional(),
  codCollected: z.number().min(0).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  at: z.coerce.date().optional(),
});

/** Proof of delivery for one waybill: receiver's code or a photo, plus the receiver's name. Sets DELIVERED. */
export async function deliverStop(ctx: DriverCtx, jobId: string, waybill: string, raw: unknown) {
  const { j } = await ownJob(ctx, jobId);
  const p = deliverSchema.parse(raw);
  const stop = await stopOf(j.id, waybill);
  if (!p.otp && !p.photo) throw new DomainError("POD_REQUIRED", "Take a photo or enter the receiver's code.", 400);
  if (p.otp) {
    const [code] = await db.select({ codeHash: trackingOtps.codeHash }).from(trackingOtps).where(and(eq(trackingOtps.waybill, waybill), gte(trackingOtps.expiresAt, new Date()))).orderBy(desc(trackingOtps.createdAt)).limit(1);
    if (!code || !same(code.codeHash, receiverCodeHash(waybill, p.otp))) throw new DomainError("BAD_OTP", "The receiver's code is not right.", 400);
  }
  const due = amountToCollect(stop.s).total;
  if (due > 0 && p.codCollected !== undefined && p.codCollected < due) {
    throw new DomainError("COD_SHORT", `Collect TZS ${due.toLocaleString("en")} before handing over, or record a failed attempt.`, 400);
  }
  await walk(ctx.user, waybill, "DELIVERED", { lat: p.lat, lng: p.lng, occurredAt: p.at, jobRef: j.ref }, {
    source: "field_app",
    pod: { method: p.otp ? "otp" : "photo", receiverName: p.recipientName, photo: p.photo },
    collectMethod: p.method,
  });
  await db.update(jobShipments).set({ outcome: "delivered" }).where(and(eq(jobShipments.jobId, j.id), eq(jobShipments.shipmentId, stop.s.id)));
  return { waybill, outcome: "delivered", codCollected: due };
}

/** App reasons (FailReason in job_models.dart) → Appendix B codes. */
const APP_REASONS: Record<string, string> = { recipientAbsent: "FD01", unreachable: "FD01", wrongAddress: "FD02", refusedCod: "FD06", other: "FD09" };

export async function failStop(ctx: DriverCtx, jobId: string, waybill: string, raw: unknown) {
  const { j } = await ownJob(ctx, jobId);
  const p = z.object({ reasonCode: z.string().optional(), reason: z.string().optional(), note: z.string().trim().max(300).optional(), lat: z.number().optional(), lng: z.number().optional(), at: z.coerce.date().optional() }).parse(raw);
  const code = p.reasonCode ?? (p.reason ? APP_REASONS[p.reason] : undefined);
  const [rc] = code ? await db.select().from(reasonCodes).where(and(eq(reasonCodes.code, code), eq(reasonCodes.kind, "failed_delivery"), eq(reasonCodes.active, true))) : [];
  if (!rc) throw new DomainError("REASON_REQUIRED", "Choose why the delivery failed.", 400);
  if (rc.code === "FD09" && !p.note) throw new DomainError("NOTE_REQUIRED", "Say what happened.", 400);
  const stop = await stopOf(j.id, waybill);
  const step = { lat: p.lat, lng: p.lng, occurredAt: p.at, jobRef: j.ref };
  await walk(ctx.user, waybill, "OUT_FOR_DELIVERY", step);
  await transition(ctx.user, waybill, "ATTEMPT_FAILED", { source: "field_app", reasonCode: rc.code, note: p.note, lat: p.lat, lng: p.lng, occurredAt: p.at, data: { job: j.ref } });
  await db.update(jobShipments).set({ outcome: "failed" }).where(and(eq(jobShipments.jobId, j.id), eq(jobShipments.shipmentId, stop.s.id)));
  return { waybill, outcome: "failed", reasonCode: rc.code };
}

async function stopOf(jobId: string, waybill: string) {
  const [row] = await db
    .select({ s: shipments, outcome: jobShipments.outcome })
    .from(jobShipments)
    .innerJoin(shipments, eq(shipments.id, jobShipments.shipmentId))
    .where(and(eq(jobShipments.jobId, jobId), eq(shipments.waybill, waybill)));
  if (!row) throw new DomainError("NOT_FOUND", "That waybill isn't on this job.", 404);
  if (row.outcome !== "pending") throw new DomainError("STOP_DONE", "This stop is already done.", 409);
  return row;
}

export async function completeJob(ctx: DriverCtx, jobId: string, raw: unknown) {
  const { j } = await ownJob(ctx, jobId);
  const p = z.object({ distanceM: z.number().min(0).max(5_000_000).optional(), trail: z.array(z.tuple([z.number(), z.number()])).max(20_000).optional() }).parse(raw ?? {});
  const open = await jobWaybills(j.id, "pending");
  if (open.length) throw new DomainError("STOPS_PENDING", `Deliver or record a failed attempt for ${open.map((o) => o.waybill).join(", ")} first.`, 409);
  // Keep at most 2,000 points of the trail.
  const trail = p.trail && p.trail.length > 2000 ? p.trail.filter((_, i) => i % Math.ceil(p.trail!.length / 2000) === 0) : p.trail;
  await db.transaction(async (tx) => {
    await tx.update(jobs).set({ status: "completed", phase: "completed", completedAt: new Date(), distanceM: p.distanceM ? Math.round(p.distanceM) : null, trail }).where(eq(jobs.id, j.id));
    await enqueue(tx, { target: "finops", topic: "driver.job_completed", idempotencyKey: `job-done:${j.id}`, payload: { job: j.ref, driver: ctx.user.id, payout: j.payout, currency: j.currency } });
    await audit(tx, { actorId: ctx.user.id, action: "job.complete", entity: "job", entityId: j.ref, before: { status: j.status }, after: { status: "completed", distanceM: p.distanceM } });
  });
  return { id: j.id, status: "completed", payout: j.payout, currency: j.currency };
}

/**
 * The driver hands a job back. Before pickup it goes back to the pool; after pickup the job closes and the
 * undelivered waybills are freed for dispatch to plan again.
 */
export async function releaseJob(ctx: DriverCtx, jobId: string, raw: unknown) {
  const { j } = await ownJob(ctx, jobId);
  const { reason } = z.object({ reason: z.string().trim().min(2).max(300) }).parse(raw);
  const beforePickup = !j.phase || j.phase === "toPickup" || j.phase === "atPickup";
  await db.transaction(async (tx) => {
    if (beforePickup) {
      await tx.update(jobs).set({ status: "open", driverId: null, acceptedAt: null, phase: null, note: [j.note, `Released by driver: ${reason}`].filter(Boolean).join("\n") }).where(eq(jobs.id, j.id));
    } else {
      await tx.update(jobs).set({ status: "cancelled", cancelReason: reason, completedAt: new Date() }).where(eq(jobs.id, j.id));
      await tx.delete(jobShipments).where(and(eq(jobShipments.jobId, j.id), eq(jobShipments.outcome, "pending")));
    }
    await audit(tx, { actorId: ctx.user.id, action: "job.release", entity: "job", entityId: j.ref, before: { status: j.status, phase: j.phase }, after: { status: beforePickup ? "open" : "cancelled", reason } });
  });
  return { id: j.id, status: beforePickup ? "open" : "cancelled" };
}

/* ---------------------------------------------------- history and cash */

export async function jobHistory(ctx: DriverCtx, limit = 50) {
  const d = needDriver(ctx, false);
  const rows = await db
    .select({
      id: jobs.id,
      ref: jobs.ref,
      kind: jobs.kind,
      status: jobs.status,
      payout: jobs.payout,
      currency: jobs.currency,
      distanceM: jobs.distanceM,
      acceptedAt: jobs.acceptedAt,
      completedAt: jobs.completedAt,
      delivered: sql<number>`(select count(*)::int from ${jobShipments} js where js.job_id = ${jobs.id} and js.outcome = 'delivered')`,
      failed: sql<number>`(select count(*)::int from ${jobShipments} js where js.job_id = ${jobs.id} and js.outcome = 'failed')`,
    })
    .from(jobs)
    .where(and(eq(jobs.driverId, d.userId), inArray(jobs.status, ["completed", "cancelled"])))
    .orderBy(desc(jobs.completedAt))
    .limit(Math.min(limit, 200));
  return rows;
}

/** Cash the driver collected at the door and still holds (FR-FIN-02). */
export async function cashHeld(ctx: DriverCtx) {
  const d = needDriver(ctx, false);
  const rows = await db
    .select({ waybill: shipments.waybill, goods: codRecords.amountCollected, fee: codRecords.feeCollected, method: codRecords.method, collectedAt: codRecords.collectedAt })
    .from(codRecords)
    .innerJoin(shipments, eq(shipments.id, codRecords.shipmentId))
    .where(and(eq(codRecords.holderId, d.userId), eq(codRecords.status, "collected"), eq(codRecords.method, "cash")))
    .orderBy(desc(codRecords.collectedAt));
  return { total: rows.reduce((a, r) => a + r.goods + r.fee, 0), currency: "TZS", items: rows };
}

export async function failedReasons() {
  return db.select({ code: reasonCodes.code, en: reasonCodes.labelEn, sw: reasonCodes.labelSw }).from(reasonCodes).where(and(eq(reasonCodes.kind, "failed_delivery"), eq(reasonCodes.active, true))).orderBy(asc(reasonCodes.code));
}

/* ----------------------------------------------------------------- SOS */

export async function raiseSos(ctx: DriverCtx, raw: unknown) {
  const p = z.object({ lat: z.number().optional(), lng: z.number().optional(), jobId: z.string().uuid().optional(), note: z.string().max(300).optional() }).parse(raw ?? {});
  const [u] = await db.select({ name: users.name, phone: users.phone }).from(users).where(eq(users.id, ctx.user.id));
  const job = p.jobId ? (await db.select({ ref: jobs.ref }).from(jobs).where(and(eq(jobs.id, p.jobId), eq(jobs.driverId, ctx.user.id))))[0] : undefined;
  const ref = `SOS-${ulid().slice(-8)}`;
  await db.transaction(async (tx) => {
    await tx.insert(supportRequests).values({ ref, kind: "sos", name: u?.name || "Driver", phone: u?.phone, body: { driver: ctx.user.id, job: job?.ref, lat: p.lat, lng: p.lng, note: p.note } });
    await enqueue(tx, { target: "bliss", topic: "driver.sos", idempotencyKey: `sos:${ref}`, payload: { ref, driver: ctx.user.id, name: u?.name, phone: u?.phone, job: job?.ref, lat: p.lat, lng: p.lng, note: p.note, at: new Date().toISOString() } });
    await audit(tx, { actorId: ctx.user.id, action: "driver.sos", entity: "driver", entityId: ctx.user.id, before: null, after: { ref, job: job?.ref, lat: p.lat, lng: p.lng } });
  });
  return { ref };
}
