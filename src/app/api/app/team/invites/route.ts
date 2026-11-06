import { body, driverRoute } from "@/server/http/driver-api";
import { createInvite } from "@/server/services/team-invites";

/** POST { name, phone, email?, roles[], branchId? } → { id, link }. Tuma texts the link to the phone. */
export const POST = driverRoute(async (ctx, req) => createInvite(ctx.user, await body(req)));
