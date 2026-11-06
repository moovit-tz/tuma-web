import { body, driverRoute } from "@/server/http/driver-api";
import { myKyb, submitKyb } from "@/server/services/kyb";

/** GET → the signed-in user's business application (or null). */
export const GET = driverRoute(async (ctx) => ({ application: await myKyb(ctx) }));

/** POST the KYB form → the application. Also used to resubmit after ComplyOS asks for changes. */
export const POST = driverRoute(async (ctx, req) => ({ application: await submitKyb(ctx, await body(req)) }));
