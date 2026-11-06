import { TZ_REGIONS } from "./pricing";
import { TZ_DISTRICTS } from "./tz-districts";
import { GEO_DISTRICTS } from "./geo";

/**
 * BRELA (Business Registrations and Licensing Agency) records, as Tuma uses them to fill in a business application:
 * the registered name, kind and number, and the office region, district and street read from the registered address.
 */
export type RegistryKind = "company" | "business_name";

export type RegistryRecord = {
  number: string; // incorporation (company) or registration (business name) number
  /** The TIN: BRELA's certificate number is the business's 9-digit TIN for registrations through ORS. */
  tin: string | null;
  name: string; // registered legal name
  kind: RegistryKind;
  subtype: string | null;
  status: string; // e.g. "Registered"
  registered: boolean;
  registeredOn: string | null; // YYYY-MM-DD
  address: string | null;
  /** Office fields read from the address; any can be missing. */
  office: { region?: string; district?: string; street?: string };
  /** The application's business type this record implies. */
  businessType: "sole_trader" | "partnership" | "company";
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
const title = (s: string) => s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase());

/** "Dar Es Salaam" → "Dar es Salaam"; also "Zanzibar Urban/West" style names that contain a region name. */
export function matchRegion(raw: string): string | undefined {
  const n = norm(raw);
  if (!n) return undefined;
  return TZ_REGIONS.find((r) => norm(r) === n) ?? TZ_REGIONS.find((r) => n.includes(norm(r)) && norm(r).length > 4);
}

/** "Kinondoni" → "Kinondoni"; "Arusha" in Arusha → "Arusha City"; unknown → title case as written. */
export function matchDistrict(region: string | undefined, raw: string): string | undefined {
  const n = norm(raw);
  if (!n) return undefined;
  const list = region ? (TZ_DISTRICTS[region] ?? []) : [];
  // An old or other name of a council: "Ilala" → "Dar es Salaam City", "Nyamagana" → "Mwanza City".
  const alias = GEO_DISTRICTS.find((d) => d.region === region && d.aliases.some((a) => norm(a) === n));
  if (alias) return alias.name;
  // "Iringa CBD", "Moshi Urban", "Mjini": the town council of that name.
  if (/\b(cbd|urban|mjini|town|municipal|city)\b/i.test(raw)) {
    const first = norm(raw.trim().split(/\s+/)[0]);
    const town = list.find((d) => norm(d).startsWith(first) && /(Municipal|City|Town|Urban)/.test(d));
    if (town) return town;
  }
  return list.find((d) => norm(d) === n) ?? list.find((d) => norm(d).startsWith(n)) ?? list.find((d) => n.startsWith(norm(d))) ?? title(raw.trim());
}

/**
 * BRELA addresses read "Region, District, Ward, Postcode, Street parts…, house numbers", e.g.
 * "Dar Es Salaam, Kinondoni, Mwananyamala, 14108, URSINO ESTATE, BAGAMOYO ROAD, 23, 23, 23".
 */
export function officeFromAddress(address: string | null | undefined): RegistryRecord["office"] {
  const parts = (address ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return {};
  const region = matchRegion(parts[0]);
  if (!region) return {};
  const district = parts[1] ? matchDistrict(region, parts[1]) : undefined;
  const ward = parts[2] && !/^\d+$/.test(parts[2]) ? title(parts[2]) : undefined;
  const seen = new Set<string>();
  const street = parts
    .slice(3)
    .filter((p) => !/^[\d\s/-]+$/.test(p)) // postcode and house numbers
    .map(title)
    .filter((p) => (seen.has(p) ? false : (seen.add(p), true)));
  if (ward) street.push(ward);
  return { region, ...(district ? { district } : {}), ...(street.length ? { street: street.join(", ").slice(0, 120) } : {}) };
}

export function businessTypeFor(kind: RegistryKind, subtype: string | null): RegistryRecord["businessType"] {
  if (/partnership/i.test(subtype ?? "")) return "partnership";
  return kind === "company" ? "company" : "sole_trader";
}

/** Builds a record from BRELA's own field names (as Ondi and ComplyOS relay them). */
/** A 9-digit TIN, or null ("169057265", "169-057-265" → "169057265"). */
export function tinOf(raw: string | null | undefined): string | null {
  const d = (raw ?? "").replace(/\D/g, "");
  return d.length === 9 ? d : null;
}

export function toRegistryRecord(r: {
  number: string;
  name: string;
  kind: RegistryKind;
  subtype?: string | null;
  status?: string | null;
  registeredOn?: string | null;
  address?: string | null;
  tin?: string | null;
}): RegistryRecord {
  const status = (r.status ?? "").trim() || "Registered";
  const subtype = r.subtype?.trim() || null;
  return {
    number: r.number.trim(),
    tin: tinOf(r.tin ?? r.number),
    name: r.name.trim().replace(/\s+/g, " "),
    kind: r.kind,
    subtype,
    status,
    registered: /^registered$/i.test(status),
    registeredOn: r.registeredOn ? r.registeredOn.slice(0, 10) : null,
    address: r.address?.trim() || null,
    office: officeFromAddress(r.address),
    businessType: businessTypeFor(r.kind, subtype),
  };
}
