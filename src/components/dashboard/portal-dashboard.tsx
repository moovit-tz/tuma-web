"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
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
    RefreshCw,
    ArrowRight,
} from "lucide-react"
import {
    Package01Icon,
    Location01Icon,
    UserCircleIcon,
    ArrowRight01Icon,
    UserGroupIcon,
    ViewIcon,
    Clock01Icon,
    Download01Icon,
    Delete02Icon,
    Copy01Icon,
    Cancel01Icon,
} from "@hugeicons/core-free-icons"
import { format, subDays, addDays, startOfDay, formatDistanceToNowStrict } from "date-fns"

import { Icon } from "@/components/ui/icon"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { ParcelViewSheet } from "@/components/parcel/parcel-view-sheet"
import { ParcelReceiptDocument, downloadReceiptPdf, printReceipt } from "@/components/parcel/parcel-receipt-document"
import { ReceiptActions } from "@/components/modals/parcel-receipt"
import { Skeleton } from "@/components/ui/skeleton"
import {
    fetchUnifiedDashboardData,
    fetchRecentParcels,
    handleParcelCancellation,
} from "@/lib/services/dashboard-unified"
import { getParcelStats } from "@/lib/services/parcel"
import { getCurrentUser } from "@/lib/auth"
import { useTr } from "@/lib/i18n/portal"

export interface StatDef {
    title: string
    value: React.ReactNode
    icon: any
    sub: string
    /** Render a skeleton in place of the value */
    loading?: boolean
}

/** Shown for a figure whose request failed, so it never reads as a real zero. */
export const NO_VALUE = "—"

export interface PortalPeriodStats {
    total: number
    delivered: number
    totalValue: number
    totalPrice: number
    /** False when the period had too many parcels to total (sums are partial) */
    totalsComplete: boolean
}

// Up to 3,000 parcels (30 requests) for a money total; beyond that the
// figure would be partial, so it's shown as unavailable instead.
const MAX_TOTALS_PAGES = 30

export interface PortalStatsContext {
    /** Dashboard summary; null while loading or if the request failed */
    data: any
    isLoadingSummary: boolean
    /** Stats for the selected period; null while loading or if the request failed */
    periodStats: PortalPeriodStats | null
    isLoadingPeriodStats: boolean
    periodLabel: string
}

interface PortalDashboardProps {
    /** Route prefix without locale, e.g. "/ops", "/admin", "/biz" */
    basePath: string
    /** Copy under the greeting */
    snapshotLabel?: string
    /** Fallback name for the greeting */
    fallbackName?: string
    /**
     * Fill periodStats.totalValue/totalPrice. Reads the period's parcels
     * (up to MAX_TOTALS_PAGES requests), so only portals whose cards show
     * money opt in.
     */
    includeValueTotals?: boolean
    /** Build the KPI cards from the fetched data */
    buildStats: (ctx: PortalStatsContext) => StatDef[]
}

// Live figures for an operations screen: poll while the tab is visible.
const REFRESH_INTERVAL_MS = 60 * 1000

const dashboardKeys = {
    all: ["portal-dashboard"] as const,
    summary: () => [...dashboardKeys.all, "summary"] as const,
    recentParcels: () => [...dashboardKeys.all, "recent-parcels"] as const,
    periodStats: (period: string, includeTotals: boolean) =>
        [...dashboardKeys.all, "period-stats", period, includeTotals] as const,
}

// The global default is no retries; dashboard reads are idempotent, so ride
// out a transient failure — but never retry an auth failure, which is
// already redirecting to login.
const retryTransient = (failureCount: number, error: unknown) =>
    failureCount < 2 && !(error instanceof Error && error.message.startsWith("Unauthorized"))

