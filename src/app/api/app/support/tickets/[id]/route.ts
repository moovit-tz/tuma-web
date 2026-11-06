import { driverRoute } from "@/server/http/driver-api";
import { myTicket } from "@/server/services/help-tickets";

/** GET → one of the person's tickets with the conversation. */
export const GET = driverRoute<{ id: string }>(async (ctx, _req, { id }) => myTicket(ctx.user, id));
