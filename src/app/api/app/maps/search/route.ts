import { driverRoute } from "@/server/http/driver-api";
import { textSearch } from "@/server/services/maps";

/** GET ?q=&lat=&lng=&lang= → places for a free-text search, with positions (cached). */
export const GET = driverRoute(async (_ctx, req) => textSearch(Object.fromEntries(req.nextUrl.searchParams)));
