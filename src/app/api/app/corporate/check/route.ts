import { driverRoute } from "@/server/http/driver-api";
import { companyCheck } from "@/server/services/corporate";

/** GET ?tin= → whether a company with this TIN is already on Tuma (then you ask its admin to add you). */
export const GET = driverRoute(async (_ctx, req) => companyCheck({ tin: req.nextUrl.searchParams.get("tin") }));
