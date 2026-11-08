import { body, driverRoute } from "@/server/http/driver-api";
import { myPlaces, savePlace } from "@/server/services/saved-places";

/** GET → { places }: home, work, then favourites. */
export const GET = driverRoute(async (ctx) => myPlaces(ctx.user));

/** POST { kind: home|work|favourite, label?, line, region, district, lat, lng } → { places }. */
export const POST = driverRoute(async (ctx, req) => savePlace(ctx.user, await body(req)));
