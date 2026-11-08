import { driverRoute } from "@/server/http/driver-api";
import { companyInvoices } from "@/server/services/company";

/** GET → { invoices, owed, overdue }: what Tuma points invoiced the company. */
export const GET = driverRoute(async (ctx) => companyInvoices(ctx.user));
