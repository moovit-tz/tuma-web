import { driverRoute } from "@/server/http/driver-api";
import { companyHome } from "@/server/services/company";

/** GET → the company card: KYC, allowance while it's reviewed, this month, wallet (admins), departments, policy. */
export const GET = driverRoute(async (ctx) => companyHome(ctx.user));
