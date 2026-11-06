import { body, clientIp, publicRoute } from "@/server/http/driver-api";
import { allowLookup, verifyTrackingOtp } from "@/server/services/tracking";
import { DomainError } from "@/server/services/shipments";

/** POST { code } → { ok:true, token } (send it back as X-Track-Proof for 30 minutes) or { ok:false, error }. */
export const POST = publicRoute<{ waybill: string }>(async (req, { waybill }) => {
  if (!allowLookup(`otp-check:${clientIp(req)}`)) throw new DomainError("RATE_LIMITED", "Too many tries. Wait a minute.", 429);
  const b = (await body(req)) as { code?: string };
  return verifyTrackingOtp(decodeURIComponent(waybill), String(b.code ?? ""));
});
