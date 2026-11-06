import { body, driverRoute } from "@/server/http/driver-api";
import { failStop } from "@/server/services/drivers";

/** POST { reasonCode | reason, note?, lat?, lng?, at? } → ATTEMPT_FAILED. */
export const POST = driverRoute<{ id: string; waybill: string }>(async (ctx, req, { id, waybill }) => failStop(ctx, id, decodeURIComponent(waybill), await body(req)));
