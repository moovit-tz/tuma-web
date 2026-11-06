import { BLOC } from "./bloc";
/** Phone numbers are stored in E.164 (+255…) — FR-WB-07. */

/** Accepts 0712345678, 712345678, 255712345678, +255 712 345 678. Returns null when invalid. */
export function toE164TZ(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let national: string | null = null;
  if (/^\+255\d{9}$/.test(digits)) national = digits.slice(4);
  else if (/^255\d{9}$/.test(digits)) national = digits.slice(3);
  else if (/^0\d{9}$/.test(digits)) national = digits.slice(1);
  else if (/^\d{9}$/.test(digits)) national = digits;
  if (!national || !/^[67]\d{8}$/.test(national)) return null; // mobile ranges 6x/7x
  return `+255${national}`;
}

/**
 * A mobile number from Tanzania (the usual local forms) or another SADC/EAC country written with its code
 * (+254 712 345 678, 00254…). Anything else, including a +255 number that isn't a Tanzanian mobile, is null.
 */
export function toE164(input: string): string | null {
  const tz = toE164TZ(input);
  if (tz) return tz;
  let digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (!digits.startsWith("+")) return null;
  const c = [...BLOC].sort((a, b) => b.dial.length - a.dial.length).find((x) => digits.startsWith(`+${x.dial}`));
  if (!c || c.dial === "255") return null;
  let national = digits.slice(1 + c.dial.length);
  if (national.length === c.digits + 1 && national.startsWith("0")) national = national.slice(1);
  return national.length === c.digits ? `+${c.dial}${national}` : null;
}

/** +255712345678 → +255 7•• ••• 678 (section 10.3: masked in logs, public pages and shared links). */
export function maskPhone(e164: string): string {
  if (e164.length < 8) return "•••";
  return `${e164.slice(0, 4)} ${e164.slice(4, 5)}•• ••• ${e164.slice(-3)}`;
}

export function maskName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0] + "•".repeat(Math.max(2, part.length - 1)))
    .join(" ");
}

export function lastFour(e164: string): string {
  return e164.slice(-4);
}
