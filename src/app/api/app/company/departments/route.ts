import { body, driverRoute } from "@/server/http/driver-api";
import { companyDepartments, createDepartment } from "@/server/services/company";

/** GET → { departments } with staff, parcels and spend this month. */
export const GET = driverRoute(async (ctx) => companyDepartments(ctx.user));

/** POST { name, monthlyBudget? } → { departments }. */
export const POST = driverRoute(async (ctx, req) => createDepartment(ctx.user, await body(req)));
