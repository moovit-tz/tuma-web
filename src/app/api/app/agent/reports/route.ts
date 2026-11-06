import { driverRoute } from "@/server/http/driver-api";
import { agentReport } from "@/server/services/agent-parcels";

/** GET ?period=today|week|month|quarter → the business's parcel report (report.view). */
export const GET = driverRoute(async (ctx, req) => agentReport(ctx.user, Object.fromEntries(req.nextUrl.searchParams)));
