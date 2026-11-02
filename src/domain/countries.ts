/**
 * The Tuma footprint: SADC + EAC member states (22; DR Congo and Tanzania belong to both).
 * Used by the landing page, the region map generator and (later) multi-country pricing.
 *
 * `status` is commercial availability. The SRS launches in Tanzania first (A7); every other market is
 * "soon" until operations confirm a launch. Change it here and the site follows.
 */
export type Bloc = "SADC" | "EAC";
export type CountryStatus = "live" | "soon";
export type City = { name: string; lon: number; lat: number };

export type Country = {
  iso2: string;
  /** ISO 3166-1 numeric, as used by Natural Earth / world-atlas */
  num: string;
  name: { en: string; sw: string; fr: string };
  blocs: Bloc[];
  currency: string;
  dial: string;
  status: CountryStatus;
  /** First city is the main hub. */
  cities: City[];
  /** Small island states are drawn with a ring so they stay visible at regional scale. */
  island?: boolean;
  /** Mobile money wallets accepted. PLACEHOLDER — confirm with finance (SRS open question Q12). */
  wallets?: string[];
};

/** French names (official francophone forms where they differ). */
const FR_NAMES: Record<string, string> = {
  TZ: "Tanzanie", KE: "Kenya", UG: "Ouganda", RW: "Rwanda", BI: "Burundi", SS: "Soudan du Sud", SO: "Somalie",
  CD: "RD Congo", ZA: "Afrique du Sud", ZM: "Zambie", ZW: "Zimbabwe", MW: "Malawi", MZ: "Mozambique",
  BW: "Botswana", NA: "Namibie", AO: "Angola", MG: "Madagascar", SZ: "Eswatini", LS: "Lesotho",
  KM: "Comores", MU: "Maurice", SC: "Seychelles",
};

const c = (
  iso2: string,
  num: string,
  en: string,
  sw: string,
  blocs: Bloc[],
  currency: string,
  dial: string,
  cities: [string, number, number][],
  extra: Partial<Country> = {},
): Country => ({
  iso2,
  num,
  name: { en, sw, fr: FR_NAMES[iso2] ?? en },
  blocs,
  currency,
  dial,
  status: "soon",
  cities: cities.map(([name, lon, lat]) => ({ name, lon, lat })),
  ...extra,
});

