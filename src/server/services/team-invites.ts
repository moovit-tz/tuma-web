import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { db, type Tx } from "../db/client";
import { accounts, branches, kybApplications, rolePermissions, roles, teamInvites, users } from "../db/schema";
import { audit } from "../audit";
import { enqueue } from "../adapters/outbox";
import { DomainError } from "../errors";
import { accountRoleKey, assignableKeys, requireScope } from "./roles";
import type { CurrentUser } from "../auth/current-user";
import { toE164TZ } from "@/domain/phone";
import { AGENT_CUSTOM_GRANTABLE, AGENT_STAFF_ROLES, type Permission } from "@/domain/roles";
import { updateTag } from "next/cache";
import { allowLookup } from "./tracking";
import { ROLES_TAG } from "../rbac";
import { CORPORATE_ROLES } from "./corporate";

/**
 * Inviting staff. Someone with team.manage invites a person by phone and chooses their roles and office; Tuma texts
 * them a link. Opening it, they sign in with Ondi (or create an Ondi account) and accept, which puts them in the
 * company with those roles. People who sign in with the invited phone or email also see the invitation in the app.
 *
 * Works while the company is still being reviewed: staff join straight away and can set up too, within the same
 * limits as the owner (effectivePermissions).
 */

const INVITE_TEMPLATE = "team.invite";
const VALID_DAYS = 14;

const phone = z
  .string()
  .trim()
  .transform((v, c) => toE164TZ(v) ?? (c.addIssue({ code: "custom", message: "Enter a valid Tanzanian mobile number." }), z.NEVER));

export const inviteSchema = z.object({
  name: z.string().trim().min(2, "Enter their name").max(120),
  phone,
  email: z
    .union([z.email("Enter a valid email"), z.literal("")])
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null)),
  roles: z.array(z.string()).min(1, "Choose at least one role"),
  /** "" or omitted = the whole company. */
  branchId: z
    .union([z.uuid(), z.literal("")])
    .optional()
    .transform((v) => v || null),
});
export type InviteInput = z.input<typeof inviteSchema>;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const newToken = () => randomBytes(24).toString("base64url");

/** Join codes: 8 letters and digits without the look-alikes (0/O, 1/I/L), shown as two groups: "K7QM-4XPR". */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function newJoinCode() {
  const b = randomBytes(8);
  const c = [...b].map((x) => CODE_ALPHABET[x % CODE_ALPHABET.length]).join("");
  return `${c.slice(0, 4)}-${c.slice(4)}`;
}
/** However it's typed ("k7qm 4xpr", "K7QM-4XPR"): the 8 characters, or null. */
export function normaliseJoinCode(raw: string) {
  const c = raw.toUpperCase().replace(/[\s-]/g, "");
  return /^[A-Z0-9]{8}$/.test(c) ? c : null;
}
const codeHash = (code: string) => hash(`join:${normaliseJoinCode(code)}`);

