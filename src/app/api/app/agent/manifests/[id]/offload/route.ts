import { body, driverRoute } from "@/server/http/driver-api";
import { offloadParcel } from "@/server/services/manifests";

/** POST { waybill } → checks one parcel in at the point the manifest is going to. { checkedIn, manifest }. */
export const POST = driverRoute<{ id: string }>(async (ctx, req, p) => offloadParcel(ctx.user, p.id, await body(req)));
