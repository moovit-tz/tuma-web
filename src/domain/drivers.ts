/**
 * Tuma-X driver rules, shared by the API and the dispatch board. Mirrors the app's
 * lib/jobs/vehicles.dart and lib/jobs/delivery_area.dart so both sides agree on what a driver may take.
 */
import type { Address } from "@/server/db/schema";

export type JobKind = "parcel" | "cargo";

export const VEHICLE_KINDS = {
  boda: { label: "Boda boda", jobKind: "parcel", capacityKg: 30 },
  bajaji: { label: "Bajaji", jobKind: "parcel", capacityKg: 150 },
  van: { label: "Van", jobKind: "parcel", capacityKg: 1000 },
  pickup: { label: "Pickup", jobKind: "cargo", capacityKg: 1500 },
  lorry: { label: "Lorry", jobKind: "cargo", capacityKg: 10000 },
  trailer: { label: "Trailer", jobKind: "cargo", capacityKg: 28000 },
} as const satisfies Record<string, { label: string; jobKind: JobKind; capacityKg: number }>;

export type VehicleKind = keyof typeof VEHICLE_KINDS;
export const VEHICLE_KEYS = Object.keys(VEHICLE_KINDS) as VehicleKind[];
export const isVehicleKind = (v: unknown): v is VehicleKind => typeof v === "string" && v in VEHICLE_KINDS;

/** Riders drive parcel vehicles; truck drivers drive cargo vehicles. */
export const roleFor = (v: VehicleKind) => (VEHICLE_KINDS[v].jobKind === "parcel" ? "rider" : "truck_driver");

const CORE = new Set(["Dar es Salaam", "Pwani", "Morogoro", "Dodoma", "Arusha", "Kilimanjaro", "Tanga", "Mwanza", "Mbeya", "Iringa"]);
const ISLAND = new Set(["Zanzibar (Mjini Magharibi)", "Mjini Magharibi", "Kaskazini Pemba", "Kusini Pemba", "Kaskazini Unguja", "Kusini Unguja"]);

/**
 * PLACEHOLDER rules until Tuma publishes per-area vehicle rules: core regions take every vehicle,
 * islands only light vehicles (no lorries or trailers), everywhere else no trailers.
 */
export function vehicleAllowedIn(region: string, v: VehicleKind): boolean {
  if (ISLAND.has(region)) return v === "boda" || v === "bajaji" || v === "van" || v === "pickup";
  if (CORE.has(region)) return true;
  return v !== "trailer";
}

/** Why a job can't go to this driver, or null when it can. Same rules as the app's eligibility.dart. */
export function ineligible(job: { kind: JobKind; region: string; requiredVehicle: string | null; weightG: number }, d: { region: string; vehicleKind: VehicleKind }): string | null {
  const v = VEHICLE_KINDS[d.vehicleKind];
  if (job.region !== d.region) return "AREA";
  if (!vehicleAllowedIn(d.region, d.vehicleKind)) return "VEHICLE_NOT_ALLOWED";
  if (job.kind !== v.jobKind) return "KIND";
  if (job.requiredVehicle && job.requiredVehicle !== d.vehicleKind) return "VEHICLE";
  if (job.weightG / 1000 > v.capacityKg) return "CAPACITY";
  return null;
}

/** Approximate centre (regional capital) of each Tanzanian region, for addresses without coordinates. */
export const REGION_CENTRES: Record<string, [lat: number, lng: number]> = {
  Arusha: [-3.37, 36.68],
  "Dar es Salaam": [-6.82, 39.28],
  Dodoma: [-6.17, 35.75],
  Geita: [-2.87, 32.23],
  Iringa: [-7.77, 35.69],
  Kagera: [-1.33, 31.81],
  Katavi: [-6.34, 31.07],
  Kigoma: [-4.88, 29.63],
  Kilimanjaro: [-3.35, 37.34],
  Lindi: [-10.0, 39.71],
  Manyara: [-4.21, 35.75],
  Mara: [-1.5, 33.8],
  Mbeya: [-8.9, 33.46],
  Morogoro: [-6.82, 37.66],
  Mtwara: [-10.27, 40.18],
  Mwanza: [-2.52, 32.9],
  Njombe: [-9.33, 34.77],
  Pwani: [-6.77, 38.92],
  Rukwa: [-7.96, 31.62],
  Ruvuma: [-10.68, 35.65],
  Shinyanga: [-3.66, 33.42],
  Simiyu: [-2.8, 33.99],
  Singida: [-4.82, 34.75],
  Songwe: [-9.11, 32.93],
  Tabora: [-5.02, 32.8],
  Tanga: [-5.07, 39.1],
  "Zanzibar (Mjini Magharibi)": [-6.16, 39.2],
  "Mjini Magharibi": [-6.16, 39.2],
  "Kaskazini Unguja": [-5.88, 39.29],
  "Kusini Unguja": [-6.27, 39.43],
  "Kaskazini Pemba": [-4.98, 39.75],
  "Kusini Pemba": [-5.25, 39.77],
};

/** Where to send a driver for an address: its own coordinates, else the region's centre. `approx` says which. */
export function pointFor(a: Pick<Address, "region" | "lat" | "lng">): { lat: number; lng: number; approx: boolean } {
  if (typeof a.lat === "number" && typeof a.lng === "number") return { lat: a.lat, lng: a.lng, approx: false };
  const c = REGION_CENTRES[a.region] ?? REGION_CENTRES["Dar es Salaam"];
  return { lat: c[0], lng: c[1], approx: true };
}

export const addressLine = (a: Address) => [a.street, a.ward, a.district, a.region].filter(Boolean).join(", ") + (a.landmark ? ` (${a.landmark})` : "");

/** Straight-line distance in metres. */
export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Guide payout (TZS): base + per km, rounded up to 500. PLACEHOLDER until finance sets the rate card. */
export const PAYOUT_GUIDE: Record<VehicleKind, { base: number; perKm: number }> = {
  boda: { base: 1000, perKm: 300 },
  bajaji: { base: 2000, perKm: 450 },
  van: { base: 5000, perKm: 800 },
  pickup: { base: 15000, perKm: 1200 },
  lorry: { base: 60000, perKm: 2500 },
  trailer: { base: 150000, perKm: 4000 },
};
export function guidePayout(v: VehicleKind, km: number): number {
  const g = PAYOUT_GUIDE[v];
  return Math.ceil((g.base + g.perKm * km) / 500) * 500;
}

/** Phases the app reports (lib/jobs/job_models.dart JobPhase). */
export const JOB_PHASES = ["toPickup", "atPickup", "inTransit", "outForDelivery", "atCheckpoint", "atDropoff", "completed"] as const;
export type JobPhase = (typeof JOB_PHASES)[number];
