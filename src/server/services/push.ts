import "server-only";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db, type Tx } from "../db/client";
import { outbox, pushDevices, users } from "../db/schema";
import { enqueue } from "../adapters/outbox";
import { dispatch, type Channel } from "../adapters/hudufeed";
import { render } from "../messages/templates";
import type { CurrentUser } from "../auth/current-user";
import { toE164 } from "@/domain/phone";

/**
 * Push notifications to the Tuma app, and the delivery of every queued HuduFeed message.
 *
 * The app registers its FCM token after sign-in ([registerDevice]); services queue a push in the same transaction
 * as the change ([queuePush]) addressed to people (by user, by phone, or everyone at a business with a permission),
 * and [flushHuduFeed] turns each queued message into text and sends it through HuduFeed: SMS/WhatsApp/email to the
 * address on it, push to every live device of the people it's for. It runs right after app requests and on the
 * /api/cron/notify schedule; a failed send stays queued and is tried again (up to MAX_ATTEMPTS).
 */

const MAX_ATTEMPTS = 6;
const CLAIM_STALE_MS = 2 * 60_000;
const MAX_AGE_MS = 24 * 3600_000;

/* ------------------------------------------------------------ devices */

const deviceSchema = z.object({
  token: z.string().trim().min(20).max(4096),
  platform: z.enum(["android", "ios"]).default("android"),
  appVersion: z.string().trim().max(40).optional(),
});

/** The app's FCM token for this person (a token moves to whoever signed in last on that phone). */
export async function registerDevice(user: CurrentUser, raw: unknown) {
  const d = deviceSchema.parse(raw);
  await db
    .insert(pushDevices)
    .values({ userId: user.id, token: d.token, platform: d.platform, appVersion: d.appVersion })
    .onConflictDoUpdate({
      target: pushDevices.token,
      set: { userId: user.id, platform: d.platform, appVersion: d.appVersion ?? null, lastSeenAt: new Date(), disabledAt: null },
    });
  return { ok: true };
}

/** Signing out on this phone: stop pushing to it. */
export async function unregisterDevice(user: CurrentUser, raw: unknown) {
  const { token } = z.object({ token: z.string().trim().min(20).max(4096) }).parse(raw);
  await db.delete(pushDevices).where(and(eq(pushDevices.token, token), eq(pushDevices.userId, user.id)));
  return { ok: true };
}

/* ------------------------------------------------------------ queueing */

export type PushAudience = { userIds?: string[]; phones?: (string | null | undefined)[]; account?: { id: string; permission: string } };

/** Queue a push (sent after commit by the flush). `key` makes it once-only. */
export async function queuePush(
  tx: Tx,
  p: { key: string; to: PushAudience; template: string; variables?: Record<string, unknown>; data?: Record<string, string>; waybill?: string },
) {
  const phones = (p.to.phones ?? []).map((x) => (x ? toE164(x) : null)).filter((x): x is string => !!x);
  if (!p.to.userIds?.length && !phones.length && !p.to.account) return;
  await enqueue(tx, {
    target: "hudufeed",
    topic: "push.request",
    idempotencyKey: `push:${p.key}`,
    waybill: p.waybill,
    payload: { template: p.template, variables: p.variables ?? {}, data: p.data ?? {}, userIds: p.to.userIds ?? [], phones: [...new Set(phones)], account: p.to.account ?? null },
  });
}

/** The people a push is for, with their language. */
async function audience(p: { userIds?: string[]; phones?: string[]; account?: { id: string; permission: string } | null }) {
  const ors = [
    p.userIds?.length ? inArray(users.id, p.userIds) : undefined,
    p.phones?.length ? inArray(users.phone, p.phones) : undefined,
    p.account
      ? sql`(${users.accountId} = ${p.account.id} and exists (select 1 from jsonb_array_elements_text(${users.roles}) r(k) join role_permissions rp on rp.role_key = r.k where rp.permission = ${p.account.permission}))`
      : undefined,
  ].filter((x) => !!x);
  if (!ors.length) return [];
  return db
    .select({ token: pushDevices.token, locale: users.locale })
    .from(pushDevices)
    .innerJoin(users, eq(users.id, pushDevices.userId))
    .where(and(isNull(pushDevices.disabledAt), sql`(${sql.join(ors, sql` or `)})`));
}

