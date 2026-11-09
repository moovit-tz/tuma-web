import { driverRoute } from "@/server/http/driver-api";
import { lookupPerson } from "@/server/services/team-invites";

/** GET ?phone= → { found, name?, onTeam?, otherBusiness? }: the Ondi name Tuma has for that number. Needs team.manage. */
export const GET = driverRoute(async (ctx, req) => lookupPerson(ctx.user, new URL(req.url).searchParams.get("phone") ?? ""));
