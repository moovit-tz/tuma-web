"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
    ArrowRight,
    ArrowUpRight,
    BadgeCheck,
    Search,
    Package,
    MapPin,
    CheckCircle2,
    Clock,
    Lock,
    Eye,
    EyeOff,
    User,
    Boxes,
    LifeBuoy,
    FileWarning,
    Loader2,
} from "lucide-react"

import { useTrackParcel } from "@/hooks/use-track-parcel"
import { cn, formatDate, maskAmount, maskPhoneNumber } from "@/lib/utils"
import { SiteNavbar } from "@/components/site/navbar"
import { TRACKING_EXAMPLE, TRACKING_HINT, normaliseTrackingNumber, trackingNumberProblem } from "@/lib/tracking-number"

const ACCENT = "#FFD428"

const STATUS_FLOW = ["PENDING", "RECEIVED", "DISPATCHED", "OFFLOADED", "DELIVERED"] as const

const STATUS_STYLES: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800 border-amber-200",
    RECEIVED: "bg-sky-100 text-sky-800 border-sky-200",
    DISPATCHED: "bg-indigo-100 text-indigo-800 border-indigo-200",
    OFFLOADED: "bg-violet-100 text-violet-800 border-violet-200",
    DELIVERED: "bg-emerald-100 text-emerald-800 border-emerald-200",
    CANCELLED: "bg-rose-100 text-rose-800 border-rose-200",
}

function statusStyle(status: string) {
    return STATUS_STYLES[status?.toUpperCase()] || "bg-slate-100 text-slate-700 border-slate-200"
}

/* ------------------------------------------------------------------ */
/*  Search bar                                                          */
/* ------------------------------------------------------------------ */

function SearchBar({
    value,
    onChange,
    onSubmit,
    isLoading,
    error,
}: {
    value: string
    onChange: (v: string) => void
    onSubmit: () => void
    isLoading: boolean
    error?: string | null
}) {
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault()
                onSubmit()
            }}
            className="w-full"
        >
            <label htmlFor="tracking-number" className="sr-only">Tracking number</label>
            <div className={cn("flex items-center rounded-[var(--ds-radius-large)] border bg-white p-2 shadow-[var(--ds-shadow-raised)] transition-colors focus-within:ring-2 focus-within:ring-[#FFD428]/40",
                error ? "border-rose-300 focus-within:border-rose-400" : "border-slate-200 focus-within:border-[#242a37]/40")}>
                <Search className="ml-3 h-5 w-5 flex-shrink-0 text-slate-400" aria-hidden />
                <input
                    id="tracking-number"
                    type="text"
                    autoFocus
                    inputMode="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder={TRACKING_EXAMPLE}
                    value={value}
                    onChange={(e) => onChange(normaliseTrackingNumber(e.target.value))}
                    maxLength={8}
                    aria-invalid={!!error}
                    aria-describedby="tracking-number-help"
                    className="w-full border-0 bg-transparent px-3 py-2.5 font-mono text-base font-semibold tracking-[0.2em] text-[#242a37] placeholder:font-normal placeholder:text-slate-300 focus:outline-none focus:ring-0"
                />
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--ds-radius-small)] bg-[#242a37] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a1f2a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD428] disabled:opacity-60"
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Track"}
                    {!isLoading && <ArrowRight className="h-4 w-4" />}
                </button>
            </div>
            <p id="tracking-number-help" className={cn("mt-2 px-1 text-xs", error ? "text-rose-600" : "text-slate-500")} aria-live="polite">
                {error ?? `Your tracking number is ${TRACKING_HINT}.`}
            </p>
        </form>
    )
}

/* ------------------------------------------------------------------ */
/*  Journey / progress                                                  */
/* ------------------------------------------------------------------ */

