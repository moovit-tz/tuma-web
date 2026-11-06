import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, toResponse } from "@/server/http/driver-api";
import { verifyCallback } from "@/server/adapters/hudupay";
import { settlePayment } from "@/server/services/counter-payments";

const payload = z.object({
  type: z.enum(["payment", "disbursement"]),
  id: z.string(),
  reference: z.string(),
  status: z.enum(["SUCCESS", "FAILED"]),
  failureMessage: z.string().optional(),
});

/** HuduPay → Tuma: a push payment's outcome, signed `X-HuduPay-Signature` (HMAC-SHA256 of the raw body). */
export async function POST(req: NextRequest) {
  if (!process.env.HUDUPAY_CALLBACK_SECRET) return apiError("NOT_CONFIGURED", "HuduPay callbacks are not configured.", 503);
  const raw = await req.text();
  if (!verifyCallback(raw, req.headers.get("x-hudupay-signature"))) return apiError("BAD_SIGNATURE", "Signature mismatch.", 401);
  try {
    const p = payload.parse(JSON.parse(raw));
    if (p.type !== "payment") return NextResponse.json({ ok: true, ignored: true });
    const settled = await settlePayment(p.reference, p.status, p.failureMessage ?? null);
    return NextResponse.json({ ok: true, known: !!settled });
  } catch (e) {
    return toResponse(e);
  }
}
