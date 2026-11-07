import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { claimsFrom, phoneClaim } = await import("./ondi");

describe("Ondi's phone claim", () => {
  it("keeps real mobile numbers, in E.164", () => {
    expect(phoneClaim("+255745763000")).toBe("+255745763000");
    expect(phoneClaim("0745 763 000")).toBe("+255745763000");
    expect(phoneClaim("+254712345678")).toBe("+254712345678");
  });
  it("drops a federated sign-up's placeholder and anything that isn't a phone", () => {
    expect(phoneClaim("federated_google_110651584368606466219")).toBeUndefined();
    expect(phoneClaim("deleted_abc")).toBeUndefined();
    expect(phoneClaim("110651584368606466219")).toBeUndefined();
    expect(phoneClaim(undefined)).toBeUndefined();
    expect(claimsFrom({ sub: "u1", name: "Asha", phone: "federated_google_110651584368606466219" }, "roles").phone).toBeUndefined();
  });
});
