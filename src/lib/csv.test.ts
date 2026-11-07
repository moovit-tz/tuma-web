import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("CSV exports", () => {
  it("quotes what needs it, defuses formulas, and starts with a BOM", () => {
    const out = toCsv(["a", "b"], [["Juma, Asha", 'say "hi"'], ["=SUM(A1)", 1200], [null, undefined]]);
    expect(out.startsWith("﻿")).toBe(true);
    expect(out.slice(1).split("\r\n")).toEqual(["a,b", '"Juma, Asha","say ""hi"""', "'=SUM(A1),1200", ",", ""]);
  });
});
