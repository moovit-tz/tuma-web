/** One CSV cell: quoted when it holds a comma, quote or line break; a leading = + - @ is defused for spreadsheets. */
function cell(v: unknown) {
  if (v === null || v === undefined) return "";
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s) && typeof v === "string") s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Rows to CSV text (with a BOM so Excel reads UTF-8). */
export function toCsv(header: string[], rows: unknown[][]) {
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export function csvResponse(name: string, body: string) {
  return new Response(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" },
  });
}

/** The last line of an exported file: who took it and when, so a copy that travels can be traced back. */
export function watermark(name: string, id: string, at = new Date()) {
  return `${cell(`Exported by ${name} (${id}) on ${at.toISOString()} from Tuma. Confidential.`)}\r\n`;
}