export const COUNTRIES: Country[] = [
  c("TZ", "834", "Tanzania", "Tanzania", ["SADC", "EAC"], "TZS", "+255", [["Dar es Salaam", 39.28, -6.82], ["Arusha", 36.68, -3.37], ["Mwanza", 32.9, -2.52], ["Dodoma", 35.75, -6.17]], { status: "live", wallets: ["M-Pesa", "Mixx by Yas", "Airtel Money", "HaloPesa"] }),
  c("KE", "404", "Kenya", "Kenya", ["EAC"], "KES", "+254", [["Nairobi", 36.82, -1.29], ["Mombasa", 39.67, -4.04], ["Kisumu", 34.76, -0.09]], { wallets: ["M-Pesa", "Airtel Money"] }),
  c("UG", "800", "Uganda", "Uganda", ["EAC"], "UGX", "+256", [["Kampala", 32.58, 0.35], ["Mbale", 34.18, 1.08], ["Gulu", 32.3, 2.77]], { wallets: ["MTN MoMo", "Airtel Money"] }),
  c("RW", "646", "Rwanda", "Rwanda", ["EAC"], "RWF", "+250", [["Kigali", 30.06, -1.95]], { wallets: ["MTN MoMo", "Airtel Money"] }),
  c("BI", "108", "Burundi", "Burundi", ["EAC"], "BIF", "+257", [["Bujumbura", 29.36, -3.38], ["Gitega", 29.93, -3.43]]),
  c("SS", "728", "South Sudan", "Sudan Kusini", ["EAC"], "SSP", "+211", [["Juba", 31.58, 4.85]]),
  c("SO", "706", "Somalia", "Somalia", ["EAC"], "SOS", "+252", [["Mogadishu", 45.34, 2.05], ["Hargeisa", 44.06, 9.56]]),
  c("CD", "180", "DR Congo", "Kongo DR", ["SADC", "EAC"], "CDF", "+243", [["Kinshasa", 15.31, -4.32], ["Lubumbashi", 27.48, -11.66], ["Goma", 29.22, -1.68]], { wallets: ["M-Pesa", "Orange Money", "Airtel Money"] }),
  c("ZA", "710", "South Africa", "Afrika Kusini", ["SADC"], "ZAR", "+27", [["Johannesburg", 28.05, -26.2], ["Durban", 31.02, -29.86], ["Cape Town", 18.42, -33.92]]),
  c("ZM", "894", "Zambia", "Zambia", ["SADC"], "ZMW", "+260", [["Lusaka", 28.32, -15.39], ["Kitwe", 28.21, -12.8], ["Ndola", 28.64, -12.97]], { wallets: ["MTN MoMo", "Airtel Money"] }),
  c("ZW", "716", "Zimbabwe", "Zimbabwe", ["SADC"], "ZWG", "+263", [["Harare", 31.05, -17.83], ["Bulawayo", 28.58, -20.15]], { wallets: ["EcoCash"] }),
  c("MW", "454", "Malawi", "Malawi", ["SADC"], "MWK", "+265", [["Lilongwe", 33.79, -13.96], ["Blantyre", 35.0, -15.79]], { wallets: ["Airtel Money", "TNM Mpamba"] }),
  c("MZ", "508", "Mozambique", "Msumbiji", ["SADC"], "MZN", "+258", [["Maputo", 32.57, -25.97], ["Beira", 34.84, -19.83], ["Nampula", 39.27, -15.12]], { wallets: ["M-Pesa", "e-Mola"] }),
  c("BW", "072", "Botswana", "Botswana", ["SADC"], "BWP", "+267", [["Gaborone", 25.91, -24.65], ["Francistown", 27.51, -21.17]]),
  c("NA", "516", "Namibia", "Namibia", ["SADC"], "NAD", "+264", [["Windhoek", 17.08, -22.56], ["Walvis Bay", 14.5, -22.95]]),
  c("AO", "024", "Angola", "Angola", ["SADC"], "AOA", "+244", [["Luanda", 13.23, -8.84], ["Lobito", 13.55, -12.35], ["Huambo", 15.74, -12.78]]),
  c("MG", "450", "Madagascar", "Madagaska", ["SADC"], "MGA", "+261", [["Antananarivo", 47.52, -18.88], ["Toamasina", 49.4, -18.15]]),
  c("SZ", "748", "Eswatini", "Eswatini", ["SADC"], "SZL", "+268", [["Mbabane", 31.14, -26.31], ["Manzini", 31.38, -26.49]]),
  c("LS", "426", "Lesotho", "Lesotho", ["SADC"], "LSL", "+266", [["Maseru", 27.48, -29.31]]),
  c("KM", "174", "Comoros", "Komoro", ["SADC"], "KMF", "+269", [["Moroni", 43.26, -11.7]], { island: true }),
  c("MU", "480", "Mauritius", "Morisi", ["SADC"], "MUR", "+230", [["Port Louis", 57.5, -20.16]], { island: true }),
  c("SC", "690", "Seychelles", "Shelisheli", ["SADC"], "SCR", "+248", [["Victoria", 55.45, -4.62]], { island: true }),
];

export const DEFAULT_COUNTRY = "TZ";
export const COUNTRY_COOKIE = "tuma_country";

export function getCountry(iso2: string | null | undefined): Country | undefined {
  if (!iso2) return undefined;
  const k = iso2.toUpperCase();
  return COUNTRIES.find((x) => x.iso2 === k);
}

