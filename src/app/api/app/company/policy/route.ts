import { body, driverRoute } from "@/server/http/driver-api";
import { companyPolicy, setCompanyPolicy } from "@/server/services/company";

/** GET → { policy }. */
export const GET = driverRoute(async (ctx) => companyPolicy(ctx.user));

/** PUT { payWith?, maxDeclaredValue?, requireDepartment?, monthlyParcelsPerSender? } → { policy }. */
export const PUT = driverRoute(async (ctx, req) => setCompanyPolicy(ctx.user, await body(req)));
