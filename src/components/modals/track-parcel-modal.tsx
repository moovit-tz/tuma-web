"use client"

import React, { useState, useEffect } from "react"
import { ParcelViewSheet } from "@/components/parcel/parcel-view-sheet"
import { TRACKING_EXAMPLE, normaliseTrackingNumber } from "@/lib/tracking-number"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@/components/ui/icon"
import {
    Package01Icon,
    Search01Icon,
    Tick01Icon,
    Alert01Icon,
    Clock01Icon,
    SmartPhone01Icon,
    Building03Icon,
    RefreshIcon,
    Task01Icon,
    UserGroupIcon,
    Download01Icon,
    Navigation03Icon,
    Cancel01Icon,
    MapsIcon,
    Activity01Icon,
    DeliveryTruck01Icon,
} from "@hugeicons/core-free-icons"
import { useTrackParcel } from "@/hooks/use-track-parcel"
import { getParcel, type Parcel } from "@/lib/services/parcel"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useTr } from "@/lib/i18n/portal"

interface TrackParcelModalProps {
    isOpen: boolean
    onClose: () => void
    initialTrackingNumber?: string
}

// Brand palette
const INK = "#242a37"
const ACCENT = "#ffd428"

const LABEL = "text-xs font-semibold text-slate-400"
const SECTION_TITLE =
    "text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2"
const CARD = "border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1b212e] rounded-[var(--ds-radius-large)] overflow-hidden"

