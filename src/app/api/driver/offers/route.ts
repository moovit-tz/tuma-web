import { driverRoute } from "@/server/http/driver-api";
import { offersFor } from "@/server/services/drivers";

/** GET ?lat&lng → open jobs this driver may take, nearest first. Polled while online. */
export const GET = driverRoute(async (ctx, req) => {
  const sp = req.nextUrl.searchParams;
  const num = (k: string) => (sp.get(k) !== null && sp.get(k) !== "" ? Number(sp.get(k)) : undefined);
  return { offers: await offersFor(ctx, { lat: num("lat"), lng: num("lng") }) };
});
