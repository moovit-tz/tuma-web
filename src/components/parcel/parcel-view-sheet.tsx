"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { formatDistanceToNowStrict } from "date-fns"
import {
    X as XIcon,
    Trash2,
    MapPin,
    AlertTriangle,
    CheckCircle2,
    Truck,
    Building2,
    Navigation,
    Package,
    ArrowRight,
} from "lucide-react"
import {
    Package01Icon,
    Location01Icon,
    UserCircleIcon,
    UserGroupIcon,
    ViewIcon,
    Clock01Icon,
    Download01Icon,
    Delete02Icon,
    Copy01Icon,
    Cancel01Icon,
} from "@hugeicons/core-free-icons"
import { Icon } from "@/components/ui/icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { ParcelReceiptDocument, downloadReceiptPdf, printReceipt } from "@/components/parcel/parcel-receipt-document"
import { ReceiptActions } from "@/components/modals/parcel-receipt"
import { handleParcelCancellation } from "@/lib/services/dashboard-unified"
import { useTr } from "@/lib/i18n/portal"

const NON_CANCELLABLE_STATUSES = new Set(["CANCELED", "CANCELLED", "DELIVERED", "LOST"])

type ModalTab = "details" | "history" | "receipt" | "cancel"

// Atlassian lozenge appearances on the brand palette: finished = yellow,
// moving = bold navy, just received = subtle navy, cancelled = subtle rose.
const STATUS_LOZENGE: Record<string, string> = {
    DELIVERED: "bg-[#ffd428] text-[#242a37]",
    PICKED_UP: "bg-[#ffd428] text-[#242a37]",
    DISPATCHED: "bg-[#242a37] text-white dark:bg-white dark:text-[#242a37]",
    IN_TRANSIT: "bg-[#242a37] text-white dark:bg-white dark:text-[#242a37]",
    OFFLOADED: "bg-[#242a37] text-white dark:bg-white dark:text-[#242a37]",
    RECEIVED: "bg-[#242a37]/10 text-[#242a37] dark:bg-white/10 dark:text-white",
    CANCELED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    CANCELLED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    LOST: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
}

function StatusBadge({ status }: { status: string }) {
    const s = (status || "UNKNOWN").toUpperCase()
    return (
        <Badge className={cn("h-7 rounded-[var(--ds-radius-small)] px-3 text-xs font-semibold border-none", STATUS_LOZENGE[s] ?? "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200")}>
            {s.replace(/_/g, " ")}
        </Badge>
    )
}

function timeAgo(dateString?: string | null) {
    if (!dateString) return null
    const date = new Date(dateString)
    return Number.isNaN(date.getTime()) ? null : formatDistanceToNowStrict(date, { addSuffix: true })
}

interface ParcelViewSheetProps {
    /** The parcel to show; null closes the sheet */
    parcel: any | null
    onClose: () => void
    /** Called after the parcel was cancelled, so lists can refresh */
    onChanged?: () => void
}

/**
 * Parcel profile sheet (Details, History, Receipt, Cancel) — the same view
 * wherever a parcel is opened: dashboard Recent parcels, Parcels page, etc.
 */
