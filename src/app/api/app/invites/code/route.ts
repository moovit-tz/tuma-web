import { body, driverRoute } from "@/server/http/driver-api";
import { inviteByCode } from "@/server/services/team-invites";

/** POST { code } → { invite }: what a join code opens (business, role, office), before accepting. */
export const POST = driverRoute(async (ctx, req) => {
  const { code } = (await body(req)) as { code?: unknown };
  return { invite: await inviteByCode(ctx.user, typeof code === "string" ? code : "") };
});
