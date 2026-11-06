import { driverRoute } from "@/server/http/driver-api";
import { getSetting } from "@/server/settings";

/** GET → the kinds of goods an agent can pick when receiving a parcel: [{ key, en, sw }]. */
export const GET = driverRoute(async () => ({ types: await getSetting("goodsTypes") }));
