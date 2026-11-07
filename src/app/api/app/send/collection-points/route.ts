import { driverRoute } from "@/server/http/driver-api";
import { senderCollectionPoints } from "@/server/services/sender";

/** GET ?dropOffId=&region=&district= → where the receiver can collect: the drop-off business's offices and the common collection points. */
export const GET = driverRoute(async (ctx, req) => {
  const q = req.nextUrl.searchParams;
  return senderCollectionPoints(ctx.user, { dropOffId: q.get("dropOffId"), region: q.get("region"), district: q.get("district") });
});
