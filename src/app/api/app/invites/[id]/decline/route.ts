import { driverRoute } from "@/server/http/driver-api";
import { declineInvite } from "@/server/services/team-invites";

/** POST → turns the invitation down. */
export const POST = driverRoute<{ id: string }>(async (ctx, _req, { id }) => {
  await declineInvite(ctx.user, { id });
  return { ok: true };
});
