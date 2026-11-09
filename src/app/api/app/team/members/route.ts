import { driverRoute } from "@/server/http/driver-api";
import { teamRoster } from "@/server/services/team-members";

/** GET → teammates and the business's office locations, for anyone in the business (read-only). */
export const GET = driverRoute(async (ctx) => teamRoster(ctx.user));
