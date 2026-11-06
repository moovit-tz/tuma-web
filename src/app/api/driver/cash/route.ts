import { driverRoute } from "@/server/http/driver-api";
import { cashHeld } from "@/server/services/drivers";

/** GET → cash collected at the door that the driver still holds. */
export const GET = driverRoute(async (ctx) => cashHeld(ctx));
