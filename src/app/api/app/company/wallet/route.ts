import { driverRoute } from "@/server/http/driver-api";
import { companyWallet } from "@/server/services/company";

/** GET → the company wallet. Deposit with POST /api/app/wallet/top-up { forCompany: true }. */
export const GET = driverRoute(async (ctx) => companyWallet(ctx.user));