export function TrackParcelModal({ isOpen, onClose, initialTrackingNumber }: TrackParcelModalProps) {
    const tr = useTr()
    const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber || "")
    const { trackParcel, parcelData, isLoading, error, resetTracking, cancelParcel } = useTrackParcel()
    const { toast } = useToast()

    // The public /track payload has no "agent" — the agent who booked the parcel is the
    // `sender` user account on the full parcel record, so fetch that separately.
    const [fullParcel, setFullParcel] = useState<Parcel | null>(null)

    useEffect(() => {
        if (!isOpen) {
            resetTracking()
            setTrackingNumber("")
            setFullParcel(null)
        } else if (initialTrackingNumber) {
            setTrackingNumber(initialTrackingNumber)
            trackParcel(initialTrackingNumber)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    useEffect(() => {
        const id = parcelData?.parcel?.id
        if (!id) {
            setFullParcel(null)
            return
        }
        let cancelled = false
        getParcel(id)
            .then((p) => {
                if (!cancelled) setFullParcel(p)
            })
            .catch(() => {
                if (!cancelled) setFullParcel(null)
            })
        return () => {
            cancelled = true
        }
    }, [parcelData?.parcel?.id])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (trackingNumber.trim()) {
            await trackParcel(trackingNumber.trim())
        }
    }

    const handleRetry = () => {
        if (trackingNumber.trim()) trackParcel(trackingNumber.trim())
    }

    const handleCancelParcel = async () => {
        if (!parcelData?.parcel.id) return
        const confirmed = window.confirm("Are you sure you want to cancel this parcel? This action cannot be undone.")
        if (confirmed) {
            const success = await cancelParcel(parcelData.parcel.id, "User requested cancellation via Tracker")
            if (success) {
                toast({ title: tr("Success"), description: tr("Parcel has been canceled successfully") })
            }
        }
    }

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return "N/A"
        return new Date(dateString).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        })
    }

    const getProgressPercentage = () => {
        if (!parcelData?.parcel) return 0
        const status = parcelData.parcel.status?.toUpperCase()
        const statusMap: { [key: string]: number } = { RECEIVED: 25, DISPATCHED: 50, OFFLOADED: 75, DELIVERED: 100 }
        return statusMap[status] || 0
    }

    const getStatusIcon = (status: string) => {
        switch (status?.toUpperCase()) {
            case "DELIVERED":
                return Tick01Icon
            case "IN_TRANSIT":
                return DeliveryTruck01Icon
            case "DISPATCHED":
                return Navigation03Icon
            case "RECEIVED":
                return Building03Icon
            case "CANCELED":
                return Cancel01Icon
            default:
                return Package01Icon
        }
    }

    // Once the full parcel record loads, show it in the same parcel sheet the
    // Parcels pages use (details, history, receipt, cancel)
    if (isOpen && fullParcel) {
        return <ParcelViewSheet parcel={fullParcel} onClose={onClose} />
    }

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent
                side="right"
                className={cn(
                    "p-0 overflow-hidden border-0 shadow-[var(--ds-shadow-raised)] [&>button]:hidden",
                    "w-[95vw] sm:max-w-[720px] h-full",
                    "bg-slate-50 dark:bg-[#12151c]",
                    "flex flex-col inset-y-0 right-0 outline-none",
                )}
            >
                <SheetHeader className="sr-only">
                    <SheetTitle>{tr("Parcel Tracker")}</SheetTitle>
                    <SheetDescription>{tr("Real-time tracking and parcel details for MySafari logistics.")}</SheetDescription>
                </SheetHeader>

                {/* Header */}
                <div className="flex-shrink-0 border-b border-black/10 bg-[#242a37]">
                    <div className="flex items-start justify-between px-8 pb-6 pt-9">
                        <div className="flex items-center gap-4">
                            <div className="flex size-12 items-center justify-center rounded-[var(--ds-radius-small)] bg-[#ffd428] text-[#242a37]">
                                <Icon icon={Search01Icon} size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{tr("Parcel Tracker")}</h2>
                                <p className="mt-1 text-xs font-semibold text-[#ffd428]">{tr("Real-time delivery updates")}</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="size-9 rounded-full border-none bg-white/10 p-0 text-white outline-none transition-colors hover:bg-white/20 hover:text-white"
                        >
                            <Icon icon={Cancel01Icon} size={18} />
                        </Button>
                    </div>

                    {/* Search */}
                    <div className="px-8 pb-8">
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <div className="group relative flex-1">
                                <Icon
                                    icon={Search01Icon}
                                    className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#ffd428]"
                                />
                                <Input
                                    placeholder={tr("Tracking number, e.g. {TRACKING_EXAMPLE}", { TRACKING_EXAMPLE })}
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(normaliseTrackingNumber(e.target.value))}
                                    maxLength={8}
                                    autoComplete="off"
                                    spellCheck={false}
                                    className="h-12 rounded-[var(--ds-radius-small)] border-white/15 bg-[#1b212e] pl-12 font-mono text-sm text-white placeholder:normal-case placeholder:text-slate-500 focus:border-[#ffd428]/60 focus:ring-1 focus:ring-[#ffd428]/25"
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={isLoading || !trackingNumber.trim()}
                                className="h-10 rounded-[var(--ds-radius-small)] border-none bg-[#ffd428] px-6 text-xs font-bold text-[#242a37] transition-colors hover:bg-[#e6bc00]"
                            >
                                {isLoading ? <LoadingSpinner className="size-5" /> : tr("Track")}
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Content */}
                <div className="custom-scrollbar flex-1 overflow-auto scroll-smooth bg-slate-50 dark:bg-[#12151c]">
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center px-8 py-24 text-center"
                            >
                                <div className="mb-8 flex size-16 items-center justify-center rounded-[var(--ds-radius-large)] border border-slate-200 bg-white dark:border-white/10 dark:bg-[#1b212e]">
                                    <LoadingSpinner className="size-8 text-[#ffd428]" />
                                </div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">{tr("Fetching parcel")}</h3>
                                <p className="mt-2 max-w-[280px] text-xs text-slate-500">{tr("Looking up the latest tracking details for this parcel…")}</p>
                            </motion.div>
                        ) : error ? (
                            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="m-8">
                                <Card className={cn(CARD, "border-rose-200 dark:border-rose-900/50")}>
                                    <CardContent className="space-y-5 p-6 text-center">
                                        <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40">
                                            <Icon icon={Alert01Icon} size={28} className="text-rose-600 dark:text-rose-400" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <h3 className="text-base font-bold text-slate-900 dark:text-white">{tr("Parcel not found")}</h3>
                                            <p className="mx-auto max-w-xs text-xs text-slate-500">{error}</p>
                                        </div>
                                        <Button
                                            onClick={handleRetry}
                                            className="h-10 rounded-[var(--ds-radius-small)] border-none bg-[#242a37] px-6 text-xs font-bold text-white transition-colors hover:bg-[#1a1f2a] hover:text-white"
                                        >
                                            <Icon icon={RefreshIcon} size={15} className="mr-2" />{tr("Try again")}</Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ) : parcelData ? (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6 p-8"
                            >
                                {/* Action bar */}
                                <div className="flex items-center justify-between">
                                    <Button
                                        onClick={handleCancelParcel}
                                        variant="outline"
                                        disabled={
                                            parcelData.parcel.status === "CANCELED" || parcelData.parcel.status === "DELIVERED"
                                        }
                                        className="flex h-9 items-center gap-2 rounded-lg border-rose-200 bg-white px-4 text-xs font-bold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:border-rose-900/50 dark:bg-[#1b212e] dark:text-rose-400 dark:hover:border-rose-800 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                                    >
                                        <Icon icon={Cancel01Icon} size={14} />{tr("Cancel parcel")}</Button>

                                    <Button
                                        onClick={() =>
                                            window.open(`/api/parcels/${parcelData.parcel.parcelNumber}/receipt`, "_blank")
                                        }
                                        variant="outline"
                                        className="flex h-9 items-center gap-2 rounded-lg border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition-colors hover:border-[#ffd428]/60 hover:bg-[#ffd428]/10 hover:text-slate-900 dark:border-white/10 dark:bg-[#1b212e] dark:text-slate-300 dark:hover:border-[#ffd428]/40 dark:hover:bg-[#ffd428]/10 dark:hover:text-white"
                                    >
                                        <Icon icon={Download01Icon} size={14} className="text-[#ffd428]" />{tr("Download receipt")}</Button>
                                </div>

                                {/* Status strip */}
                                <div
                                    className={cn(
                                        CARD,
                                        "grid grid-cols-1 divide-y divide-slate-200 md:grid-cols-2 md:divide-x md:divide-y-0 lg:grid-cols-4 dark:divide-white/10",
                                    )}
                                >
                                    <div className="p-5">
                                        <p className={cn(LABEL, "mb-2")}>{tr("Parcel")}</p>
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-9 items-center justify-center rounded-lg bg-[#ffd428]/15 text-[#ffd428]">
                                                <Icon icon={Package01Icon} size={20} />
                                            </div>
                                            <div>
                                                <p className="font-mono text-sm font-bold leading-none text-slate-900 dark:text-white">
                                                    {parcelData.parcel.parcelNumber}
                                                </p>
                                                <Badge className="mt-1 h-4 border-none bg-emerald-500/15 px-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">{tr("Verified")}</Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5">
                                        <p className={cn(LABEL, "mb-2")}>{tr("Journey progress")}</p>
                                        <div className="space-y-2">
                                            <div className="flex items-end justify-between">
                                                <span className="text-xs font-bold text-slate-900 dark:text-white">{tr("Overall")}</span>
                                                <span className="text-xs font-bold text-[#ffd428]">
                                                    {getProgressPercentage()}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${getProgressPercentage()}%` }}
                                                    transition={{ duration: 0.8, ease: "easeInOut" }}
                                                    className="h-full rounded-full bg-[#ffd428]"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5">
                                        <p className={cn(LABEL, "mb-2")}>{tr("Status")}</p>
                                        <div className="flex items-center gap-2.5">
                                            <span
                                                className={cn(
                                                    "size-2.5 rounded-full",
                                                    parcelData.parcel.status === "DELIVERED"
                                                        ? "bg-emerald-500"
                                                        : parcelData.parcel.status === "CANCELED"
                                                          ? "bg-rose-500"
                                                          : "bg-[#ffd428]",
                                                )}
                                            />
                                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                {parcelData.parcel.status.replace("_", " ")}
                                            </span>
                                        </div>
                                        <p className="mt-1.5 text-xs font-medium text-slate-400">
                                            {tr("Updated {formatDate}", { formatDate: formatDate(parcelData.parcel.updatedAt) })}</p>
                                    </div>

                                    <div className="bg-[#242a37] p-5">
                                        <p className="mb-2 text-xs font-semibold text-white/50">{tr("Est. arrival")}</p>
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-9 items-center justify-center rounded-lg bg-white/10 text-[#ffd428]">
                                                <Icon icon={Clock01Icon} size={20} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-white">
                                                    {parcelData.parcel.estimatedDelivery
                                                        ? formatDate(parcelData.parcel.estimatedDelivery).split(",")[0]
                                                        : tr("Scheduled")}
                                                </p>
                                                <p className="mt-0.5 text-xs font-medium text-white/40">{tr("Estimated")}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Tabs defaultValue="overview" className="w-full">
                                    <TabsList className="grid h-11 w-full grid-cols-3 rounded-[var(--ds-radius-small)] border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-[#1b212e]">
                                        {[
                                            ["overview", "Overview"],
                                            ["operations", "Details"],
                                            ["history", "Timeline"],
                                        ].map(([v, label]) => (
                                            <TabsTrigger
                                                key={v}
                                                value={v}
                                                className="cursor-pointer rounded-lg text-xs font-bold text-slate-500 transition-colors data-[state=active]:bg-[#242a37] data-[state=active]:text-[#ffd428]"
                                            >
                                                {label}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>

                                    {/* Overview */}
                                    <TabsContent value="overview" className="mt-6">
                                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                            <div className="space-y-3">
                                                <h3 className={SECTION_TITLE}>
                                                    <Icon icon={UserGroupIcon} size={14} className="text-[#ffd428]" />{tr("People")}</h3>
                                                <Card className={CARD}>
                                                    <CardContent className="space-y-5 p-6">
                                                        <Field
                                                            label={tr("Sender")}
                                                            value={parcelData.parcel.sender?.name}
                                                            phone={parcelData.parcel.sender?.phoneNumber}
                                                            accent
                                                        />
                                                        <Field
                                                            label={tr("Recipient")}
                                                            value={parcelData.parcel.recipient?.name}
                                                            phone={parcelData.parcel.recipient?.phoneNumber}
                                                        />
                                                        {fullParcel?.sender && (
                                                            <Field
                                                                label={tr("Booking agent")}
                                                                value={
                                                                    fullParcel.sender.fullName ||
                                                                    fullParcel.sender.username
                                                                }
                                                                phone={fullParcel.sender.phoneNumber}
                                                                sub={fullParcel.sender.company?.name}
                                                            />
                                                        )}
                                                        {parcelData.parcel.dispatcher?.name && (
                                                            <Field
                                                                label={tr("Dispatched by")}
                                                                value={parcelData.parcel.dispatcher.name}
                                                                phone={parcelData.parcel.dispatcher.phoneNumber}
                                                            />
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            <div className="space-y-3">
                                                <h3 className={SECTION_TITLE}>
                                                    <Icon icon={Navigation03Icon} size={14} className="text-[#ffd428]" />{tr("Route")}</h3>
                                                <Card className={CARD}>
                                                    <CardContent className="space-y-5 p-6">
                                                        <Field
                                                            label={tr("Origin")}
                                                            value={parcelData.parcel.origin?.name}
                                                            dotClass="bg-emerald-500"
                                                        />
                                                        <Field label={tr("Destination")} value={parcelData.parcel.destination?.name} />
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* Details */}
                                    <TabsContent value="operations" className="mt-6">
                                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                            <div className="space-y-3">
                                                <h3 className={SECTION_TITLE}>
                                                    <Icon icon={Building03Icon} size={14} className="text-[#ffd428]" />{tr("Offices")}</h3>
                                                <Card className={CARD}>
                                                    <CardContent className="space-y-5 p-6">
                                                        <Field
                                                            label={tr("Origin office")}
                                                            value={parcelData.parcel.originOffice?.name || "—"}
                                                            accent
                                                        />
                                                        <Field
                                                            label={tr("Destination office")}
                                                            value={parcelData.parcel.destinationOffice?.name || "—"}
                                                        />
                                                        {parcelData.parcel.vehicle?.registrationNumber && (
                                                            <Field
                                                                label={tr("Vehicle")}
                                                                value={`${parcelData.parcel.vehicle.brand?.name ?? ""} ${parcelData.parcel.vehicle.model?.name ?? ""} · ${parcelData.parcel.vehicle.registrationNumber}`.trim()}
                                                            />
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            <div className="space-y-3">
                                                <h3 className={SECTION_TITLE}>
                                                    <Icon icon={Activity01Icon} size={14} className="text-[#ffd428]" />{tr("Parcel details")}</h3>
                                                <Card className="overflow-hidden rounded-[var(--ds-radius-large)] border-none bg-[#242a37] text-white">
                                                    <CardContent className="p-0">
                                                        <div className="divide-y divide-white/10">
                                                            {(parcelData.parcel.name || parcelData.parcel.description) && (
                                                                <DarkRow
                                                                    label={tr("Item")}
                                                                    value={parcelData.parcel.name || parcelData.parcel.description}
                                                                />
                                                            )}
                                                            <DarkRow label={tr("Type")} value={parcelData.parcel.parcelType || "—"} />
                                                            <div className="grid grid-cols-2 divide-x divide-white/10">
                                                                <div className="p-5">
                                                                    <p className="mb-1.5 text-xs font-semibold text-white/40">{tr("Weight")}</p>
                                                                    <p className="text-lg font-bold tabular-nums">
                                                                        {parcelData.parcel.weight ?? 0}
                                                                        <span className="ml-1 text-xs text-[#ffd428]">KG</span>
                                                                    </p>
                                                                </div>
                                                                <div className="p-5 text-right">
                                                                    <p className="mb-1.5 text-xs font-semibold text-white/40">{tr("Units")}</p>
                                                                    <p className="text-lg font-bold tabular-nums">
                                                                        {parcelData.parcel.units ?? 1}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <DarkRow
                                                                label={tr("Declared value")}
                                                                value={`TZS ${Number(parcelData.parcel.value ?? 0).toLocaleString()}`}
                                                            />
                                                            <div className="flex items-center justify-between bg-white/5 px-5 py-4">
                                                                <span className="text-xs font-semibold text-white/40">{tr("Shipping price")}</span>
                                                                <span className="text-base font-bold tabular-nums text-[#ffd428]">
                                                                    TZS {Number(parcelData.parcel.price ?? 0).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* Timeline */}
                                    <TabsContent value="history" className="mt-6">
                                        <div className="relative space-y-0 pl-4 before:absolute before:bottom-4 before:left-[31px] before:top-4 before:w-px before:bg-slate-200 dark:before:bg-white/10">
                                            {(parcelData.parcel.trackingHistory?.length ?? 0) > 0 ||
                                            parcelData.parcel.status === "RECEIVED" ? (
                                                [
                                                    ...(parcelData.parcel.trackingHistory &&
                                                    parcelData.parcel.trackingHistory.length > 0
                                                        ? parcelData.parcel.trackingHistory
                                                        : [
                                                              {
                                                                  status: "RECEIVED",
                                                                  location:
                                                                      parcelData.parcel.originOffice?.name ||
                                                                      parcelData.parcel.origin?.name ||
                                                                      "Origin office",
                                                                  timestamp: parcelData.parcel.createdAt,
                                                                  description:
                                                                      tr("Parcel received and registered at the origin office."),
                                                              },
                                                          ]),
                                                ]
                                                    .reverse()
                                                    .map((event: any, index: number) => {
                                                        const StatusIcon = getStatusIcon(event.status)
                                                        const isLatest = index === 0
                                                        return (
                                                            <div key={index} className="group relative pb-8 pl-12 last:pb-0">
                                                                <div
                                                                    className={cn(
                                                                        "absolute left-0 top-0 z-10 flex size-9 items-center justify-center rounded-full border-4 border-slate-50 dark:border-[#12151c]",
                                                                        isLatest
                                                                            ? "bg-[#ffd428] text-[#242a37]"
                                                                            : "bg-white text-slate-400 dark:bg-[#1b212e]",
                                                                    )}
                                                                >
                                                                    <Icon icon={StatusIcon} size={16} />
                                                                </div>

                                                                <div className="mb-2 flex items-start justify-between">
                                                                    <div>
                                                                        <h4
                                                                            className={cn(
                                                                                "text-xs font-bold leading-none",
                                                                                isLatest
                                                                                    ? "text-slate-900 dark:text-white"
                                                                                    : "text-slate-400",
                                                                            )}
                                                                        >
                                                                            {event.status.replace("_", " ")}
                                                                        </h4>
                                                                        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                                                                            <Icon icon={MapsIcon} size={10} />
                                                                            <span>{event.location}</span>
                                                                        </div>
                                                                    </div>
                                                                    <span className="whitespace-nowrap text-xs font-medium text-slate-400">
                                                                        {formatDate(event.timestamp)}
                                                                    </span>
                                                                </div>

                                                                <div
                                                                    className={cn(
                                                                        "rounded-[var(--ds-radius-small)] border p-3 text-xs leading-relaxed",
                                                                        isLatest
                                                                            ? "border-[#ffd428]/40 bg-white text-slate-700 dark:bg-[#1b212e] dark:text-slate-200"
                                                                            : "border-slate-200 bg-white/60 text-slate-400 dark:border-white/10 dark:bg-white/[0.02]",
                                                                    )}
                                                                >
                                                                    {event.description ||
                                                                        `Status updated to ${event.status
                                                                            .replace("_", " ")
                                                                            .toLowerCase()}.`}
                                                                </div>
                                                            </div>
                                                        )
                                                    })
                                            ) : (
                                                <div className="flex flex-col items-center justify-center rounded-[var(--ds-radius-large)] border border-dashed border-slate-200 bg-white py-16 text-center dark:border-white/10 dark:bg-[#1b212e]">
                                                    <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-slate-100 dark:bg-[#12151c]">
                                                        <Icon icon={Task01Icon} size={26} className="text-slate-300 dark:text-slate-600" />
                                                    </div>
                                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{tr("No updates yet")}</h3>
                                                    <p className="mt-1.5 max-w-[220px] text-xs text-slate-500">{tr("This parcel is awaiting its first tracking update.")}</p>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </motion.div>
                        ) : (
                            <div className="flex flex-col items-center justify-center px-6 py-32 text-center">
                                <div className="mb-8 flex size-20 items-center justify-center rounded-[var(--ds-radius-large)] border border-slate-200 bg-white dark:border-white/10 dark:bg-[#1b212e]">
                                    <Icon icon={DeliveryTruck01Icon} size={36} className="text-[#ffd428]" />
                                </div>
                                <h3 className="mb-1.5 text-lg font-bold text-slate-900 dark:text-white">{tr("Track a parcel")}</h3>
                                <p className="max-w-[280px] text-xs text-slate-500">{tr("Enter a tracking number above to see the parcel's status and history.")}</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="flex flex-shrink-0 justify-center border-t border-slate-200 bg-white px-8 py-5 dark:border-white/10 dark:bg-[#1b212e]">
                    <Button
                        onClick={onClose}
                        className="h-11 w-full max-w-sm rounded-[var(--ds-radius-small)] border-none bg-[#242a37] text-xs font-bold text-white transition-colors hover:bg-[#1a1f2a] dark:bg-[#ffd428] dark:text-[#242a37] dark:hover:bg-[#e6bc00]"
                    >{tr("Close")}</Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}

/* ---- Row inside the dark parcel-details card ---- */
function DarkRow({ label, value }: { label: string; value?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 px-5 py-3.5">
            <span className="text-xs font-semibold text-white/40">{label}</span>
            <span className="text-right text-sm font-semibold">{value || "—"}</span>
        </div>
    )
}

/* ---- Small field row ---- */
function Field({
    label,
    value,
    phone,
    sub,
    accent = false,
    dotClass,
}: {
    label: string
    value?: React.ReactNode
    phone?: string
    sub?: string
    accent?: boolean
    dotClass?: string
}) {
    return (
        <div className={cn("relative border-l-2 pl-5", accent ? "border-[#ffd428]" : "border-slate-200 dark:border-white/10")}>
            <div
                className={cn(
                    "absolute -left-[5px] top-0.5 size-2 rounded-full",
                    dotClass || (accent ? "bg-[#ffd428]" : "bg-slate-300 dark:bg-white/20"),
                )}
            />
            <p className="mb-1 text-xs font-semibold text-slate-400">{label}</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{value || "—"}</p>
            {phone && (
                <div className="mt-1.5 flex items-center gap-2 text-xs font-medium tabular-nums text-slate-500">
                    <Icon icon={SmartPhone01Icon} size={12} className="text-[#ffd428]" />
                    {phone}
                </div>
            )}
            {sub && <p className="mt-1 text-xs font-medium text-slate-400">{sub}</p>}
        </div>
    )
}
