import { body, driverRoute } from "@/server/http/driver-api";
import { senderCancel } from "@/server/services/sender";

/** POST { reason } → cancel my booking before it reaches the Tuma point. */
export const POST = driverRoute<{ waybill: string }>(async (ctx, req, p) => senderCancel(ctx.user, p.waybill, await body(req)));
