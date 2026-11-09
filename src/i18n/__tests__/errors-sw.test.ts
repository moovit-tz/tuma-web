import { describe, expect, it } from "vitest";
import { localizeError, SW_ERRORS } from "../errors-sw";

describe("localizeError", () => {
  it("leaves English alone", () => {
    expect(localizeError("Parcel not found.", "en")).toBe("Parcel not found.");
  });
  it("translates exact messages to Swahili", () => {
    expect(localizeError("Parcel not found.", "sw")).toBe(SW_ERRORS["Parcel not found."]);
  });
  it("fills templated messages", () => {
    expect(localizeError("No parcel TM-123.", "sw")).toBe("Hakuna kifurushi TM-123.");
  });
  it("falls back to the English when unknown", () => {
    expect(localizeError("Something brand new.", "sw")).toBe("Something brand new.");
  });
});
