import { driverRoute } from "@/server/http/driver-api";
import { autocomplete } from "@/server/services/maps";

/** GET ?q=&lat=&lng=&lang=&session= → places matching what's typed, in SADC and EAC countries (cached). */
export const GET = driverRoute(async (_ctx, req) => autocomplete(Object.fromEntries(req.nextUrl.searchParams)));
