import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { apiError, toResponse } from "@/server/http/driver-api";
import { runRiskChecks } from "@/server/services/admin/risk";

/**
 * Runs the risk rules (velocity, ghost delivery, cash shortfall, reported phones) and raises alerts for what's new.
 * Call it every 15 minutes with `Authorization: Bearer CRON_SECRET`.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return apiError("NOT_CONFIGURED", "Scheduled jobs aren't configured.", 503);
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (got.length !== secret.length || !timingSafeEqual(Buffer.from(got), Buffer.from(secret))) return apiError("UNAUTHORIZED", "Not allowed.", 401);
  try {
    return NextResponse.json(await runRiskChecks(null));
  } catch (e) {
    return toResponse(e);
  }
}
