import { driverRoute } from "@/server/http/driver-api";
import { tumaPoints } from "@/server/services/sender";

/** GET ?lat=&lng=&region=&q= → Tuma points (agents' offices) to drop a parcel at, nearest first. */
export const GET = driverRoute(async (_ctx, req) => tumaPoints(Object.fromEntries(req.nextUrl.searchParams)));
