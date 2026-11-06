import { driverRoute } from "@/server/http/driver-api";
import { agentCustomers } from "@/server/services/customers";

/** GET ?q=&kind=individual|company → the company's saved customers, most recent first. */
export const GET = driverRoute(async (ctx, req) => agentCustomers(ctx.user, Object.fromEntries(req.nextUrl.searchParams)));
