import { publicRoute } from "@/server/http/driver-api";
import { DomainError } from "@/server/errors";
import { LEGAL, type LegalKey } from "@/content/legal";

/** GET /api/app/legal/terms | privacy → { updated, sections } for the app's own Terms and Privacy screens. */
export const GET = publicRoute<{ doc: string }>(async (_req, { doc }) => {
  if (!(doc in LEGAL)) throw new DomainError("NOT_FOUND", "No such document.", 404);
  return LEGAL[doc as LegalKey];
});
