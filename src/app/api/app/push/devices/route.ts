import { body, driverRoute } from "@/server/http/driver-api";
import { registerDevice, unregisterDevice } from "@/server/services/push";

/** POST { token, platform, appVersion? } → this phone takes push notifications for me. */
export const POST = driverRoute(async (ctx, req) => registerDevice(ctx.user, await body(req)));
/** DELETE { token } → signing out: stop pushing to this phone. */
export const DELETE = driverRoute(async (ctx, req) => unregisterDevice(ctx.user, await body(req)));
