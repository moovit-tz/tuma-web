import { driverRoute } from "@/server/http/driver-api";
import { placeDetails } from "@/server/services/maps";

/** GET ?id=&lang= → a suggestion's position, address, country, region and district (cached). */
export const GET = driverRoute(async (_ctx, req) => placeDetails(Object.fromEntries(req.nextUrl.searchParams)));
