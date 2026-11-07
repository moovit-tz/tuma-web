import { driverRoute } from "@/server/http/driver-api";
import { myRatings } from "@/server/services/ratings";
import { myCustomerScore } from "@/server/services/customer-ratings";

/** GET → { toRate, rated, score }: the Tuma points I was asked to rate, and my own score from the businesses that served me. */
export const GET = driverRoute(async (ctx) => ({ ...(await myRatings(ctx.user)), score: await myCustomerScore(ctx.user) }));
