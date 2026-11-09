import "server-only";
import { after, NextResponse, type NextRequest } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { verifyDriverToken } from "../auth/driver-token";
import { driverContext, type DriverCtx } from "../services/drivers";
import { DomainError } from "../services/shipments";
import { kickHuduFeed } from "../services/push";
import { localizeError } from "@/i18n/errors-sw";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import { idempotencyKeys } from "../db/schema";

/** JSON error body the app understands: { error: { code, message, fields? } }. */
export function apiError(code: string, message: string, status: number, fields?: Record<string, string>) {
  return NextResponse.json({ error: { code, message, ...(fields ? { fields } : {}) } }, { status });
}

/** The error as the app shows it, in the reader's language ([lang]: the request's Accept-Language). */
export function toResponse(e: unknown, lang?: string | null) {
  const L = (m: string) => localizeError(m, lang);
  // Next's own signals (prerender bail-out, redirect, not found) pass through, never become a 500.
  unstable_rethrow(e);
  if (e instanceof DomainError) return apiError(e.code, L(e.message), e.status);
  if (e instanceof ZodError) {
    const fields = Object.fromEntries(e.issues.map((i) => [i.path.join(".") || "_", L(i.message)]));
    return apiError("INVALID", L("Some details are missing or wrong."), 400, fields);
  }
  if (e instanceof SyntaxError) return apiError("BAD_JSON", "The request body is not valid JSON.", 400);
  console.error("[driver-api]", e);
  return apiError("SERVER", L("Something went wrong. Try again."), 500);
}

export async function body(req: NextRequest): Promise<unknown> {
  const text = await req.text();
  return text ? JSON.parse(text) : {};
}

/** An Idempotency-Key the app made (a UUID or similar); anything else is ignored. */
const KEY_RE = /^[\w-]{8,100}$/;

/** Keeps the answer to a keyed request: successes and the person's own mistakes (4xx), not sign-in or rate limits. */
async function remember(userId: string, key: string, req: NextRequest, status: number, body: unknown) {
  if (status >= 500 || status === 401 || status === 429) return;
  await db
    .insert(idempotencyKeys)
    .values({ userId, key, method: req.method, path: req.nextUrl.pathname, status, body: body as object })
    .onConflictDoNothing()
    .catch((e) => console.error("[idempotency]", e));
}

/**
 * Wraps a Tuma-X route: bearer token → driver context, JSON out, errors mapped. A POST/PUT/PATCH/DELETE with an
 * Idempotency-Key header is done once: sent again (the offline outbox retrying), it gets the first answer back.
 */
export function driverRoute<P>(handler: (ctx: DriverCtx, req: NextRequest, params: P) => Promise<unknown>) {
  return async (req: NextRequest, route: { params: Promise<P> }) => {
    let userId: string | null = null;
    const raw = req.method === "GET" ? null : req.headers.get("idempotency-key");
    const key = raw && KEY_RE.test(raw) ? raw : null;
    try {
      const auth = req.headers.get("authorization");
      userId = await verifyDriverToken(auth?.startsWith("Bearer ") ? auth.slice(7) : null);
      const ctx = await driverContext(userId);
      if (!ctx) return apiError("UNAUTHORIZED", localizeError("Sign in again.", req.headers.get("accept-language")), 401);
      if (key) {
        const [hit] = await db.select().from(idempotencyKeys).where(and(eq(idempotencyKeys.userId, ctx.user.id), eq(idempotencyKeys.key, key)));
        if (hit) return NextResponse.json(hit.body ?? { ok: true }, { status: hit.status, headers: { "idempotent-replay": "true" } });
      }
      const out = await handler(ctx, req, await route.params);
      // Whatever that queued (SMS, push) goes out now, after the response.
      if (req.method !== "GET") after(kickHuduFeed);
      // A handler that builds its own response (a file download) gets it sent as is.
      if (out instanceof Response) return out;
      if (key) await remember(ctx.user.id, key, req, 200, out ?? { ok: true });
      return NextResponse.json(out ?? { ok: true });
    } catch (e) {
      const res = toResponse(e, req.headers.get("accept-language"));
      if (key && userId) await remember(userId, key, req, res.status, await res.clone().json().catch(() => null));
      return res;
    }
  };
}

/** Same, without a token (sign-in and guest routes). */
export function publicRoute<P = Record<string, never>>(handler: (req: NextRequest, params: P) => Promise<unknown>) {
  return async (req: NextRequest, route?: { params: Promise<P> }) => {
    try {
      const out = await handler(req, (await route?.params) ?? ({} as P));
      if (req.method !== "GET") after(kickHuduFeed);
      return NextResponse.json(out);
    } catch (e) {
      return toResponse(e, req.headers.get("accept-language"));
    }
  };
}

/** Caller IP for rate limits (first x-forwarded-for hop). */
export const clientIp = (req: NextRequest) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
