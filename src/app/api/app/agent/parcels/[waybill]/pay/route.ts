import { body, driverRoute } from "@/server/http/driver-api";
import { agentRequestPayment } from "@/server/services/agent-parcels";

/** POST { phone } → pushes a mobile-money prompt for the parcel's charge to that phone. */
export const POST = driverRoute<{ waybill: string }>(async (ctx, req, p) => agentRequestPayment(ctx.user, p.waybill, await body(req)));
