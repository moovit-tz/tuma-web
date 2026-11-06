import { body, driverRoute } from "@/server/http/driver-api";
import { myParcels, senderBook } from "@/server/services/sender";

/** GET → what I sent and what's coming to my number. POST → book a parcel to drop at a Tuma point. */
export const GET = driverRoute(async (ctx) => myParcels(ctx.user));
export const POST = driverRoute(async (ctx, req) => senderBook(ctx.user, await body(req)));
