import { driverRoute } from "@/server/http/driver-api";
import { jobHistory } from "@/server/services/drivers";

/** GET ?limit → finished and cancelled jobs with payout. */
export const GET = driverRoute(async (ctx, req) => ({ jobs: await jobHistory(ctx, Number(req.nextUrl.searchParams.get("limit") ?? 50) || 50) }));
