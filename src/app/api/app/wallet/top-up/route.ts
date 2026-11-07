import { body, driverRoute } from "@/server/http/driver-api";
import { walletTopUp } from "@/server/services/wallet";

/** POST { amount, phone } → push a mobile-money prompt to top up the wallet; poll /top-up/{id}. */
export const POST = driverRoute(async (ctx, req) => walletTopUp(ctx.user, await body(req)));