/* ------------------------------------------------------------ delivery */

type Row = typeof outbox.$inferSelect;

async function send(m: Row): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = m.payload as Record<string, unknown>;
  const template = String(p.template ?? "");
  const variables = (p.variables ?? {}) as Record<string, unknown>;
  if (m.topic === "push.request") {
    const devices = await audience(p as never);
    let failed = 0;
    let lastError = "";
    for (const d of devices) {
      const text = render(template, d.locale, variables);
      const r = await dispatch({ channel: "push", to: d.token, title: text.title, message: text.body, data: { ...((p.data ?? {}) as Record<string, string>), template } });
      if (r.ok) continue;
      if (r.dead) await db.update(pushDevices).set({ disabledAt: new Date() }).where(eq(pushDevices.token, d.token));
      else (failed++, (lastError = r.error));
    }
    // Nobody with the app is fine: there's nothing to send.
    return failed && failed === devices.length ? { ok: false, error: lastError } : { ok: true };
  }
  if (m.topic === "notification.request") {
    const to = typeof p.to === "string" ? p.to : "";
    if (!to) return { ok: true };
    const channel = (["sms", "whatsapp", "email"].includes(String(p.channel)) ? p.channel : "sms") as Channel;
    const text = render(template, String(p.language ?? "sw"), variables);
    return dispatch({ channel, to, message: text.body, title: text.title });
  }
  return { ok: true }; // not a delivery HuduFeed does
}

/** Send what's queued for HuduFeed (claimed first, so two runs never send the same message). */
export async function flushHuduFeed(limit = 100) {
  const stale = new Date(Date.now() - CLAIM_STALE_MS);
  // Old news isn't sent: a code or "out for delivery" from yesterday would only confuse (and the first run after
  // this ships must not send the backlog).
  await db.execute(sql`
    update outbox set status = 'failed', last_error = 'expired'
    where target = 'hudufeed' and status in ('pending', 'failed') and created_at < ${new Date(Date.now() - MAX_AGE_MS).toISOString()}::timestamptz and last_error is distinct from 'expired'
  `);
  const claimed = (await db.execute(sql`
    update outbox set last_error = 'sending', sent_at = now(), attempts = attempts + 1
    where id in (
      select id from outbox
      where target = 'hudufeed' and status in ('pending', 'failed') and attempts < ${MAX_ATTEMPTS} and created_at >= ${new Date(Date.now() - MAX_AGE_MS).toISOString()}::timestamptz
        and (last_error is distinct from 'sending' or sent_at < ${stale.toISOString()}::timestamptz)
      order by created_at limit ${limit} for update skip locked
    )
    returning id, topic, payload, attempts, idempotency_key as "idempotencyKey"
  `)) as unknown as Row[];
  let sent = 0;
  let failed = 0;
  for (const m of claimed) {
    const r = await send(m).catch((e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) }));
    if (r.ok) {
      sent++;
      await db.update(outbox).set({ status: "sent", sentAt: new Date(), lastError: null }).where(eq(outbox.id, m.id));
    } else {
      failed++;
      await db.update(outbox).set({ status: "failed", sentAt: null, lastError: r.error.slice(0, 500) }).where(eq(outbox.id, m.id));
    }
  }
  return { sent, failed };
}

let lastKick = 0;
/** After an app request: send anything queued, at most every few seconds per server. Never throws. */
export async function kickHuduFeed() {
  if (Date.now() - lastKick < 3_000) return;
  lastKick = Date.now();
  await flushHuduFeed(50).catch((e) => console.error("[hudufeed]", e));
}
