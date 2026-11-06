import { NextResponse, type NextRequest } from "next/server";
import { apiError, toResponse } from "@/server/http/driver-api";
import { verifyComplySignature } from "@/server/adapters/complyos";
import { applyKybDecision } from "@/server/services/kyb";

/**
 * ComplyOS → Tuma KYB decisions. Body: { eventId, ref, decision: in_review | needs_info | approved | rejected, note?,
 * complyRef?, occurredAt? }. Header `x-complyos-signature: sha256=<hex HMAC of the raw body>` with
 * COMPLYOS_WEBHOOK_SECRET. PLACEHOLDER contract until ComplyOS publishes its webhook spec.
 */
export async function POST(req: NextRequest) {
  if (!process.env.COMPLYOS_WEBHOOK_SECRET) return apiError("NOT_CONFIGURED", "ComplyOS webhook is not configured.", 503);
  const raw = await req.text();
  if (!verifyComplySignature(raw, req.headers.get("x-complyos-signature"))) return apiError("BAD_SIGNATURE", "Signature mismatch.", 401);
  try {
    return NextResponse.json(await applyKybDecision(JSON.parse(raw)));
  } catch (e) {
    return toResponse(e);
  }
}
