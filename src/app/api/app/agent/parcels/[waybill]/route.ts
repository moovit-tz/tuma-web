import { body, driverRoute } from "@/server/http/driver-api";
import { agentMove, agentParcel } from "@/server/services/agent-parcels";

/** GET → one parcel with its history and the moves this person can make. POST { to, … } → makes one. */
export const GET = driverRoute<{ waybill: string }>(async (ctx, _req, p) => agentParcel(ctx.user, p.waybill));
export const POST = driverRoute<{ waybill: string }>(async (ctx, req, p) => agentMove(ctx.user, p.waybill, await body(req)));