/** Main trade corridors as chains of [country, city] stops. Drawn on the map; lit when they touch the selected country. */
/** `label` names the major corridors on the map (one label each); links between them stay unlabelled. */
export const CORRIDORS: { name: string; label?: string; stops: [string, string][] }[] = [
  { name: "Central Corridor", label: "Central Corridor", stops: [["TZ", "Dar es Salaam"], ["TZ", "Dodoma"], ["TZ", "Mwanza"], ["RW", "Kigali"]] },
  { name: "Central Corridor (Burundi)", stops: [["TZ", "Dodoma"], ["BI", "Bujumbura"]] },
  { name: "Northern Corridor", label: "Northern Corridor", stops: [["KE", "Mombasa"], ["KE", "Nairobi"], ["UG", "Kampala"], ["RW", "Kigali"]] },
  { name: "Northern Corridor (Juba)", stops: [["UG", "Kampala"], ["UG", "Gulu"], ["SS", "Juba"]] },
  { name: "Namanga", stops: [["TZ", "Arusha"], ["KE", "Nairobi"]] },
  { name: "TAZARA / Dar Corridor", label: "TAZARA", stops: [["TZ", "Dar es Salaam"], ["ZM", "Lusaka"]] },
  { name: "Copperbelt", stops: [["ZM", "Lusaka"], ["ZM", "Ndola"], ["CD", "Lubumbashi"]] },
  { name: "Lobito Corridor", label: "Lobito Corridor", stops: [["CD", "Lubumbashi"], ["AO", "Lobito"]] },
  { name: "Goma link", stops: [["RW", "Kigali"], ["CD", "Goma"]] },
  { name: "North–South Corridor", label: "North–South Corridor", stops: [["ZM", "Lusaka"], ["ZW", "Harare"], ["ZA", "Johannesburg"], ["ZA", "Durban"]] },
  { name: "Beira Corridor", label: "Beira", stops: [["ZW", "Harare"], ["MZ", "Beira"]] },
  { name: "Maputo Corridor", label: "Maputo", stops: [["ZA", "Johannesburg"], ["MZ", "Maputo"]] },
  { name: "Nacala Corridor", label: "Nacala", stops: [["MW", "Lilongwe"], ["MZ", "Nampula"]] },
  { name: "Mtwara link", stops: [["MW", "Lilongwe"], ["TZ", "Dar es Salaam"]] },
  { name: "Trans-Kalahari", label: "Trans-Kalahari", stops: [["NA", "Walvis Bay"], ["NA", "Windhoek"], ["BW", "Gaborone"], ["ZA", "Johannesburg"]] },
  { name: "Botswana link", stops: [["BW", "Francistown"], ["ZW", "Bulawayo"], ["ZW", "Harare"]] },
  { name: "Lesotho link", stops: [["ZA", "Johannesburg"], ["LS", "Maseru"]] },
  { name: "Eswatini link", stops: [["ZA", "Johannesburg"], ["SZ", "Mbabane"]] },
  { name: "Somalia coast", stops: [["KE", "Mombasa"], ["SO", "Mogadishu"]] },
  { name: "Kinshasa", stops: [["CD", "Kinshasa"], ["AO", "Luanda"]] },
];

/** Decimal degrees → 06°49′S 039°17′E */
export function dms(lat: number, lon: number): string {
  const f = (v: number, pad: number) => {
    const a = Math.abs(v);
    const d = Math.floor(a);
    const m = Math.round((a - d) * 60);
    return `${String(d).padStart(pad, "0")}°${String(m).padStart(2, "0")}′`;
  };
  return `${f(lat, 2)}${lat < 0 ? "S" : "N"} ${f(lon, 3)}${lon < 0 ? "W" : "E"}`;
}

/**
 * Regional road links beyond the named corridors: neighbouring hubs connected by trunk roads.
 * Drawn faintly on the hero map; the simulated vans and parcels travel on them.
 */
export const ROAD_LINKS: [string, string][][] = [
  [["UG", "Kampala"], ["RW", "Kigali"]],
  [["RW", "Kigali"], ["BI", "Bujumbura"]],
  [["KE", "Kisumu"], ["UG", "Kampala"]],
  [["TZ", "Mwanza"], ["KE", "Kisumu"]],
  [["TZ", "Arusha"], ["TZ", "Dodoma"]],
  [["ZM", "Lusaka"], ["MW", "Lilongwe"]],
  [["MW", "Blantyre"], ["MZ", "Beira"]],
  [["ZW", "Bulawayo"], ["ZA", "Johannesburg"]],
  [["BW", "Gaborone"], ["ZW", "Bulawayo"]],
  [["NA", "Windhoek"], ["AO", "Huambo"]],
  [["AO", "Huambo"], ["AO", "Luanda"]],
  [["CD", "Goma"], ["UG", "Kampala"]],
  [["ZA", "Durban"], ["SZ", "Manzini"]],
  [["ZA", "Cape Town"], ["ZA", "Johannesburg"]],
  [["MZ", "Nampula"], ["MZ", "Beira"]],
  [["SO", "Mogadishu"], ["SO", "Hargeisa"]],
];
