import { driverRoute } from "@/server/http/driver-api";
import { businessOnTuma } from "@/server/services/kyb";

/** GET ?tin=&regNo= → { taken, name? }: whether this business is already on Tuma (checked as the TIN is typed). */
export const GET = driverRoute(async (ctx, req) => {
  const q = req.nextUrl.searchParams;
  return businessOnTuma(ctx.user.id, { tin: q.get("tin"), regNo: q.get("regNo") });
});
