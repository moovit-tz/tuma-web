/**
 * Waybill numbers.
 *
 * New shipments are numbered by the Hudumika Reference Number Service (see reference-number.ts): AAA001, with
 * piece labels AAA001-02/03. The legacy TransX format below is still read, validated and tracked, because labels
 * already printed with it stay in circulation; nothing issues it any more.
 *
 * Legacy format — SRS 4.2:
 *
 *   TM{P|C}-{YYMM}-{6 random chars}{check}
 *   TMP-2611-4F7K2QX        parcel waybill issued November 2026
 *   TMP-2611-4F7K2QX-02/03  second label of a three-piece parcel
 *
 * - Random chars come from Crockford base32 (no I, L, O, U) so labels are not misread.
 * - Numbers are random, not sequential, so volumes cannot be guessed.
 * - The check character is Luhn mod 32 over every alphanumeric before it ("TMP2611" + random).
 *   It stays inside the same alphabet, catches every single-character error and almost every
 *   adjacent transposition. (SRS: "the algorithm is fixed in design" — this is that decision.)
 */

import { isReference, normaliseReference } from "./reference-number";

export const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32
const N = ALPHABET.length; // 32

export type WaybillKind = "parcel" | "cargo";

const PATTERN = /^TM([PC])-(\d{4})-([0-9A-HJKMNP-TV-Z]{6})([0-9A-HJKMNP-TV-Z])$/;

function codePoint(ch: string): number {
  const v = ALPHABET.indexOf(ch);
  if (v < 0) throw new Error(`Character ${ch} is not in the waybill alphabet`);
  return v;
}

/** Luhn mod N check character (N = 32). */
export function checkChar(body: string): string {
  let factor = 2;
  let sum = 0;
  for (let i = body.length - 1; i >= 0; i--) {
    let addend = factor * codePoint(body[i]);
    factor = factor === 2 ? 1 : 2;
    addend = Math.floor(addend / N) + (addend % N);
    sum += addend;
  }
  const remainder = sum % N;
  return ALPHABET[(N - remainder) % N];
}

function yymm(date: Date, timeZone = "Africa/Dar_es_Salaam"): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, year: "2-digit", month: "2-digit" }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  return `${y}${m}`;
}

function randomChars(count: number): string {
  const bytes = new Uint8Array(count);
  crypto.getRandomValues(bytes);
  // 256 is a multiple of 32, so masking the low 5 bits is unbiased.
  return Array.from(bytes, (b) => ALPHABET[b & 31]).join("");
}

/** Legacy format generator. Kept for fixtures and old-label tests; shipments get global references now. */
export function generateWaybill(kind: WaybillKind, now = new Date()): string {
  const type = kind === "parcel" ? "P" : "C";
  const period = yymm(now);
  const random = randomChars(6);
  const check = checkChar(`TM${type}${period}${random}`);
  return `TM${type}-${period}-${random}${check}`;
}

/**
 * Normalise what a person typed or a scanner read: uppercase, map the Crockford
 * look-alikes (O→0, I/L→1), drop spaces, and strip a piece suffix.
 */
export function normaliseWaybill(input: string): { waybill: string; piece?: { seq: number; of: number } } {
  let s = input.trim().toUpperCase().replace(/\s+/g, "");
  let piece: { seq: number; of: number } | undefined;
  const pieceMatch = s.match(/-(\d{2})\/(\d{2})$/);
  if (pieceMatch) {
    piece = { seq: Number(pieceMatch[1]), of: Number(pieceMatch[2]) };
    s = s.slice(0, -pieceMatch[0].length);
  }
  const ref = normaliseReference(s);
  if (isReference(ref)) return { waybill: ref, piece };
  // Only the variable parts get look-alike mapping; the TM prefix is fixed.
  const m = s.match(/^TM([PC])-?(\w{4})-?(\w{7})$/);
  if (m) {
    const fix = (x: string) => x.replace(/O/g, "0").replace(/[IL]/g, "1");
    s = `TM${m[1]}-${fix(m[2])}-${fix(m[3])}`;
  }
  return { waybill: s, piece };
}

export function isValidWaybill(waybill: string): boolean {
  // Parcels (AAA001) and cargo (CG-AAA001); a case number (CS-…) is never a waybill.
  if (isReference(waybill)) return !waybill.startsWith("CS-");
  const m = waybill.match(PATTERN);
  if (!m) return false;
  const [, type, period, random, check] = m;
  return checkChar(`TM${type}${period}${random}`) === check;
}

/** A waybill's kind when its number says so (legacy TMP-/TMC-, cargo CG-); otherwise the shipment record does. */
export function waybillKind(waybill: string): WaybillKind | null {
  if (waybill.startsWith("TMP-")) return "parcel";
  if (waybill.startsWith("TMC-") || waybill.startsWith("CG-")) return "cargo";
  return null;
}

/** Label suffix for one piece of a multi-piece shipment (FR-WB-05). */
export function pieceLabel(waybill: string, seq: number, of: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${waybill}-${pad(seq)}/${pad(of)}`;
}
