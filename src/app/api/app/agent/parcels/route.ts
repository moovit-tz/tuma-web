import { body, driverRoute } from "@/server/http/driver-api";
import { agentBook, agentParcels } from "@/server/services/agent-parcels";

/** GET ?view=expected|in_hand|on_the_way|done|all&q= → the business's parcels. POST counter booking → the new parcel. */
export const GET = driverRoute(async (ctx, req) => agentParcels(ctx.user, Object.fromEntries(req.nextUrl.searchParams)));
export const POST = driverRoute(async (ctx, req) => agentBook(ctx.user, await body(req)));
