import { driverRoute } from "@/server/http/driver-api";
import { companyReport } from "@/server/services/company";

/** GET ?months=6 → totals, by month, by department, by person, by region. */
export const GET = driverRoute(async (ctx, req) => companyReport(ctx.user, { months: req.nextUrl.searchParams.get("months") ?? undefined }));
