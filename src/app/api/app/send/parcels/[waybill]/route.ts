import { driverRoute } from "@/server/http/driver-api";
import { senderParcel } from "@/server/services/sender";

/** GET → one of my parcels, with the Tuma point and the courier when one has it. */
export const GET = driverRoute<{ waybill: string }>(async (ctx, _req, p) => senderParcel(ctx.user, p.waybill));
