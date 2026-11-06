/* eslint-disable @typescript-eslint/no-explicit-any -- Google's JSON is read field by field below. */
import "server-only";
import { z } from "zod";
import { cached } from "../adapters/cache";
import { DomainError } from "../errors";
import { BLOC, BLOC_CODES } from "@/domain/bloc";
import { matchDistrict, matchRegion } from "@/domain/brela";

/**
 * Google Maps for the app, through the server: place search, a place's position, the address under a pin and
 * driving routes. Answers are cached (Redis) so the same search, pin or route isn't paid for again, and everything
 * is held to the SADC and EAC countries Tuma works in.
 */

const key = () => {
  const k = process.env.GOOGLE_MAPS_API_KEY;
  if (!k) throw new DomainError("MAPS_UNAVAILABLE", "Maps aren't set up on the server.", 503);
  return k;
};

const DAY = 86_400;
const ROUTE_TTL = 15 * 60; // routes follow traffic, so they go stale quickly
const LANGS = ["en", "sw"] as const;

const round = (n: number, dp: number) => Number(n.toFixed(dp));
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

async function google(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new DomainError("MAPS_UNAVAILABLE", "Maps didn't answer. Try again.", 503);
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new DomainError("MAPS_FAILED", "Maps couldn't answer that.", 502);
  return body;
}

const places = (path: string, body: unknown, fieldMask?: string) =>
  google(`https://places.googleapis.com/v1/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key(), ...(fieldMask ? { "x-goog-fieldmask": fieldMask } : {}) },
    body: JSON.stringify(body),
  });

/* ---------------------------------------------------------------- areas */

// Google's names for regions that differ from the official ones.
const REGION_ALIASES: Record<string, string> = {
  "zanzibar urban/west": "Mjini Magharibi",
  "zanzibar urban west": "Mjini Magharibi",
  "zanzibar north": "Kaskazini Unguja",
  "zanzibar south & central": "Kusini Unguja",
  "zanzibar south and central": "Kusini Unguja",
  "pemba north": "Kaskazini Pemba",
  "pemba south": "Kusini Pemba",
  "dar es salam": "Dar es Salaam",
  "dar-es-salaam": "Dar es Salaam",
  coast: "Pwani",
  "coast region": "Pwani",
};

type Component = { types?: string[]; longText?: string; shortText?: string; long_name?: string; short_name?: string };
export type Area = { country: string | null; region: string | null; district: string | null; inBloc: boolean };

/** Country, region and district from Google's address components, named the way Tuma names them. */
export function areaOf(components: Component[] | undefined): Area {
  const of = (t: string) => components?.find((c) => c.types?.includes(t));
  const long = (c?: Component) => c?.longText ?? c?.long_name ?? null;
  const country = (of("country")?.shortText ?? of("country")?.short_name ?? null)?.toUpperCase() ?? null;
  const admin1 = long(of("administrative_area_level_1"));
  const admin2 = long(of("administrative_area_level_2")) ?? long(of("locality"));
  let region = admin1;
  let district = admin2;
  if (country === "TZ" && admin1) {
    region = REGION_ALIASES[norm(admin1)] ?? matchRegion(admin1.replace(/\s+region$/i, "")) ?? admin1;
    if (admin2) district = matchDistrict(region ?? undefined, admin2.replace(/\s+(district|council)$/i, "")) ?? admin2;
  }
  return { country, region, district, inBloc: !!country && BLOC_CODES.has(country) };
}

/* ------------------------------------------------------------- searches */

const nearSchema = z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) });
const searchSchema = z.object({
  q: z.string().trim().min(2).max(120),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  lang: z.enum(LANGS).default("en"),
  session: z.string().max(64).optional(),
});

const bias = (lat: number, lng: number, radius: number) => ({ circle: { center: { latitude: lat, longitude: lng }, radius } });

// Places autocomplete takes at most 15 countries at a time, so the bloc goes in two batches.
const BATCHES = [BLOC.slice(0, 15).map((c) => c.iso.toLowerCase()), BLOC.slice(15).map((c) => c.iso.toLowerCase())];

export type Suggestion = { id: string; title: string; subtitle: string; distanceM: number | null; types: string[] };

/** Places matching what's typed, nearest first when the app says where it is. */
export async function autocomplete(raw: unknown) {
  const { q, lat, lng, lang, session } = searchSchema.parse(raw);
  const near = lat != null && lng != null ? { lat: round(lat, 2), lng: round(lng, 2) } : null;
  const { value, hit } = await cached(`maps:ac:${lang}:${norm(q)}:${near ? `${near.lat},${near.lng}` : "-"}`, DAY, async () => {
    const lists = await Promise.all(
      BATCHES.map((codes) =>
        places("places:autocomplete", {
          input: q,
          includedRegionCodes: codes,
          languageCode: lang,
          ...(session ? { sessionToken: session } : {}),
          ...(near ? { locationBias: bias(near.lat, near.lng, 40_000), origin: { latitude: near.lat, longitude: near.lng } } : {}),
        }),
      ),
    );
    const out: Suggestion[] = [];
    const seen = new Set<string>();
    for (const body of lists) {
      for (const s of (body.suggestions as Record<string, unknown>[] | undefined) ?? []) {
        const p = s.placePrediction as Record<string, any> | undefined;
        if (!p?.placeId || seen.has(p.placeId)) continue;
        seen.add(p.placeId);
        out.push({
          id: p.placeId,
          title: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
          subtitle: p.structuredFormat?.secondaryText?.text ?? "",
          distanceM: typeof p.distanceMeters === "number" ? p.distanceMeters : null,
          types: p.types ?? [],
        });
      }
    }
    // The second batch's hits after the first's, unless they're nearer.
    return near ? out.sort((a, b) => (a.distanceM ?? 1e12) - (b.distanceM ?? 1e12)) : out;
  });
  return { suggestions: value, cached: hit };
}

export type Place = { id: string; name: string; address: string; lat: number; lng: number; area: Area };

const toPlace = (m: Record<string, any>): Place | null =>
  m.location
    ? {
        id: m.id,
        name: m.displayName?.text ?? "",
        address: m.shortFormattedAddress ?? m.formattedAddress ?? "",
        lat: m.location.latitude,
        lng: m.location.longitude,
        area: areaOf(m.addressComponents),
      }
    : null;

/** A free-text search ("hospital near Kariakoo"), with positions; places outside the bloc are dropped. */
export async function textSearch(raw: unknown) {
  const { q, lat, lng, lang } = searchSchema.parse(raw);
  const near = lat != null && lng != null ? { lat: round(lat, 2), lng: round(lng, 2) } : null;
  const { value, hit } = await cached(`maps:ts:${lang}:${norm(q)}:${near ? `${near.lat},${near.lng}` : "-"}`, DAY, async () => {
    const body = await places(
      "places:searchText",
      { textQuery: q, languageCode: lang, regionCode: "TZ", ...(near ? { locationBias: bias(near.lat, near.lng, 30_000) } : {}) },
      "places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.types,places.addressComponents",
    );
    return ((body.places as Record<string, any>[] | undefined) ?? []).map(toPlace).filter((p): p is Place => !!p && p.area.inBloc);
  });
  return { places: value, cached: hit };
}

/** Where a picked suggestion is, with its country, region and district. */
export async function placeDetails(raw: unknown) {
  const { id, lang } = z.object({ id: z.string().trim().min(3).max(300), lang: z.enum(LANGS).default("en") }).parse(raw);
  const { value, hit } = await cached(`maps:pl:${lang}:${id}`, 30 * DAY, async () => {
    const body = await google(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?languageCode=${lang}`, {
      headers: { "x-goog-api-key": key(), "x-goog-fieldmask": "id,displayName,formattedAddress,shortFormattedAddress,location,addressComponents" },
    });
    return toPlace(body);
  });
  if (!value) throw new DomainError("PLACE_NOT_FOUND", "That place has no position on the map.", 404);
  return { place: value, cached: hit };
}