export function ParcelViewSheet({ parcel, onClose, onChanged }: ParcelViewSheetProps) {
    const tr = useTr()
    const params = useParams()
    const localeString = (params?.locale as string) || "en"
    const selectedParcel = parcel
    const setSelectedParcel = (value: null) => { if (value === null) onClose() }
    const [modalTab, setModalTab] = useState<ModalTab>("details")
    const [cancelReason, setCancelReason] = useState("")
    const [isCancelling, setIsCancelling] = useState(false)
    const [receiptBusy, setReceiptBusy] = useState<"pdf" | "print" | null>(null)
    const receiptRef = useRef<HTMLDivElement>(null)

    // Every newly opened parcel starts on Details with an empty reason
    useEffect(() => {
        setModalTab("details")
        setCancelReason("")
    }, [parcel?.id])

    const handleCancel = async () => {
        if (!selectedParcel || isCancelling) return
        if (!cancelReason.trim()) {
            toast({ title: tr("Reason required"), description: tr("Please enter a cancellation reason."), variant: "destructive" })
            return
        }
        setIsCancelling(true)
        try {
            const result = await handleParcelCancellation(String(selectedParcel.id), true, cancelReason)
            if (result.success) {
                toast({ title: tr("Parcel cancelled"), description: result.message })
                onChanged?.()
                onClose()
            } else {
                toast({ title: tr("Cancel failed"), description: result.error || result.message, variant: "destructive" })
            }
        } catch (e: any) {
            toast({ title: tr("Error"), description: e.message, variant: "destructive" })
        } finally {
            setIsCancelling(false)
        }
    }

    const exportReceipt = async (kind: "pdf" | "print") => {
        if (!receiptRef.current || !selectedParcel) return
        setReceiptBusy(kind)
        try {
            if (kind === "pdf") await downloadReceiptPdf(receiptRef.current, selectedParcel.parcelNumber)
            else await printReceipt(receiptRef.current)
        } catch (err) {
            console.error("Receipt export failed:", err)
            toast({
                variant: "destructive",
                title: kind === "pdf" ? "Couldn't create the PDF" : "Couldn't print",
                description: tr("Please try again."),
            })
        } finally {
            setReceiptBusy(null)
        }
    }

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return "n/a"
        return new Date(dateString).toLocaleString(localeString, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        })
    }

    const getStatusIcon = (status: string) => {
        switch (status?.toUpperCase()) {
            case "DELIVERED":
                return <CheckCircle2 className="size-4" />
            case "IN_TRANSIT":
                return <Truck className="size-4" />
            case "DISPATCHED":
                return <Navigation className="size-4" />
            case "RECEIVED":
                return <Building2 className="size-4" />
            case "CANCELLED":
            case "CANCELED":
                return <XIcon className="size-4" />
            default:
                return <Package className="size-4" />
        }
    }

    const canCancel = !NON_CANCELLABLE_STATUSES.has(String(selectedParcel?.status || "").toUpperCase())

    return (
        <Sheet open={!!selectedParcel} onOpenChange={(open) => !open && setSelectedParcel(null)}>
            <SheetContent
                side="right"
                className="flex h-full w-full flex-col overflow-hidden border-l bg-white p-0 outline-none dark:bg-[#0f1117] sm:max-w-[640px] [&>button]:hidden"
            >
                {selectedParcel && (
                    <>
                        <SheetTitle className="sr-only">{tr("Parcel {parcelNumber}", { parcelNumber: selectedParcel.parcelNumber })}</SheetTitle>
                        <SheetDescription className="sr-only">{tr("Details, history, receipt and cancellation for this parcel.")}</SheetDescription>

                        {/* ── Header — same layout as the agent sheet; one close button ── */}
                        <div className="relative flex-shrink-0 overflow-hidden bg-[#242a37] text-white">
                            <div className="relative z-10 p-5 pt-6 sm:p-8 sm:pt-10">
                                <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                                    <div className="flex size-14 items-center justify-center rounded-[var(--ds-radius-small)] border border-white/20 bg-[#ffd428]">
                                        <Icon icon={Package01Icon} size={28} className="text-[#242a37]" />
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                                        <Button
                                            onClick={async () => {
                                                try {
                                                    await navigator.clipboard.writeText(String(selectedParcel.parcelNumber ?? ""))
                                                    toast({ title: tr("Copied"), description: tr("Parcel number copied.") })
                                                } catch {
                                                    toast({ variant: "destructive", title: tr("Copy failed"), description: tr("Select the number and copy it manually.") })
                                                }
                                            }}
                                            className="flex h-9 cursor-pointer items-center gap-2 rounded-[var(--ds-radius-small)] border-none bg-[#ffd428] px-4 text-xs font-semibold text-[#242a37] shadow-none transition-colors hover:bg-[#ffdb4d]"
                                        >
                                            <Icon icon={Copy01Icon} size={18} />{tr("Copy parcel no.")}</Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setSelectedParcel(null)}
                                            aria-label={tr("Close")}
                                            className="flex size-9 cursor-pointer items-center justify-center rounded-full border-none bg-white/10 p-0 text-white outline-none transition hover:bg-white/20 hover:text-white"
                                        >
                                            <Icon icon={Cancel01Icon} size={18} />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex items-end justify-between gap-4">
                                    <div className="min-w-0 text-left">
                                        <h2 className="m-0 truncate p-0 text-2xl font-bold leading-none text-white">{selectedParcel.parcelNumber}</h2>
                                        <p className="mt-2 flex items-center gap-2 truncate text-xs font-semibold text-white/50">{tr("Parcel ID: #")}{String(selectedParcel.id ?? "").padStart(4, "0")}
                                            <span className="text-white/20">•</span>
                                            {selectedParcel.parcelTypeName || tr("General")}
                                            {timeAgo(selectedParcel.createdAt) && (
                                                <>
                                                    <span className="text-white/20">•</span>
                                                    {timeAgo(selectedParcel.createdAt)}
                                                </>
                                            )}
                                        </p>
                                    </div>
                                    <Badge
                                        className={cn(
                                            "flex h-7 shrink-0 translate-y-[2px] items-center justify-center rounded-[var(--ds-radius-large)] border-none px-3 text-xs font-semibold shadow-[var(--ds-shadow-raised)]",
                                            STATUS_LOZENGE[String(selectedParcel.status || "").toUpperCase()] ?? "bg-slate-100 text-slate-700",
                                        )}
                                    >
                                        {String(selectedParcel.status || "UNKNOWN").toUpperCase().replace(/_/g, " ")}
                                    </Badge>
                                </div>
                            </div>

                            <div role="tablist" className="custom-scrollbar flex gap-1 overflow-x-auto border-t border-white/10 px-6">
                                {[
                                    { id: "details" as ModalTab, label: tr("Details"), icon: ViewIcon },
                                    { id: "history" as ModalTab, label: tr("History"), icon: Clock01Icon },
                                    { id: "receipt" as ModalTab, label: tr("Receipt"), icon: Download01Icon },
                                    ...(canCancel ? [{ id: "cancel" as ModalTab, label: tr("Cancel parcel"), icon: Delete02Icon }] : []),
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={modalTab === tab.id}
                                        onClick={() => setModalTab(tab.id)}
                                        className={cn(
                                            "-mb-px flex cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-2 py-3 text-sm font-medium outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ffd428]",
                                            modalTab === tab.id
                                                ? "border-[#ffd428] text-white"
                                                : "border-transparent text-white/60 hover:border-white/30 hover:text-white",
                                        )}
                                    >
                                        <Icon icon={tab.icon} className="size-4" />
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="custom-scrollbar flex-1 overflow-y-auto bg-[#f1f3f6] dark:bg-[#0a0c10]">
                            {modalTab === "details" && (
                                <div className="space-y-6 p-4 sm:p-8">
                                    {/* Sender / Recipient */}
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        {[
                                            { title: tr("Sender"), icon: UserCircleIcon, name: selectedParcel.senderName, phone: selectedParcel.senderPhoneNumber },
                                            { title: tr("Recipient"), icon: UserGroupIcon, name: selectedParcel.recipientName, phone: selectedParcel.recipientPhoneNumber },
                                        ].map((party) => (
                                            <section key={party.title} className="space-y-3">
                                                <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                                                    <Icon icon={party.icon} size={14} /> {party.title}
                                                </h3>
                                                <div className="rounded-[var(--ds-radius-large)] border border-slate-100 px-5 py-4 dark:border-white/5 bg-white shadow-[var(--ds-shadow-raised)] dark:bg-[#1a1f2b]">
                                                    <p className="truncate text-sm font-semibold text-[#242a37] dark:text-white">{party.name || "—"}</p>
                                                    <p className="mt-1 text-sm tabular-nums text-slate-500">{party.phone || "—"}</p>
                                                </div>
                                            </section>
                                        ))}
                                    </div>

                                    {/* Route */}
                                    <section className="space-y-3">
                                        <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                                            <Icon icon={Location01Icon} size={14} />{" "}{tr("Route")}</h3>
                                        <div className="flex items-center gap-4 rounded-[var(--ds-radius-large)] border border-slate-100 px-5 py-4 dark:border-white/5 bg-white shadow-[var(--ds-shadow-raised)] dark:bg-[#1a1f2b]">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs text-slate-400">{tr("From")}</p>
                                                <p className="truncate text-sm font-semibold text-[#242a37] dark:text-white">{selectedParcel.origin?.name || "—"}</p>
                                                <p className="truncate text-xs text-slate-500">{selectedParcel.originOffice?.name || "—"}</p>
                                            </div>
                                            <ArrowRight className="size-4 shrink-0 text-slate-300" aria-hidden />
                                            <div className="min-w-0 flex-1 text-right">
                                                <p className="text-xs text-slate-400">{tr("To")}</p>
                                                <p className="truncate text-sm font-semibold text-[#242a37] dark:text-white">{selectedParcel.destination?.name || "—"}</p>
                                                <p className="truncate text-xs text-slate-500">{selectedParcel.destinationOffice?.name || "—"}</p>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Parcel + booking, as label/value rows */}
                                    <section className="space-y-3">
                                        <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                                            <Icon icon={Package01Icon} size={14} />{" "}{tr("Parcel")}</h3>
                                        <dl className="divide-y divide-slate-100 rounded-[var(--ds-radius-large)] border border-slate-100 dark:divide-white/5 dark:border-white/5 bg-white shadow-[var(--ds-shadow-raised)] dark:bg-[#1a1f2b]">
                                            {[
                                                { label: tr("Contents"), value: selectedParcel.name || "—" },
                                                { label: tr("Type"), value: selectedParcel.parcelTypeName || "General" },
                                                { label: tr("Weight"), value: selectedParcel.weight ? `${selectedParcel.weight} kg` : "—" },
                                                { label: tr("Quantity"), value: selectedParcel.units ? String(selectedParcel.units) : "—" },
                                                { label: tr("Declared value"), value: selectedParcel.value ? `TZS ${new Intl.NumberFormat("en-TZ").format(selectedParcel.value)}` : "—" },
                                                { label: tr("Price"), value: selectedParcel.price ? `TZS ${new Intl.NumberFormat("en-TZ").format(selectedParcel.price)}` : "—", strong: true },
                                                { label: tr("Company"), value: selectedParcel.sender?.company?.name || selectedParcel.company?.name || "—" },
                                                { label: tr("Booked by"), value: selectedParcel.sender?.fullName || (selectedParcel.sender as any)?.username || "—" },
                                                { label: tr("Booked on"), value: selectedParcel.createdAt ? formatDate(selectedParcel.createdAt) : "—" },
                                            ].map((row) => (
                                                <div key={row.label} className="flex items-center justify-between gap-4 px-5 py-3">
                                                    <dt className="text-sm text-slate-500">{row.label}</dt>
                                                    <dd className={cn("truncate text-right text-sm font-semibold tabular-nums", row.strong ? "text-[#242a37] dark:text-[#ffd428]" : "text-[#242a37] dark:text-white")}>
                                                        {row.value}
                                                    </dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </section>
                                </div>
                            )}

                            {modalTab === "history" && (
                                <ol className="m-4 sm:m-8 space-y-0 rounded-[var(--ds-radius-large)] border border-slate-100 p-6 dark:border-white/5 bg-white shadow-[var(--ds-shadow-raised)] dark:bg-[#1a1f2b]">
                                    {[
                                        {
                                            status: "RECEIVED",
                                            label: tr("Booked"),
                                            timestamp: selectedParcel.createdAt,
                                            location: selectedParcel.originOffice?.name || selectedParcel.origin?.name,
                                            done: true,
                                        },
                                        {
                                            status: "PICKED_UP",
                                            label: tr("Picked up"),
                                            timestamp: selectedParcel.pickedUpDate,
                                            location: selectedParcel.origin?.name,
                                            done: !!selectedParcel.pickedUpDate,
                                        },
                                        {
                                            status: "DISPATCHED",
                                            label: tr("Dispatched"),
                                            timestamp: selectedParcel.travelDate,
                                            location: selectedParcel.destination?.name ? `On the way to ${selectedParcel.destination.name}` : undefined,
                                            done: !!selectedParcel.travelDate,
                                        },
                                        {
                                            status: "DELIVERED",
                                            label: tr("Delivered"),
                                            timestamp: selectedParcel.deliveredDate,
                                            location: selectedParcel.destinationOffice?.name || selectedParcel.destination?.name,
                                            done: !!selectedParcel.deliveredDate,
                                        },
                                    ].map((event, i, all) => (
                                        <li key={event.status} className="relative flex gap-4 pb-8 last:pb-0">
                                            {i < all.length - 1 && (
                                                <span
                                                    aria-hidden
                                                    className={cn(
                                                        "absolute left-4 top-9 -ml-px h-[calc(100%-2.25rem)] w-0.5",
                                                        all[i + 1].done ? "bg-[#ffd428]" : "bg-slate-200 dark:bg-white/10",
                                                    )}
                                                />
                                            )}
                                            <span
                                                className={cn(
                                                    "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full",
                                                    event.done
                                                        ? "bg-[#ffd428] text-[#242a37]"
                                                        : "border-2 border-dashed border-slate-200 text-slate-300 dark:border-white/10",
                                                )}
                                            >
                                                {getStatusIcon(event.status)}
                                            </span>
                                            <div className={cn("min-w-0 flex-1 pt-1", !event.done && "opacity-50")}>
                                                <div className="flex items-baseline justify-between gap-4">
                                                    <p className="text-sm font-semibold text-[#242a37] dark:text-white">{event.label}</p>
                                                    <p className="shrink-0 text-xs tabular-nums text-slate-500">
                                                        {event.timestamp ? formatDate(event.timestamp) : tr("Pending")}
                                                    </p>
                                                </div>
                                                {event.location && (
                                                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                                                        <MapPin className="size-3" aria-hidden />
                                                        {event.location}
                                                    </p>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            )}

                                {modalTab === "receipt" && (
                                    <div className="mx-auto flex max-w-[520px] flex-col items-center gap-4 p-4 sm:p-8">
                                        <ParcelReceiptDocument ref={receiptRef} parcel={selectedParcel} />
                                        <ReceiptActions
                                            busy={receiptBusy}
                                            onDownload={() => exportReceipt("pdf")}
                                            onPrint={() => exportReceipt("print")}
                                        />
                                    </div>
                                )}

                            {modalTab === "cancel" && (
                                <div className="space-y-5 p-4 sm:p-8">
                                    {!canCancel ? (
                                        <div className="flex gap-3 rounded-[var(--ds-radius-small)] bg-slate-100 p-4 dark:bg-white/5">
                                            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-slate-500" />
                                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                                {tr("This parcel is {v} and can no longer be cancelled.", { v: String(selectedParcel.status).toLowerCase().replace(/_/g, " ") })}</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Atlassian section message — warning */}
                                            <div className="flex gap-3 rounded-[var(--ds-radius-small)] bg-rose-50 p-4 dark:bg-rose-500/10">
                                                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600 dark:text-rose-400" />
                                                <div>
                                                    <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">{tr("This can't be undone")}</p>
                                                    <p className="mt-1 text-sm text-rose-700 dark:text-rose-300/80">{tr("Cancelling")}{" "}<span className="font-mono font-semibold">{selectedParcel.parcelNumber}</span>{" "}{tr("takes it out of transit.")}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label htmlFor="cancel-reason" className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Reason for cancelling")}</label>
                                                <Textarea
                                                    id="cancel-reason"
                                                    value={cancelReason}
                                                    onChange={(e) => setCancelReason(e.target.value)}
                                                    placeholder={tr("Why is this parcel being cancelled?")}
                                                    rows={4}
                                                    className="resize-none rounded-[var(--ds-radius-small)] border-slate-200 text-sm dark:border-white/10"
                                                />
                                            </div>
                                            <div className="flex justify-end gap-3">
                                                <Button variant="outline" onClick={() => setModalTab("details")}>{tr("Keep parcel")}</Button>
                                                <Button
                                                    onClick={handleCancel}
                                                    disabled={isCancelling || !cancelReason.trim()}
                                                    className="gap-2 bg-rose-600 text-white hover:bg-rose-700"
                                                >
                                                    <Trash2 size={16} />
                                                    {isCancelling ? tr("Cancelling…") : tr("Cancel parcel")}
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    )
}
