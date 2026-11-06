import { driverRoute } from "@/server/http/driver-api";
import { directions } from "@/server/services/maps";

/** GET ?origin=lat,lng&destination=lat,lng&waypoints=lat,lng|…&avoid=&lang= → Google's Directions answer (cached 15 min). */
export const GET = driverRoute(async (_ctx, req) => directions(Object.fromEntries(req.nextUrl.searchParams)));
