import { driverRoute } from "@/server/http/driver-api";
import { memberDetail } from "@/server/services/team-members";

/** GET → one person on the team, their last 30 days and latest activity. Needs team.manage. */
export const GET = driverRoute<{ id: string }>(async (ctx, _req, { id }) => memberDetail(ctx.user, id));
