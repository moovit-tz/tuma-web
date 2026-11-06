import { driverRoute } from "@/server/http/driver-api";
import { agentSummary } from "@/server/services/agent-parcels";

/** GET → the agent home: parcel counts by stage, takings for today / 7 / 30 days, the last 7 days, and the allowance. */
export const GET = driverRoute(async (ctx) => agentSummary(ctx.user));
