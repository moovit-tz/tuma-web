import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { apiError, toResponse } from "@/server/http/driver-api";
import { flushHuduFeed } from "@/server/services/push";

/**
 * Sends what's queued for HuduFeed (SMS, WhatsApp, email, push) that app requests didn't already send: messages
 * queued by the portal, background jobs, and retries. Call it every minute with `Authorization: Bearer CRON_SECRET`.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return apiError("NOT_CONFIGURED", "Scheduled jobs aren't configured.", 503);
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (got.length !== secret.length || !timingSafeEqual(Buffer.from(got), Buffer.from(secret))) return apiError("UNAUTHORIZED", "Not allowed.", 401);
  try {
    return NextResponse.json(await flushHuduFeed(500));
  } catch (e) {
    return toResponse(e);
  }
}
