import { body, clientIp, publicRoute } from "@/server/http/driver-api";
import { allowLookup } from "@/server/services/tracking";
import { publicCase } from "@/server/services/support";
import { DomainError } from "@/server/services/shipments";

/** Guest case status. POST { phone } (in the body, never the URL) → status, item, history. 404 on any mismatch. */
export const POST = publicRoute<{ ref: string }>(async (req, { ref }) => {
  if (!allowLookup(`case:${clientIp(req)}`)) throw new DomainError("RATE_LIMITED", "Too many lookups. Wait a minute.", 429);
  const b = (await body(req)) as { phone?: string };
  return publicCase(decodeURIComponent(ref), String(b.phone ?? ""));
});
