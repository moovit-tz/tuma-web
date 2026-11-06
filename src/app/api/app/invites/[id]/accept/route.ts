import { driverRoute } from "@/server/http/driver-api";
import { acceptInvite } from "@/server/services/team-invites";

/** POST → joins the company with the invitation's roles and office. */
export const POST = driverRoute<{ id: string }>(async (ctx, _req, { id }) => acceptInvite(ctx.user, { id }));
