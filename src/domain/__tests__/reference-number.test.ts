import { describe, expect, it } from "vitest";
import {
  BLOCKED_PREFIXES,
  PREFIX_COUNT,
  capacity,
  formatReference,
  isReference,
  nextIssuablePrefix,
  normaliseReference,
  prefixAt,
  prefixOrder,
} from "../reference-number";
import { isValidWaybill, normaliseWaybill } from "../waybill-number";

describe("global reference numbers", () => {
  it("orders prefixes base-26 from AAA to ZZZ", () => {
    expect(prefixOrder("AAA")).toBe(0);
    expect(prefixOrder("AAB")).toBe(1);
    expect(prefixOrder("ABA")).toBe(26);
    expect(prefixOrder("ZZZ")).toBe(PREFIX_COUNT - 1);
    for (const p of ["AAA", "AAZ", "ABA", "MQX", "ZZZ"]) expect(prefixAt(prefixOrder(p))).toBe(p);
    expect(() => prefixAt(PREFIX_COUNT)).toThrow();
  });

  it("formats three letters and three digits, never 000", () => {
    expect(formatReference("AAA", 1)).toBe("AAA001");
    expect(formatReference("AAB", 999)).toBe("AAB999");
    expect(() => formatReference("AAA", 0)).toThrow();
    expect(() => formatReference("AAA", 1000)).toThrow();
    expect(isReference("AAA001")).toBe(true);
    expect(isReference("AAA000")).toBe(false);
    expect(isReference("AA0001")).toBe(false);
  });

  it("steps over blocked prefixes and stops after ZZZ", () => {
    const sex = prefixOrder("SEX");
    expect(BLOCKED_PREFIXES.has("SEX")).toBe(true);
    expect(nextIssuablePrefix(sex)).toEqual({ prefix: "SEY", order: sex + 1 });
    expect(nextIssuablePrefix(PREFIX_COUNT - 1)).toEqual({ prefix: "ZZZ", order: PREFIX_COUNT - 1 });
    expect(nextIssuablePrefix(PREFIX_COUNT)).toBeNull();
  });

  it("fixes look-alikes by position and accepts spaces and dashes", () => {
    expect(normaliseReference(" aab-204 ")).toBe("AAB204");
    expect(normaliseReference("A0B2O4")).toBe("AOB204"); // 0 among the letters is O; O among the digits is 0
    expect(normaliseReference("1AB2I4")).toBe("IAB214");
    expect(normaliseReference("TMP-2611-4F7K2QX")).toBe("TMP-2611-4F7K2QX"); // not a reference: left alone
  });

  it("is a valid waybill alongside the legacy format, with piece labels", () => {
    expect(normaliseWaybill("aab 204-02/03")).toEqual({ waybill: "AAB204", piece: { seq: 2, of: 3 } });
    expect(isValidWaybill("AAB204")).toBe(true);
    expect(isValidWaybill("AAB000")).toBe(false);
  });

  it("reports capacity against the version-1 namespace", () => {
    const c = capacity(1244);
    expect(c.total).toBe((PREFIX_COUNT - BLOCKED_PREFIXES.size) * 999);
    expect(c.remaining).toBe(c.total - 1244);
  });
});

describe("one sequence and tag per kind", () => {
  it("tags cargo and cases, and reads the kind back from the number", async () => {
    const { formatReference, referenceTypeOf, normaliseReference, isReference } = await import("../reference-number");
    expect(formatReference("AAA", 1, "CASE")).toBe("CS-AAA001");
    expect(formatReference("AAA", 2, "CARGO")).toBe("CG-AAA002");
    expect(formatReference("AAA", 3)).toBe("AAA003");
    expect(referenceTypeOf("CS-AAA001")).toBe("CASE");
    expect(referenceTypeOf("AAA001")).toBe("PARCEL");
    // Typed without the dash, lower case, with look-alikes.
    expect(normaliseReference("cs aao 00l")).toBe("CS-AAO001");
    expect(normaliseReference("cgaab204")).toBe("CG-AAB204");
    expect(isReference("XX-AAA001")).toBe(false);
  });

  it("never takes a case number for a waybill", async () => {
    const { isValidWaybill } = await import("../waybill-number");
    expect(isValidWaybill("AAA001")).toBe(true);
    expect(isValidWaybill("CG-AAA001")).toBe(true);
    expect(isValidWaybill("CS-AAA001")).toBe(false);
  });
});

describe("invoice numbers", () => {
  it("carry the business code, made from its name", async () => {
    const { invoiceCodeCandidates, formatInvoiceNumber } = await import("../invoice-number");
    expect(invoiceCodeCandidates("Kombo Parcels Ltd")[0]).toBe("KPL");
    expect(invoiceCodeCandidates("Jupiter")[0]).toBe("JUP");
    expect(new Set(invoiceCodeCandidates("Kombo Parcels Ltd")).size).toBeGreaterThan(2);
    expect(formatInvoiceNumber("KPL", new Date("2026-11-06T10:00:00Z"), 1)).toBe("INV-KPL-2611-0001");
  });
});
