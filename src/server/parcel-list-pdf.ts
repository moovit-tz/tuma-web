import "server-only";
import fontkit from "@pdf-lib/fontkit";
import { LineCapStyle, PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { fontFiles } from "./receipt-pdf";

/**
 * A desk tab's parcels as an A4 count sheet, the same one the app shares: who made it and when, one row per parcel
 * with a box to tick, the totals, and lines to sign the count off with the team. Text colours meet WCAG AA.
 */

export type ParcelListRow = { waybill: string; receiver: string; place: string; status: string; pieces: number; value: string; updated: string };
export type ParcelListDoc = {
  title: string;
  madeBy: string;
  kicker: string;
  head: { waybill: string; receiver: string; place: string; status: string; pieces: string; value: string; updated: string; seen: string };
  rows: ParcelListRow[];
  totals: string;
  value: string | null;
  countedBy: string;
  signature: string;
};

const hex = (h: number) => rgb(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255);
const INK = hex(0x16171b);
const MUTED = hex(0x5c5e66);
const RULE = hex(0xd8d8d1);
const BAND = hex(0xf3f3f0);
const BRAND_RED = hex(0xff4545);
const TAN = hex(0xa59b87);

const W = 595.28;
const H = 841.89;
const L = 32;
const R = W - 32;
const BOTTOM = 48;

/** Cut [s] to fit [max] points, with an ellipsis. */
function fit(s: string, f: PDFFont, size: number, max: number) {
  if (f.widthOfTextAtSize(s, size) <= max) return s;
  let t = s;
  while (t.length > 1 && f.widthOfTextAtSize(`${t}…`, size) > max) t = t.slice(0, -1);
  return `${t}…`;
}

export async function parcelListPdf(d: ParcelListDoc): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(d.title);
  pdf.setAuthor("Tuma by Hudumika");
  const files = await fontFiles();
  const [regular, semi, bold, mono] = await Promise.all([files.regular, files.semi, files.bold, files.mono].map((b) => pdf.embedFont(b, { subset: true })));

  // Columns: x from the left margin, width, right-aligned.
  const cols: { key: keyof ParcelListDoc["head"] | "n"; w: number; right?: boolean }[] = [
    { key: "n", w: 18 },
    { key: "waybill", w: 74 },
    { key: "receiver", w: 100 },
    { key: "place", w: 84 },
    { key: "status", w: 74 },
    { key: "pieces", w: 24, right: true },
    { key: "value", w: 48, right: true },
    { key: "updated", w: 76 },
    { key: "seen", w: 0 }, // the rest
  ];
  const used = cols.reduce((a, c) => a + c.w, 0);
  cols[cols.length - 1].w = R - L - used;

  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;

  const mark = (p: PDFPage, x: number, top: number, w: number) => {
    const k = w / 18;
    const line = (x1: number, y1: number, x2: number, y2: number, color: ReturnType<typeof rgb>) =>
      p.drawLine({ start: { x: x + x1 * k, y: top - w * 0.94 + y1 * k }, end: { x: x + x2 * k, y: top - w * 0.94 + y2 * k }, thickness: 3 * k, color, lineCap: LineCapStyle.Round });
    line(2.5, 3.5, 11.5, 13.5, BRAND_RED);
    line(10.5, 3.5, 15.5, 8.5, TAN);
  };

  const headRow = () => {
    page.drawRectangle({ x: L, y: y - 18, width: R - L, height: 18, color: BAND });
    let x = L;
    for (const c of cols) {
      const label = c.key === "n" ? "#" : d.head[c.key];
      const tw = semi.widthOfTextAtSize(label, 7.5);
      page.drawText(label, { x: c.right ? x + c.w - 4 - tw : x + 4, y: y - 12, size: 7.5, font: semi, color: MUTED });
      x += c.w;
    }
    y -= 18;
  };

  const newPage = () => {
    page = pdf.addPage([W, H]);
    pages.push(page);
    y = H - 32;
    mark(page, L, y, 16);
    page.drawText("Tuma", { x: L + 22, y: y - 12, size: 13, font: bold, color: INK });
    page.drawText("by Hudumika", { x: L + 22 + bold.widthOfTextAtSize("Tuma", 13) + 5, y: y - 12, size: 9, font: regular, color: MUTED });
    const k = d.kicker.toUpperCase();
    page.drawText(k, { x: R - semi.widthOfTextAtSize(k, 8.5), y: y - 11, size: 8.5, font: semi, color: MUTED });
    y -= 30;
    if (pages.length === 1) {
      page.drawText(fit(d.title, bold, 18, R - L), { x: L, y: y - 18, size: 18, font: bold, color: INK });
      page.drawText(d.madeBy, { x: L, y: y - 33, size: 9, font: regular, color: MUTED });
      y -= 48;
    }
    headRow();
  };

  newPage();
  const ROW = 22;
  d.rows.forEach((r, i) => {
    if (y - ROW < BOTTOM) newPage();
    const cells: Record<string, { s: string; f: PDFFont; size: number; color: ReturnType<typeof rgb> }> = {
      n: { s: String(i + 1), f: regular, size: 8.5, color: MUTED },
      waybill: { s: r.waybill, f: mono, size: 8, color: INK },
      receiver: { s: r.receiver, f: regular, size: 8.5, color: INK },
      place: { s: r.place, f: regular, size: 8.5, color: MUTED },
      status: { s: r.status, f: regular, size: 8.5, color: INK },
      pieces: { s: String(r.pieces), f: regular, size: 8.5, color: INK },
      value: { s: r.value, f: regular, size: 8.5, color: INK },
      updated: { s: r.updated, f: regular, size: 7.5, color: MUTED },
    };
    let x = L;
    const base = y - ROW / 2 - 3;
    for (const c of cols) {
      if (c.key === "seen") {
        page.drawRectangle({ x: x + c.w / 2 - 5, y: y - ROW / 2 - 5, width: 10, height: 10, borderColor: INK, borderWidth: 0.7 });
      } else {
        const v = cells[c.key];
        const s = fit(v.s, v.f, v.size, c.w - 8);
        const tw = v.f.widthOfTextAtSize(s, v.size);
        page.drawText(s, { x: c.right ? x + c.w - 4 - tw : x + 4, y: base, size: v.size, font: v.f, color: v.color });
      }
      x += c.w;
    }
    y -= ROW;
    page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 0.5, color: RULE });
  });

  // Totals, then the sign-off lines (on a new page when they don't fit).
  if (y - 100 < BOTTOM) newPage();
  y -= 20;
  const parts: [string, PDFFont][] = [[d.totals, bold], ...(d.value ? ([["    ", regular], [d.value, bold]] as [string, PDFFont][]) : [])];
  const total = parts.reduce((a, [s, f]) => a + f.widthOfTextAtSize(s, 9.5), 0);
  let tx = R - total;
  for (const [s, f] of parts) {
    page.drawText(s, { x: tx, y, size: 9.5, font: f, color: INK });
    tx += f.widthOfTextAtSize(s, 9.5);
  }
  y -= 56;
  const half = (R - L - 40) / 2;
  for (const [i, label] of [d.countedBy, d.signature].entries()) {
    const x = L + i * (half + 40);
    page.drawLine({ start: { x, y }, end: { x: x + half, y }, thickness: 0.7, color: INK });
    page.drawText(label, { x, y: y - 12, size: 8.5, font: regular, color: MUTED });
  }

  pages.forEach((p, i) => {
    p.drawText("tuma.hudumika.tz", { x: L, y: 24, size: 7.5, font: regular, color: MUTED });
    const n = `${i + 1} / ${pages.length}`;
    p.drawText(n, { x: R - regular.widthOfTextAtSize(n, 7.5), y: 24, size: 7.5, font: regular, color: MUTED });
  });
  return pdf.save();
}
