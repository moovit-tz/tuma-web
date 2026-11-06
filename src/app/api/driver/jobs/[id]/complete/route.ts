import { body, driverRoute } from "@/server/http/driver-api";
import { completeJob } from "@/server/services/drivers";

/** POST { distanceM?, trail? } once every stop is delivered or failed. */
export const POST = driverRoute<{ id: string }>(async (ctx, req, { id }) => completeJob(ctx, id, await body(req)));
