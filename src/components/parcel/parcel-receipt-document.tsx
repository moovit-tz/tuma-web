"use client"

import * as React from "react"
import { format } from "date-fns"
import { useTr } from "@/lib/i18n/portal"

/*
 * The printable parcel receipt, shared by every place that shows one.
 *
 * Colours are plain hex on purpose: html2canvas 1.4 (used for the PDF)
 * can't parse Tailwind v4's oklch palette, so slate-*, emerald-* etc.
 * would break the download. The receipt is always light, like paper.
 */

const INK = "#242a37"
const MUTED = "#6b7280"
const FAINT = "#9ca3af"
const LINE = "#e5e7eb"
const PAPER = "#ffffff"
const TINT = "#f8f9fb"
const BRAND = "#ffd428"

const money = (n?: number | string | null) =>
    `TZS ${new Intl.NumberFormat("en-TZ").format(Number(n) || 0)}`

const when = (d?: string | null, pattern = "d MMM yyyy, HH:mm") => {
    if (!d) return "—"
    const date = new Date(d)
    return Number.isNaN(date.getTime()) ? "—" : format(date, pattern)
}

function Label({ children }: { children: React.ReactNode }) {
    return (
        <p style={{ color: FAINT }} className="text-[11px] font-semibold uppercase tracking-[0.06em]">
            {children}
        </p>
    )
}

interface ParcelReceiptDocumentProps {
    parcel: any
}

