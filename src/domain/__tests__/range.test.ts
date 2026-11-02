import { describe, expect, it } from "vitest";
import { asRange, rangeStart } from "../range";

describe("dashboard range", () => {
  // 1 Nov 2026 01:30 in Dar es Salaam = 31 Oct 2026 22:30 UTC
  const now = Date.UTC(2026, 9, 31, 22, 30);
  it("starts today at local midnight, not UTC midnight", () => {
    expect(rangeStart("today", now)?.toISOString()).toBe("2026-10-31T21:00:00.000Z");
  });
  it("counts today in the last 7 and 30 days", () => {
    expect(rangeStart("7d", now)?.toISOString()).toBe("2026-10-25T21:00:00.000Z");
    expect(rangeStart("30d", now)?.toISOString()).toBe("2026-10-02T21:00:00.000Z");
  });
  it("has no start for all time and falls back to 30 days for anything unknown", () => {
    expect(rangeStart("all", now)).toBeNull();
    expect(asRange("week")).toBe("30d");
    expect(asRange("7d")).toBe("7d");
  });
});
