import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFName, PDFString, rgb, LineCapStyle, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * The shared receipt (or proforma) as a PDF, the same ticket the app shares: a black "Tuma Receipt" band, a thank-you
 * and the date, the total with its breakdown, a torn edge, the trip (from → to) beside a tracking QR, and the agent
 * who served them with a "Track parcel" link. Every text colour meets WCAG AA on its background.
 */

export type ReceiptStop = { place: string; time?: string; who?: string };
export type ReceiptDoc = {
  paid: boolean;
  kindLabel: string;
  number: string;
  waybill: string;
  greeting: string;
  date: string;
  message: string;
  totalLabel: string;
  total: string;
  lines: [string, string][];
  detailsTitle: string;
  details: string;
  from: ReceiptStop;
  to: ReceiptStop;
  scan: string;
  trackLabel: string;
  trackUrl: string;
  agentName?: string | null;
  agentLine?: string | null;
};

const hex = (h: number) => rgb(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255);
const BG = hex(0xededea);
const INK = hex(0x16171b);
const MUTED = hex(0x5c5e66); // 6.5:1 on white
const RULE = hex(0xd8d8d1);
const RED = hex(0xc42727); // 5.7:1 with white either way
const BRAND_RED = hex(0xff4545);
const TAN = hex(0xa59b87);
const ON_BLACK = hex(0xd9d6cf);
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0, 0, 0);

const FONT_DIR = path.join(process.cwd(), "src/server/fonts");
let fontCache: Promise<Record<"regular" | "medium" | "semi" | "bold" | "mono", Buffer>> | null = null;
export function fontFiles() {
  fontCache ??= Promise.all(
    ["GoogleSansFlex-Regular", "GoogleSansFlex-Medium", "GoogleSansFlex-SemiBold", "GoogleSansFlex-Bold", "GoogleSansCode-Regular"].map((f) => readFile(path.join(FONT_DIR, `${f}.ttf`))),
  ).then(([regular, medium, semi, bold, mono]) => ({ regular, medium, semi, bold, mono }));
  return fontCache;
}

/** A rounded rectangle path (SVG, y down) for drawSvgPath; radii per corner: tl, tr, br, bl. */
function rounded(w: number, h: number, [tl, tr, br, bl]: [number, number, number, number]) {
  return `M ${tl} 0 H ${w - tr} Q ${w} 0 ${w} ${tr} V ${h - br} Q ${w} ${h} ${w - br} ${h} H ${bl} Q 0 ${h} 0 ${h - bl} V ${tl} Q 0 0 ${tl} 0 Z`;
}

