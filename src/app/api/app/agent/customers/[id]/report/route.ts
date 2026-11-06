import { body, driverRoute } from "@/server/http/driver-api";
import { reportCustomer } from "@/server/services/customers";

/** POST { reason, note? } → reports the customer for fraud or abuse; other agents booking with the number are warned. */
export const POST = driverRoute<{ id: string }>(async (ctx, req, p) => reportCustomer(ctx.user, p.id, await body(req)));
