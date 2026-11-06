import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { shipments } from "@/server/db/schema";
import { clientIp } from "@/server/http/driver-api";
import { allowLookup, isTrackingVerified } from "@/server/services/tracking";
import { encodeFeed, gtfsFeed } from "@/server/services/live-tracking";
import { normaliseWaybill } from "@/domain/waybill-number";

export const dynamic = "force-dynamic";

/**
 * GET → GTFS-Realtime VehiclePositions for one parcel: the Tuma courier carrying it (empty feed when none).
 * Protobuf by default; ?format=json for the JSON form. Position is ~1 km unless X-Track-Proof (from the
 * receiver's code) is sent, then exact.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ waybill: string }> }) {
  if (!allowLookup(`gtfs:${clientIp(req)}`)) return NextResponse.json({ error: "Too many requests. Wait a minute." }, { status: 429 });
  const { waybill } = normaliseWaybill(decodeURIComponent((await params).waybill));
  const [s] = await db.select({ id: shipments.id }).from(shipments).where(eq(shipments.waybill, waybill));
  if (!s) return NextResponse.json({ error: "We couldn't find that tracking number." }, { status: 404 });
  const exact = await isTrackingVerified(waybill, req.headers.get("x-track-proof") ?? undefined);
  const { body, type } = encodeFeed(await gtfsFeed({ shipmentId: s.id, exact }), req.nextUrl.searchParams.get("format") === "json");
  return new NextResponse(body as BodyInit, { headers: { "content-type": type, "cache-control": "no-store" } });
}