/** Typing codes is limited per person, so a code can't be guessed by trying many (in-process; enough for one server). */
const ATTEMPTS = new Map<string, { n: number; until: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60_000;
function countAttempt(userId: string) {
  const now = Date.now();
  const a = ATTEMPTS.get(userId);
  if (!a || a.until < now) return void ATTEMPTS.set(userId, { n: 1, until: now + WINDOW_MS });
  if (a.n >= MAX_ATTEMPTS) throw new DomainError("TOO_MANY", "Too many codes tried. Wait 15 minutes, or ask for the code again.", 429);
  a.n++;
}
const expiry = () => new Date(Date.now() + VALID_DAYS * 86400_000);

export function inviteLink(token: string, locale: string) {
  return new URL(`/${locale === "en" ? "en" : "sw"}/join/${token}`, process.env.APP_URL ?? "https://tuma.hudumika.tz").toString();
}

function companyOf(user: CurrentUser): string {
  const scope = requireScope(user, "users");
  const accountId = scope.kind === "account" ? scope.accountId : user.accountId;
  if (!accountId) throw new DomainError("NO_COMPANY", "You need a company to invite people to.", 409);
  return accountId;
}

async function checkRolesAndBranch(tx: Tx, user: CurrentUser, accountId: string, roleKeys: string[], branchId: string | null) {
  const allowed = await assignableKeys(tx, requireScope(user, "users"));
  const bad = roleKeys.filter((k) => !allowed.includes(k));
  if (bad.length) throw new DomainError("UNKNOWN_ROLE", `You can't give these roles: ${bad.join(", ")}`, 403);
  if (branchId) {
    // Someone tied to one office can only invite people to that office.
    if (user.branchId && user.branchId !== branchId) throw new DomainError("FORBIDDEN", "You can only invite people to your own office.", 403);
    const [b] = await tx.select({ id: branches.id }).from(branches).where(and(eq(branches.id, branchId), eq(branches.accountId, accountId), eq(branches.active, true)));
    if (!b) throw new DomainError("NOT_FOUND", "That office isn't part of your company.", 404);
  }
}

async function sendInvite(tx: Tx, inv: typeof teamInvites.$inferSelect, token: string, code: string, inviterName: string) {
  const [acct] = await tx.select({ name: accounts.name }).from(accounts).where(eq(accounts.id, inv.accountId));
  const link = inviteLink(token, inv.locale);
  await enqueue(tx, {
    target: "hudufeed",
    topic: "notify.send",
    idempotencyKey: `team-invite:${inv.id}:${inv.tokenHash.slice(0, 16)}`,
    payload: { template: INVITE_TEMPLATE, channel: "sms", language: inv.locale, to: inv.phone, variables: { name: inv.name, business: acct?.name ?? "", inviter: inviterName, link, code } },
  });
  return link;
}

/** Invite someone. Returns the link and the join code too, so the inviter can also share them (WhatsApp, copy, say it). */
export async function createInvite(user: CurrentUser, raw: unknown) {
  const input = inviteSchema.parse(raw);
  const accountId = companyOf(user);
  const branchId = input.branchId ?? user.branchId ?? null;
  const token = newToken();
  const code = newJoinCode();
  return db.transaction(async (tx) => {
    await checkRolesAndBranch(tx, user, accountId, input.roles, branchId);
    const [member] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.accountId, accountId), or(eq(users.phone, input.phone), input.email ? eq(users.email, input.email) : undefined)));
    if (member) throw new DomainError("ALREADY_MEMBER", "This person is already on your team.", 409);
    // A new invitation to the same number replaces the old one.
    await tx
      .update(teamInvites)
      .set({ status: "revoked", respondedAt: new Date() })
      .where(and(eq(teamInvites.accountId, accountId), eq(teamInvites.phone, input.phone), eq(teamInvites.status, "pending")));
    const [inv] = await tx
      .insert(teamInvites)
      .values({
        accountId,
        name: input.name,
        phone: input.phone,
        email: input.email,
        roles: [...new Set(input.roles)].sort(),
        branchId,
        tokenHash: hash(token),
        codeHash: codeHash(code),
        locale: user.locale === "en" ? "en" : "sw",
        invitedBy: user.id,
        expiresAt: expiry(),
      })
      .returning();
    const link = await sendInvite(tx, inv, token, code, user.name);
    await audit(tx, { actorId: user.id, action: "team.invite", entity: "team_invite", entityId: inv.id, after: { name: inv.name, phone: inv.phone, roles: inv.roles, branchId } });
    return { id: inv.id, link, code };
  });
}

async function ownInvite(tx: Tx, user: CurrentUser, id: string) {
  const accountId = companyOf(user);
  if (!z.uuid().safeParse(id).success) throw new DomainError("NOT_FOUND", "Invitation not found.", 404);
  const [inv] = await tx.select().from(teamInvites).where(and(eq(teamInvites.id, id), eq(teamInvites.accountId, accountId))).for("update");
  if (!inv) throw new DomainError("NOT_FOUND", "Invitation not found.", 404);
  if (user.branchId && inv.branchId !== user.branchId) throw new DomainError("FORBIDDEN", "This invitation is for another office.", 403);
  return inv;
}

