import { driverRoute } from "@/server/http/driver-api";
import { currentJob } from "@/server/services/drivers";

/** GET → the job in progress, so the app can resume after a restart. */
export const GET = driverRoute(async (ctx) => ({ job: await currentJob(ctx) }));
