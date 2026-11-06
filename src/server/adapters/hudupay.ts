import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { DomainError } from "../errors";

/**
 * Hudumika HuduPay: mobile-money collections (moovit-beta services/hudupay-api). Tuma is a service client:
 * `POST /v1/collections` pushes a payment prompt to the payer's phone (idempotent on our reference), `GET
 * /v1/collections/:id` reports (and reconciles) its status, and the outcome is POSTed to our callback signed with
 * `X-HuduPay-Signature` = hex HMAC-SHA256 of the raw body under the client's callback secret.
 *
 * Without HUDUPAY_URL outside production, payments are simulated: accepted at once and paid a few seconds later,
 * so the counter flow can be exercised end to end.
 */

export type CollectionStatus = "PENDING" | "SUCCESS" | "FAILED";
export type Collection = { id: string; reference: string; status: CollectionStatus; failureMessage: string | null };

const SIM_PREFIX = "sim_";
export const SIM_PAID_AFTER_MS = 6_000;

function config() {
  const url = process.env.HUDUPAY_URL?.replace(/\/+$/, "");
  const key = process.env.HUDUPAY_SERVICE_KEY;
  if (url && key) return { url, key };
  if (process.env.NODE_ENV === "production") throw new DomainError("MOMO_UNAVAILABLE", "Mobile money isn't set up yet. Take cash for now.", 503);
  return null;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const c = config()!;
  let res: Response;
  try {
    res = await fetch(`${c.url}${path}`, {
      ...init,
      headers: { "content-type": "application/json", "x-service-key": c.key, ...init?.headers },
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new DomainError("MOMO_UNAVAILABLE", "Mobile money didn't answer. Try again or take cash.", 503);
  }
  const body = (await res.json().catch(() => ({}))) as T & { error?: unknown };
  if (!res.ok) throw new DomainError("MOMO_FAILED", "Mobile money couldn't start that payment. Check the number and try again.", 502);
  return body;
}

/** Ask the payer's phone for the money. `msisdn` is 255XXXXXXXXX. */
export async function collect(p: { reference: string; amount: number; msisdn: string; narration: string; callbackUrl: string }): Promise<Collection> {
  if (!config()) return { id: `${SIM_PREFIX}${p.reference}`, reference: p.reference, status: "PENDING", failureMessage: null };
  const r = await call<Collection>("/v1/collections", { method: "POST", body: JSON.stringify({ ...p, currency: "TZS" }) });
  return { id: r.id, reference: r.reference, status: r.status, failureMessage: r.failureMessage ?? null };
}

/** Where a payment stands; HuduPay checks with the provider when it's still pending. */
export async function collection(id: string, requestedAt: Date): Promise<Collection> {
  if (id.startsWith(SIM_PREFIX)) {
    const paid = Date.now() - requestedAt.getTime() >= SIM_PAID_AFTER_MS;
    return { id, reference: id.slice(SIM_PREFIX.length), status: paid ? "SUCCESS" : "PENDING", failureMessage: null };
  }
  const r = await call<Collection>(`/v1/collections/${encodeURIComponent(id)}`);
  return { id: r.id, reference: r.reference, status: r.status, failureMessage: r.failureMessage ?? null };
}

/** True when `signature` is HuduPay's HMAC of `raw` under HUDUPAY_CALLBACK_SECRET. */
export function verifyCallback(raw: string, signature: string | null): boolean {
  const secret = process.env.HUDUPAY_CALLBACK_SECRET;
  if (!secret || !signature) return false;
  const want = createHmac("sha256", secret).update(raw).digest("hex");
  return signature.length === want.length && timingSafeEqual(Buffer.from(signature), Buffer.from(want));
}
