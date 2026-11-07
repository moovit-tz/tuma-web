import { body, driverRoute } from "@/server/http/driver-api";
import { acceptInvite } from "@/server/services/team-invites";

/** POST { code } → joins the business with the invitation's roles and office, by its join code. */
export const POST = driverRoute(async (ctx, req) => {
  const { code } = (await body(req)) as { code?: unknown };
  return acceptInvite(ctx.user, { code: typeof code === "string" ? code : "" });
});
