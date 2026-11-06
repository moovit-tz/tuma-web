import { body, driverRoute } from "@/server/http/driver-api";
import { replyTicket } from "@/server/services/help-tickets";

/** POST { message } → the ticket, with the reply added. */
export const POST = driverRoute<{ id: string }>(async (ctx, req, { id }) => replyTicket(ctx.user, id, await body(req)));
