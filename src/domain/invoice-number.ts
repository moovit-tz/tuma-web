/**
 * Invoice numbers: INV-{business code}-{YYMM}-{count}, e.g. INV-KPL-2611-0001.
 *
 * The business code makes a number unique across all of Tuma (two businesses never share one), and the INV- tag
 * keeps it apart from parcel (AAA001), cargo (CG-AAA001) and case (CS-AAA001) numbers.
 */

/** Code candidates from a business name, best first: initials (Kombo Parcels Ltd → KPL), then letters of the name. */
export function invoiceCodeCandidates(name: string): string[] {
  const words = name
    .toUpperCase()
    .normalize("NFKD")
    .replace(/[^A-Z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const letters = words.join("");
  const out = new Set<string>();
  const add = (c: string) => c.length === 3 && out.add(c);
  add(words.map((w) => w[0]).join("").slice(0, 3));
  if (words[0]) add((words[0].slice(0, 2) + (words[1]?.[0] ?? words[0][2] ?? "X")).slice(0, 3));
  add(letters.slice(0, 3));
  for (let i = 1; i + 1 < letters.length && out.size < 6; i++) add(letters[0] + letters[i] + letters[i + 1]);
  if (out.size === 0) add("TUM");
  return [...out];
}

export function formatInvoiceNumber(code: string, at: Date, n: number): string {
  return `INV-${code}-${yymm(at)}-${String(n).padStart(4, "0")}`;
}

export function invoicePrefix(code: string, at: Date): string {
  return `INV-${code}-${yymm(at)}-`;
}

function yymm(d: Date): string {
  const eat = new Date(d.getTime() + 3 * 3600_000);
  return `${String(eat.getUTCFullYear()).slice(2)}${String(eat.getUTCMonth() + 1).padStart(2, "0")}`;
}
