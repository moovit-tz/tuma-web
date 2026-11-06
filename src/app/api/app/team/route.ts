import { driverRoute } from "@/server/http/driver-api";
import { teamOverview } from "@/server/services/team-invites";

/** GET → the company's people, open invitations, and the roles and offices that can be chosen. Needs team.manage. */
export const GET = driverRoute(async (ctx) => teamOverview(ctx.user));