// Computed at fetch time (not render time) so a dashboard left open past
// midnight rolls "Today" over on its next refresh.
function periodRange(value: string): { dateFrom?: string; dateTo?: string } {
    const today = startOfDay(new Date())
    const tomorrow = format(addDays(today, 1), "yyyy-MM-dd")
    if (value === "today") return { dateFrom: format(today, "yyyy-MM-dd"), dateTo: tomorrow }
    // "Last N days" includes today, so it starts N-1 days back.
    if (value === "7d") return { dateFrom: format(subDays(today, 6), "yyyy-MM-dd"), dateTo: tomorrow }
    if (value === "30d") return { dateFrom: format(subDays(today, 29), "yyyy-MM-dd"), dateTo: tomorrow }
    return {}
}

function greetingFor(hour: number) {
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
}

function SectionError({ message, onRetry, isRetrying }: { message: string; onRetry: () => void; isRetrying: boolean }) {
    const tr = useTr()
    return (
        <div className="flex items-center justify-between gap-4 rounded-[var(--ds-radius-small)] border border-rose-200 bg-rose-50 px-5 py-4 dark:border-rose-500/20 dark:bg-rose-500/10">
            <div className="flex items-center gap-3">
                <AlertTriangle className="size-4 flex-shrink-0 text-rose-500" />
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">{message}</p>
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                disabled={isRetrying}
                className="gap-2 rounded-[var(--ds-radius-small)] border-rose-200 text-rose-700 dark:border-rose-500/30 dark:text-rose-300"
            >
                <RefreshCw className={cn("size-3.5", isRetrying && "animate-spin")} />{tr("Retry")}</Button>
        </div>
    )
}

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

function PartyCell({ name, phone }: { name?: string; phone?: string }) {
    return (
        <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 min-w-0">
                <div className="size-1.5 shrink-0 rounded-full bg-[#ffd428]" />
                <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">{name || "—"}</p>
            </div>
            {phone && (
                <div className="h-[18px] px-2.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[6px] text-xs font-semibold tabular-nums text-slate-400 w-fit max-w-full truncate flex items-center">
                    {phone}
                </div>
            )}
        </div>
    )
}

function RouteCell({ origin, destination }: { origin?: string; destination?: string }) {
    return (
        <div className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className="truncate">{origin || "—"}</span>
            <ArrowRight className="size-3.5 shrink-0 text-[var(--ds-text-subtlest)]" aria-hidden />
            <span className="truncate">{destination || "—"}</span>
        </div>
    )
}

const PERIOD_OPTIONS = [
    { value: "today", label: "Today" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "all", label: "All Time" },
] as const

