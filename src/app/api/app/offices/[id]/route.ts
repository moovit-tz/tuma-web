import { body, driverRoute } from "@/server/http/driver-api";
import { officeDetail, updateOffice } from "@/server/services/branches";

/** GET → one office with its figures and staff. */
export const GET = driverRoute<{ id: string }>(async (ctx, _req, p) => officeDetail(ctx.user, p.id));

/** PUT { name, country, region, district, address, lat?, lng?, phone? } → changes one office. Needs partner.branches.manage. */
export const PUT = driverRoute<{ id: string }>(async (ctx, req, p) => ({ office: await updateOffice(ctx.user, p.id, await body(req)) }));
