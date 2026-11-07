import { body, driverRoute } from "@/server/http/driver-api";
import { setUpSender } from "@/server/services/sender-profile";

/** POST { region, district?, language?, phone? } → set up to send and receive parcels; returns { sender, phone }. */
export const POST = driverRoute(async (ctx, req) => setUpSender(ctx.user, await body(req)));
