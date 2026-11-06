import { driverRoute } from "@/server/http/driver-api";
import { acceptJob } from "@/server/services/drivers";

/** POST → take the job. 409 TAKEN when another driver was first. */
export const POST = driverRoute<{ id: string }>(async (ctx, _req, { id }) => ({ job: await acceptJob(ctx, id) }));
