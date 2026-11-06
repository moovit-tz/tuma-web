import { body, driverRoute } from "@/server/http/driver-api";
import { reportProgress } from "@/server/services/drivers";

/** POST { phase, stopId?, lat?, lng?, at? } */
export const POST = driverRoute<{ id: string }>(async (ctx, req, { id }) => ({ job: await reportProgress(ctx, id, await body(req)) }));
