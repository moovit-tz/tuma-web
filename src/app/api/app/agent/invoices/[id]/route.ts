import { driverRoute } from "@/server/http/driver-api";
import { invoiceDetail } from "@/server/services/agent-payments";

/** GET → one invoice of the business. */
export const GET = driverRoute<{ id: string }>(async (ctx, _req, p) => invoiceDetail(ctx.user, p.id));