function wrap(value: string, font: PDFFont, size: number, maxWidth: number, maxLines = 3): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const w of value.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length > 1 && font.widthOfTextAtSize(`${last}…`, size) > maxWidth) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last}…`;
    return kept;
  }
  return lines;
}

function fit(value: string, font: PDFFont, size: number, maxWidth: number) {
  let v = value;
  while (v.length > 1 && font.widthOfTextAtSize(v, size) > maxWidth) v = v.slice(0, -2) + "…";
  return v;
}

function link(doc: PDFDocument, page: PDFPage, x: number, y: number, w: number, h: number, url: string) {
  const annot = doc.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [x, y, x + w, y + h],
    Border: [0, 0, 0],
    A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
  });
  page.node.set(PDFName.of("Annots"), doc.context.obj([doc.context.register(annot)]));
}

export async function receiptPdf(r: ReceiptDoc): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${r.kindLabel} ${r.number}`);
  doc.setAuthor("Tuma");
  doc.setCreator("Tuma");
  const files = await fontFiles();
  const [regular, medium, semi, bold, mono] = await Promise.all([files.regular, files.medium, files.semi, files.bold, files.mono].map((b) => doc.embedFont(b, { subset: true })));

  // A5 portrait; the card is 340pt wide, centred.
  const W = 419.53;

  const CW = 340;
  const PAD = 26;
  const inner = CW - PAD * 2;

  // Measure the variable parts first so the card can be centred vertically.
  const greet = wrap(r.greeting, bold, 19, inner - 92, 3);
  const msg = wrap(r.message, regular, 9.5, 250, 3);
  const BAND = 62;
  const topH = 24 + greet.length * 22 + 8 + msg.length * 14 + 22 + 24 + r.lines.length * 25 + 8;
  const PERF = 18;
  const bottomH = 12 + 14 + 14 + 14 + 112 + 18 + 36 + 22;
  const CH = BAND + topH + PERF + bottomH;
  // A5, taller when a long breakdown needs it.
  const H = Math.max(595.28, CH + 80);
  const page = doc.addPage([W, H]);
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BG });
  const cx = (W - CW) / 2;
  const top = H - Math.max(24, (H - CH - 22) / 2); // the card's top edge (PDF y up)

  // Card and band.
  page.drawSvgPath(rounded(CW, CH, [16, 16, 16, 16]), { x: cx, y: top, color: WHITE });
  page.drawSvgPath(rounded(CW, BAND, [16, 16, 0, 0]), { x: cx, y: top, color: BLACK });

  // Band: the mark, "Tuma" and the kind.
  const t1 = "Tuma";
  const t2 = r.kindLabel;
  const markW = 20;
  const rowW = markW + 8 + bold.widthOfTextAtSize(t1, 21) + 6 + regular.widthOfTextAtSize(t2, 21);
  let bx = cx + (CW - rowW) / 2;
  const by = top - BAND / 2;
  const k = markW / 18;
  const stroke = (x1: number, y1: number, x2: number, y2: number, color: ReturnType<typeof rgb>) =>
    page.drawLine({ start: { x: bx + x1 * k, y: by - 8.5 * k + y1 * k }, end: { x: bx + x2 * k, y: by - 8.5 * k + y2 * k }, thickness: 3 * k, color, lineCap: LineCapStyle.Round });
  stroke(2.5, 3.5, 11.5, 13.5, BRAND_RED);
  stroke(10.5, 3.5, 15.5, 8.5, TAN);
  bx += markW + 8;
  page.drawText(t1, { x: bx, y: by - 7, size: 21, font: bold, color: WHITE });
  bx += bold.widthOfTextAtSize(t1, 21) + 6;
  page.drawText(t2, { x: bx, y: by - 7, size: 21, font: regular, color: ON_BLACK });

  // Thanks and the date.
  const L = cx + PAD;
  const R = cx + CW - PAD;
  let y = top - BAND - 24;
  page.drawText(r.date, { x: R - medium.widthOfTextAtSize(r.date, 9), y: y - 12, size: 9, font: medium, color: INK });
  for (const line of greet) {
    y -= 22;
    page.drawText(line, { x: L, y: y + 4, size: 19, font: bold, color: INK });
  }
  y -= 8;
  for (const line of msg) {
    y -= 14;
    page.drawText(line, { x: L, y: y + 3, size: 9.5, font: regular, color: INK });
  }

  // Total, the number chip, and the breakdown.
  y -= 22 + 24;
  page.drawText(r.totalLabel, { x: L, y: y + 6, size: 17, font: bold, color: INK });
  const chipX = L + bold.widthOfTextAtSize(r.totalLabel, 17) + 8;
  const chipW = mono.widthOfTextAtSize(r.number, 7) + 12;
  page.drawSvgPath(rounded(chipW, 13, [3, 3, 3, 3]), { x: chipX, y: y + 18, borderColor: INK, borderWidth: 0.8, color: WHITE });
  page.drawText(r.number, { x: chipX + 6, y: y + 9, size: 7, font: mono, color: INK });
  page.drawText(r.total, { x: R - bold.widthOfTextAtSize(r.total, 17), y: y + 6, size: 17, font: bold, color: INK });
  y -= 8;
  r.lines.forEach(([label, value], i) => {
    if (i > 0) page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 0.8, color: RULE });
    y -= 25;
    page.drawText(fit(label, regular, 9.5, inner - 120), { x: L, y: y + 9, size: 9.5, font: regular, color: INK });
    page.drawText(value, { x: R - semi.widthOfTextAtSize(value, 9.5), y: y + 9, size: 9.5, font: semi, color: INK });
  });

  // The torn edge: a notch each side and a dashed rule.
  const perfY = top - BAND - topH - PERF / 2;
  page.drawCircle({ x: cx, y: perfY, size: 9, color: BG });
  page.drawCircle({ x: cx + CW, y: perfY, size: 9, color: BG });
  page.drawLine({ start: { x: cx + 15, y: perfY }, end: { x: cx + CW - 15, y: perfY }, thickness: 0.9, color: RULE, dashArray: [5, 4] });

  // Details: the trip beside the QR.
  y = perfY - PERF / 2 - 12;
  page.drawText(r.detailsTitle, { x: L, y: y - 9, size: 10.5, font: bold, color: INK });
  y -= 14;
  page.drawText(fit(r.details, regular, 9, inner), { x: L, y: y - 10, size: 9, font: regular, color: MUTED });
  y -= 14 + 14;
  const tripTop = y;
  const tripH = 104;
  const QR = 82;
  const qrBox = QR + 12;
  const tripW = inner - qrBox - 14;
  // The line and the two stops.
  page.drawLine({ start: { x: L + 3.5, y: tripTop - 5 }, end: { x: L + 3.5, y: tripTop - tripH + 5 }, thickness: 1.4, color: RED });
  page.drawRectangle({ x: L, y: tripTop - 9, width: 7, height: 7, color: RED });
  page.drawRectangle({ x: L, y: tripTop - tripH + 2, width: 7, height: 7, color: RED });
  const stop = (s: ReceiptStop, yTop: number) => {
    let yy = yTop;
    if (s.time) {
      page.drawText(s.time, { x: L + 16, y: yy - 8, size: 8.5, font: bold, color: INK });
      yy -= 12;
    }
    for (const line of wrap(s.place, medium, 9.5, tripW - 16, 2)) {
      page.drawText(line, { x: L + 16, y: yy - 9, size: 9.5, font: medium, color: INK });
      yy -= 12.5;
    }
    if (s.who) page.drawText(fit(s.who, regular, 8, tripW - 16), { x: L + 16, y: yy - 8, size: 8, font: regular, color: MUTED });
  };
  stop(r.from, tripTop);
  const toLines = (r.to.time ? 12 : 0) + Math.min(2, wrap(r.to.place, medium, 9.5, tripW - 16, 2).length) * 12.5 + (r.to.who ? 10 : 0);
  stop(r.to, tripTop - tripH + toLines);
  // QR in a soft frame.
  const qx = R - qrBox;
  page.drawRectangle({ x: qx, y: tripTop - qrBox, width: qrBox, height: qrBox, borderColor: RULE, borderWidth: 0.8, color: WHITE });
  const qr = await doc.embedPng(await QRCode.toBuffer(r.trackUrl, { margin: 0, width: 360, errorCorrectionLevel: "M", color: { dark: "#16171bff", light: "#ffffffff" } }));
  page.drawImage(qr, { x: qx + 6, y: tripTop - qrBox + 6, width: QR, height: QR });
  page.drawText(r.scan, { x: qx + (qrBox - regular.widthOfTextAtSize(r.scan, 7.5)) / 2, y: tripTop - qrBox - 11, size: 7.5, font: regular, color: MUTED });

  // Who served them, and the "Track parcel" button (a link).
  const footY = tripTop - tripH - 18 - 18; // centre line of the footer row
  const btnLabelW = semi.widthOfTextAtSize(r.trackLabel, 9.5);
  const btnW = btnLabelW + 24 + 16;
  const btnH = 28;
  const btnX = R - btnW;
  page.drawSvgPath(rounded(btnW, btnH, [4, 4, 4, 4]), { x: btnX, y: footY + btnH / 2, color: RED });
  page.drawText(r.trackLabel, { x: btnX + 12, y: footY - 3.3, size: 9.5, font: semi, color: WHITE });
  const ax = btnX + 12 + btnLabelW + 6;
  page.drawLine({ start: { x: ax, y: footY }, end: { x: ax + 9, y: footY }, thickness: 1.4, color: WHITE, lineCap: LineCapStyle.Round });
  page.drawLine({ start: { x: ax + 5.5, y: footY + 3.4 }, end: { x: ax + 9, y: footY }, thickness: 1.4, color: WHITE, lineCap: LineCapStyle.Round });
  page.drawLine({ start: { x: ax + 5.5, y: footY - 3.4 }, end: { x: ax + 9, y: footY }, thickness: 1.4, color: WHITE, lineCap: LineCapStyle.Round });
  link(doc, page, btnX, footY - btnH / 2, btnW, btnH, r.trackUrl);
  if (r.agentName) {
    const initials = r.agentName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
    page.drawCircle({ x: L + 17, y: footY, size: 17, color: INK });
    page.drawText(initials, { x: L + 17 - semi.widthOfTextAtSize(initials, 11) / 2, y: footY - 4, size: 11, font: semi, color: WHITE });
    const textW = btnX - 10 - (L + 43);
    page.drawText(fit(r.agentName, semi, 9.5, textW), { x: L + 43, y: footY + 2, size: 9.5, font: semi, color: INK });
    if (r.agentLine) page.drawText(fit(r.agentLine, regular, 8.5, textW), { x: L + 43, y: footY - 10, size: 8.5, font: regular, color: MUTED });
  }

  // Under the card.
  const foot = `tuma.hudumika.tz  ·  ${r.waybill}`;
  page.drawText(foot, { x: (W - mono.widthOfTextAtSize(foot, 7.5)) / 2, y: top - CH - 18, size: 7.5, font: mono, color: MUTED });

  return doc.save();
}
