import { body, driverRoute } from "@/server/http/driver-api";
import { mergeCustomers } from "@/server/services/customers";

/** POST { keepId, mergeIds } → merges those customers into the one kept. Needs partner.clients.manage. */
export const POST = driverRoute(async (ctx, req) => mergeCustomers(ctx.user, await body(req)));
