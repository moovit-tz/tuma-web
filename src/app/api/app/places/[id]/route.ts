import { driverRoute } from "@/server/http/driver-api";
import { removePlace } from "@/server/services/saved-places";

/** DELETE → { places }. */
export const DELETE = driverRoute<{ id: string }>(async (ctx, _req, { id }) => removePlace(ctx.user, id));
