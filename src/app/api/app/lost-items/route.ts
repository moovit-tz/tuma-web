import { body, clientIp, publicRoute } from "@/server/http/driver-api";
import { allowLookup } from "@/server/services/tracking";
import { lostItemSchema, submitSupportRequest } from "@/server/services/support";
import { DomainError } from "@/server/services/shipments";

/** Guest "report a lost item" from the Tuma app. POST lostItemSchema (+ lang) → { ref }. Goes to Bliss like the web form. */
export const POST = publicRoute(async (req) => {
  if (!allowLookup(`lost:${clientIp(req)}`)) throw new DomainError("RATE_LIMITED", "Too many reports. Wait a minute.", 429);
  const b = (await body(req)) as Record<string, unknown>;
  const data = lostItemSchema.parse(b);
  const ref = await submitSupportRequest("lost_item", { ...data, channel: "app" }, b.lang === "sw" ? "sw" : "en");
  return { ref };
});
