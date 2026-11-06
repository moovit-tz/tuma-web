import "server-only";
import bwipjs from "bwip-js/node";
import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { pieceLabel } from "@/domain/waybill-number";
import type { ShipmentDetail } from "./services/shipments";
import { amountToCollect } from "@/domain/payments";

/**
 * FR-WB-03: printable waybill as an A4 PDF and as a 100 x 150 mm label, each with a Code 128 barcode
 * and a QR code. One label per piece (FR-WB-05). The QR opens the public tracking page.
 */

const MM = 72 / 25.4;
const INK = rgb(0.086, 0.09, 0.106);
const MUTED = rgb(0.36, 0.37, 0.4);
const RED = rgb(1, 0.27, 0.27);
const TAN = rgb(0.647, 0.608, 0.529);

/** Standard PDF fonts only cover WinAnsi; drop anything else. */
const safe = (s: string | null | undefined) => (s ?? "").replace(/[^\x20-\x7E -ÿ–—•]/g, "").trim();

async function code128(text: string) {
  return bwipjs.toBuffer({ bcid: "code128", text, scale: 3, height: 14, includetext: false });
}

async function qr(text: string) {
  return QRCode.toBuffer(text, { margin: 0, width: 360, errorCorrectionLevel: "M" });
}

function drawMark(page: PDFPage, x: number, y: number, size: number) {
  // Logo strokes from the SRS mark (1080 x 1011 viewBox), drawn on a black square.
  const s = size / 1080;
  page.drawRectangle({ x, y, width: size, height: 1011 * s, color: rgb(0, 0, 0) });
  const line = (x1: number, y1: number, x2: number, y2: number, color: ReturnType<typeof rgb>) =>
    page.drawLine({ start: { x: x + x1 * s, y: y + (1011 - y1) * s }, end: { x: x + x2 * s, y: y + (1011 - y2) * s }, thickness: 162 * s, color, lineCap: 1 });
  line(152, 787, 680, 215, RED);
  line(620, 787, 928, 455, TAN);
}

function text(page: PDFPage, value: string, x: number, y: number, size: number, font: PDFFont, color = INK, maxWidth?: number) {
  let v = safe(value);
  if (maxWidth) {
    while (v.length > 1 && font.widthOfTextAtSize(v, size) > maxWidth) v = v.slice(0, -2) + "…";
  }
  page.drawText(v, { x, y, size, font, color });
}

function wrap(value: string, font: PDFFont, size: number, maxWidth: number, maxLines = 3): string[] {
  const words = safe(value).split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}

const addr = (a: ShipmentDetail["consignee"]["address"]) => [a.street, a.ward, a.district, a.region].filter(Boolean).join(", ");