function Stepper({ parcel }: { parcel: any }) {
    const status = String(parcel.status || "").toUpperCase()
    const cancelled = status === "CANCELLED"
    const activeIndex = cancelled ? -1 : Math.max(0, STATUS_FLOW.indexOf(status as any))

    return (
        <div className="relative py-2">
            <div className="absolute inset-x-3 top-[18px] h-0.5 bg-slate-200" />
            <motion.div
                className={cn(
                    "absolute left-3 top-[18px] h-0.5",
                    cancelled ? "bg-rose-400" : "bg-[#FFD428]",
                )}
                style={{ maxWidth: "calc(100% - 1.5rem)" }}
                initial={{ width: "0%" }}
                animate={{
                    width: cancelled
                        ? "100%"
                        : `${(activeIndex / (STATUS_FLOW.length - 1)) * 100}%`,
                }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
            />
            <div className="relative flex justify-between">
                {STATUS_FLOW.map((s, i) => {
                    const done = !cancelled && i <= activeIndex
                    const current = !cancelled && i === activeIndex
                    return (
                        <div key={s} className="flex flex-col items-center gap-1.5">
                            <div
                                className={cn(
                                    "flex h-6 w-6 items-center justify-center rounded-full border-2",
                                    done
                                        ? "border-[#FFD428] bg-[#FFD428] text-[#141822]"
                                        : "border-slate-200 bg-white text-slate-400",
                                    current && "ring-4 ring-[#FFD428]/20",
                                )}
                            >
                                {s === "DELIVERED" ? <CheckCircle2 size={12} /> : <Package size={11} />}
                            </div>
                            <span
                                className={cn(
                                    "text-xs font-medium",
                                    done ? "text-slate-700" : "text-slate-400",
                                )}
                            >
                                {s}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Details (privacy-gated)                                             */
/* ------------------------------------------------------------------ */

function DetailRow({
    label,
    value,
    sensitive = false,
    revealed,
}: {
    label: string
    value?: React.ReactNode
    sensitive?: boolean
    revealed: boolean
}) {
    const show = !sensitive || revealed
    return (
        <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="break-words text-sm font-medium leading-snug text-[#242a37]">
                {show ? value ?? "—" : "••••••"}
            </p>
        </div>
    )
}

function DetailCard({
    title,
    icon,
    children,
}: {
    title: string
    icon: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <div className="flex flex-col rounded-[var(--ds-radius-large)] border border-slate-200 bg-slate-50 p-5">
            <h4 className="mb-4 flex items-center gap-2.5 text-sm font-semibold text-[#242a37]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFD428]/30 text-[#242a37]">
                    {icon}
                </span>
                {title}
            </h4>
            <div className="grid grid-cols-2 gap-x-5 gap-y-4">{children}</div>
        </div>
    )
}

function ParcelDetailsGrid({ parcel, revealed }: { parcel: any; revealed: boolean }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <DetailCard title="Sender" icon={<User size={16} />}>
                <DetailRow label="Name" value={parcel.sender?.name} sensitive revealed={revealed} />
                <DetailRow
                    label="Phone"
                    value={maskPhoneNumber(parcel.sender?.phoneNumber)}
                    sensitive
                    revealed={revealed}
                />
                {parcel.sender?.company && (
                    <DetailRow label="Company" value={parcel.sender.company} sensitive revealed={revealed} />
                )}
            </DetailCard>

            <DetailCard title="Recipient" icon={<User size={16} />}>
                <DetailRow label="Name" value={parcel.recipient?.name} sensitive revealed={revealed} />
                <DetailRow
                    label="Phone"
                    value={maskPhoneNumber(parcel.recipient?.phoneNumber)}
                    sensitive
                    revealed={revealed}
                />
            </DetailCard>

            <DetailCard title="Shipment" icon={<Boxes size={16} />}>
                <DetailRow label="Weight" value={parcel.weight ? `${parcel.weight} kg` : "—"} revealed />
                <DetailRow
                    label="Declared value"
                    value={parcel.value ? maskAmount(parcel.value) : "—"}
                    sensitive
                    revealed={revealed}
                />
                <DetailRow label="Units" value={parcel.units ?? "—"} revealed />
                <DetailRow label="Created" value={formatDate(parcel.createdAt)} revealed />
                {parcel.vehicle?.brand?.name && (
                    <DetailRow
                        label="Vehicle"
                        value={`${parcel.vehicle.brand.name} ${parcel.vehicle.model?.name ?? ""}`.trim()}
                        revealed
                    />
                )}
            </DetailCard>

            <DetailCard title="Route" icon={<MapPin size={16} />}>
                <DetailRow
                    label="From"
                    value={`${parcel.origin?.name ?? "—"}${parcel.originOffice?.name ? ` · ${parcel.originOffice.name}` : ""}`}
                    revealed
                />
                <DetailRow
                    label="To"
                    value={`${parcel.destination?.name ?? "—"}${parcel.destinationOffice?.name ? ` · ${parcel.destinationOffice.name}` : ""}`}
                    revealed
                />
                {parcel.currentLocation && (
                    <DetailRow label="Current location" value={parcel.currentLocation} revealed />
                )}
            </DetailCard>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Result — compact panel, fits the viewport                           */
/* ------------------------------------------------------------------ */

function ParcelResult({ parcel }: { parcel: any }) {
    const [revealed, setRevealed] = useState(false)

    const status = String(parcel.status || "").toUpperCase()
    const cancelled = status === "CANCELLED"

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex h-full flex-col gap-4"
        >
            {/* Header */}
            <div className="flex flex-shrink-0 items-center justify-between gap-4 rounded-[var(--ds-radius-large)] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[var(--ds-radius-small)] bg-[#FFD428]/30 text-[#242a37]">
                        <Package className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="font-bold leading-tight">{parcel.parcelNumber}</p>
                        <p className="text-xs text-slate-500">{parcel.parcelType || parcel.name || "Parcel"}</p>
                    </div>
                </div>
                <span
                    className={cn(
                        "rounded-lg border px-2.5 py-1 text-xs font-semibold",
                        statusStyle(parcel.status),
                    )}
                >
                    {parcel.status}
                </span>
            </div>

            {/* Route + progress */}
            <div className="flex-shrink-0 rounded-[var(--ds-radius-large)] border border-slate-200 bg-slate-50 p-4">
                <div className="mb-1 flex items-center justify-between text-xs">
                    <div>
                        <p className="font-semibold text-[#242a37]">{parcel.origin?.name || "—"}</p>
                        <p className="text-xs text-slate-500">{parcel.origin?.code}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold text-[#242a37]">{parcel.destination?.name || "—"}</p>
                        <p className="text-xs text-slate-500">{parcel.destination?.code}</p>
                    </div>
                </div>
                <Stepper parcel={parcel} />
                <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500">
                    {parcel.isDelivered ? (
                        <>
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            Delivered {parcel.deliveredDate ? formatDate(parcel.deliveredDate) : ""}
                        </>
                    ) : cancelled ? (
                        <>
                            <FileWarning size={13} className="text-rose-600" />
                            This parcel was cancelled
                        </>
                    ) : (
                        <>
                            <Clock size={13} className="text-amber-600" />
                            {parcel.estimatedDelivery
                                ? `Est. delivery ${formatDate(parcel.estimatedDelivery)}`
                                : "In transit"}
                            {parcel.currentLocation ? ` · near ${parcel.currentLocation}` : ""}
                        </>
                    )}
                </div>
            </div>

            {/* Details */}
            <div className="flex flex-shrink-0 items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[#242a37]">
                    <Lock size={15} className="text-[#242a37]" />
                    Parcel details
                </h3>
                <button
                    onClick={() => setRevealed((r) => !r)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-[#242a37]/40 hover:text-[#242a37]"
                >
                    {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
                    {revealed ? "Hide" : "Reveal"}
                </button>
            </div>

            <div className="-mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
                <ParcelDetailsGrid parcel={parcel} revealed={revealed} />
            </div>
        </motion.div>
    )
}

/* ------------------------------------------------------------------ */
/*  States                                                              */
/* ------------------------------------------------------------------ */

function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
    return (
        <div className="overflow-hidden rounded-[var(--ds-radius-large)] border border-slate-200 bg-white shadow-[0_24px_60px_-20px_rgba(36,42,55,0.25)]">
            <div className="relative px-6 py-16 text-center sm:py-20">
                <div aria-hidden className="absolute left-1/2 top-10 size-40 -translate-x-1/2 rounded-full bg-[#FFD428]/15 blur-2xl" />
                <div className="relative mx-auto mb-5 flex size-16 items-center justify-center rounded-[var(--ds-radius-large)] bg-[#242a37] text-[#FFD428] shadow-[var(--ds-shadow-raised)]">
                    {icon}
                </div>
                <h3 className="relative text-lg font-bold text-[#242a37]">{title}</h3>
                <p className="relative mx-auto mt-1.5 max-w-sm text-sm text-slate-500">{text}</p>
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

function TrackingPageInner() {
    const router = useRouter()
    const params = useParams()
    const locale = (params?.locale as string) || "en"
    const searchParams = useSearchParams()
    const initial = normaliseTrackingNumber(searchParams.get("tracking_number") || "")

    const [input, setInput] = useState(initial)
    const { trackParcel, parcelData, isLoading, error } = useTrackParcel()
    const parcel = parcelData?.parcel || null

    // Auto-run when arriving with a tracking number in the URL.
    useEffect(() => {
        if (initial) {
            setInput(initial)
            trackParcel(initial)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initial])

    const [inputError, setInputError] = useState<string | null>(null)
    const runSearch = () => {
        const q = normaliseTrackingNumber(input)
        const problem = trackingNumberProblem(q)
        setInputError(problem)
        if (problem) return
        if (q === initial) {
            trackParcel(q) // same number: re-run manually since the URL won't change
        } else {
            router.replace(`/${locale}/tracking?tracking_number=${encodeURIComponent(q)}`)
        }
    }

    return (
        <div className="relative flex min-h-screen flex-col bg-white text-[#242a37] lg:h-screen lg:min-h-0 lg:overflow-hidden">
            {/* backdrop */}
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white" />
                <div
                    className="absolute inset-0 opacity-60"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(36,42,55,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(36,42,55,0.06) 1px, transparent 1px)",
                        backgroundSize: "64px 64px",
                        maskImage: "radial-gradient(ellipse 60% 70% at 20% 40%, black, transparent)",
                    }}
                />
                <div className="absolute -right-32 top-24 size-[28rem] rounded-full bg-[#FFD428]/20 blur-3xl" />
            </div>

            <SiteNavbar />

            <main className="relative z-10 flex flex-1 flex-col lg:min-h-0">
                <div className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 pb-16 pt-10 sm:px-6 lg:min-h-0 lg:grid-cols-[minmax(0,26rem)_1fr] lg:grid-rows-1 lg:gap-14 lg:pb-6">
                    {/* Left column */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="lg:self-start"
                    >
                        <p className="inline-flex items-center gap-2 rounded-full border border-[#FFD428]/50 bg-gradient-to-r from-[#FFD428]/10 via-[#FFD428]/25 to-[#FFD428]/10 px-4 py-1.5 text-sm font-semibold">
                            <BadgeCheck className="size-4 fill-[#242a37] text-[#FFF6D1]" aria-hidden />
                            Track a parcel
                        </p>
                        <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
                            Where&apos;s my
                            <br />
                            <span className="bg-gradient-to-r from-[#E8B400] via-[#C99A06] to-[#9A6B00] bg-clip-text text-transparent">parcel?</span>
                        </h1>
                        <p className="mt-3 max-w-md text-base text-slate-600">
                            Enter your tracking number to see where it is, where it&apos;s going and when it arrived.
                        </p>

                        <div className="mt-6">
                            <SearchBar value={input} onChange={(v) => { setInput(v); if (inputError) setInputError(null) }} onSubmit={runSearch} isLoading={isLoading} error={inputError} />
                            {parcel && (
                                <p className="mt-3 text-xs text-slate-500">
                                    Showing results for{" "}
                                    <span className="font-medium text-slate-600">{parcel.parcelNumber}</span>
                                </p>
                            )}
                        </div>

                        {/* The journey every parcel takes */}
                        <ol aria-label="Parcel journey" className="mt-6 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                            {["Received", "Dispatched", "Offloaded", "Delivered"].map((label, i, all) => (
                                <li key={label} className="flex items-center gap-1.5">
                                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">{label}</span>
                                    {i < all.length - 1 && <ArrowRight className="size-3 text-slate-300" aria-hidden />}
                                </li>
                            ))}
                        </ol>

                        {/* Help */}
                        <ul className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-[var(--ds-radius-large)] border border-slate-200 bg-white/90 shadow-[var(--ds-shadow-raised)] backdrop-blur">
                            {[
                                { href: `/${locale}/contact`, icon: LifeBuoy, label: "Need a hand?", value: "Our team can help trace a parcel", action: "Contact" },
                                { href: `/${locale}/report-lost-item`, icon: FileWarning, label: "Parcel missing?", value: "Report a lost or damaged item", action: "Report" },
                            ].map((row) => (
                                <li key={row.href}>
                                    <Link href={row.href} className="group flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#242a37]">
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--ds-radius-small)] bg-[#242a37] text-[#FFD428]">
                                            <row.icon className="size-[18px]" aria-hidden />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-semibold text-[#242a37]">{row.label}</span>
                                            <span className="block text-xs text-slate-500">{row.value}</span>
                                        </span>
                                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FFD428]/25 px-3 py-1 text-xs font-semibold text-[#242a37] transition-colors group-hover:bg-[#FFD428]">
                                            {row.action} <ArrowUpRight className="size-3.5" aria-hidden />
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Right column — results (only the history/details body scrolls) */}
                    <div className="min-w-0 pb-6 lg:h-full lg:min-h-0 lg:pb-0">
                        <AnimatePresence mode="wait">
                            {isLoading && (
                                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <EmptyState
                                        icon={<Loader2 className="h-6 w-6 animate-spin" />}
                                        title="Searching…"
                                        text="Looking up your parcel. This only takes a moment."
                                    />
                                </motion.div>
                            )}

                            {!isLoading && error && (
                                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <EmptyState
                                        icon={<FileWarning className="h-6 w-6" />}
                                        title="We couldn't find that parcel"
                                        text={error || "Check the tracking number and try again."}
                                    />
                                </motion.div>
                            )}

                            {!isLoading && !error && !parcel && (
                                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <EmptyState
                                        icon={<Package className="h-6 w-6" />}
                                        title="No parcel loaded yet"
                                        text={`Your tracking number is ${TRACKING_HINT}. You'll find it on your receipt or in the confirmation SMS.`}
                                    />
                                </motion.div>
                            )}

                            {!isLoading && !error && parcel && (
                                <ParcelResult key="result" parcel={parcel} />
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default function TrackingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white" />}>
            <TrackingPageInner />
        </Suspense>
    )
}
