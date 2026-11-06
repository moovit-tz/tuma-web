import { body, driverRoute } from "@/server/http/driver-api";
import { raiseSos } from "@/server/services/drivers";

/** POST { lat?, lng?, jobId?, note? } → alerts the control tower. */
export const POST = driverRoute(async (ctx, req) => raiseSos(ctx, await body(req)));
