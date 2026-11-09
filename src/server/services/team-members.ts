import "server-only";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../db/client";
import { auditLog, branches, events, shipments, users } from "../db/schema";
import { DomainError } from "../errors";
import { requireScope } from "./roles";
import { roleNameMap } from "./team-invites";
import type { CurrentUser } from "../auth/current-user";

/**
 * Everyone in a business sees their teammates and where the business's offices are; nothing about the business
 * itself (approval, documents, money). Read-only.
 */
export async function teamRoster(user: CurrentUser) {
  const accountId = user.accountId;
  if (!accountId) throw new DomainError("NO_COMPANY", "You don't work for a business on Tuma.", 409);
  const [people, offices] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, phone: users.phone, picture: users.avatarUrl, roles: users.roles, branchId: users.branchId })
      .from(users)
      .where(and(eq(users.accountId, accountId), eq(users.active, true)))
      .orderBy(asc(users.name)),
    db
      .select({ id: branches.id, name: branches.name, region: branches.region, district: branches.district, address: branches.address, lat: branches.lat, lng: branches.lng, phone: branches.phone, isHead: branches.isHead })
      .from(branches)
      .where(and(eq(branches.accountId, accountId), eq(branches.active, true)))
      .orderBy(desc(branches.isHead), asc(branches.name)),
  ]);
  const names = await roleNameMap([...new Set(people.flatMap((p) => p.roles))]);
  const office = new Map(offices.map((o) => [o.id, o.name]));
  return {
    members: people.map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      picture: p.picture,
      you: p.id === user.id,
      roleNames: p.roles.map((k) => names.get(k)).filter(Boolean) as string[],
      office: p.branchId ? (office.get(p.branchId) ?? null) : null,
    })),
    offices,
  };
}

const ACTIVITY_DAYS = 30;

/**
 * One person on the team, for whoever manages it: who they are, their roles and office, when they were
 * last seen, what they did in the last 30 days (booked, handled, handed over, failed) and their latest activity on
 * parcels and in the business's settings. An office manager sees only their own office's people.
 */
export async function memberDetail(user: CurrentUser, memberId: string) {
  const scope = requireScope(user, "users");
  const accountId = scope.kind === "account" ? scope.accountId : user.accountId;
  if (!accountId) throw new DomainError("NO_COMPANY", "You need a company to invite people to.", 409);
  const [m] = await db
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      email: users.email,
      picture: users.avatarUrl,
      roles: users.roles,
      branchId: users.branchId,
      active: users.active,
      lastSeenAt: users.lastSeenAt,
    })
    .from(users)
    .where(and(eq(users.id, memberId), eq(users.accountId, accountId)));
  if (!m || (user.branchId && m.branchId !== user.branchId)) throw new DomainError("NOT_FOUND", "That person isn't in your company.", 404);
  const since = new Date(Date.now() - ACTIVITY_DAYS * 86_400_000);
  const ours = sql`(${shipments.accountId} = ${accountId} or ${shipments.handlingPartnerId} = ${accountId})`;
  const [[booked], [moves], recent, settings, names, office] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int`, value: sql<number>`coalesce(sum(${shipments.totalCharge}), 0)::int` })
      .from(shipments)
      .where(and(eq(shipments.createdBy, memberId), gte(shipments.createdAt, since), sql`${shipments.state} <> 'CANCELLED'`)),
    db
      .select({
        handled: sql<number>`count(distinct ${events.shipmentId})::int`,
        delivered: sql<number>`count(*) filter (where ${events.stateAfter} = 'DELIVERED')::int`,
        failed: sql<number>`count(*) filter (where ${events.stateAfter} = 'ATTEMPT_FAILED')::int`,
        received: sql<number>`count(*) filter (where ${events.stateAfter} in ('RECEIVED', 'AT_HUB', 'READY_FOR_COLLECTION'))::int`,
      })
      .from(events)
      .innerJoin(shipments, eq(events.shipmentId, shipments.id))
      .where(and(eq(events.actorId, memberId), gte(events.occurredAt, since), ours, eq(events.estimated, false))),
    db
      .select({ at: events.occurredAt, type: events.type, state: events.stateAfter, note: events.note, waybill: shipments.waybill })
      .from(events)
      .innerJoin(shipments, eq(events.shipmentId, shipments.id))
      .where(and(eq(events.actorId, memberId), ours, eq(events.estimated, false)))
      .orderBy(desc(events.occurredAt))
      .limit(40),
    db
      .select({ at: auditLog.at, action: auditLog.action, entity: auditLog.entity })
      .from(auditLog)
      .where(and(eq(auditLog.actorId, memberId), sql`${auditLog.entity} in ('branch', 'team_invite', 'role', 'user', 'customer', 'manifest', 'partner_payment', 'account')`))
      .orderBy(desc(auditLog.at))
      .limit(20),
    roleNameMap(m.roles),
    m.branchId ? db.select({ name: branches.name }).from(branches).where(eq(branches.id, m.branchId)) : Promise.resolve([]),
  ]);
  return {
    member: {
      id: m.id,
      name: m.name,
      phone: m.phone,
      email: m.email,
      picture: m.picture,
      active: m.active,
      you: m.id === user.id,
      roles: m.roles,
      roleNames: m.roles.map((k) => names.get(k)).filter(Boolean) as string[],
      office: office[0]?.name ?? null,
      lastSeenAt: m.lastSeenAt?.toISOString() ?? null,
    },
    days: ACTIVITY_DAYS,
    stats: {
      booked: booked?.n ?? 0,
      bookedValue: booked?.value ?? 0,
      handled: moves?.handled ?? 0,
      received: moves?.received ?? 0,
      delivered: moves?.delivered ?? 0,
      failed: moves?.failed ?? 0,
    },
    activity: [
      ...recent.map((e) => ({ kind: "parcel" as const, at: e.at.toISOString(), state: e.state, type: e.type, waybill: e.waybill, note: e.note })),
      ...settings.map((a) => ({ kind: "admin" as const, at: a.at.toISOString(), action: a.action, entity: a.entity })),
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 50),
  };
}
