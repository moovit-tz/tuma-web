import { driverRoute } from "@/server/http/driver-api";
import { agentPaymentStatus } from "@/server/services/agent-parcels";

/** GET → where the push payment stands: pending, paid or failed. */
export const GET = driverRoute<{ waybill: string; id: string }>(async (ctx, _req, p) => agentPaymentStatus(ctx.user, p.waybill, p.id));
