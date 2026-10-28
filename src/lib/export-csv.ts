import type { ExportColumn } from "./export-pdf"

// Download rows as a CSV file (opens in Excel). Columns pick and label the fields.
export function downloadCsv<T>(filename: string, rows: T[], columns: ExportColumn<T>[]) {
    const cell = (v: unknown) => {
        const s = v == null ? "" : String(v)
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = [columns.map(([label]) => cell(label)).join(","), ...rows.map((row) => columns.map(([, get]) => cell(get(row))).join(","))]
    const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
}
