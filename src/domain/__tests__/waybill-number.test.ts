import { describe, expect, it } from "vitest";
import { ALPHABET, checkChar, generateWaybill, isValidWaybill, normaliseWaybill, pieceLabel } from "../waybill-number";

describe("waybill numbers (SRS 4.2)", () => {
  it("generates the TM{P|C}-YYMM-XXXXXXC format with the issue month in EAT", () => {
    const wb = generateWaybill("parcel", new Date("2026-11-01T10:00:00Z"));
    expect(wb).toMatch(/^TMP-2611-[0-9A-HJKMNP-TV-Z]{7}$/);
    expect(generateWaybill("cargo", new Date("2026-11-30T22:30:00Z"))).toMatch(/^TMC-2612-/); // 01:30 EAT on 1 Dec
  });

  it("never uses I, L, O or U", () => {
    for (let i = 0; i < 2000; i++) expect(generateWaybill("parcel").slice(9)).not.toMatch(/[ILOU]/);
  });

  it("validates its own check character", () => {
    for (let i = 0; i < 500; i++) expect(isValidWaybill(generateWaybill(i % 2 ? "parcel" : "cargo"))).toBe(true);
  });

  it("catches every single-character substitution", () => {
    const wb = generateWaybill("parcel");
    const positions = [9, 10, 11, 12, 13, 14, 15];
    for (const pos of positions) {
      for (const ch of ALPHABET) {
        if (ch === wb[pos]) continue;
        const bad = wb.slice(0, pos) + ch + wb.slice(pos + 1);
        expect(isValidWaybill(bad)).toBe(false);
      }
    }
  });

  it("catches adjacent transpositions of different characters in the random part", () => {
    let caught = 0;
    let total = 0;
    for (let n = 0; n < 300; n++) {
      const wb = generateWaybill("parcel");
      for (let pos = 9; pos < 15; pos++) {
        if (wb[pos] === wb[pos + 1]) continue;
        total++;
        const swapped = wb.slice(0, pos) + wb[pos + 1] + wb[pos] + wb.slice(pos + 2);
        if (!isValidWaybill(swapped)) caught++;
      }
    }
    expect(caught / total).toBeGreaterThan(0.95);
  });

  it("normalises typed input and look-alikes", () => {
    const wb = generateWaybill("parcel");
    const typed = wb.toLowerCase().replace(/0/g, "o").replace(/-/g, " - ");
    expect(normaliseWaybill(typed).waybill).toBe(wb);
    expect(normaliseWaybill(`${wb}-02/03`)).toEqual({ waybill: wb, piece: { seq: 2, of: 3 } });
  });

  it("formats piece labels", () => {
    expect(pieceLabel("TMP-2611-4F7K2QX", 2, 3)).toBe("TMP-2611-4F7K2QX-02/03");
  });

  it("check char is in the alphabet", () => {
    expect(ALPHABET).toContain(checkChar("TMP26114F7K2Q"));
  });
});
