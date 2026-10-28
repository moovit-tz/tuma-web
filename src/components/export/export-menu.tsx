"use client"

import { useState } from "react"
import { ChevronDown, FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { Download01Icon } from "@hugeicons/core-free-icons"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { downloadCsv } from "@/lib/export-csv"
import { downloadPdf, type ExportColumn } from "@/lib/export-pdf"
import { useTr } from "@/lib/i18n/portal"

type Format = "csv" | "pdf"

interface ExportMenuProps<T> {
    /** File name without date or extension, e.g. "districts" */
    filename: string
    /** Heading on the PDF, e.g. "Districts" */
    title: string
    /** Extra PDF line, e.g. the period or filters */
    subtitle?: string
    /** PDF summary figures, worked out from the exported rows */
    summary?: (rows: T[]) => [label: string, value: string][]
    columns: ExportColumn<T>[]
    /** Rows to export, or a loader for rows that aren't on the page yet */
    rows: T[] | (() => Promise<T[]>)
    /** Replaces the generic PDF table with a page-specific report */
    pdf?: (rows: T[]) => Promise<void>
    label?: string
    variant?: "outline" | "primary"
    disabled?: boolean
    className?: string
}

/*
 * "Download" button that asks for the format first: CSV (opens in Excel) or
 * PDF (a printable report). Both use the same rows the page is showing.
 */
export function ExportMenu<T>({ filename, title, subtitle, summary, columns, rows, pdf, label = "Download", variant = "outline", disabled, className }: ExportMenuProps<T>) {
    const tr = useTr()
    const { toast } = useToast()
    const [busy, setBusy] = useState<Format | null>(null)
    const empty = Array.isArray(rows) && rows.length === 0

    const run = async (format: Format) => {
        setBusy(format)
        try {
            const data = Array.isArray(rows) ? rows : await rows()
            if (!data.length) {
                toast({ title: tr("Nothing to download"), description: tr("No rows match the current filters.") })
                return
            }
            if (format === "csv") downloadCsv(filename, data, columns)
            else if (pdf) await pdf(data)
            else await downloadPdf(filename, data, columns, { title, subtitle, summary: summary?.(data) })
            toast({ title: tr("{format} downloaded", { format: format.toUpperCase() }), description: `${title} · ${data.length.toLocaleString()} ${data.length === 1 ? "row" : "rows"}` })
        } catch (e) {
            console.error("Download failed:", e)
            toast({ variant: "destructive", title: tr("Couldn't create the file"), description: tr("Please try again.") })
        } finally {
            setBusy(null)
        }
    }

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant={variant === "outline" ? "outline" : "default"}
                    disabled={disabled || empty || busy !== null}
                    className={cn(
                        "h-10 px-4 rounded-[var(--ds-radius-small)] text-sm flex items-center gap-2 cursor-pointer",
                        variant === "outline"
                            ? "font-medium border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1f2b] shadow-none"
                            : "px-5 font-semibold bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] shadow-[var(--ds-shadow-raised)]",
                        className,
                    )}
                >
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Icon icon={Download01Icon} size={16} className={variant === "outline" ? "text-slate-500 dark:text-slate-400" : undefined} />}
                    {busy ? tr("Preparing…") : label}
                    <ChevronDown className="size-4 opacity-60" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 p-1 rounded-[var(--ds-radius-small)] bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10">
                <DropdownMenuItem onSelect={() => run("csv")} className="flex items-start gap-3 p-2.5 cursor-pointer">
                    <FileSpreadsheet className="size-4 mt-0.5 text-emerald-600" />
                    <div>
                        <p className="text-sm font-medium">CSV</p>
                        <p className="text-xs text-slate-500">{tr("Spreadsheet, opens in Excel")}</p>
                    </div>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => run("pdf")} className="flex items-start gap-3 p-2.5 cursor-pointer">
                    <FileText className="size-4 mt-0.5 text-rose-600" />
                    <div>
                        <p className="text-sm font-medium">PDF</p>
                        <p className="text-xs text-slate-500">{tr("Report, ready to print or share")}</p>
                    </div>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
