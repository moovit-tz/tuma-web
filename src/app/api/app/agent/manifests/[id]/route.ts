import { driverRoute } from "@/server/http/driver-api";
import { manifestDetail } from "@/server/services/manifests";

/** GET → one manifest with its parcels, for the office that sent it or the point it's going to. */
export const GET = driverRoute<{ id: string }>(async (ctx, _req, p) => manifestDetail(ctx.user, p.id));
