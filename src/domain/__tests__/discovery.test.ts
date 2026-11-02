import { describe, expect, it } from "vitest";
import { EMPTY_ANSWERS, recommend } from "../discovery";

describe("solution discovery", () => {
  it("recommends Starter with bulk upload and TZ wallets for a small Tanzanian online seller on pay-on-delivery", () => {
    const r = recommend({ ...EMPTY_ANSWERS, businessType: "ecommerce", goods: ["parcels"], origin: "TZ", markets: ["TZ"], volume: "100_1000", payments: ["pay_on_delivery"], collect: ["cash", "mobile_money"], systems: ["manual"] });
    expect(r.plan).toBe("starter");
    expect(r.integration).toBe("bulk_upload");
    const collect = r.modules.find((m) => m.key === "collect")!;
    expect(collect.availability).toBe("available");
    expect(collect.detail).toEqual(expect.arrayContaining(["method:cash", "wallet:M-Pesa"]));
    expect(r.crossBorder).toBe(false);
    expect(r.liveMarkets).toEqual(["TZ"]);
  });

  it("marks cross-border as roadmap and non-live markets as rolling out", () => {
    const r = recommend({ ...EMPTY_ANSWERS, businessType: "manufacturer", goods: ["freight"], origin: "TZ", markets: ["KE", "UG"], volume: "gt_10000", payments: ["account"], systems: ["erp"] });
    expect(r.plan).toBe("enterprise");
    expect(r.modules.find((m) => m.key === "cross_border")?.availability).toBe("roadmap");
    expect(r.modules.find((m) => m.key === "cargo")?.availability).toBe("rolling_out");
    expect(r.soonMarkets).toEqual(["KE", "UG"]);
    expect(r.integration).toBe("erp");
  });

  it("treats a non-live origin as rolling out", () => {
    const r = recommend({ ...EMPTY_ANSWERS, origin: "ZA", markets: ["ZA"], goods: ["parcels"] });
    expect(r.modules.find((m) => m.key === "parcel")?.availability).toBe("rolling_out");
  });
});
