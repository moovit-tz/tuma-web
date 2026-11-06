import { body, driverRoute } from "@/server/http/driver-api";
import { createStaffRole } from "@/server/services/team-invites";

/** POST { name, description?, permissions[] } → a new kind of staff for the business, with those permissions. Owner only. */
export const POST = driverRoute(async (ctx, req) => ({ role: await createStaffRole(ctx.user, await body(req)) }));
