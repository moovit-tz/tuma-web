import { body, driverRoute } from "@/server/http/driver-api";
import { paymentSettingsFor, updatePaymentSettings } from "@/server/services/agent-payments";

/** GET → { momo: { enabled, payout, schedule }, payOnDelivery, commissionBps, canManage }. PUT the same shape to change it. */
export const GET = driverRoute(async (ctx) => paymentSettingsFor(ctx.user));
export const PUT = driverRoute(async (ctx, req) => updatePaymentSettings(ctx.user, await body(req)));
