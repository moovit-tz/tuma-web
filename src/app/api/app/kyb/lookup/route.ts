import { body, driverRoute } from "@/server/http/driver-api";
import { allowLookup } from "@/server/services/tracking";
import { lookupBusiness } from "@/server/services/kyb";
import { DomainError } from "@/server/errors";

/** POST { kind: "company" | "business_name", query } → { results } from the BRELA register (via ComplyOS). */
export const POST = driverRoute(async (ctx, req) => {
  if (!allowLookup(`brela:${ctx.user.id}`)) throw new DomainError("RATE_LIMITED", "Too many searches. Wait a minute.", 429);
  return lookupBusiness(await body(req));
});
