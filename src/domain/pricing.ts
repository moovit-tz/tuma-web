/**
 * Parcel pricing — FR-PCL-03, business parameters in SRS 5.2.
 *
 * STUB. Where rate cards live (CRM, FinOps or Tuma) is open question Q3. Until it closes, this
 * module is the single place prices come from, and every number here is a PLACEHOLDER for
 * operations and finance to replace. The result is stored on the waybill as a charge snapshot.
 */
import type { ChargeLine } from "./types";

export const VOLUMETRIC_DIVISOR_CM3_PER_KG = 5000; // 5.2 proposed default
export const MAX_PIECE_WEIGHT_KG = 30; // heavier goods go to Cargo
export const VAT_RATE = 0.18; // estimate only; FinOps produces fiscal documents (FR-FIN-07, Q4)

export const TZ_REGIONS = [
  "Arusha",
  "Dar es Salaam",
  "Dodoma",
  "Geita",
  "Iringa",
  "Kagera",
  "Katavi",
  "Kigoma",
  "Kilimanjaro",
  "Lindi",
  "Manyara",
  "Mara",
  "Mbeya",
  "Morogoro",
  "Mtwara",
  "Mwanza",
  "Njombe",
  "Pwani",
  "Rukwa",
  "Ruvuma",
  "Shinyanga",
  "Simiyu",
  "Singida",
  "Songwe",
  "Tabora",
  "Tanga",
  "Kaskazini Pemba",
  "Kusini Pemba",
  "Kaskazini Unguja",
  "Kusini Unguja",
  "Mjini Magharibi",
] as const;

const ISLAND = new Set(["Kaskazini Pemba", "Kusini Pemba", "Kaskazini Unguja", "Kusini Unguja", "Mjini Magharibi"]);
const CORE = new Set([
  "Dar es Salaam",
  "Pwani",
  "Morogoro",
  "Dodoma",
  "Arusha",
  "Kilimanjaro",
  "Tanga",
  "Mwanza",
  "Mbeya",
  "Iringa",
]);

export type Zone = "local" | "core" | "national" | "island";
export type ServiceLevel = "same_day" | "next_day" | "standard";

export function zoneFor(originRegion: string, destRegion: string): Zone {
  if (originRegion === destRegion) return "local";
  if (ISLAND.has(originRegion) !== ISLAND.has(destRegion)) return "island";
  if (CORE.has(originRegion) && CORE.has(destRegion)) return "core";
  return "national";
}

/** PLACEHOLDER rate card: base price for the first kg, then per additional kg, in TZS. */
const RATE_CARD: Record<Zone, Partial<Record<ServiceLevel, { base: number; perKg: number }>>> = {
  local: {
    same_day: { base: 6000, perKg: 800 },
    next_day: { base: 4500, perKg: 600 },
    standard: { base: 3500, perKg: 500 },
  },
  core: { next_day: { base: 9000, perKg: 1200 }, standard: { base: 7000, perKg: 1000 } },
  national: { next_day: { base: 12000, perKg: 1500 }, standard: { base: 9500, perKg: 1300 } },
  island: { next_day: { base: 14000, perKg: 1800 }, standard: { base: 11000, perKg: 1500 } },
};

export function availableServiceLevels(zone: Zone): ServiceLevel[] {
  return Object.keys(RATE_CARD[zone]) as ServiceLevel[];
}

export type PieceInput = { weightKg: number; lengthCm: number; widthCm: number; heightCm: number };

export function volumetricKg(p: Omit<PieceInput, "weightKg">): number {
  return (p.lengthCm * p.widthCm * p.heightCm) / VOLUMETRIC_DIVISOR_CM3_PER_KG;
}

