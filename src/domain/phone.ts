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
