import { driverRoute } from "@/server/http/driver-api";
import { collectionPoints } from "@/server/services/agent-parcels";

/** GET ?region=&district= → this company's offices there (receiver's district first) and Wakala points a receiver can collect from. */
export const GET = driverRoute(async (ctx, req) => {
  const q = req.nextUrl.searchParams;
  return collectionPoints(ctx.user, q.get("region") ?? undefined, q.get("district") ?? undefined);
});
