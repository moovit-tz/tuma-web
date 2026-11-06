import { body, driverRoute } from "@/server/http/driver-api";
import { priceDropOff } from "@/server/services/sender";

/** POST { price, weightKg? } → price a parcel booked ahead now it's on the counter (then it's paid for, or received). */
export const POST = driverRoute<{ waybill: string }>(async (ctx, req, p) => priceDropOff(ctx.user, p.waybill, await body(req)));
