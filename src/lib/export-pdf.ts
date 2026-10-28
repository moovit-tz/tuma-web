// Download rows as a branded PDF report: logo and title header on every page,
// optional summary figures, the table, and a footer with the generation time
// and page numbers. Same column format as downloadCsv, so a page can offer both.
export type ExportColumn<T> = [label: string, value: (row: T) => unknown]

export interface PdfOptions {
    title: string
    /** Line under the title, e.g. the period or filters */
    subtitle?: string
    /** Figures shown as tiles above the table */
    summary?: [label: string, value: string][]
}

const NAVY: [number, number, number] = [36, 42, 55]
const YELLOW: [number, number, number] = [255, 212, 40]
const SLATE: [number, number, number] = [100, 116, 139]
const MUTED: [number, number, number] = [148, 163, 184]

// The logo shrunk to 600px wide, so it doesn't bloat every PDF
async function logoDataUrl(): Promise<string | null> {
    try {
        const img = new Image()
        img.src = "/logo.png"
        await img.decode()
        const canvas = document.createElement("canvas")
        canvas.width = 600
        canvas.height = Math.round((600 * img.naturalHeight) / img.naturalWidth)
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL("image/png")
    } catch {
        return null
    }
}

export async function downloadPdf<T>(filename: string, rows: T[], columns: ExportColumn<T>[], { title, subtitle, summary }: PdfOptions) {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")])
    const doc = new jsPDF({ orientation: columns.length > 6 ? "landscape" : "portrait", unit: "mm", format: "a4" })
    const width = doc.internal.pageSize.getWidth()
    const height = doc.internal.pageSize.getHeight()
    const margin = 14
    const generated = new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    const logo = await logoDataUrl()
    // The logo is a 2.92:1 yellow tile
    const drawLogo = (x: number, y: number, h: number) => {
        if (logo) {
            try {
                doc.addImage(logo, "PNG", x, y, h * 2.92, h)
                return
            } catch { /* fall back to text */ }
        }
        doc.setFont("helvetica", "bold")
        doc.setFontSize(h * 0.9)
        doc.setTextColor(...YELLOW)
        doc.text("mysafari", x, y + h * 0.72)
    }
    doc.setProperties({ title, subject: subtitle ?? title, author: "MySafari Parcel", creator: "MySafari Parcel portal" })

    // First page: one navy band, like the portal's table banners: logo and
    // company on top, then the report title and what it covers
    const lines = subtitle ? (doc.splitTextToSize(subtitle, width - margin * 2) as string[]) : []
    // Long titles (e.g. "Commissions · <long company name>") shrink a little, then wrap
    doc.setFont("helvetica", "bold")
    let titleSize = 18
    doc.setFontSize(titleSize)
    while (titleSize > 14 && doc.getTextWidth(title) > width - margin * 2) doc.setFontSize((titleSize -= 1))
    const titleLines = (doc.splitTextToSize(title, width - margin * 2) as string[]).slice(0, 2)
    const titleLineH = titleSize * 0.42
    const extra = (titleLines.length - 1) * titleLineH
    const bandH = 50 + extra + Math.max(0, lines.length - 1) * 4.5
    doc.setFillColor(...NAVY)
    doc.rect(0, 0, width, bandH, "F")
    doc.setFillColor(...YELLOW)
    doc.rect(0, bandH, width, 1.2, "F")
    drawLogo(margin, 7, 12)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9.5)
    doc.setTextColor(255, 255, 255)
    doc.text("MySafari Parcel", width - margin, 11, { align: "right" })
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(170, 178, 192)
    doc.text("Dar es Salaam, Tanzania  ·  parcel.mysafari.co.tz", width - margin, 16, { align: "right" })

    doc.setFont("helvetica", "bold")
    doc.setFontSize(titleSize)
    doc.setTextColor(255, 255, 255)
    doc.text(titleLines, margin, 33, { lineHeightFactor: 1.15 })
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8.5)
    doc.setTextColor(170, 178, 192)
    doc.text(`Generated ${generated}  ·  ${rows.length.toLocaleString()} ${rows.length === 1 ? "record" : "records"}`, margin, 40 + extra)
    if (lines.length) doc.text(lines, margin, 45 + extra)
    let y = bandH + 1.2

    // Summary panel: every figure side by side (two rows when there are more than four)
    if (summary?.length) {
        y += 8
        doc.setFont("helvetica", "bold")
        doc.setFontSize(8)
        doc.setTextColor(...SLATE)
        doc.text("SUMMARY", margin, y, { charSpace: 0.4 })
        y += 3
        const perRow = summary.length <= 4 ? summary.length : Math.ceil(summary.length / 2)
        const rowsCount = Math.ceil(summary.length / perRow)
        const boxW = width - margin * 2
        const colW = boxW / perRow
        const rowH = 17
        const boxH = rowsCount * rowH
        doc.setFillColor(248, 250, 252)
        doc.setDrawColor(226, 232, 240)
        doc.setLineWidth(0.25)
        doc.roundedRect(margin, y, boxW, boxH, 2, 2, "FD")
        doc.setFillColor(...YELLOW)
        doc.rect(margin, y + 3, 1, boxH - 6, "F")
        for (let c = 1; c < perRow; c++) doc.line(margin + c * colW, y + 3.5, margin + c * colW, y + boxH - 3.5)
        for (let r = 1; r < rowsCount; r++) doc.line(margin + 4, y + r * rowH, margin + boxW - 4, y + r * rowH)
        summary.forEach(([label, value], i) => {
            const x = margin + (i % perRow) * colW + 6
            const ty = y + Math.floor(i / perRow) * rowH
            doc.setFont("helvetica", "bold")
            doc.setFontSize(6.8)
            doc.setTextColor(...SLATE)
            doc.text(label.toUpperCase(), x, ty + 6.2, { charSpace: 0.25, maxWidth: colW - 10 })
            doc.setFontSize(12)
            doc.setTextColor(...NAVY)
            // Shrink a long value to fit its column rather than cutting it off
            let size = 12
            while (size > 8 && doc.getTextWidth(value) > colW - 10) doc.setFontSize((size -= 0.5))
            doc.text(value, x, ty + 13)
        })
        y += boxH
    }

    const cell = (v: unknown) => (v == null || v === "" ? "—" : typeof v === "number" ? v.toLocaleString() : String(v))
    // Columns whose values are numbers are right-aligned (not phone numbers or references)
    const numeric = columns.map(([, get]) => rows.length > 0 && rows.every((row) => { const v = get(row); return v == null || v === "" || typeof v === "number" }))
    const RULE: [number, number, number] = [226, 232, 240]
    autoTable(doc, {
        startY: y + 7,
        // Later pages start below the compact header
        margin: { top: 24, left: margin, right: margin, bottom: 18 },
        theme: "plain",
        head: [["#", ...columns.map(([label]) => label.toUpperCase())]],
        body: rows.map((row, i) => [String(i + 1), ...columns.map(([, get]) => cell(get(row)))]),
        styles: { font: "helvetica", fontSize: 8.5, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, textColor: [30, 41, 59], valign: "middle", overflow: "linebreak" },
        headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.2, cellPadding: { top: 3.6, bottom: 3.6, left: 3, right: 3 } },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 0: { cellWidth: 9, textColor: MUTED, halign: "right" } },
        didParseCell: (data: any) => {
            const col = data.column.index - 1
            if (col >= 0 && numeric[col]) data.cell.styles.halign = "right"
            if (data.section === "body" && data.cell.raw === "—") data.cell.styles.textColor = MUTED
        },
        didDrawCell: (data: any) => {
            const { x, y: cy, width: w, height: h } = data.cell
            if (data.section === "head") {
                // Yellow rule under the heading row, as in the portal
                doc.setDrawColor(...YELLOW)
                doc.setLineWidth(0.6)
                doc.line(x, cy + h, x + w, cy + h)
            } else if (data.section === "body") {
                doc.setDrawColor(...RULE)
                doc.setLineWidth(0.15)
                doc.line(x, cy + h, x + w, cy + h)
            }
        },
    })

    // Compact header on later pages, footer on every page
    const pages = doc.getNumberOfPages()
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i)
        if (i > 1) {
            doc.setFillColor(...NAVY)
            doc.rect(0, 0, width, 15, "F")
            doc.setFillColor(...YELLOW)
            doc.rect(0, 15, width, 0.8, "F")
            drawLogo(margin, 3.5, 8)
            doc.setFont("helvetica", "bold")
            doc.setFontSize(9.5)
            doc.setTextColor(255, 255, 255)
            // Clear of the logo on the left
            let short = title
            while (short.length > 4 && doc.getTextWidth(short) > width - margin * 2 - 32) short = short.slice(0, -1)
            doc.text(short === title ? title : `${short.trimEnd()}…`, width - margin, 9.5, { align: "right" })
        }
        doc.setDrawColor(226, 232, 240)
        doc.setLineWidth(0.2)
        doc.line(margin, height - 12, width - margin, height - 12)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(7.5)
        doc.setTextColor(...MUTED)
        // Left: what this is (shortened to fit); right: when it was made and the page
        const right = `Generated ${generated}  ·  Page ${i} of ${pages}`
        const room = width - margin * 2 - doc.getTextWidth(right) - 8
        let left = `MySafari Parcel  ·  ${title}  ·  Confidential`
        if (doc.getTextWidth(left) > room) {
            let short = title
            while (short.length > 4 && doc.getTextWidth(`MySafari Parcel  ·  ${short}…  ·  Confidential`) > room) short = short.slice(0, -1)
            left = `MySafari Parcel  ·  ${short.trimEnd()}…  ·  Confidential`
        }
        doc.text(left, margin, height - 7)
        doc.text(right, width - margin, height - 7, { align: "right" })
    }

    doc.save(`${filename}-${new Date().toISOString().slice(0, 10)}.pdf`)
}
