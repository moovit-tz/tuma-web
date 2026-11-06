import { driverRoute } from "@/server/http/driver-api";
import { invitesFor } from "@/server/services/team-invites";

/** GET → open invitations addressed to the signed-in person's phone or email. */
export const GET = driverRoute(async (ctx) => ({ invites: await invitesFor(ctx.user) }));
