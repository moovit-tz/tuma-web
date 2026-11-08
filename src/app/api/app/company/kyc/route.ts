import { body, driverRoute } from "@/server/http/driver-api";
import { companyKycDocument } from "@/server/services/company";

/** POST { licenceFile } → { kyc }: adds the certificate or licence (resubmits when the reviewer asked for more). */
export const POST = driverRoute(async (ctx, req) => companyKycDocument(ctx.user, await body(req)));
