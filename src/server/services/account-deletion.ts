import "server-only";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "../db/client";
import { accounts, codRecords, drivers, jobs, kybApplications, kybEvents, teamInvites, users } from "../db/schema";
import { audit } from "../audit";
import { DomainError } from "../errors";
import type { DriverCtx } from "./drivers";

/** A job a driver has taken and not finished (drivers.ts ACTIVE). */
const OPEN_JOB = ["assigned", "in_progress"];

/**
 * Delete the signed-in person's Tuma account (their Ondi account is separate and stays). Their records can't simply
 * vanish: shipments, cash and the audit trail point at them. So their personal details are wiped, roles and business
 * link removed, and the row marked deleted; every token stops working at once because requests check `active`.
 *
 * Refused while it would leave something hanging: cash they hold, a job under way, or a business that depends on
 * them (others still in it, or an approved business, whose wallet and commission need support to close).
 */
export async function deleteMyAccount(ctx: DriverCtx) {
  const userId = ctx.user.id;
  const [held] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(codRecords)
    .where(and(eq(codRecords.holderId, userId), eq(codRecords.status, "collected"), eq(codRecords.method, "cash")));
  if (held.n > 0) throw new DomainError("CASH_HELD", "You still hold cash collected on delivery. Hand it in first, then delete your account.", 409);
  const [job] = await db.select({ id: jobs.id }).from(jobs).where(and(eq(jobs.driverId, userId), inArray(jobs.status, OPEN_JOB))).limit(1);
  if (job) throw new DomainError("JOB_UNDER_WAY", "Finish or hand back your current job first, then delete your account.", 409);

  const accountId = ctx.user.accountId;
  let closeBusiness = false;
  if (accountId) {
    const [[acct], [app], [others]] = await Promise.all([
      db.select({ status: accounts.status }).from(accounts).where(eq(accounts.id, accountId)),
      db.select({ id: kybApplications.id, userId: kybApplications.userId }).from(kybApplications).where(eq(kybApplications.accountId, accountId)).limit(1),
      db.select({ n: sql<number>`count(*)::int` }).from(users).where(and(eq(users.accountId, accountId), eq(users.active, true), ne(users.id, userId))),
    ]);
    const owner = app?.userId === userId;
    if (owner && others.n > 0) {
      throw new DomainError("OWNS_BUSINESS", "Others still work in your business. Call Tuma support to hand it over, then delete your account.", 409);
    }
    if (owner && acct?.status === "active") {
      throw new DomainError("OWNS_BUSINESS", "Your business is approved and may have money in its wallet. Call Tuma support to close it first.", 409);
    }
    closeBusiness = owner && acct?.status === "pending";
  }

  await db.transaction(async (tx) => {
    const now = new Date();
    if (closeBusiness && accountId) {
      // Nobody is left to run it: close the business and withdraw its application, keeping no one's contact details.
      await tx.update(accounts).set({ status: "closed", syncedAt: now }).where(eq(accounts.id, accountId));
      const [a] = await tx.select().from(kybApplications).where(eq(kybApplications.accountId, accountId));
      if (a && a.status !== "approved") {
        const note = "Withdrawn: the applicant deleted their Tuma account.";
        await tx
          .update(kybApplications)
          .set({ status: "rejected", decisionNote: note, decidedAt: now, updatedAt: now, contact: { name: "Deleted user", phone: "" } })
          .where(eq(kybApplications.id, a.id));
        await tx.insert(kybEvents).values({ applicationId: a.id, status: "rejected", source: "tuma", note });
      }
      await tx.update(teamInvites).set({ status: "revoked", respondedAt: now }).where(and(eq(teamInvites.accountId, accountId), eq(teamInvites.status, "pending")));
    }
    await tx.update(teamInvites).set({ status: "revoked", respondedAt: now }).where(and(eq(teamInvites.invitedBy, userId), eq(teamInvites.status, "pending")));
    // Their driver record keeps its history but loses the ID, licence and payout details; the phone frees up.
    await tx
      .update(drivers)
      .set({ status: "closed", online: false, lat: null, lng: null, profile: {}, phone: `deleted:${userId}`, plate: "" })
      .where(eq(drivers.userId, userId));
    await tx
      .update(users)
      .set({ active: false, deletedAt: now, name: "Deleted user", email: null, phone: null, avatarUrl: null, roles: [], grantedRoles: [], accountId: null, branchId: null, scope: {} })
      .where(eq(users.id, userId));
    await audit(tx, { actorId: userId, action: "user.delete", entity: "user", entityId: userId, after: { closedBusiness: closeBusiness ? accountId : null } });
  });
  return { deleted: true };
}
