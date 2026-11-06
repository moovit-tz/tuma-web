import { driverRoute } from "@/server/http/driver-api";
import { paymentRecords } from "@/server/services/agent-payments";

/** GET ?kind=payments|invoices&status=all|open|paid&before=<iso>&limit= → the business's payments or invoices, newest first. */
export const GET = driverRoute(async (ctx, req) => paymentRecords(ctx.user, Object.fromEntries(req.nextUrl.searchParams)));