/** Send it again with a fresh link and code (the old ones stop working) and a new expiry. */
export async function resendInvite(user: CurrentUser, id: string) {
  const token = newToken();
  const code = newJoinCode();
  return db.transaction(async (tx) => {
    const inv = await ownInvite(tx, user, id);
    if (inv.status !== "pending") throw new DomainError("CLOSED", "This invitation was already answered or cancelled.", 409);
    const [next] = await tx.update(teamInvites).set({ tokenHash: hash(token), codeHash: codeHash(code), expiresAt: expiry() }).where(eq(teamInvites.id, id)).returning();
    const link = await sendInvite(tx, next, token, code, user.name);
    await audit(tx, { actorId: user.id, action: "team.invite.resend", entity: "team_invite", entityId: id });
    return { id, link, code };
  });
}

export async function revokeInvite(user: CurrentUser, id: string) {
  await db.transaction(async (tx) => {
    const inv = await ownInvite(tx, user, id);
    if (inv.status !== "pending") return;
    await tx.update(teamInvites).set({ status: "revoked", respondedAt: new Date() }).where(eq(teamInvites.id, id));
    await audit(tx, { actorId: user.id, action: "team.invite.revoke", entity: "team_invite", entityId: id });
  });
}

async function roleNameMap(keys: string[]) {
  if (!keys.length) return new Map<string, string>();
  const rows = await db.select({ key: roles.key, name: roles.name }).from(roles).where(inArray(roles.key, keys));
  return new Map(rows.map((r) => [r.key, r.name]));
}

/** The team screen: people, open invitations, and what can be chosen when inviting. */
export async function teamOverview(user: CurrentUser) {
  const scope = requireScope(user, "users");
  const accountId = companyOf(user);
  const [people, invites, roleRows, branchRows] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, phone: users.phone, email: users.email, picture: users.avatarUrl, roles: users.roles, branchId: users.branchId, active: users.active })
      .from(users)
      .where(and(eq(users.accountId, accountId), user.branchId ? eq(users.branchId, user.branchId) : undefined))
      .orderBy(asc(users.name)),
    db
      .select()
      .from(teamInvites)
      .where(and(eq(teamInvites.accountId, accountId), eq(teamInvites.status, "pending"), user.branchId ? eq(teamInvites.branchId, user.branchId) : undefined))
      .orderBy(desc(teamInvites.createdAt)),
    db.transaction((tx) => assignableKeys(tx, scope)).then((keys) =>
      keys.length ? db.select({ key: roles.key, name: roles.name, description: roles.description, active: roles.active }).from(roles).where(inArray(roles.key, keys)).orderBy(asc(roles.name)) : [],
    ),
    db
      .select({ id: branches.id, name: branches.name, code: branches.code, isHead: branches.isHead })
      .from(branches)
      .where(and(eq(branches.accountId, accountId), eq(branches.active, true), user.branchId ? eq(branches.id, user.branchId) : undefined))
      .orderBy(asc(branches.name)),
  ]);
  const names = await roleNameMap([...new Set([...people.flatMap((p) => p.roles), ...invites.flatMap((i) => i.roles)])]);
  const branchName = new Map(branchRows.map((b) => [b.id, b.name]));
  const [acct] = await db.select({ kind: accounts.partnerKind, type: accounts.type }).from(accounts).where(eq(accounts.id, accountId));
  const agent = acct?.kind === "parcel_agent";
  // A company that sends: its admins and senders, or its own roles.
  const company = acct?.type === "shipper";
  const owner = agent && (await isOwner(user, accountId));
  const ownKeys = new Set((await db.select({ key: roles.key }).from(roles).where(and(eq(roles.accountId, accountId), eq(roles.active, true)))).map((r) => r.key));
  const order = (k: string) => {
    const i = (AGENT_STAFF_ROLES as readonly string[]).indexOf(k);
    return i < 0 ? 100 : i;
  };
  const now = Date.now();
  return {
    members: people.map((p) => ({ ...p, you: p.id === user.id, roleNames: p.roles.map((k) => names.get(k)).filter(Boolean) as string[], branch: p.branchId ? (branchName.get(p.branchId) ?? null) : null })),
    invites: invites.map((i) => ({
      id: i.id,
      name: i.name,
      phone: i.phone,
      email: i.email,
      roles: i.roles,
      roleNames: i.roles.map((k) => names.get(k) ?? k),
      branchId: i.branchId,
      branch: i.branchId ? (branchName.get(i.branchId) ?? null) : null,
      expired: i.expiresAt.getTime() < now,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
    })),
    roles: (agent
      ? // A parcel agent picks a kind of staff (office staff, courier, store keeper) or one of its own roles ("Other").
        roleRows
          .filter((r) => r.active && ((AGENT_STAFF_ROLES as readonly string[]).includes(r.key) || ownKeys.has(r.key)))
          .sort((a, b) => order(a.key) - order(b.key))
      : company
        ? roleRows.filter((r) => r.active && ((CORPORATE_ROLES as readonly string[]).includes(r.key) || ownKeys.has(r.key)))
        : roleRows.filter((r) => r.active)
    ).map(({ key, name, description }) => ({ key, name, description, custom: ownKeys.has(key) })),
    branches: branchRows,
    /** Only the business's owner makes new kinds of staff with their own permissions. */
    canCreateRole: agent && owner,
    grantable: agent && owner ? AGENT_CUSTOM_GRANTABLE : [],
  };
}

