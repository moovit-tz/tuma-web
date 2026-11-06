import { body, driverRoute } from "@/server/http/driver-api";
import { setPresence } from "@/server/services/drivers";

/** POST { online, lat?, lng? } */
export const POST = driverRoute(async (ctx, req) => setPresence(ctx, await body(req)));
