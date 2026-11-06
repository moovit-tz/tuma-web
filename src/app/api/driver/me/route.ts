import { body, driverRoute } from "@/server/http/driver-api";
import { driverMe, registerDriver } from "@/server/services/drivers";

/** GET → the driver, today's earnings, cash held, active job id. */
export const GET = driverRoute(async (ctx) => driverMe(ctx));
/** PUT { fullName, region, vehicleKind, plate, profile } → register or update. */
export const PUT = driverRoute(async (ctx, req) => registerDriver(ctx, await body(req)));