/** The person who applied for the business (its owner). Checked by who they are, never by a role's name. */
async function isOwner(user: CurrentUser, accountId: string) {
  const [k] = await db
    .select({ id: kybApplications.id })
    .from(kybApplications)
    .where(and(eq(kybApplications.accountId, accountId), eq(kybApplications.userId, user.id)));
  return !!k;
}

export const staffRoleSchema = z.object({
  name: z.string().trim().min(2, "Name this kind of staff").max(60),
  description: z.string().trim().max(240).default(""),
  permissions: z.array(z.enum(AGENT_CUSTOM_GRANTABLE as [Permission, ...Permission[]])).min(1, "Choose at least one thing they can do"),
});

/**
 * "Other": the owner makes a kind of staff for their business with just the permissions it needs (always with the
 * agent workspace and the business's parcels). Only the owner; returns the new role to invite with.
 */
export async function createStaffRole(user: CurrentUser, raw: unknown) {
  const accountId = companyOf(user);
  if (!(await isOwner(user, accountId))) throw new DomainError("OWNER_ONLY", "Only the business owner can make a new kind of staff.", 403);
  const input = staffRoleSchema.parse(raw);
  const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 20) || "staff";
  const permissions = [...new Set<Permission>(["agent.workspace", "partner.cargo.read", "partner.cargo.operate", ...input.permissions])];
  const out = await db.transaction(async (tx) => {
    let key = accountRoleKey(accountId, `s_${slug}`);
    for (let i = 2; (await tx.select({ key: roles.key }).from(roles).where(eq(roles.key, key))).length; i++) key = accountRoleKey(accountId, `s_${slug}_${i}`);
    await tx.insert(roles).values({ key, name: input.name, description: input.description, surface: "partner", accountId });
    await tx.insert(rolePermissions).values(permissions.map((p) => ({ roleKey: key, permission: p })));
    await audit(tx, { actorId: user.id, action: "role.create", entity: "role", entityId: key, after: { name: input.name, permissions, accountId } });
    return { key, name: input.name, description: input.description, custom: true };
  });
  updateTag(ROLES_TAG);
  return out;
}

