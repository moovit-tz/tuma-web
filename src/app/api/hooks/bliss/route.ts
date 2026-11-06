import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { apiError, toResponse } from "@/server/http/driver-api";
import { applyCaseUpdate } from "@/server/services/support";

/**
 * Bliss → Tuma case updates (Bliss owns the case lifecycle; Tuma shows the customer-facing part).
 * Body: { eventId, ref, status, note?, occurredAt? }. Header `x-bliss-signature: sha256=<hex HMAC of the raw body>`
 * with BLISS_WEBHOOK_SECRET. PLACEHOLDER contract until Bliss publishes its webhook spec.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.BLISS_WEBHOOK_SECRET;
  if (!secret) return apiError("NOT_CONFIGURED", "Bliss webhook is not configured.", 503);
  const raw = await req.text();
  const sig = (req.headers.get("x-bliss-signature") ?? "").replace(/^sha256=/, "");
  const want = createHmac("sha256", secret).update(raw).digest("hex");
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return apiError("BAD_SIGNATURE", "Signature mismatch.", 401);
  try {
    return NextResponse.json(await applyCaseUpdate(JSON.parse(raw)));
  } catch (e) {
    return toResponse(e);
  }
}