/** Chargeable weight is the greater of actual and volumetric, per piece, summed (glossary). */
export function weights(pieces: PieceInput[]) {
  let actualG = 0;
  let volumetricG = 0;
  let chargeableG = 0;
  for (const p of pieces) {
    const a = Math.round(p.weightKg * 1000);
    const v = Math.round(volumetricKg(p) * 1000);
    actualG += a;
    volumetricG += v;
    chargeableG += Math.max(a, v);
  }
  return { actualG, volumetricG, chargeableG };
}

export type QuoteInput = {
  originRegion: string;
  destRegion: string;
  serviceLevel: ServiceLevel;
  pieces: PieceInput[];
  codAmount?: number;
  declaredValue?: number;
  deliveryMode: "door" | "wakala_collect";
};

export type Quote =
  | {
      ok: true;
      zone: Zone;
      chargeableKg: number;
      lines: ChargeLine[];
      subtotal: number;
      tax: number;
      total: number;
      weights: ReturnType<typeof weights>;
    }
  | { ok: false; code: "SERVICE_NOT_AVAILABLE" | "PIECE_TOO_HEAVY"; message: string };

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

export function quote(input: QuoteInput): Quote {
  const heavy = input.pieces.find((p) => p.weightKg > MAX_PIECE_WEIGHT_KG);
  if (heavy) {
    return {
      ok: false,
      code: "PIECE_TOO_HEAVY",
      message: `A piece weighs more than ${MAX_PIECE_WEIGHT_KG} kg. Book it as cargo.`,
    };
  }
  const zone = zoneFor(input.originRegion, input.destRegion);
  const rate = RATE_CARD[zone][input.serviceLevel];
  if (!rate) {
    return {
      ok: false,
      code: "SERVICE_NOT_AVAILABLE",
      message: `${input.serviceLevel.replace("_", " ")} is not offered between these regions.`,
    };
  }
  const w = weights(input.pieces);
  const chargeableKg = Math.max(1, Math.ceil(w.chargeableG / 1000));
  const lines: ChargeLine[] = [
    { code: "BASE", label: "Delivery, first kg", amount: rate.base },
  ];
  if (chargeableKg > 1) {
    lines.push({ code: "WEIGHT", label: `Additional ${chargeableKg - 1} kg`, amount: (chargeableKg - 1) * rate.perKg });
  }
  if (input.deliveryMode === "wakala_collect") {
    lines.push({ code: "WAKALA_DISCOUNT", label: "Wakala collection discount", amount: -500 });
  }
  if (input.codAmount && input.codAmount > 0) {
    lines.push({ code: "COD_FEE", label: "COD handling (2%, min 1,000)", amount: Math.max(1000, roundTo(input.codAmount * 0.02, 50)) });
  }
  if (input.declaredValue && input.declaredValue > 0) {
    lines.push({ code: "COVER", label: "Declared-value cover (0.5%)", amount: roundTo(input.declaredValue * 0.005, 50) });
  }
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const tax = roundTo(subtotal * VAT_RATE, 1);
  return { ok: true, zone, chargeableKg, lines, subtotal, tax, total: subtotal + tax, weights: w };
}

const DAY = 24 * 3600 * 1000;

/** Promised delivery date from service level and route (FR-TRK-05). Calendar days; PLACEHOLDER. */
export function promisedAt(serviceLevel: ServiceLevel, zone: Zone, now = new Date()): Date {
  // Work in East Africa Time (UTC+3, no DST).
  const eat = new Date(now.getTime() + 3 * 3600 * 1000);
  const at = (daysAhead: number, hour: number) => {
    const d = new Date(Date.UTC(eat.getUTCFullYear(), eat.getUTCMonth(), eat.getUTCDate(), hour - 3, 0, 0));
    return new Date(d.getTime() + daysAhead * DAY);
  };
  if (serviceLevel === "same_day") return eat.getUTCHours() < 14 ? at(0, 21) : at(1, 21);
  if (serviceLevel === "next_day") return at(1, 18);
  const days: Record<Zone, number> = { local: 2, core: 3, island: 4, national: 5 };
  return at(days[zone], 18);
}
