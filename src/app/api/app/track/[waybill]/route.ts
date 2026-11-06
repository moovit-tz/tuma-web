import { clientIp, publicRoute } from "@/server/http/driver-api";
import { allowLookup, isTrackingVerified, publicTracking } from "@/server/services/tracking";
import { DomainError } from "@/server/services/shipments";
import { getDict } from "@/i18n";

/**
 * Guest tracking for the Tuma app. GET ?lang=sw. Masked unless the `X-Track-Proof` header carries the token
 * from /verify. Same rules and rate limit as the public /track page.
 */
export const GET = publicRoute<{ waybill: string }>(async (req, { waybill }) => {
  if (!allowLookup(`app-track:${clientIp(req)}`)) throw new DomainError("RATE_LIMITED", "Too many lookups. Wait a minute and try again.", 429);
  const wb = decodeURIComponent(waybill);
  const r = await publicTracking(wb, await isTrackingVerified(wb.toUpperCase(), req.headers.get("x-track-proof") ?? undefined));
  if (r.status === "invalid") throw new DomainError("INVALID_WAYBILL", "That doesn't look like a Tuma tracking number.", 400);
  if (r.status === "not_found") throw new DomainError("NOT_FOUND", "We couldn't find that tracking number.", 404);
  const sw = req.nextUrl.searchParams.get("lang") === "sw";
  const t = getDict(sw ? "sw" : "en");
  const states = t.states as Record<string, string>;
  return {
    ...r,
    stateLabel: states[r.state] ?? r.state,
    timeline: r.timeline.map((e) => ({
      state: e.stateAfter,
      label: e.stateAfter ? (states[e.stateAfter] ?? e.stateAfter) : null,
      at: e.occurredAt,
      estimated: e.estimated,
      place: e.locationName ? `${e.locationName}${e.locationRegion ? `, ${e.locationRegion}` : ""}` : null,
      reason: (sw ? e.reasonSw : e.reasonEn) ?? null,
    })),
  };
});
