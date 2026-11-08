import { driverRoute } from "@/server/http/driver-api";
import { companyStaff } from "@/server/services/company";

/** GET → { staff }: everyone in the company with their department and parcels this month. Invite with /api/app/team/invites. */
export const GET = driverRoute(async (ctx) => companyStaff(ctx.user));
