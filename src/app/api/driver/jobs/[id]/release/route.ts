import { body, driverRoute } from "@/server/http/driver-api";
import { releaseJob } from "@/server/services/drivers";

/** POST { reason } → hand the job back. */
export const POST = driverRoute<{ id: string }>(async (ctx, req, { id }) => releaseJob(ctx, id, await body(req)));
