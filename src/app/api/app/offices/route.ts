import { body, driverRoute } from "@/server/http/driver-api";
import { addOffice, listOffices } from "@/server/services/branches";

/** GET → the company's offices. POST { name, region, district, address, phone? } → adds one. Needs partner.branches.manage. */
export const GET = driverRoute(async (ctx) => ({ offices: await listOffices(ctx.user) }));
export const POST = driverRoute(async (ctx, req) => ({ office: await addOffice(ctx.user, await body(req)) }));
