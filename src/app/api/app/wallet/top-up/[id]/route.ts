import { driverRoute } from "@/server/http/driver-api";
import { walletTopUpStatus } from "@/server/services/wallet";

/** GET → { topUp, balance }: where a top-up stands (asks HuduPay while it's pending). */
export const GET = driverRoute<{ id: string }>(async (ctx, _req, p) => walletTopUpStatus(ctx.user, p.id));
