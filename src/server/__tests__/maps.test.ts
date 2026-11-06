import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { autocomplete, directions, reverse, textSearch, areaOf } = await import("../services/maps");
const { resetCacheForTests } = await import("../adapters/cache");

const json = (o: unknown) => new Response(JSON.stringify(o), { status: 200, headers: { "content-type": "application/json" } });
let calls: { url: string; body?: unknown }[] = [];

beforeEach(() => {
  process.env.GOOGLE_MAPS_API_KEY = "test-key";
  delete process.env.REDIS_URL;
  resetCacheForTests();
  calls = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (url.includes("places:autocomplete")) {
      const codes = (JSON.parse(String(init!.body)) as { includedRegionCodes: string[] }).includedRegionCodes;
      return json({
        suggestions: codes.includes("tz")
          ? [{ placePrediction: { placeId: "p1", structuredFormat: { mainText: { text: "Kariakoo Market" }, secondaryText: { text: "Dar es Salaam, Tanzania" } }, distanceMeters: 1200 } }]
          : [{ placePrediction: { placeId: "p2", structuredFormat: { mainText: { text: "Kariakoo Shop" }, secondaryText: { text: "Port Louis, Mauritius" } }, distanceMeters: 4_000_000 } }],
      });
    }
    if (url.includes("places:searchText")) {
      return json({
        places: [
          { id: "a", displayName: { text: "Kibo" }, formattedAddress: "Moshi, Tanzania", location: { latitude: -3.35, longitude: 37.34 }, addressComponents: [{ types: ["country"], shortText: "TZ", longText: "Tanzania" }] },
          { id: "b", displayName: { text: "Kibo Addis" }, formattedAddress: "Addis Ababa, Ethiopia", location: { latitude: 9, longitude: 38.7 }, addressComponents: [{ types: ["country"], shortText: "ET", longText: "Ethiopia" }] },
        ],
      });
    }
    if (url.includes("geocode/json")) {
      return json({
        status: "OK",
        results: [
          {
            formatted_address: "Nyerere Rd, Ilala, Dar es Salaam, Tanzania",
            address_components: [
              { types: ["administrative_area_level_2"], long_name: "Ilala", short_name: "Ilala" },
              { types: ["administrative_area_level_1"], long_name: "Dar es Salaam Region", short_name: "Dar es Salaam Region" },
              { types: ["country"], long_name: "Tanzania", short_name: "TZ" },
            ],
          },
        ],
      });
    }
    if (url.includes("directions/json")) return json({ status: "OK", routes: [{ summary: "Morogoro Rd", legs: [] }] });
    return json({});
  });
});

afterEach(() => vi.restoreAllMocks());

describe("maps through the server", () => {
  it("searches all of SADC and EAC in two batches, once per query", async () => {
    const a = await autocomplete({ q: "kariakoo", lat: "-6.8161", lng: "39.2803" });
    expect(a.cached).toBe(false);
    const batches = calls.filter((c) => c.url.includes("autocomplete")).map((c) => (c.body as { includedRegionCodes: string[] }).includedRegionCodes);
    expect(batches).toHaveLength(2);
    expect(batches[0]).toHaveLength(15);
    expect(batches.flat()).toHaveLength(22);
    expect(a.suggestions.map((s) => s.id)).toEqual(["p1", "p2"]);
    // Same words nearby: from the cache, Google isn't asked again.
    const b = await autocomplete({ q: "  Kariakoo ", lat: "-6.8172", lng: "39.2811" });
    expect(b.cached).toBe(true);
    expect(calls.filter((c) => c.url.includes("autocomplete"))).toHaveLength(2);
  });

  it("drops places outside the bloc from a text search", async () => {
    const r = await textSearch({ q: "kibo" });
    expect(r.places.map((p) => p.id)).toEqual(["a"]);
  });

  it("names a pin's country, region and district the Tuma way, and caches it to ~10 m", async () => {
    const r = await reverse({ lat: "-6.81612", lng: "39.28031" });
    expect(r.area).toEqual({ country: "TZ", region: "Dar es Salaam", district: "Dar es Salaam City", inBloc: true });
    expect((await reverse({ lat: "-6.81608", lng: "39.28029" })).cached).toBe(true);
    expect(calls.filter((c) => c.url.includes("geocode"))).toHaveLength(1);
    expect(calls[0].url).toContain("latlng=-6.8161,39.2803");
  });

  it("reuses a route for nearby starts", async () => {
    const q = { destination: "-6.7924,39.2083", lang: "en" };
    expect((await directions({ ...q, origin: "-6.81612,39.28031" })).cached).toBe(false);
    expect((await directions({ ...q, origin: "-6.81590,39.28010" })).cached).toBe(true);
    expect(calls.filter((c) => c.url.includes("directions"))).toHaveLength(1);
  });

  it("knows Google's Zanzibar region names", () => {
    expect(areaOf([{ types: ["administrative_area_level_1"], longText: "Zanzibar Urban/West" }, { types: ["country"], shortText: "TZ" }]).region).toBe("Mjini Magharibi");
  });
  it("names Google's urban districts the official way", () => {
    const c = (a1: string, a2: string) => [
      { types: ["country"], shortText: "TZ", longText: "Tanzania" },
      { types: ["administrative_area_level_1"], longText: a1 },
      { types: ["administrative_area_level_2"], longText: a2 },
    ];
    expect(areaOf(c("Arusha Region", "Arusha Urban"))).toMatchObject({ region: "Arusha", district: "Arusha City" });
    expect(areaOf(c("Iringa Region", "Iringa Urban"))).toMatchObject({ region: "Iringa", district: "Iringa Municipal" });
    expect(areaOf(c("Dar es Salam", "Ilala"))).toMatchObject({ region: "Dar es Salaam", district: "Dar es Salaam City" });
  });
});
