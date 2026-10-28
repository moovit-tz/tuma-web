"use client"
import { Icon } from "@/components/ui/icon"
import React, { useRef, useState } from "react"
import { ArrowLeft01Icon, Download01Icon, PrinterIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import {
    ParcelReceiptDocument,
    downloadReceiptPdf,
    printReceipt,
} from "@/components/parcel/parcel-receipt-document"
import { useTr } from "@/lib/i18n/portal"

interface ParcelReceiptProps {
    parcel: any | null
    onBack: () => void
}

export function ParcelReceipt({ parcel, onBack }: ParcelReceiptProps) {
    const tr = useTr()
    const receiptRef = useRef<HTMLDivElement>(null)
    const [busy, setBusy] = useState<"pdf" | "print" | null>(null)
    const { toast } = useToast()

    if (!parcel) return null

    const run = async (kind: "pdf" | "print") => {
        if (!receiptRef.current) return
        setBusy(kind)
        try {
            if (kind === "pdf") await downloadReceiptPdf(receiptRef.current, parcel.parcelNumber)
            else await printReceipt(receiptRef.current)
        } catch (err) {
            console.error("Receipt export failed:", err)
            toast({
                variant: "destructive",
                title: kind === "pdf" ? "Couldn't create the PDF" : "Couldn't print",
                description: tr("Please try again."),
            })
        } finally {
            setBusy(null)
        }
    }

    return (
        <div className="flex h-full flex-col bg-[#f1f3f6] dark:bg-[#0a0c10]">
            <div className="flex items-center gap-4 border-b border-slate-100 bg-white p-6 dark:border-white/5 dark:bg-[#1a1f2b]">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    aria-label={tr("Back")}
                    className="size-10 cursor-pointer rounded-full border-none bg-slate-50 transition-colors hover:bg-[#ffd428] hover:text-[#242a37] dark:bg-white/5"
                >
                    <Icon icon={ArrowLeft01Icon} size={20} />
                </Button>
                <div className="min-w-0">
                    <h3 className="m-0 text-sm font-semibold text-[#242a37] dark:text-white">{tr("Parcel receipt")}</h3>
                    <p className="m-0 truncate font-mono text-xs text-slate-400">{parcel.parcelNumber}</p>
                </div>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto p-8">
                <div className="mx-auto flex max-w-[520px] flex-col items-center gap-4">
                    <ParcelReceiptDocument ref={receiptRef} parcel={parcel} />
                    <ReceiptActions busy={busy} onDownload={() => run("pdf")} onPrint={() => run("print")} />
                </div>
            </div>
        </div>
    )
}

export function ReceiptActions({
    busy,
    onDownload,
    onPrint,
}: {
    busy: "pdf" | "print" | null
    onDownload: () => void
    onPrint: () => void
}) {
    const tr = useTr()
    return (
        <div className="flex w-full gap-3">
            <Button
                onClick={onDownload}
                disabled={busy !== null}
                className="h-11 flex-1 gap-2 bg-[#242a37] text-sm font-semibold text-white hover:bg-[#1a1f2b]"
            >
                <Icon icon={Download01Icon} size={16} className="text-[#ffd428]" />
                {busy === "pdf" ? tr("Preparing PDF…") : tr("Download PDF")}
            </Button>
            <Button variant="outline" onClick={onPrint} disabled={busy !== null} className="h-11 flex-1 gap-2 text-sm font-semibold">
                <Icon icon={PrinterIcon} size={16} />
                {busy === "print" ? tr("Preparing…") : tr("Print")}
            </Button>
        </div>
    )
}
