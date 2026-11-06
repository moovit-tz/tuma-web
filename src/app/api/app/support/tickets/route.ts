import { body, driverRoute } from "@/server/http/driver-api";
import { myTickets, openTicket } from "@/server/services/help-tickets";

/** GET → { tickets } the signed-in person opened from the app (Bliss). POST { topic, subject, message, waybill?, urgent? } → { id, ref, status }. */
export const GET = driverRoute(async (ctx) => myTickets(ctx.user));
export const POST = driverRoute(async (ctx, req) => openTicket(ctx.user, await body(req)));
