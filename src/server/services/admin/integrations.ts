import "server-only";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { outbox, parcelPayments } from "../../db/schema";
import { audit } from "../../audit";
import { DomainError } from "../../errors";
import type { CurrentUser } from "../../auth/current-user";
import type { OutboxTarget } from "../../adapters/outbox";

/**
 * The services Tuma talks to, for the platform team: what each does, whether it's connected for real or simulated,
 * which settings are present (never their values), and what has gone through it lately. Read from this server's
 * environment and the outbox; changing a connection is a deploy, not a click.
 */

export type IntegrationCategory = "messaging" | "payments" | "identity" | "compliance" | "finance" | "insurance" | "analytics" | "maps" | "storage";
export type IntegrationMode = "live" | "simulated" | "off";

type Def = {
  key: string;
  category: IntegrationCategory;
  provider: string;
  /** Environment settings it uses: names only. */
  settings: string[];
  mode: () => IntegrationMode;
  /** Its outbox target, when Tuma queues work for it. */
  target?: OutboxTarget;
  /** Tuma itself delivers what's queued (otherwise the other side collects it, or it waits for a connector). */
  delivered?: boolean;
};

const set = (k: string) => !!process.env[k]?.trim();

const DEFS: Def[] = [
  { key: "hudufeed", category: "messaging", provider: "HuduFeed", settings: ["HUDUFEED_URL", "HUDUFEED_SERVICE_KEY"], mode: () => (set("HUDUFEED_URL") ? "live" : "simulated"), target: "hudufeed", delivered: true },
  {
    key: "hudupay",
    category: "payments",
    provider: "HuduPay",
    settings: ["HUDUPAY_URL", "HUDUPAY_SERVICE_KEY", "HUDUPAY_CALLBACK_SECRET"],
    mode: () => (set("HUDUPAY_URL") ? "live" : process.env.NODE_ENV === "production" ? "off" : "simulated"),
  },
  {
    key: "ondi",
    category: "identity",
    provider: "Ondi",
    settings: ["ONDI_MODE", "ONDI_API_URL", "ONDI_CLIENT_ID", "ONDI_CLIENT_SECRET"],
    mode: () => (process.env.ONDI_MODE === "oidc" ? "live" : process.env.ONDI_MODE === "stub" ? "simulated" : "off"),
  },
  {
    key: "complyos",
    category: "compliance",
    provider: "ComplyOS",
    settings: ["COMPLYOS_MODE", "COMPLYOS_API_URL", "COMPLYOS_API_TOKEN", "COMPLYOS_WEBHOOK_SECRET"],
    mode: () => ((process.env.COMPLYOS_MODE ?? "stub") === "stub" ? "simulated" : "live"),
    target: "complyos",
  },
  { key: "finops", category: "finance", provider: "FinOps", settings: [], mode: () => "simulated", target: "finops" },
  { key: "seal", category: "finance", provider: "SEAL", settings: [], mode: () => "simulated", target: "seal" },
  { key: "crm", category: "finance", provider: "CRM", settings: [], mode: () => "simulated", target: "crm" },
  {
    key: "bliss",
    category: "insurance",
    provider: "Bliss",
    settings: ["BLISS_MODE", "BLISS_API_URL", "BLISS_SERVICE_KEY", "BLISS_WEBHOOK_SECRET"],
    mode: () => ((process.env.BLISS_MODE ?? (set("BLISS_API_URL") ? "http" : "stub")) === "stub" ? "simulated" : "live"),
    target: "bliss",
  },
  { key: "hudubi", category: "analytics", provider: "HuduBI", settings: ["HUDUBI_API_URL", "HUDUBI_INGEST_KEY"], mode: () => (set("HUDUBI_API_URL") ? "live" : "simulated"), target: "hudubi", delivered: true },
  { key: "maps", category: "maps", provider: "Google Maps", settings: ["GOOGLE_MAPS_API_KEY"], mode: () => (set("GOOGLE_MAPS_API_KEY") ? "live" : "off") },
  {
    key: "storage",
    category: "storage",
    provider: "Cloudflare R2",
    settings: ["R2_ENDPOINT", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"],
    mode: () => (set("R2_ENDPOINT") && set("R2_BUCKET") ? "live" : "simulated"),
  },
];

export type OutboxStats = { sent24h: number; pending: number; failed: number; lastSentAt: string | null; lastError: string | null };

function canSee(user: CurrentUser) {
  if (!user.permissions.has("settings.manage")) throw new DomainError("FORBIDDEN", "You don't have access to integrations.", 403);
}

export async function integrations(user: CurrentUser) {
  canSee(user);
  const since = new Date(Date.now() - 24 * 3600_000);
  const targets = DEFS.map((d) => d.target).filter((t): t is OutboxTarget => !!t);
  const [rows, errors, pay] = await Promise.all([
    db
      .select({
        target: outbox.target,
        sent24h: sql<number>`count(*) filter (where ${outbox.status} = 'sent' and ${outbox.sentAt} >= ${since.toISOString()}::timestamptz)::int`,
        pending: sql<number>`count(*) filter (where ${outbox.status} = 'pending')::int`,
        failed: sql<number>`count(*) filter (where ${outbox.status} = 'failed')::int`,
        lastSentAt: sql<string | null>`max(${outbox.sentAt}) filter (where ${outbox.status} = 'sent')`,
      })
      .from(outbox)
      .where(inArray(outbox.target, targets))
      .groupBy(outbox.target),
    // The latest failure per target, to say what went wrong.
    db.execute(sql`select distinct on (target) target, last_error from ${outbox} where status = 'failed' and target in (${sql.join(targets.map((t) => sql`${t}`), sql`, `)}) order by target, created_at desc`) as unknown as Promise<
      { target: string; last_error: string | null }[]
    >,
    db
      .select({
        paid: sql<number>`count(*) filter (where ${parcelPayments.status} = 'paid')::int`,
        failed: sql<number>`count(*) filter (where ${parcelPayments.status} = 'failed')::int`,
        pending: sql<number>`count(*) filter (where ${parcelPayments.status} = 'pending')::int`,
        last: sql<string | null>`max(${parcelPayments.completedAt}) filter (where ${parcelPayments.status} = 'paid')`,
      })
      .from(parcelPayments)
      .where(gte(parcelPayments.createdAt, since)),
  ]);
  const byTarget = new Map(rows.map((r) => [r.target, r]));
  const lastErr = new Map([...errors].map((e) => [e.target, e.last_error]));
  const p = pay[0];
  return {
    items: DEFS.map((d) => {
      const r = d.target ? byTarget.get(d.target) : undefined;
      const stats: OutboxStats | null = d.target
        ? {
            sent24h: r?.sent24h ?? 0,
            pending: r?.pending ?? 0,
            failed: r?.failed ?? 0,
            lastSentAt: r?.lastSentAt ? new Date(r.lastSentAt).toISOString() : null,
            lastError: lastErr.get(d.target)?.slice(0, 200) ?? null,
          }
        : null;
      return {
        key: d.key,
        category: d.category,
        provider: d.provider,
        mode: d.mode(),
        settings: d.settings.map((name) => ({ name, set: set(name) })),
        delivered: !!d.delivered,
        outbox: stats,
        // Mobile money's last day: requests paid, failed and still waiting.
        payments: d.key === "hudupay" ? { paid: p?.paid ?? 0, failed: p?.failed ?? 0, pending: p?.pending ?? 0, lastPaidAt: p?.last ? new Date(p.last).toISOString() : null } : null,
      };
    }),
  };
}

/** Sends a delivered target's failed messages from the last day again (HuduFeed, HuduBI), with fresh attempts. */
export async function retryFailed(user: CurrentUser, key: string) {
  canSee(user);
  const d = DEFS.find((x) => x.key === key);
  if (!d?.target || !d.delivered) throw new DomainError("NOT_RETRYABLE", "Tuma doesn't deliver for this integration, so there's nothing to send again.", 400);
  const out = await db.transaction(async (tx) => {
    const rows = await tx
      .update(outbox)
      // Only what's still fresh: an old message (a code, a "your parcel is here") isn't worth sending late.
      .set({ status: "pending", attempts: 0, lastError: null, sentAt: null })
      .where(and(eq(outbox.target, d.target!), eq(outbox.status, "failed"), sql`${outbox.lastError} is distinct from 'expired'`, gte(outbox.createdAt, new Date(Date.now() - 24 * 3600_000))))
      .returning({ id: outbox.id });
    await audit(tx, { actorId: user.id, action: "integration.retry", entity: "integration", entityId: d.key, after: { messages: rows.length } });
    return rows.length;
  });
  return { requeued: out };
}
