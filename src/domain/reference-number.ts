/**
 * Hudumika reference numbers (Reference Number Service spec, format version 1).
 *
 *   AAA001      a parcel        three letters, three digits
 *   CG-AAA001   a cargo shipment
 *   CS-AAA001   a support case
 *
 * Each kind has its own sequence and a fixed tag, so a number says what it is and a case can never look like a
 * parcel (no case AAA001 next to a parcel AAA002). Parcels carry no tag: their labels are already in circulation.
 * Numbers issued before the split (from the one shared sequence) keep working; the registry knows their type.
 *
 * Allocation is capacity-based: AAA001 → AAA999, then AAB001 … ZZZ999 (base-26 order). Nothing ever resets or wraps;
 * before the last prefix runs out, a longer format version takes over and every old reference stays valid.
 */

export const REF_FORMAT_VERSION = 1;
export const SEQ_MAX = 999;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const PREFIX_COUNT = 26 ** 3; // 17,576

export type ReferenceType = "PARCEL" | "CARGO" | "CASE";
export const REFERENCE_TYPES: { code: ReferenceType; description: string; sourceSystem: string }[] = [
  { code: "PARCEL", description: "Parcel reference", sourceSystem: "TRANSX" },
  { code: "CARGO", description: "Cargo reference", sourceSystem: "TRANSX" },
  { code: "CASE", description: "Support case reference", sourceSystem: "BLISS" },
];

/**
 * Prefixes never issued because they read as something offensive on a label or in an SMS (English and Swahili).
 * They are recorded as RETIRED so the allocator steps over them; the list only ever grows.
 */
export const BLOCKED_PREFIXES = new Set([
  "ASS", "CUM", "DIK", "DIC", "FAG", "FCK", "FUC", "FUK", "FUX", "GAY", "JEW", "KKK", "KIL", "NAZ", "NIG", "PIS",
  "POO", "SEX", "SHT", "SUX", "TIT", "WTF", "XXX", "KUM", "MBO", "MAV", "MSE", "KUN",
]);

/** Each kind's own sequence (its allocator cursor) and the tag in front of its numbers. */
export const REF_SERIES: Record<ReferenceType, { cursor: number; tag: string }> = {
  PARCEL: { cursor: 1, tag: "" },
  CARGO: { cursor: 2, tag: "CG-" },
  CASE: { cursor: 3, tag: "CS-" },
};

export const REF_PATTERN = /^(?:(?:CG|CS)-)?[A-Z]{3}(?!000)\d{3}$/;

/** AAA → 0, AAB → 1 … ZZZ → 17,575. */
export function prefixOrder(prefix: string): number {
  if (!/^[A-Z]{3}$/.test(prefix)) throw new Error(`Bad prefix ${prefix}`);
  return [...prefix].reduce((n, ch) => n * 26 + LETTERS.indexOf(ch), 0);
}

export function prefixAt(order: number): string {
  if (!Number.isInteger(order) || order < 0 || order >= PREFIX_COUNT) throw new Error(`Prefix order ${order} out of range`);
  return LETTERS[Math.floor(order / 676)] + LETTERS[Math.floor(order / 26) % 26] + LETTERS[order % 26];
}

/** The first issuable prefix at or after `order`, or null when the format version is exhausted. */
export function nextIssuablePrefix(order: number): { prefix: string; order: number } | null {
  for (let o = order; o < PREFIX_COUNT; o++) {
    const p = prefixAt(o);
    if (!BLOCKED_PREFIXES.has(p)) return { prefix: p, order: o };
  }
  return null;
}

export function formatReference(prefix: string, seq: number, type: ReferenceType = "PARCEL"): string {
  if (seq < 1 || seq > SEQ_MAX) throw new Error(`Sequence ${seq} out of range`);
  return REF_SERIES[type].tag + prefix + String(seq).padStart(3, "0");
}

/** What a number is, from its tag: CG- cargo, CS- a case, untagged a parcel (or, before the split, any kind). */
export function referenceTypeOf(ref: string): ReferenceType {
  return ref.startsWith("CG-") ? "CARGO" : ref.startsWith("CS-") ? "CASE" : "PARCEL";
}

export function isReference(s: string): boolean {
  return REF_PATTERN.test(s);
}

/**
 * What a person typed or a scanner read → the reference. Upper-cases, drops spaces and dashes ("aaa-001"), and fixes
 * look-alikes by position: letters come first and digits last, so 0/O and 1/I/L can never be confused.
 * Anything that isn't a reference comes back just trimmed and upper-cased, so callers can try other formats.
 */
export function normaliseReference(input: string): string {
  const raw = input.trim().toUpperCase();
  let s = raw.replace(/[\s-]+/g, "");
  // A tag in front (CG, CS; typed with or without the dash) stays as it is.
  const tag = s.length === 8 && /^(CG|CS)/.test(s) ? `${s.slice(0, 2)}-` : "";
  if (tag) s = s.slice(2);
  if (s.length !== 6) return raw;
  const letters = s.slice(0, 3).replace(/0/g, "O").replace(/1/g, "I").replace(/5/g, "S").replace(/8/g, "B");
  const digits = s.slice(3).replace(/O/g, "0").replace(/[IL]/g, "1").replace(/S/g, "5").replace(/B/g, "8");
  const out = tag + letters + digits;
  return isReference(out) ? out : raw;
}

/** Share of one kind's version-1 namespace used, for capacity monitoring (spec §10 thresholds). */
export function capacity(issued: number) {
  const total = (PREFIX_COUNT - BLOCKED_PREFIXES.size) * SEQ_MAX;
  return { total, issued, remaining: total - issued, percentUsed: Math.round((issued / total) * 1e6) / 1e4 };
}

export const REFERENCE_TYPE_LABEL: Record<ReferenceType, { en: string; sw: string }> = {
  PARCEL: { en: "Parcel", sw: "Kifurushi" },
  CARGO: { en: "Cargo", sw: "Mzigo" },
  CASE: { en: "Case", sw: "Kesi" },
};
