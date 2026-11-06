import { driverRoute } from "@/server/http/driver-api";
import { revokeInvite } from "@/server/services/team-invites";

/** DELETE → cancels the invitation; its link stops working. */
export const DELETE = driverRoute<{ id: string }>(async (ctx, _req, { id }) => {
  await revokeInvite(ctx.user, id);
  return { ok: true };
});
