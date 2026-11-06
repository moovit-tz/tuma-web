import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { PARCEL_CATEGORIES, PARCEL_TERMS } from "../parcel-types";
import { GET } from "@/app/api/app/parcel-types/route";

describe("parcel types (Parcel_Types_Clean.xlsx)", () => {
  it("has the 35 categories, each named in English and Swahili", () => {
    expect(PARCEL_CATEGORIES).toHaveLength(35);
    for (const c of PARCEL_CATEGORIES) {
      expect(c.key).toMatch(/^[a-z_]+$/);
      expect(c.en.length).toBeGreaterThan(2);
      expect(c.sw.length).toBeGreaterThan(2);
    }
    expect(new Set(PARCEL_CATEGORIES.map((c) => c.key)).size).toBe(35);
    expect(PARCEL_CATEGORIES.find((c) => c.key === "phones")).toMatchObject({ sw: "Simu na vifaa vyake", marks: ["fragile"] });
  });

  it("maps the words agents type, Swahili or English, to a category", () => {
    const keys = new Set(PARCEL_CATEGORIES.map((c) => c.key));
    for (const k of Object.keys(PARCEL_TERMS)) expect(keys.has(k)).toBe(true);
    expect(PARCEL_TERMS.fresh_produce).toContain("vitunguu");
    expect(PARCEL_TERMS.documents).toContain("bahasha");
    expect(PARCEL_TERMS.appliances).toContain("air conditioner");
  });

  it("keeps only clear, single-item words: no mixed loads, packaging or notes", () => {
    const all = Object.values(PARCEL_TERMS).flat();
    for (const t of all) {
      expect(t, t).not.toMatch(/\b(na|and|with|pamoja)\b|[,&+/()$]/);
      expect(t.split(" ").length, t).toBeLessThanOrEqual(3);
    }
    expect(all).not.toContain("box la nguo na samaki");
    expect(all.filter((t) => /\bbox\b|boksi|kiroba|mfuko/.test(t))).toEqual([]);
  });

  it("is served once, then 304 while the app's copy is current", async () => {
    const first = GET(new NextRequest("http://x/api/app/parcel-types"));
    expect(first.status).toBe(200);
    const etag = first.headers.get("etag")!;
    expect((await first.json()).categories).toHaveLength(35);
    const again = GET(new NextRequest("http://x/api/app/parcel-types", { headers: { "if-none-match": etag } }));
    expect(again.status).toBe(304);
  });
});
