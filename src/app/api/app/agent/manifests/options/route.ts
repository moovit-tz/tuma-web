import { driverRoute } from "@/server/http/driver-api";
import { dispatchOptions } from "@/server/services/manifests";

/** GET → this office, the team members who carry parcels, and whether Tuma couriers are available. */
export const GET = driverRoute(async (ctx) => dispatchOptions(ctx.user));
