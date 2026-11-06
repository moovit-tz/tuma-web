import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { apiError, toResponse } from "@/server/http/driver-api";
import { publishPricing } from "@/server/services/pricing-analytics";

/**
 * Background run of the parcel-pricing analytics: computes today's snapshot (trailing 30 days) and delivers it, and
 * anything still pending, to HuduBI. Call it on a schedule (hourly is plenty) with `Authorization: Bearer CRON_SECRET`.
 * Optional body { asOf: "YYYY-MM-DD" } to rebuild a past day.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return apiError("NOT_CONFIGURED", "Scheduled jobs aren't configured.", 503);
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (got.length !== secret.length || !timingSafeEqual(Buffer.from(got), Buffer.from(secret))) return apiError("UNAUTHORIZED", "Not allowed.", 401);
  try {
    const b = (await req.json().catch(() => ({}))) as { asOf?: unknown };
    const asOf = typeof b.asOf === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.asOf) ? b.asOf : undefined;
    return NextResponse.json(await publishPricing(asOf));
  } catch (e) {
    return toResponse(e);
  }
}
