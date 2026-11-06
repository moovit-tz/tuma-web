import { body, driverRoute } from "@/server/http/driver-api";
import { dismissDuplicates, duplicateCustomers } from "@/server/services/customers";

/** GET → customers sharing a name (merge suggestions). POST { ids } → "not the same", stop suggesting them. */
export const GET = driverRoute(async (ctx) => duplicateCustomers(ctx.user));
export const POST = driverRoute(async (ctx, req) => dismissDuplicates(ctx.user, await body(req)));