/* ------------------------------------------------------------ the invited person */

async function describe(inv: typeof teamInvites.$inferSelect) {
  const [[acct], [inviter], names, [branch]] = await Promise.all([
    db.select({ name: accounts.name, status: accounts.status }).from(accounts).where(eq(accounts.id, inv.accountId)),
    db.select({ name: users.name }).from(users).where(eq(users.id, inv.invitedBy)),
    roleNameMap(inv.roles),
    inv.branchId ? db.select({ name: branches.name }).from(branches).where(eq(branches.id, inv.branchId)) : Promise.resolve([]),
  ]);
  return {
    id: inv.id,
    name: inv.name,
    business: acct?.name ?? "",
    businessPending: acct?.status === "pending",
    inviter: inviter?.name ?? "",
    roles: inv.roles.map((k) => names.get(k) ?? k),
    office: branch?.name ?? null,
    status: inv.status === "pending" && inv.expiresAt.getTime() < Date.now() ? "expired" : inv.status,
  };
}

/** What the link shows before signing in. Null when the link is unknown (or was replaced by a resend). */
export async function inviteByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [inv] = await db.select().from(teamInvites).where(eq(teamInvites.tokenHash, hash(token)));
  return inv ? describe(inv) : null;
}

/**
 * What a typed join code opens, before accepting: the business, the role and the office. The code stands in for the
 * link, so it works whatever number or email this person signed in with. Tries are limited per person.
 */
export async function inviteByCode(user: CurrentUser, raw: string) {
  if (!normaliseJoinCode(raw)) throw new DomainError("BAD_CODE", "A join code has 8 letters and numbers, like K7QM-4XPR.", 400);
  countAttempt(user.id);
  const [inv] = await db.select().from(teamInvites).where(eq(teamInvites.codeHash, codeHash(raw)));
  if (!inv) throw new DomainError("NOT_FOUND", "We don't know that code. Check it, or ask for a new one.", 404);
  ATTEMPTS.delete(user.id);
  return describe(inv);
}

/** Open invitations for this person's verified phone or email (shown in the app and on the onboarding page). */
export async function invitesFor(user: CurrentUser) {
  const [u] = await db.select({ phone: users.phone, email: users.email, accountId: users.accountId }).from(users).where(eq(users.id, user.id));
  if (!u || u.accountId) return [];
  const p = u.phone ? toE164TZ(u.phone) : null;
  const match = [p ? eq(teamInvites.phone, p) : undefined, u.email ? eq(teamInvites.email, u.email.toLowerCase()) : undefined].filter(Boolean);
  if (!match.length) return [];
  const rows = await db
    .select()
    .from(teamInvites)
    .where(and(eq(teamInvites.status, "pending"), gt(teamInvites.expiresAt, new Date()), or(...match)))
    .orderBy(desc(teamInvites.createdAt));
  return Promise.all(rows.map(describe));
}

/**
 * Accept: by the link's token, or by id when the invitation matches the person's phone or email. They join the
 * company with the invitation's roles (kept across Ondi sign-ins) and office.
 */
export async function acceptInvite(user: CurrentUser, ref: InviteRef) {
  return db.transaction(async (tx) => {
    const inv = await findForResponse(tx, user, ref);
    if (user.accountId && user.accountId !== inv.accountId) throw new DomainError("OTHER_COMPANY", "You already belong to another business on Tuma.", 409);
    const [u] = await tx.select().from(users).where(eq(users.id, user.id));
    const add = (list: string[]) => [...new Set([...list, ...inv.roles])].sort();
    await tx
      .update(users)
      .set({ accountId: inv.accountId, roles: add(u.roles), grantedRoles: add(u.grantedRoles), branchId: inv.branchId, phone: u.phone ?? inv.phone })
      .where(eq(users.id, user.id));
    await tx.update(teamInvites).set({ status: "accepted", acceptedBy: user.id, respondedAt: new Date() }).where(eq(teamInvites.id, inv.id));
    await audit(tx, { actorId: user.id, action: "team.join", entity: "team_invite", entityId: inv.id, after: { accountId: inv.accountId, roles: inv.roles, branchId: inv.branchId } });
    return { accountId: inv.accountId };
  });
}

