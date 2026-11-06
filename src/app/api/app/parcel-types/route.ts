import { NextResponse, type NextRequest } from "next/server";
import { PACKAGING_TYPES, PARCEL_CATEGORIES, PARCEL_TERMS, PARCEL_TYPES_VERSION } from "@/domain/parcel-types";

/**
 * GET → { version, categories, terms, packaging }: what a parcel can hold, in English and Swahili, with the item words agents use
 * for each. The app loads it at start-up and keeps it; it sends If-None-Match with the version it has and gets a 304
 * until the list changes, so opening the goods picker costs no call. Not secret, so no sign-in needed.
 */
const ETAG = `"pt-${PARCEL_TYPES_VERSION}"`;

export function GET(req: NextRequest) {
  const headers = { etag: ETAG, "cache-control": "public, max-age=3600, stale-while-revalidate=86400" };
  if (req.headers.get("if-none-match") === ETAG) return new NextResponse(null, { status: 304, headers });
  return NextResponse.json({ version: PARCEL_TYPES_VERSION, categories: PARCEL_CATEGORIES, terms: PARCEL_TERMS, packaging: PACKAGING_TYPES }, { headers });
}
