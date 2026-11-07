import { body, driverRoute } from "@/server/http/driver-api";
import { rateCustomer } from "@/server/services/customer-ratings";

/** POST { role: sender|receiver, stars, note? } → rate the customer this business served on the parcel. */
export const POST = driverRoute<{ waybill: string }>(async (ctx, req, p) => rateCustomer(ctx.user, p.waybill, await body(req)));
