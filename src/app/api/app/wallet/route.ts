import { driverRoute } from "@/server/http/driver-api";
import { myWallet } from "@/server/services/wallet";

/** GET → my Tuma wallet: { balance, pending, phone, limits, entries }. */
export const GET = driverRoute(async (ctx) => myWallet(ctx.user));
