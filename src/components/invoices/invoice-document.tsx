"use client"

import React from "react"
import { format } from "date-fns"
import type { Invoice } from "@/lib/services/invoices"
import { useTr } from "@/lib/i18n/portal"

// Plain hex colours: html2canvas can't read oklch
const INK = "#242a37"
const MUTED = "#6b7280"
const LINE = "#e5e7eb"
const PAPER = "#ffffff"
const TINT = "#f8f9fb"
const BRAND = "#ffd428"
const PAID = "#047857"
const DUE = "#b45309"

const money = (n?: number | null) => `TZS ${new Intl.NumberFormat("en-TZ").format(Math.round(Number(n) || 0))}`
const day = (d?: string | null) => (d ? format(new Date(d), "d MMM yyyy") : "—")
// periodEnd is the first moment of the next month
// Calendar-month invoices read "October 2026"; all-time ones show their range
export const invoiceMonth = (inv: Pick<Invoice, "periodStart" | "periodEnd">) => {
    const start = new Date(inv.periodStart)
    const end = new Date(inv.periodEnd)
    const days = (end.getTime() - start.getTime()) / 86_400_000
    const startsMonth = new Date(start.getTime() + 3 * 3600_000).getUTCDate() === 1 && new Date(start.getTime() + 3 * 3600_000).getUTCHours() === 0
    if (startsMonth && days >= 27 && days <= 32) return format(new Date(start.getTime() + 12 * 3600_000), "MMMM yyyy")
    return `${format(start, "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`
}

export const InvoiceDocument = React.forwardRef<HTMLDivElement, { invoice: Invoice }>(function InvoiceDocument({ invoice }, ref) {
    const tr = useTr()
    const paid = invoice.status === "PAID"
    const c = invoice.company
    return (
        <div ref={ref} style={{ background: PAPER, color: INK, width: 640, padding: 40, fontFamily: "Inter, system-ui, sans-serif", fontSize: 12, lineHeight: 1.5 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <img src="/logo.png" alt={tr("MySafari")} style={{ height: 34 }} crossOrigin="anonymous" />
                    <p style={{ margin: "10px 0 0", color: MUTED }}>{tr("MySafari Parcel · 5 Hubert Kariuki, Dar es Salaam")}</p>
                    <p style={{ margin: 0, color: MUTED }}>support@mysafari.co.tz · +255 736 969 594</p>
                </div>
                <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: 0.5 }}>{paid ? "INVOICE" : tr("PROFORMA INVOICE")}</p>
                    <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{invoice.number}</p>
                    <span style={{ display: "inline-block", marginTop: 8, padding: "3px 10px", borderRadius: 999, fontWeight: 700, fontSize: 11, color: PAPER, background: paid ? PAID : DUE }}>
                        {paid ? "PAID" : "UNPAID"}
                    </span>
                </div>
            </div>

            <div style={{ height: 4, background: BRAND, borderRadius: 4, margin: "24px 0" }} />

            {/* Parties and dates */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
                <div>
                    <p style={{ margin: 0, color: MUTED, fontWeight: 600, fontSize: 11 }}>{tr("BILL TO")}</p>
                    <p style={{ margin: "4px 0 0", fontWeight: 700, fontSize: 14 }}>{c?.name}</p>
                    {c?.tin && <p style={{ margin: 0 }}>{tr("TIN: {tin}", { tin: c.tin })}</p>}
                    {c?.address && <p style={{ margin: 0 }}>{c.address}</p>}
                    {(c?.phoneNumber || c?.email) && <p style={{ margin: 0 }}>{[c?.phoneNumber, c?.email].filter(Boolean).join(" · ")}</p>}
                </div>
                <table style={{ borderCollapse: "collapse", alignSelf: "flex-start" }}>
                    <tbody>
                        {[
                            ["Billing period", invoiceMonth(invoice)],
                            ["Issued", day(invoice.createdAt)],
                            [paid ? "Paid" : "Status", paid ? day(invoice.paidAt) : "Awaiting payment"],
                            ...(paid && invoice.paymentReference ? [["Reference", invoice.paymentReference]] : []),
                        ].map(([k, v]) => (
                            <tr key={k}>
                                <td style={{ color: MUTED, paddingRight: 16 }}>{k}</td>
                                <td style={{ fontWeight: 600, textAlign: "right" }}>{v}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Line item */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 28 }}>
                <thead>
                    <tr style={{ background: INK, color: PAPER }}>
                        {["Description", "Parcels", "Rate", "Amount"].map((h, i) => (
                            <th key={h} style={{ padding: "10px 12px", textAlign: i === 0 ? "left" : "right", fontWeight: 600, fontSize: 11 }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr style={{ borderBottom: `1px solid ${LINE}` }}>
                        <td style={{ padding: "12px" }}>
                            <p style={{ margin: 0, fontWeight: 600 }}>{tr("Parcel platform fee, {invoiceMonth}", { invoiceMonth: invoiceMonth(invoice) })}</p>
                            <p style={{ margin: 0, color: MUTED, fontSize: 11 }}>{tr("Parcels booked on MySafari (no commission set for the company's agents)")}</p>
                        </td>
                        <td style={{ padding: "12px", textAlign: "right" }}>{invoice.parcelCount.toLocaleString()}</td>
                        <td style={{ padding: "12px", textAlign: "right" }}>{money(invoice.ratePerParcel)}</td>
                        <td style={{ padding: "12px", textAlign: "right", fontWeight: 600 }}>{money(invoice.amount)}</td>
                    </tr>
                </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                <div style={{ background: TINT, borderRadius: 8, padding: "12px 16px", minWidth: 240 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800 }}>
                        <span>{paid ? tr("Total paid") : tr("Total due")}</span>
                        <span>{money(invoice.amount)}</span>
                    </div>
                </div>
            </div>

            <p style={{ marginTop: 32, color: MUTED, fontSize: 11 }}>
                {paid
                    ? tr("Thank you. This invoice has been paid in full.")
                    : tr("This is a proforma invoice. It becomes a final invoice once payment is received. Quote the invoice number when you pay.")}
            </p>
        </div>
    )
})

async function toImage(el: HTMLElement) {
    const { default: html2canvas } = await import("html2canvas")
    const canvas = await html2canvas(el, { scale: 2.5, useCORS: true, backgroundColor: PAPER, logging: false })
    return canvas.toDataURL("image/png")
}

export async function downloadInvoicePdf(el: HTMLElement, number: string) {
    const img = await toImage(el)
    const { jsPDF } = await import("jspdf")
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const props = pdf.getImageProperties(img)
    const width = pdf.internal.pageSize.getWidth() - 24
    pdf.addImage(img, "PNG", 12, 12, width, (props.height * width) / props.width, undefined, "FAST")
    pdf.save(`${number}.pdf`)
}

export async function printInvoice(el: HTMLElement) {
    const img = await toImage(el)
    const frame = document.createElement("iframe")
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0"
    document.body.appendChild(frame)
    const doc = frame.contentDocument!
    doc.open()
    doc.write(`<!doctype html><title>Invoice</title><style>@page{margin:12mm}body{margin:0}img{width:100%}</style><img src="${img}">`)
    doc.close()
    const image = doc.querySelector("img")!
    await new Promise((resolve) => (image.complete ? resolve(null) : (image.onload = () => resolve(null))))
    frame.contentWindow!.focus()
    frame.contentWindow!.print()
    setTimeout(() => frame.remove(), 1000)
}