/** The address under a pin (to ~10 m), with its country, region and district. */
export async function reverse(raw: unknown) {
  const p = nearSchema.extend({ lang: z.enum(LANGS).default("en") }).parse(raw);
  const lat = round(p.lat, 4);
  const lng = round(p.lng, 4);
  const { value, hit } = await cached(`maps:rv:${p.lang}:${lat},${lng}`, 30 * DAY, async () => {
    const body = await google(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=${p.lang}&key=${key()}`);
    const r = ((body.results as Record<string, any>[] | undefined) ?? [])[0];
    if (body.status !== "OK" || !r) return { address: null, area: { country: null, region: null, district: null, inBloc: false } };
    return { address: r.formatted_address as string, area: areaOf(r.address_components) };
  });
  return { ...value, cached: hit };
}

/* --------------------------------------------------------------- routes */

const pt = z
  .string()
  .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/)
  .transform((s) => s.split(",").map(Number) as [number, number]);
const routeSchema = z.object({
  origin: pt,
  destination: pt,
  waypoints: z
    .string()
    .optional()
    .transform((s) => (s ? s.split("|").filter(Boolean) : []))
    .pipe(z.array(pt).max(10)),
  avoid: z.string().regex(/^(tolls|highways)(\|(tolls|highways))?$/).optional(),
  lang: z.enum(LANGS).default("en"),
});

/**
 * A driving route, as Google's Directions answer (the app reads it as before). The start is rounded to ~100 m and
 * stops to ~10 m, and a route is reused for 15 minutes, so reroutes and repeat trips don't each cost a call.
 */
export async function directions(raw: unknown) {
  const r = routeSchema.parse(raw);
  const o = r.origin.map((n) => round(n, 3)).join(",");
  const d = r.destination.map((n) => round(n, 4)).join(",");
  const w = r.waypoints.map((p) => p.map((n) => round(n, 4)).join(",")).join("|");
  const { value, hit } = await cached(`maps:rt:${r.lang}:${o}:${d}:${w}:${r.avoid ?? ""}`, ROUTE_TTL, async () => {
    const qs = new URLSearchParams({ origin: o, destination: d, mode: "driving", language: r.lang, departure_time: "now", key: key() });
    if (w) qs.set("waypoints", w);
    if (r.avoid) qs.set("avoid", r.avoid);
    const body = await google(`https://maps.googleapis.com/maps/api/directions/json?${qs}`);
    // Only good answers are kept; a failure is tried again next time.
    return body.status === "OK" ? body : null;
  });
  if (!value) throw new DomainError("NO_ROUTE", "No driving route between those places.", 422);
  return { ...value, cached: hit };
}
