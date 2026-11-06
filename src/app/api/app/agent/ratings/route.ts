import { driverRoute } from "@/server/http/driver-api";
import { agentRatings } from "@/server/services/ratings";

/** GET → this business's rating: score, count, stars, issues and the latest feedback (no phone numbers). */
export const GET = driverRoute(async (ctx) => agentRatings(ctx.user));
