import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { encodeFeed, gtfsFeed } from "@/server/services/live-tracking";

/**
 * GET → GTFS-Realtime VehiclePositions for every parcel the fleet's couriers carry now (exact positions).
 * For dispatch (dispatch.manage), signed in to the portal. Protobuf by default; ?format=json for JSON.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!user.permissions.has("dispatch.manage") || !user.accountId) return NextResponse.json({ error: "You can't see the fleet." }, { status: 403 });
  const { body, type } = encodeFeed(await gtfsFeed({ fleet: user.accountId }), req.nextUrl.searchParams.get("format") === "json");
  return new NextResponse(body as BodyInit, { headers: { "content-type": type, "cache-control": "no-store" } });
}
