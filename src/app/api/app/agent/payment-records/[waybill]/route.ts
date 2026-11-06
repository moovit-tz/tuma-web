import { driverRoute } from "@/server/http/driver-api";
import { paymentDetail } from "@/server/services/agent-payments";

/** GET → the payment on one parcel: amount, method, payer, commission and reference. */
export const GET = driverRoute<{ waybill: string }>(async (ctx, _req, p) => paymentDetail(ctx.user, p.waybill));
