import { driverRoute } from "@/server/http/driver-api";
import { payFromWallet } from "@/server/services/wallet";
import { senderParcel } from "@/server/services/sender";

/** POST → pay my priced parcel from my Tuma wallet; returns the parcel and the new balance. */
export const POST = driverRoute<{ waybill: string }>(async (ctx, _req, p) => {
  const { balance } = await payFromWallet(ctx.user, p.waybill);
  return { parcel: await senderParcel(ctx.user, p.waybill), balance };
});
