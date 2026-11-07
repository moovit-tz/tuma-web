import { body, driverRoute } from "@/server/http/driver-api";
import { rateMine } from "@/server/services/ratings";

/** POST { stars, issue?, comment? } → rate the Tuma point that handed this parcel to me. */
export const POST = driverRoute<{ waybill: string }>(async (ctx, req, p) => rateMine(ctx.user, p.waybill, await body(req)));