export async function declineInvite(user: CurrentUser, ref: InviteRef) {
  await db.transaction(async (tx) => {
    const inv = await findForResponse(tx, user, ref);
    await tx.update(teamInvites).set({ status: "declined", acceptedBy: user.id, respondedAt: new Date() }).where(eq(teamInvites.id, inv.id));
    await audit(tx, { actorId: user.id, action: "team.decline", entity: "team_invite", entityId: inv.id });
  });
}

type InviteRef = { token: string } | { id: string } | { code: string };

async function findForResponse(tx: Tx, user: CurrentUser, ref: InviteRef) {
  let inv: typeof teamInvites.$inferSelect | undefined;
  if ("code" in ref) {
    if (!normaliseJoinCode(ref.code)) throw new DomainError("BAD_CODE", "A join code has 8 letters and numbers, like K7QM-4XPR.", 400);
    countAttempt(user.id);
    [inv] = await tx.select().from(teamInvites).where(eq(teamInvites.codeHash, codeHash(ref.code))).for("update");
  } else if ("token" in ref) {
    [inv] = await tx.select().from(teamInvites).where(eq(teamInvites.tokenHash, hash(ref.token))).for("update");
  } else if (z.uuid().safeParse(ref.id).success) {
    [inv] = await tx.select().from(teamInvites).where(eq(teamInvites.id, ref.id)).for("update");
    // Without the link, the invitation must be addressed to this person.
    if (inv) {
      const [u] = await tx.select({ phone: users.phone, email: users.email }).from(users).where(eq(users.id, user.id));
      const p = u?.phone ? toE164TZ(u.phone) : null;
      const mine = (p && p === inv.phone) || (!!u?.email && !!inv.email && u.email.toLowerCase() === inv.email);
      if (!mine) inv = undefined;
    }
  }
  if (!inv) throw new DomainError("NOT_FOUND", "This invitation doesn't exist or was replaced by a newer one.", 404);
  if (inv.status === "accepted" && inv.acceptedBy === user.id) throw new DomainError("ALREADY_JOINED", "You've already joined this team.", 409);
  if (inv.status !== "pending") throw new DomainError("CLOSED", "This invitation was cancelled or already answered.", 409);
  if (inv.expiresAt.getTime() < Date.now()) throw new DomainError("EXPIRED", "This invitation has expired. Ask for a new one.", 410);
  return inv;
}

/**
 * Phone-first invites: who is this number on Tuma? Tuma keeps a copy of each person's Ondi profile when they sign in,
 * so the inviter sees the name Ondi has instead of typing it. Ondi itself has no lookup by phone, on purpose (it would
 * be a phone-enumeration oracle); here it is limited to people who can manage a team, rate-limited per inviter, and
 * returns only the name and whether they're already on this team or another business.
 */
export async function lookupPerson(user: CurrentUser, rawPhone: string) {
  const accountId = companyOf(user);
  const phone = toE164TZ(rawPhone);
  if (!phone) throw new DomainError("VALIDATION", "Enter a valid phone number.", 400);
  if (!allowLookup(`team-lookup:${user.id}`)) throw new DomainError("RATE_LIMITED", "Too many lookups. Wait a minute.", 429);
  const [u] = await db.select({ name: users.name, accountId: users.accountId, active: users.active }).from(users).where(eq(users.phone, phone)).limit(1);
  if (!u || !u.active) return { phone, found: false as const };
  return { phone, found: true as const, name: u.name ?? "", onTeam: u.accountId === accountId, otherBusiness: !!u.accountId && u.accountId !== accountId };
}
