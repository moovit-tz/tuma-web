import { body, driverRoute } from "@/server/http/driver-api";
import { updateDepartment } from "@/server/services/company";

/** PATCH { name?, monthlyBudget?, active? } → { departments }. */
export const PATCH = driverRoute<{ id: string }>(async (ctx, req, { id }) => updateDepartment(ctx.user, id, await body(req)));
