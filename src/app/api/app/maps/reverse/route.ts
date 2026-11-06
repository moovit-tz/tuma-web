import { driverRoute } from "@/server/http/driver-api";
import { reverse } from "@/server/services/maps";

/** GET ?lat=&lng=&lang= → the address under a pin, with its country, region and district (cached). */
export const GET = driverRoute(async (_ctx, req) => reverse(Object.fromEntries(req.nextUrl.searchParams)));
