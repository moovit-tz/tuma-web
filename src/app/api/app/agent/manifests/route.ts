import { body, driverRoute } from "@/server/http/driver-api";
import { createManifest, listManifests } from "@/server/services/manifests";

/** GET ?dir=out|in → manifests this office sent or that are coming to it. POST { waybills, mode, toBranchId?, carrier, note? } → sends them on. */
export const GET = driverRoute(async (ctx, req) => listManifests(ctx.user, Object.fromEntries(req.nextUrl.searchParams)));
export const POST = driverRoute(async (ctx, req) => createManifest(ctx.user, await body(req)));
