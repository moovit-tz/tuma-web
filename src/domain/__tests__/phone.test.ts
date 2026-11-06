import { describe, expect, it } from "vitest";
import { toE164 } from "../phone";

describe("phone numbers in SADC and EAC", () => {
  it("takes Tanzanian numbers in the usual forms", () => {
    expect(toE164("0745 763 000")).toBe("+255745763000");
    expect(toE164("745763000")).toBe("+255745763000");
  });

  it("takes other members' numbers with their code, dropping a trunk 0", () => {
    expect(toE164("+254 712 345 678")).toBe("+254712345678");
    expect(toE164("+254 0712 345 678")).toBe("+254712345678");
    expect(toE164("00257 79 123 456")).toBe("+25779123456");
    expect(toE164("+27 82 123 4567")).toBe("+27821234567");
    expect(toE164("+248 2 512 345")).toBe("+2482512345");
  });

  it("refuses numbers outside the bloc, the wrong length, or a +255 that isn't a mobile", () => {
    expect(toE164("+1 415 555 0100")).toBeNull();
    expect(toE164("+251 911 234 567")).toBeNull(); // Ethiopia
    expect(toE164("+254 712 345")).toBeNull();
    expect(toE164("+255 222 123 456")).toBeNull();
  });
});
