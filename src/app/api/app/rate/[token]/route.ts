import { body, clientIp, publicRoute } from "@/server/http/driver-api";
import { allowLookup } from "@/server/services/tracking";
import { DomainError } from "@/server/services/shipments";
import { ratingByToken, submitRating } from "@/server/services/ratings";

/** GET → what the receiver's rating link is for (status open | rated | expired | not_found). */
export const GET = publicRoute<{ token: string }>(async (req, { token }) => {
  if (!allowLookup(`rate:${clientIp(req)}`)) throw new DomainError("RATE_LIMITED", "Too many requests. Wait a minute.", 429);
  return ratingByToken(token);
});

/** POST { stars, issue?, comment? } → rates the point, once. */
export const POST = publicRoute<{ token: string }>(async (req, { token }) => {
  if (!allowLookup(`rate:${clientIp(req)}`)) throw new DomainError("RATE_LIMITED", "Too many requests. Wait a minute.", 429);
  return submitRating(token, await body(req));
});
