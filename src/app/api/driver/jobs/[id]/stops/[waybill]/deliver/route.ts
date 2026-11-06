import { body, driverRoute } from "@/server/http/driver-api";
import { deliverStop } from "@/server/services/drivers";

/** POST { otp? | photo?, recipientName?, method?, codCollected?, lat?, lng?, at? } → DELIVERED. */
export const POST = driverRoute<{ id: string; waybill: string }>(async (ctx, req, { id, waybill }) => deliverStop(ctx, id, decodeURIComponent(waybill), await body(req)));
