/**
 * Solution discovery: turns a prospect's answers into a recommended Tuma setup.
 * Pure and deterministic so sales sees the same recommendation the prospect saw (it is sent with the lead).
 * Availability follows the SRS release plan: parcel R1, cargo R2, cross-border R4 (Q6).
 */
import { COUNTRIES, getCountry } from "./countries";

export const BUSINESS_TYPES = ["ecommerce", "retail", "manufacturer", "marketplace", "logistics", "other"] as const;
export const GOODS = ["parcels", "documents", "bulky", "freight"] as const;
export const VOLUMES = ["lt_100", "100_1000", "1000_10000", "gt_10000"] as const;
export const PAYMENTS = ["pay_on_delivery", "cod", "prepaid", "account"] as const;
export const COLLECT = ["cash", "mobile_money", "card"] as const;
export const SYSTEMS = ["store", "custom", "erp", "marketplace", "manual"] as const;
export const SPEEDS = ["same_day", "next_day", "standard", "scheduled"] as const;

export type Answers = {
  businessType: (typeof BUSINESS_TYPES)[number] | "";
  goods: (typeof GOODS)[number][];
  origin: string; // ISO2
  markets: string[]; // ISO2, includes origin when domestic
  volume: (typeof VOLUMES)[number] | "";
  payments: (typeof PAYMENTS)[number][];
  collect: (typeof COLLECT)[number][];
  systems: (typeof SYSTEMS)[number][];
  speeds: (typeof SPEEDS)[number][];
};

export const EMPTY_ANSWERS: Answers = {
  businessType: "",
  goods: [],
  origin: "TZ",
  markets: [],
  volume: "",
  payments: [],
  collect: [],
  systems: [],
  speeds: [],
};

export type Availability = "available" | "rolling_out" | "roadmap";
export type Module = { key: string; availability: Availability; detail?: string[] };
export type Plan = "starter" | "growth" | "enterprise";

export type Recommendation = {
  plan: Plan;
  modules: Module[];
  integration: "bulk_upload" | "store_plugin" | "api" | "erp" | "marketplace";
  liveMarkets: string[];
  soonMarkets: string[];
  crossBorder: boolean;
};

export function recommend(a: Answers): Recommendation {
  const plan: Plan =
    a.volume === "gt_10000" || a.businessType === "marketplace" || a.systems.includes("erp")
      ? "enterprise"
      : a.volume === "1000_10000"
        ? "growth"
        : "starter";

  const origin = getCountry(a.origin);
  const markets = [...new Set([a.origin, ...a.markets])].filter((x) => getCountry(x));
  const live = markets.filter((x) => getCountry(x)!.status === "live");
  const soon = markets.filter((x) => getCountry(x)!.status !== "live");
  const crossBorder = markets.some((x) => x !== a.origin);
  const originAvailability: Availability = origin?.status === "live" ? "available" : "rolling_out";

  const modules: Module[] = [];
  if (a.goods.some((g) => g === "parcels" || g === "documents" || g === "bulky") || a.goods.length === 0) {
    modules.push({ key: "parcel", availability: originAvailability });
  }
  if (a.goods.includes("freight") || (a.goods.includes("bulky") && (a.volume === "1000_10000" || a.volume === "gt_10000"))) {
    // Cargo module arrives in R2.
    modules.push({ key: "cargo", availability: "rolling_out" });
  }
  if (a.payments.includes("pay_on_delivery") || a.payments.includes("cod")) {
    const wallets = origin?.wallets ?? [];
    modules.push({
      key: "collect",
      availability: originAvailability,
      detail: [...a.collect.map((c) => `method:${c}`), ...(a.collect.includes("mobile_money") ? wallets.map((w) => `wallet:${w}`) : [])],
    });
  }
  if (a.payments.includes("prepaid")) modules.push({ key: "prepaid", availability: originAvailability });
  if (a.payments.includes("account") || plan !== "starter") modules.push({ key: "account", availability: originAvailability });
  if (a.speeds.length) modules.push({ key: "service_levels", availability: originAvailability, detail: a.speeds.map((s) => `speed:${s}`) });
  modules.push({ key: "tracking", availability: originAvailability });
  if (crossBorder) modules.push({ key: "cross_border", availability: "roadmap" });

  const integration: Recommendation["integration"] = a.systems.includes("erp")
    ? "erp"
    : a.systems.includes("custom")
      ? "api"
      : a.systems.includes("marketplace")
        ? "marketplace"
        : a.systems.includes("store")
          ? "store_plugin"
          : "bulk_upload";
  modules.push({ key: `integration_${integration}`, availability: integration === "bulk_upload" ? originAvailability : "rolling_out" });

  return { plan, modules, integration, liveMarkets: live, soonMarkets: soon, crossBorder };
}

export const ALL_MARKETS = COUNTRIES.map((c) => c.iso2);
