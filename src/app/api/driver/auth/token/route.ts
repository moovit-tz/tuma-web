import { body, publicRoute } from "@/server/http/driver-api";
import { swapHandoff } from "@/server/services/drivers";

/** Tuma-X sign-in, step 3. POST { code, code_verifier } → { token, user, driver } (driver is null until registered). */
export const POST = publicRoute(async (req) => {
  const b = (await body(req)) as { code?: string; code_verifier?: string };
  return swapHandoff(String(b.code ?? ""), String(b.code_verifier ?? ""));
});