export async function labelPdf(s: ShipmentDetail, trackingBase: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Tuma label ${s.waybill}`);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.CourierBold);
  const qrImg = await doc.embedPng(await qr(`${trackingBase}/${s.waybill}`));

  const W = 100 * MM;
  const H = 150 * MM;
  const pad = 4 * MM;
  const inner = W - 2 * pad;

  for (const p of s.pieces) {
    const page = doc.addPage([W, H]);
    const label = pieceLabel(s.waybill, p.seq, s.piecesCount);
    const bar = await doc.embedPng(await code128(label));

    // Header band
    page.drawRectangle({ x: 0, y: H - 14 * MM, width: W, height: 14 * MM, color: rgb(0, 0, 0) });
    drawMark(page, pad, H - 11.5 * MM, 9 * MM);
    page.drawText("Tuma", { x: pad + 11 * MM, y: H - 8.6 * MM, size: 15, font: bold, color: rgb(0.95, 0.94, 0.92) });
    const svc = safe((s.serviceLevel ?? "").replace("_", " ").toUpperCase());
    page.drawText(svc, { x: W - pad - bold.widthOfTextAtSize(svc, 12), y: H - 8.6 * MM, size: 12, font: bold, color: rgb(1, 1, 1) });

    let y = H - 14 * MM - 7 * MM;
    // Barcode
    const barW = inner;
    const barH = 17 * MM;
    page.drawImage(bar, { x: pad, y: y - barH, width: barW, height: barH });
    y -= barH + 5 * MM;
    text(page, label, pad, y, 13, mono);
    const pc = `PIECE ${p.seq}/${s.piecesCount}`;
    page.drawText(pc, { x: W - pad - bold.widthOfTextAtSize(pc, 10), y, size: 10, font: bold, color: INK });
    y -= 4 * MM;
    page.drawLine({ start: { x: pad, y }, end: { x: W - pad, y }, thickness: 0.8, color: INK });

    // To
    y -= 5 * MM;
    text(page, "TO", pad, y, 7.5, bold, MUTED);
    y -= 5.5 * MM;
    text(page, s.consignee.name, pad, y, 13, bold, INK, inner);
    y -= 5 * MM;
    text(page, s.consignee.phone, pad, y, 10.5, regular);
    y -= 4.6 * MM;
    for (const line of wrap(addr(s.consignee.address), regular, 9.5, inner, 2)) {
      text(page, line, pad, y, 9.5, regular);
      y -= 4 * MM;
    }
    if (s.consignee.address.landmark) {
      for (const line of wrap(`Landmark: ${s.consignee.address.landmark}`, regular, 9, inner, 2)) {
        text(page, line, pad, y, 9, regular, MUTED);
        y -= 3.8 * MM;
      }
    }
    if (s.deliveryLocation) {
      text(page, `COLLECT AT: ${s.deliveryLocation.name}`, pad, y, 9.5, bold, INK, inner);
      y -= 4.2 * MM;
    }
    // Destination region, big
    y -= 3 * MM;
    text(page, s.consignee.address.region.toUpperCase(), pad, y, 18, bold, INK, inner);
    y -= 4 * MM;
    page.drawLine({ start: { x: pad, y }, end: { x: W - pad, y }, thickness: 0.8, color: INK });

    // From + QR
    const qrSize = 24 * MM;
    const qrY = pad + 12 * MM;
    page.drawImage(qrImg, { x: W - pad - qrSize, y: qrY, width: qrSize, height: qrSize });
    let fy = y - 5 * MM;
    const leftW = inner - qrSize - 3 * MM;
    text(page, "FROM", pad, fy, 7.5, bold, MUTED);
    fy -= 4.4 * MM;
    text(page, s.shipper.name, pad, fy, 9.5, bold, INK, leftW);
    fy -= 4 * MM;
    text(page, s.shipper.phone, pad, fy, 9, regular);
    fy -= 3.8 * MM;
    text(page, `${s.shipper.address.district}, ${s.shipper.address.region}`, pad, fy, 9, regular, INK, leftW);
    fy -= 6 * MM;
    const due = amountToCollect(s);
    if (due.total > 0 && p.seq === 1) {
      // Collect once per shipment, on piece 1. Shows what makes up the amount.
      page.drawRectangle({ x: pad, y: fy - 2 * MM, width: leftW, height: 8 * MM, color: rgb(0, 0, 0) });
      page.drawText(safe(`COLLECT  TZS ${due.total.toLocaleString("en-US")}`), { x: pad + 2 * MM, y: fy, size: 11, font: bold, color: rgb(1, 1, 1) });
      fy -= 4.5 * MM;
      const parts = [due.goods ? `Goods ${due.goods.toLocaleString("en-US")}` : "", due.fee ? `Delivery ${due.fee.toLocaleString("en-US")}` : ""].filter(Boolean).join(" + ");
      text(page, parts, pad, fy - 1 * MM, 7.5, regular, MUTED, leftW);
      fy -= 6 * MM;
    } else if (s.paymentTerms === "prepaid" || s.paymentTerms === "account") {
      text(page, "PAID - NOTHING TO COLLECT", pad, fy, 8.5, bold, MUTED, leftW);
      fy -= 6 * MM;
    }
    text(page, `${(p.weightG / 1000).toFixed(1)} kg  ·  ${p.lengthCm}x${p.widthCm}x${p.heightCm} cm`, pad, Math.max(fy, qrY + 2 * MM), 8.5, regular, MUTED, leftW);

    // Footer
    page.drawLine({ start: { x: pad, y: pad + 9 * MM }, end: { x: W - pad, y: pad + 9 * MM }, thickness: 0.5, color: MUTED });
    text(page, s.merchantRef ? `Ref ${s.merchantRef}` : " ", pad, pad + 4.5 * MM, 8.5, regular, MUTED, inner / 2);
    const fragile = s.specialHandling.includes("fragile") ? "FRAGILE  " : "";
    const right = `${fragile}${new Date(s.createdAt).toISOString().slice(0, 10)}`;
    page.drawText(right, { x: W - pad - bold.widthOfTextAtSize(right, 8.5), y: pad + 4.5 * MM, size: 8.5, font: bold, color: INK });
    text(page, "Track: tuma.moovit.co.tz  ·  scan the QR", pad, pad, 7, regular, MUTED, inner);
  }
  return doc.save();
}

export async function waybillA4Pdf(s: ShipmentDetail, trackingBase: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Tuma waybill ${s.waybill}`);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.CourierBold);
  const W = 210 * MM;
  const H = 297 * MM;
  const m = 16 * MM;
  const page = doc.addPage([W, H]);
  const bar = await doc.embedPng(await code128(s.waybill));
  const qrImg = await doc.embedPng(await qr(`${trackingBase}/${s.waybill}`));

  // Header
  page.drawRectangle({ x: 0, y: H - 30 * MM, width: W, height: 30 * MM, color: rgb(0, 0, 0) });
  drawMark(page, m, H - 24 * MM, 18 * MM);
  page.drawText("Tuma", { x: m + 22 * MM, y: H - 15 * MM, size: 26, font: bold, color: rgb(0.95, 0.94, 0.92) });
  page.drawText("by Moovit  ·  PARCEL WAYBILL", { x: m + 22 * MM, y: H - 21.5 * MM, size: 8.5, font: regular, color: TAN });
  page.drawImage(bar, { x: W - m - 78 * MM, y: H - 22 * MM, width: 78 * MM, height: 12 * MM });
  const wbW = mono.widthOfTextAtSize(s.waybill, 13);
  page.drawText(s.waybill, { x: W - m - wbW, y: H - 27 * MM, size: 13, font: mono, color: rgb(1, 1, 1) });

  let y = H - 42 * MM;
  const col = (W - 2 * m - 8 * MM) / 2;
  const block = (title: string, x: number, lines: [string, PDFFont, number][]) => {
    let yy = y;
    page.drawText(title, { x, y: yy, size: 8, font: bold, color: MUTED });
    yy -= 6 * MM;
    for (const [v, f, size] of lines) {
      for (const l of wrap(v, f, size, col, 2)) {
        page.drawText(l, { x, y: yy, size, font: f, color: INK });
        yy -= size * 0.5 * MM + 1.6 * MM;
      }
    }
    return yy;
  };
  const a = block("SHIPPER", m, [
    [s.shipper.name, bold, 12],
    [s.shipper.phone, regular, 10],
    [addr(s.shipper.address), regular, 10],
    [s.shipper.address.landmark ? `Landmark: ${s.shipper.address.landmark}` : "", regular, 9],
    [s.pickupLocation ? `Handover: ${s.pickupLocation.name}` : "", regular, 9],
  ]);
  const b = block("CONSIGNEE", m + col + 8 * MM, [
    [s.consignee.name, bold, 12],
    [s.consignee.phone, regular, 10],
    [addr(s.consignee.address), regular, 10],
    [s.consignee.address.landmark ? `Landmark: ${s.consignee.address.landmark}` : "", regular, 9],
    [s.deliveryLocation ? `Collect at: ${s.deliveryLocation.name}` : "", regular, 9],
  ]);
  y = Math.min(a, b) - 4 * MM;
  page.drawLine({ start: { x: m, y }, end: { x: W - m, y }, thickness: 0.8, color: INK });
  y -= 8 * MM;

  const facts: [string, string][] = [
    ["Service", (s.serviceLevel ?? "").replace("_", " ")],
    ["Delivery paid by", s.paymentTerms === "pay_on_delivery" ? "Receiver" : s.paymentTerms === "prepaid" ? "Sender (prepaid)" : "Sender (account)"],
    ["Pieces", String(s.piecesCount)],
    ["Chargeable weight", `${(s.chargeableWeightG / 1000).toFixed(1)} kg`],
    ["Collect at delivery", amountToCollect(s).total ? `TZS ${amountToCollect(s).total.toLocaleString("en-US")}` : "-"],
    ["Declared value", s.declaredValue ? `TZS ${s.declaredValue.toLocaleString("en-US")}` : "-"],
    ["Reference", s.merchantRef ?? "-"],
    ["Promised by", s.promisedAt ? new Date(s.promisedAt).toISOString().slice(0, 10) : "-"],
  ];
  const fw = (W - 2 * m) / 4;
  facts.forEach(([k, v], i) => {
    const x = m + (i % 4) * fw;
    const yy = y - Math.floor(i / 4) * 13 * MM;
    page.drawText(k.toUpperCase(), { x, y: yy, size: 7.5, font: bold, color: MUTED });
    text(page, v, x, yy - 5.5 * MM, 11, bold, INK, fw - 3 * MM);
  });
  y -= 30 * MM;

  page.drawText("GOODS", { x: m, y, size: 8, font: bold, color: MUTED });
  y -= 6 * MM;
  text(page, `${s.goodsDescription} (${s.goodsCategory})${s.specialHandling.length ? " - " + s.specialHandling.map((h) => h.replace(/_/g, " ")).join(", ") : ""}`, m, y, 10.5, regular, INK, W - 2 * m);
  y -= 8 * MM;
  for (const p of s.pieces) {
    text(page, `${pieceLabel(s.waybill, p.seq, s.piecesCount)}    ${(p.weightG / 1000).toFixed(2)} kg    ${p.lengthCm} x ${p.widthCm} x ${p.heightCm} cm`, m, y, 9.5, mono);
    y -= 5 * MM;
  }
  y -= 4 * MM;

  if (s.charges) {
    page.drawText("CHARGES", { x: m, y, size: 8, font: bold, color: MUTED });
    y -= 6 * MM;
    const right = (v: string, yy: number, f: PDFFont, size: number) => page.drawText(v, { x: m + 100 * MM - f.widthOfTextAtSize(v, size), y: yy, size, font: f, color: INK });
    for (const l of s.charges.lines) {
      text(page, l.label, m, y, 10, regular);
      right(l.amount.toLocaleString("en-US"), y, regular, 10);
      y -= 5 * MM;
    }
    text(page, "VAT (estimate; fiscal receipt from FinOps)", m, y, 10, regular, MUTED);
    right(s.charges.tax.toLocaleString("en-US"), y, regular, 10);
    y -= 6 * MM;
    text(page, "Total TZS", m, y, 11, bold);
    right(s.charges.total.toLocaleString("en-US"), y, bold, 11);
    y -= 10 * MM;
  }

  page.drawImage(qrImg, { x: W - m - 32 * MM, y: m + 30 * MM, width: 32 * MM, height: 32 * MM });
  page.drawText("Scan to track", { x: W - m - 32 * MM, y: m + 26 * MM, size: 8, font: regular, color: MUTED });

  // Signatures
  const sy = m + 14 * MM;
  for (const [i, label] of ["Handed over by (shipper)", "Received by (Tuma)", "Delivered to (consignee)"].entries()) {
    const x = m + i * 52 * MM;
    page.drawLine({ start: { x, y: sy }, end: { x: x + 46 * MM, y: sy }, thickness: 0.5, color: INK });
    page.drawText(label, { x, y: sy - 4 * MM, size: 7.5, font: regular, color: MUTED });
  }
  page.drawText(`Issued ${new Date(s.createdAt).toISOString().replace("T", " ").slice(0, 16)} UTC  ·  ${s.accountName}  ·  Print ${s.labelPrints + 1}`, { x: m, y: m - 4 * MM, size: 7.5, font: regular, color: MUTED });
  return doc.save();
}