export function PortalDashboard({
    basePath,
    snapshotLabel,
    fallbackName = "there",
    includeValueTotals = false,
    buildStats,
}: PortalDashboardProps) {
    const tr = useTr()
    const params = useParams()
    const localeString = (params?.locale as string) || "en"
    const queryClient = useQueryClient()

    const [selectedParcel, setSelectedParcel] = useState<any>(null)

    const [period, setPeriod] = useState<(typeof PERIOD_OPTIONS)[number]["value"]>("today")

    // Greeting and user name come from the clock and localStorage, so they
    // are set after mount to keep the server and client render identical.
    const [userName, setUserName] = useState(fallbackName)
    const [greeting, setGreeting] = useState("Hello")

    const localized = (href: string) => `/${localeString}${href}`

    // Each section is its own query so it renders as soon as its data lands,
    // and one failing request can't blank the rest of the dashboard.
    const summaryQuery = useQuery({
        queryKey: dashboardKeys.summary(),
        queryFn: fetchUnifiedDashboardData,
        staleTime: 30 * 1000,
        refetchInterval: REFRESH_INTERVAL_MS,
        refetchOnWindowFocus: true,
        retry: retryTransient,
    })

    const recentParcelsQuery = useQuery({
        queryKey: dashboardKeys.recentParcels(),
        queryFn: () => fetchRecentParcels(1, 10),
        staleTime: 30 * 1000,
        refetchInterval: REFRESH_INTERVAL_MS,
        refetchOnWindowFocus: true,
        retry: retryTransient,
    })

    // Keyed by period, so a slow response for a period the user already
    // switched away from can never overwrite the one on screen.
    const periodStatsQuery = useQuery({
        queryKey: dashboardKeys.periodStats(period, includeValueTotals),
        queryFn: async (): Promise<PortalPeriodStats> => {
            const stats = await getParcelStats({
                ...periodRange(period),
                includeTotals: includeValueTotals,
                maxTotalsPages: MAX_TOTALS_PAGES,
                throwOnError: true,
            })
            return {
                total: stats.total,
                delivered: stats.delivered,
                totalValue: stats.totalValue || 0,
                totalPrice: stats.totalPrice || 0,
                totalsComplete: stats.totalsComplete ?? true,
            }
        },
        // Keep showing the previous figures (flagged as loading) instead of
        // dropping the cards back to a skeleton on every period switch.
        placeholderData: keepPreviousData,
        staleTime: 30 * 1000,
        // The totals variant downloads every parcel in the period — refresh
        // that on focus/remount only, not on a timer.
        refetchInterval: includeValueTotals ? false : REFRESH_INTERVAL_MS,
        refetchOnWindowFocus: true,
        retry: retryTransient,
    })

    useEffect(() => {
        setGreeting(greetingFor(new Date().getHours()))
        const user = getCurrentUser()
        if (user) setUserName((user as any).fullName || (user as any).username || (user as any).name || fallbackName)
    }, [fallbackName])

    const refreshAll = () => queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    const isRefreshing = summaryQuery.isFetching || recentParcelsQuery.isFetching || periodStatsQuery.isFetching

    const openParcel = (parcel: any) => setSelectedParcel(parcel)


    const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label || "Today"
    const stats = buildStats({
        data: summaryQuery.data ?? null,
        isLoadingSummary: summaryQuery.isPending,
        periodStats: periodStatsQuery.data ?? null,
        // Placeholder data is the previous period's figures — loading until
        // the selected period's own response arrives.
        isLoadingPeriodStats: periodStatsQuery.isPending || periodStatsQuery.isPlaceholderData,
        periodLabel,
    })

    // Only surface an error when there's nothing to show; a failed background
    // refresh keeps the last good figures on screen.
    const statsFailed =
        (summaryQuery.isError && !summaryQuery.data) || (periodStatsQuery.isError && !periodStatsQuery.data)
    const recentParcels = recentParcelsQuery.data?.data ?? []

    return (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="space-y-10 pb-16"
            >
                {/* Header */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-[#242a37] dark:text-white">
                            {greeting}, <span className="text-[#ffd428]">{userName.split(" ")[0]}</span>
                        </h1>
                        <p className="mt-1 text-sm font-medium text-slate-400">
                            {snapshotLabel ||
                                `Overview for ${new Date().toLocaleDateString(localeString, {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                })}`}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex w-fit rounded-[var(--ds-radius-small)] bg-slate-100 p-1.5 dark:bg-[#20283a]">
                            {PERIOD_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setPeriod(option.value)}
                                    aria-pressed={period === option.value}
                                    className={cn(
                                        "h-9 whitespace-nowrap rounded-[var(--ds-radius-small)] px-4 text-xs font-semibold transition-all",
                                        period === option.value
                                            ? "bg-white text-[#ffd428] shadow-[var(--ds-shadow-raised)] dark:bg-[#242a37]"
                                            : "text-slate-400",
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={refreshAll}
                            disabled={isRefreshing}
                            aria-label={tr("Refresh dashboard")}
                            title={tr("Refresh dashboard")}
                            className="size-12 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10"
                        >
                            <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                {statsFailed && (
                    <SectionError
                        message="Some figures couldn't be loaded."
                        onRetry={refreshAll}
                        isRetrying={isRefreshing}
                    />
                )}

                {/* Stats */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={stat.title}
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.07 }}
                            className="h-full"
                        >
                            <Card className="group relative h-full overflow-hidden rounded-[var(--ds-radius-large)] border-none bg-[#242a37] shadow-[var(--ds-shadow-raised)] transition-all duration-300">
                                <div className="pointer-events-none absolute bottom-[-15px] right-[-15px] rotate-12 text-[#ffd428] opacity-[0.05] transition-transform">
                                    <Icon icon={stat.icon} size={100} />
                                </div>
                                <CardContent className="relative z-10 p-6">
                                    <div className="mb-4 flex items-center justify-between">
                                        <div className="flex size-10 items-center justify-center rounded-[var(--ds-radius-small)] bg-white/5">
                                            <Icon icon={stat.icon} className="size-5 text-[#ffd428]" />
                                        </div>
                                    </div>
                                    <p className="mb-1 text-xs font-semibold text-[#ffd428]/60">
                                        {stat.title}
                                    </p>
                                    {stat.loading ? (
                                        <Skeleton className="h-7 w-20 bg-white/10" />
                                    ) : (
                                        <h3 className="text-xl font-semibold leading-tight text-white">
                                            {stat.value}
                                        </h3>
                                    )}
                                    <p className="mt-2 text-xs font-bold text-white/40">{stat.sub}</p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Recent Parcels */}
                <Card className="gap-0 overflow-hidden py-0 rounded-[var(--ds-radius-large)] border-slate-100 dark:border-white/5 shadow-[var(--ds-shadow-raised)]">
                    {/* Banner header — same as All Companies */}
                    <div className="bg-[#242a37] text-white p-8 relative overflow-hidden">
                        <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-[0.08] pointer-events-none transform scale-125">
                            <Icon icon={Package01Icon} size={140} />
                        </div>
                        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-2xl font-bold">{tr("Recent Parcels")}</CardTitle>
                                <CardDescription className="text-white/50 font-medium text-sm">{recentParcels.length > 0
                                    ? tr("The latest {recentParcelsCount} booking{s} · refreshes every minute", { recentParcelsCount: recentParcels.length, s: recentParcels.length === 1 ? "" : "s" })
                                    : tr("Refreshes every minute")}</CardDescription>
                            </div>
                            <Button asChild className="w-fit h-10 px-6 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-large)] font-semibold text-xs border-none">
                                <Link href={localized(`${basePath}/parcels`)}>{tr("View all parcels")}<ArrowRight aria-hidden />
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <CardContent className="p-0 bg-slate-50/50 dark:bg-black/10">
                        {recentParcelsQuery.isPending ? (
                            <div className="divide-y divide-[var(--ds-border)]" aria-busy="true" aria-label={tr("Loading recent parcels")}>
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-6 px-6 py-3.5">
                                        <div className="w-36 space-y-1.5">
                                            <Skeleton className="h-4 w-28" />
                                            <Skeleton className="h-3 w-16" />
                                        </div>
                                        <Skeleton className="hidden h-4 w-28 md:block" />
                                        <Skeleton className="hidden h-4 w-28 md:block" />
                                        <Skeleton className="hidden h-4 w-40 lg:block" />
                                        <Skeleton className="ml-auto h-4 w-20" />
                                    </div>
                                ))}
                            </div>
                        ) : recentParcelsQuery.isError && !recentParcelsQuery.data ? (
                            <div className="p-6">
                                <SectionError
                                    message="Recent parcels couldn't be loaded."
                                    onRetry={() => recentParcelsQuery.refetch()}
                                    isRetrying={recentParcelsQuery.isFetching}
                                />
                            </div>
                        ) : recentParcels.length === 0 ? (
                            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                                <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[var(--ds-background-neutral-subtle-hovered)]">
                                    <Package className="size-5 text-[var(--ds-icon-subtle)]" aria-hidden />
                                </div>
                                <p className="text-sm font-semibold text-[var(--ds-text)]">{tr("No parcels yet")}</p>
                                <p className="mt-1 text-sm text-[var(--ds-text-subtlest)]">{tr("New bookings will appear here as they're created.")}</p>
                            </div>
                        ) : (
                            <>
                                {/* Phones: stacked list */}
                                <ul className="divide-y divide-[var(--ds-border)] md:hidden">
                                    {recentParcels.map((parcel: any, i: number) => (
                                        <li key={parcel.id ?? parcel.parcelNumber ?? i}>
                                            <button
                                                type="button"
                                                onClick={() => openParcel(parcel)}
                                                className="flex w-full flex-col gap-2 px-4 py-3.5 text-left outline-none transition-colors hover:bg-[var(--ds-background-neutral-subtle-hovered)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ds-border-focused)]"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="text-sm font-semibold text-[var(--ds-text)]">{parcel.parcelNumber}</span>
                                                    <StatusBadge status={parcel.status} />
                                                </div>
                                                <RouteCell origin={parcel.origin?.name} destination={parcel.destination?.name} />
                                                <p className="truncate text-xs text-[var(--ds-text-subtlest)]">
                                                    {parcel.senderName || "—"} → {parcel.recipientName || "—"}
                                                    {timeAgo(parcel.createdAt) && ` · ${timeAgo(parcel.createdAt)}`}
                                                </p>
                                            </button>
                                        </li>
                                    ))}
                                </ul>

                                {/* Tablet and up: table */}
                                <Table className="hidden table-fixed md:table">
                                    <TableHeader>
                                        {/* Navy header with yellow labels, matching the portal's other tables */}
                                        <TableRow className="bg-[#242a37] border-b border-transparent hover:bg-[#242a37]">
                                            <TableHead className="w-[24%] px-6 py-4 font-semibold text-[#ffd428] text-xs">{tr("Parcel Detail")}</TableHead>
                                            <TableHead className="w-[19%] py-4 font-semibold text-[#ffd428] text-xs">{tr("Sender")}</TableHead>
                                            <TableHead className="w-[19%] py-4 font-semibold text-[#ffd428] text-xs">{tr("Recipient")}</TableHead>
                                            <TableHead className="hidden lg:table-cell py-4 font-semibold text-[#ffd428] text-xs">{tr("Route")}</TableHead>
                                            <TableHead className="w-[140px] px-6 text-center py-4 font-semibold text-[#ffd428] text-xs">{tr("Status")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentParcels.map((parcel: any, i: number) => (
                                            <TableRow
                                                key={parcel.id ?? parcel.parcelNumber ?? i}
                                                tabIndex={0}
                                                aria-label={tr("Open parcel {parcelNumber}", { parcelNumber: parcel.parcelNumber })}
                                                onClick={() => openParcel(parcel)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault()
                                                        openParcel(parcel)
                                                    }
                                                }}
                                                className="hover:bg-white dark:hover:bg-white/[0.04] transition-colors border-b border-slate-200/60 dark:border-white/5 cursor-pointer group outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ds-border-focused)]"
                                            >
                                                <TableCell className="px-6 py-4">
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        <div className="min-w-0">
                                                            <p className="truncate font-semibold text-sm text-slate-900 dark:text-white group-hover:text-[#ffd428] transition-colors">{parcel.parcelNumber}</p>
                                                            <div className="flex items-center gap-2 mt-1 min-w-0">
                                                                <Badge variant="outline" className="bg-[#ffd428]/10 text-[#ffd428] border-none text-[11px] font-semibold h-5 px-2 rounded-md shrink-0">{tr("ID: {padStart}", { padStart: String(parcel.id ?? "—").padStart(3, "0") })}</Badge>
                                                                <p className="truncate text-xs text-slate-400 font-bold">{timeAgo(parcel.createdAt) ?? ""}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <PartyCell name={parcel.senderName} phone={parcel.senderPhoneNumber} />
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <PartyCell name={parcel.recipientName} phone={parcel.recipientPhoneNumber} />
                                                </TableCell>
                                                <TableCell className="hidden py-4 lg:table-cell">
                                                    <RouteCell origin={parcel.origin?.name} destination={parcel.destination?.name} />
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-center">
                                                    <StatusBadge status={parcel.status} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Parcel Detail Sheet */}
                <ParcelViewSheet parcel={selectedParcel} onClose={() => setSelectedParcel(null)} onChanged={refreshAll} />
            </motion.div>
        </AnimatePresence>
    )
}
