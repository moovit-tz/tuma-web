import { clientIp, publicRoute } from "@/server/http/driver-api";
import { allowLookup, requestTrackingOtp } from "@/server/services/tracking";
import { DomainError } from "@/server/services/shipments";

/** POST → text the receiver a fresh code. { ok, maskedPhone, resendInSec, devCode? } or { ok:false, error, retryInSec? }. */
export const POST = publicRoute<{ waybill: string }>(async (req, { waybill }) => {
  if (!allowLookup(`otp-send:${clientIp(req)}`)) throw new DomainError("RATE_LIMITED", "Too many requests. Wait a minute.", 429);
  return requestTrackingOtp(decodeURIComponent(waybill));
});
