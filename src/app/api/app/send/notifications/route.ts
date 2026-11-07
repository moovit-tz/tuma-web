import { driverRoute } from "@/server/http/driver-api";
import { senderNotifications } from "@/server/services/sender";

/** GET → the sender's notifications: moves on their parcels (sent and coming) and wallet activity, newest first. */
export const GET = driverRoute(async (ctx) => senderNotifications(ctx.user));
