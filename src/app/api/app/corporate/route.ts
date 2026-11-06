import { body, driverRoute } from "@/server/http/driver-api";
import { registerCompany } from "@/server/services/corporate";

/** POST { name, tin, regNo?, region, district, street, phone } → register a company that sends on Tuma; you're its admin. */
export const POST = driverRoute(async (ctx, req) => registerCompany(ctx.user, await body(req)));