export const ParcelReceiptDocument = React.forwardRef<HTMLDivElement, ParcelReceiptDocumentProps>(
    function ParcelReceiptDocument({ parcel }, ref) {
    const tr = useTr()
        const company = parcel.sender?.company?.name || parcel.company?.name || "MySafari Parcel"
        const agent = parcel.sender?.fullName || parcel.sender?.username || null
        const type = parcel.parcelTypeName || parcel.parcelType?.name || "General"
        const price = parcel.price ?? parcel.amount ?? 0
        const qrData = encodeURIComponent(String(parcel.uuid || parcel.id || parcel.parcelNumber || ""))
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${qrData}&bgcolor=ffffff&color=242a37&margin=0`

        const items = [
            { label: tr("Contents"), value: parcel.name || "—" },
            { label: tr("Type"), value: type },
            { label: tr("Weight"), value: parcel.weight ? `${parcel.weight} kg` : "—" },
            { label: tr("Quantity"), value: parcel.units ? String(parcel.units) : "1" },
            { label: tr("Declared value"), value: parcel.value ? money(parcel.value) : "—" },
        ]

        return (
            <div
                ref={ref}
                data-receipt-container
                style={{ backgroundColor: PAPER, color: INK, borderColor: LINE }}
                className="w-full max-w-[520px] overflow-hidden rounded-[6px] border font-sans"
            >
                {/* Brand band */}
                <div style={{ backgroundColor: INK }} className="flex items-start justify-between gap-6 px-7 py-6">
                    <div className="min-w-0">
                        <p style={{ color: BRAND }} className="text-[11px] font-semibold uppercase tracking-[0.08em]">{tr("Parcel receipt")}</p>
                        <p style={{ color: PAPER }} className="mt-1.5 truncate text-xl font-bold leading-tight">
                            {company}
                        </p>
                    </div>
                    <div className="shrink-0 text-right">
                        <p style={{ color: "#ffffff99" }} className="text-[11px] font-semibold uppercase tracking-[0.06em]">{tr("Parcel no.")}</p>
                        <p style={{ color: PAPER }} className="mt-1.5 font-mono text-base font-bold">
                            {parcel.parcelNumber}
                        </p>
                    </div>
                </div>
                <div style={{ backgroundColor: BRAND }} className="h-1" />

                <div className="space-y-6 px-7 py-6">
                    {/* Route */}
                    <div style={{ backgroundColor: TINT, borderColor: LINE }} className="flex items-center gap-4 rounded-[6px] border px-5 py-4">
                        <div className="min-w-0 flex-1">
                            <Label>{tr("From")}</Label>
                            <p className="mt-1 truncate text-lg font-bold leading-tight">{parcel.origin?.name || "—"}</p>
                            <p style={{ color: MUTED }} className="truncate text-xs">{parcel.originOffice?.name || "—"}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1" aria-hidden>
                            <span style={{ backgroundColor: LINE }} className="h-0.5 w-6" />
                            <span style={{ backgroundColor: BRAND }} className="size-2 rounded-full" />
                            <span style={{ backgroundColor: LINE }} className="h-0.5 w-6" />
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                            <Label>{tr("To")}</Label>
                            <p className="mt-1 truncate text-lg font-bold leading-tight">{parcel.destination?.name || "—"}</p>
                            <p style={{ color: MUTED }} className="truncate text-xs">{parcel.destinationOffice?.name || "—"}</p>
                        </div>
                    </div>

                    {/* Parties */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="min-w-0">
                            <Label>{tr("Sender")}</Label>
                            <p className="mt-1 truncate text-sm font-semibold">{parcel.senderName || "—"}</p>
                            <p style={{ color: MUTED }} className="font-mono text-xs">{parcel.senderPhoneNumber || "—"}</p>
                        </div>
                        <div className="min-w-0 text-right">
                            <Label>{tr("Recipient")}</Label>
                            <p className="mt-1 truncate text-sm font-semibold">{parcel.recipientName || "—"}</p>
                            <p style={{ color: MUTED }} className="font-mono text-xs">{parcel.recipientPhoneNumber || "—"}</p>
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <Label>{tr("Parcel details")}</Label>
                        <dl style={{ borderColor: LINE }} className="mt-2 border-t">
                            {items.map((row) => (
                                <div key={row.label} style={{ borderColor: LINE }} className="flex items-center justify-between gap-4 border-b py-2.5">
                                    <dt style={{ color: MUTED }} className="text-sm">{row.label}</dt>
                                    <dd className="truncate text-right text-sm font-semibold">{row.value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>

                    {/* Total */}
                    <div style={{ backgroundColor: INK }} className="flex items-center justify-between gap-4 rounded-[6px] px-5 py-4">
                        <p style={{ color: "#ffffffb3" }} className="text-sm font-semibold">{tr("Amount charged")}</p>
                        <p style={{ color: BRAND }} className="text-2xl font-bold tabular-nums">{money(price)}</p>
                    </div>
                </div>

                {/* Tear line + verification */}
                <div style={{ borderColor: LINE }} className="mx-7 border-t border-dashed" />
                <div className="flex items-center gap-5 px-7 py-6">
                    <div style={{ borderColor: LINE }} className="size-[84px] shrink-0 rounded-[6px] border p-1.5">
                        <img src={qrUrl} alt={tr("Parcel QR code")} crossOrigin="anonymous" className="size-full" />
                    </div>
                    <div className="min-w-0 space-y-1">
                        <p className="text-sm font-semibold">{tr("Keep this receipt to collect the parcel")}</p>
                        <p style={{ color: MUTED }} className="text-xs leading-relaxed">{tr("Booked")}{" "}{when(parcel.createdAt)}
                            {agent ? tr(" by {agent}", { agent }) : ""}
                            {parcel.originOffice?.name ? tr(" at {name}", { name: parcel.originOffice.name }) : ""}.
                        </p>
                        <p style={{ color: FAINT }} className="text-[11px]">{tr("Printed")}{" "}{when(new Date().toISOString())}{" "}{tr("· Ref")}{" "}{parcel.id ?? "—"}
                        </p>
                    </div>
                </div>
            </div>
        )
    },
)

async function receiptToImage(el: HTMLElement) {
    const { default: html2canvas } = await import("html2canvas")
    const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        backgroundColor: PAPER,
        logging: false,
    })
    return canvas.toDataURL("image/png")
}

/** Save the rendered receipt as an A4 PDF, centred with a margin. */
export async function downloadReceiptPdf(el: HTMLElement, parcelNumber: string) {
    const img = await receiptToImage(el)
    const { jsPDF } = await import("jspdf")
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const props = pdf.getImageProperties(img)
    const pageW = pdf.internal.pageSize.getWidth()
    const width = Math.min(pageW - 30, 140)
    const height = (props.height * width) / props.width
    pdf.addImage(img, "PNG", (pageW - width) / 2, 15, width, height, undefined, "FAST")
    pdf.save(`Receipt_${parcelNumber}.pdf`)
}

/** Print just the receipt (not the whole page) via a hidden iframe. */
export async function printReceipt(el: HTMLElement) {
    const img = await receiptToImage(el)
    const frame = document.createElement("iframe")
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0"
    document.body.appendChild(frame)
    const doc = frame.contentDocument!
    doc.open()
    doc.write(
        `<!doctype html><title>Receipt</title><style>@page{margin:15mm}body{margin:0;display:flex;justify-content:center}img{width:140mm}</style><img src="${img}">`,
    )
    doc.close()
    const image = doc.querySelector("img")!
    await new Promise((resolve) => (image.complete ? resolve(null) : (image.onload = () => resolve(null))))
    frame.contentWindow!.focus()
    frame.contentWindow!.print()
    setTimeout(() => frame.remove(), 1000)
}
