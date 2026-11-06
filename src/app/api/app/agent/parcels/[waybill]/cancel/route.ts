import { body, driverRoute } from "@/server/http/driver-api";
import { agentCancel } from "@/server/services/agent-parcels";

/** POST { reasonCode, note? } → cancels a parcel in hand at this office. The parcel, plus refundDue (TZS) for the sender. */
export const POST = driverRoute<{ waybill: string }>(async (ctx, req, p) => agentCancel(ctx.user, p.waybill, await body(req)));
