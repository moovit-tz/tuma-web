import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { verifyDriverToken } from "../auth/driver-token";
import { driverContext, type DriverCtx } from "../services/drivers";
import { DomainError } from "../services/shipments";

/** JSON error body the app understands: { error: { code, message, fields? } }. */
export function apiError(code: string, message: string, status: number, fields?: Record<string, string>) {
  return NextResponse.json({ error: { code, message, ...(fields ? { fields } : {}) } }, { status });
}

export function toResponse(e: unknown) {
  // Next's own signals (prerender bail-out, redirect, not found) pass through, never become a 500.
  unstable_rethrow(e);
  if (e instanceof DomainError) return apiError(e.code, e.message, e.status);
  if (e instanceof ZodError) {
    const fields = Object.fromEntries(e.issues.map((i) => [i.path.join(".") || "_", i.message]));
    return apiError("INVALID", "Some details are missing or wrong.", 400, fields);
  }
  if (e instanceof SyntaxError) return apiError("BAD_JSON", "The request body is not valid JSON.", 400);
  console.error("[driver-api]", e);
  return apiError("SERVER", "Something went wrong. Try again.", 500);
}

export async function body(req: NextRequest): Promise<unknown> {
  const text = await req.text();
  return text ? JSON.parse(text) : {};
}

/** Wraps a Tuma-X route: bearer token → driver context, JSON out, errors mapped. */
export function driverRoute<P>(handler: (ctx: DriverCtx, req: NextRequest, params: P) => Promise<unknown>) {
  return async (req: NextRequest, route: { params: Promise<P> }) => {
    try {
      const auth = req.headers.get("authorization");
      const userId = await verifyDriverToken(auth?.startsWith("Bearer ") ? auth.slice(7) : null);
      const ctx = await driverContext(userId);
      if (!ctx) return apiError("UNAUTHORIZED", "Sign in again.", 401);
      const out = await handler(ctx, req, await route.params);
      return NextResponse.json(out ?? { ok: true });
    } catch (e) {
      return toResponse(e);
    }
  };
}

/** Same, without a token (sign-in and guest routes). */
export function publicRoute<P = Record<string, never>>(handler: (req: NextRequest, params: P) => Promise<unknown>) {
  return async (req: NextRequest, route?: { params: Promise<P> }) => {
    try {
      return NextResponse.json(await handler(req, (await route?.params) ?? ({} as P)));
    } catch (e) {
      return toResponse(e);
    }
  };
}

/** Caller IP for rate limits (first x-forwarded-for hop). */
export const clientIp = (req: NextRequest) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
