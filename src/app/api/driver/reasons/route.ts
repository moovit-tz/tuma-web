import { driverRoute } from "@/server/http/driver-api";
import { failedReasons } from "@/server/services/drivers";

/** GET → failed-delivery reason codes (Appendix B). */
export const GET = driverRoute(async () => ({ reasons: await failedReasons() }));
