import { driverRoute } from "@/server/http/driver-api";
import { resendInvite } from "@/server/services/team-invites";

/** POST → texts a fresh link (the old one stops working) → { id, link }. */
export const POST = driverRoute<{ id: string }>(async (ctx, _req, { id }) => resendInvite(ctx.user, id));
