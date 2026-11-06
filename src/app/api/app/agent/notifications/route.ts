import { driverRoute } from "@/server/http/driver-api";
import { agentNotifications } from "@/server/services/agent-parcels";

/** GET → the business's notifications: parcel moves by others and business application updates, newest first. */
export const GET = driverRoute(async (ctx) => agentNotifications(ctx.user));
