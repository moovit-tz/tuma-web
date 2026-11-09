import { driverRoute } from "@/server/http/driver-api";
import { requestMomoSetup } from "@/server/services/agent-payments";

/** POST → { sent, already }: asks whoever manages payments at the business to turn mobile money on. */
export const POST = driverRoute(async (ctx) => requestMomoSetup(ctx.user));
