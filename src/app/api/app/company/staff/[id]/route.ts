import { body, driverRoute } from "@/server/http/driver-api";
import { setStaffDepartment } from "@/server/services/company";

/** PATCH { departmentId | null } → { staff }. */
export const PATCH = driverRoute<{ id: string }>(async (ctx, req, { id }) => setStaffDepartment(ctx.user, id, await body(req)));
