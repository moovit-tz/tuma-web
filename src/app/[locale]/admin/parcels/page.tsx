"use client"

import React, { useState, useEffect } from "react"
import { cardValueClass } from "@/lib/card-text"
import { useAccess } from "@/hooks/use-access"
import { Icon } from "@/components/ui/icon"
import { 
    MoneyReceive01Icon,
    OfficeIcon,
    AnalyticsUpIcon,
    Package01Icon,
    BusIcon,
    Location01Icon,
    UserGroupIcon, Search01Icon, FilterIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Search,
    Download,
    RefreshCw,
    Eye,
    MoreHorizontal,
    TrendingUp,
    CheckCircle,
    XCircle,
    Clock,
    Package,
    PackageCheck,
    Bus,
    MapPin,
    User,
    Weight,
    PackageX,
    History,
    PackageSearch,
    Building,
    X as XIcon,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    Filter,
    Loader2,
    FileText,
    BarChart3,
    Target,
    Zap,
    Phone,
    RotateCcw,
    DollarSign,
} from "lucide-react"
import { format, subDays } from "date-fns"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ListSkeleton } from "@/components/ui/skeletons"
import { ParcelViewSheet } from "@/components/parcel/parcel-view-sheet"
import { getRegions } from "@/lib/services/location"
import { cn } from "@/lib/utils"
import { getParcels, getParcelStats, getRegionVolumes, trackParcel, reverseCancellation, cancelParcel } from "@/lib/services/parcel"
import type { Parcel } from "@/lib/services/parcel"
import type { ParcelStats } from "@/types/parcel"
import { TableBanner } from "@/components/ui/table-banner"
import { useSearchLanding } from "@/hooks/use-search-landing"
import { getParcel } from "@/lib/services/parcel"
import { useTr } from "@/lib/i18n/portal"

const formatTZS = (amount: number) => {
    return (
        <div className="flex items-center gap-1.5 min-w-0">
            <Icon icon={MoneyReceive01Icon} size={14} className="text-[#ffd428] flex-shrink-0" />
            <span className="truncate">{amount.toLocaleString()}</span>
        </div>
    )
}

const PARCEL_PERIODS = [
    { value: "today", label: "Today" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "all", label: "All Time" },
] as const

// Same status colours as the dashboard's Recent parcels
const PARCEL_LOZENGE: Record<string, string> = {
    DELIVERED: "bg-[#ffd428] text-[#242a37]",
    PICKED_UP: "bg-[#ffd428] text-[#242a37]",
    DISPATCHED: "bg-[#242a37] text-white dark:bg-white dark:text-[#242a37]",
    IN_TRANSIT: "bg-[#242a37] text-white dark:bg-white dark:text-[#242a37]",
    OFFLOADED: "bg-[#242a37] text-white dark:bg-white dark:text-[#242a37]",
    RECEIVED: "bg-[#242a37]/10 text-[#242a37] dark:bg-white/10 dark:text-white",
    CANCELED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    CANCELLED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
}

const getStatusColor = (status: string): string => {
    switch (status) {
        case "RECEIVED":
            return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200"
        case "DISPATCHED":
            return "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-200"
        case "OFFLOADED":
            return "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-200"
        case "DELIVERED":
            return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200"
        case "CANCELED":
            return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200"
        case "PICKED_UP":
            return "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-200"
        default:
            return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200"
    }
}

const getStatusIcon = (status: string) => {
    switch (status) {
        case "RECEIVED":
            return <Clock className="h-3.5 w-3.5" />
        case "DISPATCHED":
            return <Bus className="h-3.5 w-3.5" />
        case "OFFLOADED":
            return <MapPin className="h-3.5 w-3.5" />
        case "DELIVERED":
            return <CheckCircle className="h-3.5 w-3.5" />
        case "CANCELED":
            return <XCircle className="h-3.5 w-3.5" />
        case "PICKED_UP":
            return <PackageCheck className="h-3.5 w-3.5" />
        default:
            return <AlertTriangle className="h-3.5 w-3.5" />
    }
}

export default function ParcelsPage() {
    const tr = useTr()
    const queryClient = useQueryClient()
    const { can } = useAccess()
    const [activeTab, setActiveTab] = useState("overview")
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [currentPage, setCurrentPage] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [parcels, setParcels] = useState<Parcel[]>([])
    const [totalPages, setTotalPages] = useState(1)
    const [totalItems, setTotalItems] = useState(0)
    const [error, setError] = useState<string | null>(null)

    // Dialog states
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [isTrackDialogOpen, setIsTrackDialogOpen] = useState(false)
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false)
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)

    // Data states for dialogs
    const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null)
    const [viewingParcel, setViewingParcel] = useState<Parcel | null>(null)
    const [trackingNumber, setTrackingNumber] = useState("")
    const [trackingData, setTrackingData] = useState<any>(null)
    const [cancelReason, setCancelReason] = useState("")
    const [isTrackingParcel, setIsTrackingParcel] = useState(false)

    const perPage = 10

    // Overview period — same options as Companies
    const [overviewPeriod, setOverviewPeriod] = useState<(typeof PARCEL_PERIODS)[number]["value"]>("today")
    const periodRange = React.useMemo(() => {
        if (overviewPeriod === "all") return null
        const today = new Date()
        const from = overviewPeriod === "today" ? today : subDays(today, overviewPeriod === "7d" ? 6 : 29)
        return { dateFrom: format(from, "yyyy-MM-dd"), dateTo: format(today, "yyyy-MM-dd") }
    }, [overviewPeriod])
    // Counts by status for the period (one summary request; no sampling)
    const { data: periodStats } = useQuery({
        queryKey: ["parcels-page-stats", periodRange],
        queryFn: () => getParcelStats({ ...(periodRange ?? {}), includeTotals: false }),
        staleTime: 60_000,
    })
    // Exact revenue and busiest regions for the period (backend grouped query)
    const { data: regionVolumes } = useQuery({
        queryKey: ["region-volumes", periodRange ?? {}],
        queryFn: ({ signal }) => getRegionVolumes(periodRange, signal),
        staleTime: 5 * 60_000,
    })
    const { data: allRegions = [] } = useQuery({
        queryKey: ["regions-all-for-mapping"],
        queryFn: async () => getRegions(),
        staleTime: 10 * 60_000,
    })

    // Fetch parcels data
    const fetchParcels = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const response = await getParcels({
                page: currentPage,
                perPage,
                status: statusFilter !== "all" ? statusFilter : undefined,
                search: searchQuery || undefined,
            })

            if (response.success) {
                setParcels(response.data.parcels)
                setTotalPages(response.data.pagination.totalPages)
                setTotalItems(response.data.pagination.totalItems)
            }
        } catch (err) {
            console.error("Error fetching parcels:", err)
            setError("Failed to load parcels. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    // Initial load
    useEffect(() => {
        fetchParcels()
    }, [currentPage, statusFilter])

    // Search with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentPage === 1) {
                fetchParcels()
            } else {
                setCurrentPage(1)
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [searchQuery])

    const handleRefresh = () => {
        fetchParcels()
        queryClient.invalidateQueries({ queryKey: ["parcels-page-stats"] })
    }

    const clearFilters = () => {
        setSearchQuery("")
        setStatusFilter("all")
        setCurrentPage(1)
    }

    // Dialog handlers
    const handleViewParcel = (parcel: Parcel) => {
        setViewingParcel(parcel)
        setIsViewDialogOpen(true)
    }

    const handleTrackDialog = () => {
        setTrackingNumber("")
        setTrackingData(null)
        setIsTrackDialogOpen(true)
    }

    const handleViewHistory = (parcel: Parcel) => {
        setSelectedParcel(parcel)
        setIsHistoryDialogOpen(true)
    }

    const handleCancelParcel = (parcel: Parcel) => {
        setSelectedParcel(parcel)
        setCancelReason("")
        setIsCancelDialogOpen(true)
    }

    const handleTrackSubmit = async () => {
        if (!trackingNumber.trim()) return

        setIsTrackingParcel(true)
        try {
            const data = await trackParcel(trackingNumber.trim())
            setTrackingData(data)
        } catch (err) {
            console.error("Error tracking parcel:", err)
            setError("Failed to track parcel. Please try again.")
        } finally {
            setIsTrackingParcel(false)
        }
    }

    const handleCancelConfirm = async () => {
        if (!selectedParcel || !cancelReason.trim()) return

        try {
            if (selectedParcel.status === "CANCELED") {
                await reverseCancellation(selectedParcel.id)
            } else {
                await cancelParcel(selectedParcel.id, cancelReason)
            }
            setIsCancelDialogOpen(false)
            setCancelReason("")
            fetchParcels()
            queryClient.invalidateQueries({ queryKey: ["parcels-page-stats"] })
        } catch (err) {
            console.error("Error canceling parcel:", err)
            setError("Failed to cancel parcel. Please try again.")
        }
    }

    const periodLabel = PARCEL_PERIODS.find((p) => p.value === overviewPeriod)?.label ?? "Today"
    const statusRows = periodStats
        ? [
            { key: "RECEIVED", label: tr("Received"), value: periodStats.received, color: "#94a3b8" },
            { key: "DISPATCHED", label: tr("Dispatched"), value: periodStats.dispatched, color: "#3b82f6" },
            { key: "OFFLOADED", label: tr("Offloaded"), value: periodStats.offloaded, color: "#8b5cf6" },
            { key: "PICKED_UP", label: tr("Picked up"), value: periodStats.pickedUp, color: "#14b8a6" },
            { key: "DELIVERED", label: tr("Delivered"), value: periodStats.delivered, color: "#ffd428" },
            { key: "CANCELED", label: tr("Cancelled"), value: periodStats.lost, color: "#f43f5e" },
        ]
        : []
    const pct = (n?: number) => (periodStats && periodStats.total > 0 ? `${(((n ?? 0) / periodStats.total) * 100).toFixed(1)}%` : "—")

    const regionName = (id: number) => (allRegions as any[]).find((r) => Number(r.id) === id)?.name ?? `Region #${id}`
    const rankRegions = (map?: Record<number, { parcels: number; revenue: number }>) =>
        Object.entries(map ?? {})
            .map(([id, v]) => ({ id: Number(id), name: regionName(Number(id)), parcels: v.parcels }))
            .filter((r) => r.parcels > 0)
            .sort((a, b) => b.parcels - a.parcels)
            .slice(0, 5)
    const topOrigins = rankRegions(regionVolumes?.sent)
    const topDestinations = rankRegions(regionVolumes?.received)
    // Opened from the portal search: fill the search and open the result
    useSearchLanding({ setSearch: setSearchQuery, showList: () => setActiveTab("parcels"), items: parcels, ready: !isLoading, onOpen: handleViewParcel, fetchOne: (id) => getParcel(Number(id)) as any })

    return (
        <div>
            <div className="space-y-10 animate-in fade-in duration-300">
                {/* ── Top bar — same layout as Companies ── */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 justify-between">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 flex-1 min-w-0">
                        <div className="relative group flex-1 min-w-0 lg:min-w-[16rem]">
                            <Icon icon={Search01Icon} size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ffd428] transition-colors" />
                            <Input
                                placeholder={tr("Search parcels")}
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value) setActiveTab("parcels") }}
                                className="h-10 pl-10 pr-9 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-normal placeholder:text-slate-400 focus:ring-1 focus:ring-[#ffd428]/50 shadow-none w-full"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    aria-label={tr("Clear search")}
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-[#242a37] dark:hover:text-white"
                                >
                                    <XIcon className="size-4" />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); setActiveTab("parcels") }}>
                                <SelectTrigger className="w-full sm:w-44 h-10 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-medium shadow-none outline-none focus:ring-1 focus:ring-[#ffd428]/50">
                                    <div className="flex items-center gap-2">
                                        <Icon icon={FilterIcon} size={16} className="shrink-0 text-slate-500 dark:text-slate-400" />
                                        <SelectValue placeholder="STATUS" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-sm">{tr("All statuses")}</SelectItem>
                                    <SelectItem value="RECEIVED" className="text-sm">{tr("Received")}</SelectItem>
                                    <SelectItem value="DISPATCHED" className="text-sm">{tr("Dispatched")}</SelectItem>
                                    <SelectItem value="OFFLOADED" className="text-sm">{tr("Offloaded")}</SelectItem>
                                    <SelectItem value="PICKED_UP" className="text-sm">{tr("Picked up")}</SelectItem>
                                    <SelectItem value="DELIVERED" className="text-sm">{tr("Delivered")}</SelectItem>
                                    <SelectItem value="CANCELED" className="text-sm">{tr("Cancelled")}</SelectItem>
                                </SelectContent>
                            </Select>
                            {(searchQuery || statusFilter !== "all") && (
                                <Button variant="ghost" onClick={clearFilters} className="h-10 text-sm font-medium">
                                    <XIcon className="size-4 mr-1" />{" "}{tr("Clear")}</Button>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleRefresh}
                            disabled={isLoading}
                            aria-label={tr("Refresh parcels")}
                            className="h-10 w-10 text-slate-400 hover:text-[#ffd428] rounded-[var(--ds-radius-small)]"
                        >
                            <RefreshCw className={cn("size-5", isLoading && "animate-spin")} />
                        </Button>
                        <Button
                            onClick={handleTrackDialog}
                            className="h-10 px-5 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-small)] font-semibold text-sm shadow-[var(--ds-shadow-raised)] transition-colors flex items-center gap-3 cursor-pointer"
                        >
                            <PackageSearch className="size-5" />{tr("Track Parcel")}</Button>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-3 rounded-[var(--ds-radius-small)] bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
                        <AlertTriangle className="size-4 shrink-0" />
                        <p className="flex-1">{error}</p>
                        <Button variant="outline" size="sm" onClick={handleRefresh}>{tr("Try again")}</Button>
                    </div>
                )}

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                    <TabsList className="portal-sticky-tabs bg-slate-100 dark:bg-black/20 p-1.5 rounded-[var(--ds-radius-small)] w-full items-stretch h-auto">
                        <TabsTrigger value="overview" className="flex-1 h-11 text-xs font-semibold cursor-pointer">
                            <BarChart3 className="size-4 mr-2" />{tr("Overview")}</TabsTrigger>
                        <TabsTrigger value="parcels" className="flex-1 h-11 text-xs font-semibold gap-3 cursor-pointer">
                            <div className="flex items-center gap-2">
                                <Package className="size-4" />{tr("All Parcels")}</div>
                            <Badge className="bg-[#ffd428] text-[#242a37] border-none text-xs font-semibold h-6 min-w-10 flex items-center justify-center rounded-[var(--ds-radius-small)]">
                                {totalItems.toLocaleString()}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>

                    {/* ════════ OVERVIEW ════════ */}
                    <TabsContent value="overview" className="space-y-10 focus:outline-none">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <h2 className="text-lg font-semibold text-[#242a37] dark:text-white">{tr("Performance")}</h2>
                                <p className="text-xs font-bold text-slate-400 mt-1">{tr("Figures for the selected period")}</p>
                            </div>
                            <div className="flex p-1.5 bg-slate-100 dark:bg-black/20 rounded-[var(--ds-radius-small)] w-fit max-w-full overflow-x-auto">
                                {PARCEL_PERIODS.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setOverviewPeriod(option.value)}
                                        className={cn(
                                            "h-9 px-4 rounded-[var(--ds-radius-small)] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                                            overviewPeriod === option.value
                                                ? "bg-white dark:bg-[#242a37] shadow-[var(--ds-shadow-raised)] text-[#ffd428]"
                                                : "text-slate-400",
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Command cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { label: tr("Parcels"), value: periodStats?.total.toLocaleString(), sub: tr("Booked {periodLabel}", { periodLabel: periodLabel.toLowerCase() }), icon: Package },
                                { label: tr("Delivered"), value: periodStats?.delivered.toLocaleString(), sub: tr("{pct} of parcels", { pct: pct(periodStats?.delivered) }), icon: PackageCheck },
                                { label: tr("Cancelled"), value: periodStats?.lost.toLocaleString(), sub: tr("{pct} of parcels", { pct: pct(periodStats?.lost) }), icon: PackageX },
                            ].map((card) => (
                                <Card key={card.label} className="rounded-[var(--ds-radius-large)] border-none h-full bg-[#242a37] relative overflow-hidden shadow-[var(--ds-shadow-raised)]">
                                    <div className="absolute right-[-15px] bottom-[-15px] opacity-[0.05] text-[#ffd428] pointer-events-none rotate-12">
                                        <card.icon size={100} />
                                    </div>
                                    <CardContent className="p-6 relative z-10">
                                        <div className="size-10 rounded-[var(--ds-radius-small)] flex items-center justify-center bg-white/5 mb-4">
                                            <card.icon className="size-5 text-[#ffd428]" />
                                        </div>
                                        <p className="text-xs font-semibold text-[#ffd428]/60 mb-1">{card.label}</p>
                                        {card.value === undefined ? (
                                            <Skeleton className="h-7 w-24 bg-white/10" />
                                        ) : (
                                            <h3 className={cn(cardValueClass(card.value), "font-semibold leading-tight text-white tabular-nums line-clamp-2 break-words")} title={(card as any).title ?? String(card.value)}>{card.value}</h3>
                                        )}
                                        <p className="text-xs font-bold text-white/40 mt-2">{card.sub}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Status breakdown */}
                            <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden">
                                <CardHeader className="py-8 px-6 bg-[#242a37] text-white border-none">
                                    <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                        <BarChart3 className="size-6 text-[#ffd428]" />{tr("Status")}</CardTitle>
                                    <CardDescription className="text-xs font-bold text-white/40 mt-1">{tr("Where the period's parcels are now · {periodLabel}", { periodLabel })}</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-5">
                                    {!periodStats ? (
                                        <ListSkeleton rows={6} className="-mx-5 -my-4" />
                                    ) : periodStats.total === 0 ? (
                                        <p className="text-sm text-slate-400">{tr("No parcels {periodLabel}.", { periodLabel: periodLabel.toLowerCase() })}</p>
                                    ) : statusRows.map((row) => (
                                        <button
                                            key={row.key}
                                            type="button"
                                            onClick={() => { setStatusFilter(row.key); setCurrentPage(1); setActiveTab("parcels") }}
                                            className="block w-full text-left group cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="flex items-center gap-2 text-sm font-semibold text-[#242a37] dark:text-white">
                                                    <span className="size-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                                                    {row.label}
                                                </span>
                                                <span className="text-sm font-semibold tabular-nums text-[#242a37] dark:text-white">
                                                    {row.value.toLocaleString()}
                                                    <span className="ml-2 text-xs font-normal text-slate-400">{pct(row.value)}</span>
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                                                <div className="h-full rounded-full transition-all" style={{ width: pct(row.value) === "—" ? 0 : pct(row.value), backgroundColor: row.color }} />
                                            </div>
                                        </button>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Recent parcels */}
                            <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden">
                                <CardHeader className="py-8 px-6 bg-[#242a37] text-white border-none">
                                    <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                        <Clock className="size-6 text-[#ffd428]" />{tr("Recent parcels")}</CardTitle>
                                    <CardDescription className="text-xs font-bold text-white/40 mt-1">{tr("The newest bookings")}</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-slate-50 dark:divide-white/5">
                                        {isLoading && parcels.length === 0 ? (
                                            <ListSkeleton rows={5} />
                                        ) : parcels.length === 0 ? (
                                            <p className="p-6 text-sm text-slate-400">{tr("No parcels yet.")}</p>
                                        ) : parcels.slice(0, 5).map((parcel) => (
                                            <button
                                                key={parcel.id}
                                                type="button"
                                                onClick={() => handleViewParcel(parcel)}
                                                className="w-full text-left px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-4 cursor-pointer"
                                            >
                                                <div className="min-w-0">
                                                    <p className="font-mono text-sm font-semibold text-[#242a37] dark:text-white truncate">{parcel.parcelNumber}</p>
                                                    <p className="text-xs font-bold text-slate-400 mt-1 truncate">
                                                        {parcel.origin?.name || "—"} → {parcel.destination?.name || "—"} · {format(new Date(parcel.createdAt), "d MMM, HH:mm")}
                                                    </p>
                                                </div>
                                                <Badge className={cn("h-7 shrink-0 rounded-[var(--ds-radius-small)] px-3 text-xs font-semibold border-none", PARCEL_LOZENGE[parcel.status] ?? "bg-slate-100 text-slate-700")}>
                                                    {String(parcel.status).replace(/_/g, " ")}
                                                </Badge>
                                            </button>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Busiest routes ends */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {[
                                { title: tr("Busiest origins"), desc: "Regions parcels are sent from", rows: topOrigins, unit: "sent" },
                                { title: tr("Busiest destinations"), desc: "Regions parcels are sent to", rows: topDestinations, unit: "received" },
                            ].map((list) => (
                                <Card key={list.title} className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden">
                                    <CardHeader className="py-8 px-6 bg-[#242a37] text-white border-none">
                                        <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                            <MapPin className="size-6 text-[#ffd428]" />
                                            {list.title}
                                        </CardTitle>
                                        <CardDescription className="text-xs font-bold text-white/40 mt-1">{list.desc} · {periodLabel}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-slate-50 dark:divide-white/5">
                                            {!regionVolumes ? (
                                                <ListSkeleton rows={5} avatar />
                                            ) : list.rows.length === 0 ? (
                                                <p className="p-6 text-sm text-slate-400">{tr("No parcels {periodLabel}.", { periodLabel: periodLabel.toLowerCase() })}</p>
                                            ) : list.rows.map((row, i) => (
                                                <div key={row.id} className="px-6 py-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        <div className={cn("size-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold",
                                                            i === 0 ? "bg-[#ffd428] text-[#242a37]" : "bg-slate-100 dark:bg-white/5 text-slate-400")}>
                                                            {i + 1}
                                                        </div>
                                                        <p className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{row.name}</p>
                                                    </div>
                                                    <div className="text-right shrink-0 ml-4">
                                                        <p className="text-[13px] font-semibold tabular-nums text-[#242a37] dark:text-white">{row.parcels.toLocaleString()}</p>
                                                        <p className="text-xs font-semibold text-slate-400">{list.unit}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    {/* ════════ ALL PARCELS ════════ */}
                    <TabsContent value="parcels" className="space-y-8">
                        <div className="bg-white dark:bg-[#1a1f2b] rounded-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)] border border-slate-100 dark:border-white/5 overflow-hidden">
                            <TableBanner title={tr("All Parcels")} description={tr("Every parcel booked across the network")} icon="parcels" />
                            {isLoading && parcels.length === 0 ? (
                                <ListSkeleton rows={8} />
                            ) : parcels.length === 0 ? (
                                <div className="px-6 py-16 text-center">
                                    <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("No parcels found")}</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {searchQuery || statusFilter !== "all" ? tr("Try a different search or status.") : tr("There are no parcels yet.")}
                                    </p>
                                    {(searchQuery || statusFilter !== "all") && (
                                        <Button variant="outline" className="mt-4" onClick={clearFilters}>{tr("Reset filters")}</Button>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-slate-50/50 dark:bg-black/10">
                                    <div className="overflow-x-auto">
                                        <Table className="min-w-[1000px]">
                                            <TableHeader>
                                                <TableRow className="bg-[#242a37] border-b border-transparent hover:bg-[#242a37]">
                                                    <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs">{tr("Parcel Detail")}</TableHead>
                                                    <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Sender")}</TableHead>
                                                    <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Recipient")}</TableHead>
                                                    <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Route")}</TableHead>
                                                    <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Price")}</TableHead>
                                                    <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-center">{tr("Status")}</TableHead>
                                                    <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Actions")}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {parcels.map((parcel) => (
                                                    <TableRow
                                                        key={parcel.id}
                                                        tabIndex={0}
                                                        aria-label={tr("Open parcel {parcelNumber}", { parcelNumber: parcel.parcelNumber })}
                                                        onClick={() => handleViewParcel(parcel)}
                                                        onKeyDown={(e) => {
                                                            if (e.target !== e.currentTarget) return
                                                            if (e.key === "Enter" || e.key === " ") {
                                                                e.preventDefault()
                                                                handleViewParcel(parcel)
                                                            }
                                                        }}
                                                        className="hover:bg-white dark:hover:bg-white/[0.04] transition-colors border-b border-slate-200/60 dark:border-white/5 cursor-pointer group outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ds-border-focused)]"
                                                    >
                                                        <TableCell className="px-6 py-4">
                                                            <p className="font-mono font-semibold text-sm text-slate-900 dark:text-white group-hover:text-[#ffd428] transition-colors">{parcel.parcelNumber}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge variant="outline" className="bg-[#ffd428]/10 text-[#ffd428] border-none text-[11px] font-semibold h-5 px-2 rounded-md">{tr("ID: {padStart}", { padStart: String(parcel.id).padStart(3, "0") })}</Badge>
                                                                <p className="text-xs text-slate-400 font-bold truncate">{format(new Date(parcel.createdAt), "d MMM yyyy")}</p>
                                                            </div>
                                                        </TableCell>
                                                        {[
                                                            { name: parcel.senderName, phone: parcel.senderPhoneNumber },
                                                            { name: parcel.recipientName, phone: parcel.recipientPhoneNumber },
                                                        ].map((party, i) => (
                                                            <TableCell key={i} className="py-4">
                                                                <div className="space-y-1.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="size-1.5 rounded-full bg-[#ffd428]" />
                                                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">{party.name || "—"}</p>
                                                                    </div>
                                                                    {party.phone && (
                                                                        <div className="h-[18px] px-2.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[6px] text-xs font-semibold tabular-nums text-slate-400 w-fit flex items-center">
                                                                            {party.phone}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        ))}
                                                        <TableCell className="py-4">
                                                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{parcel.origin?.name || "—"}</p>
                                                            <p className="mt-1 text-xs text-slate-400">→ {parcel.destination?.name || "—"}</p>
                                                        </TableCell>
                                                        <TableCell className="py-4">
                                                            <div className="flex flex-col gap-1.5">
                                                                <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">{formatTZS(parcel.price || 0)}</span>
                                                                <p className="text-xs font-semibold text-slate-400 leading-none">
                                                                    {parcel.weight ? tr("{weight} kg", { weight: parcel.weight }) : "—"}{parcel.parcelType?.name ? ` · ${parcel.parcelType.name}` : ""}
                                                                </p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-4 text-center">
                                                            <Badge className={cn("h-7 rounded-[var(--ds-radius-small)] px-3 text-xs font-semibold border-none", PARCEL_LOZENGE[parcel.status] ?? "bg-slate-100 text-slate-700")}>
                                                                {String(parcel.status).replace(/_/g, " ")}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-right">
                                                            <DropdownMenu modal={false}>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" aria-label={tr("Actions for {parcelNumber}", { parcelNumber: parcel.parcelNumber })} className="size-10 rounded-[var(--ds-radius-small)] bg-slate-50 dark:bg-white/5 hover:bg-[#ffd428] dark:hover:bg-[#ffd428] hover:text-[#242a37] text-slate-400 transition-colors cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                                                        <MoreHorizontal className="size-5" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-64 rounded-[var(--ds-radius-large)] bg-white dark:bg-[#242a37] border-slate-100 dark:border-white/5 p-2 shadow-[var(--ds-shadow-raised)] mt-2" onClick={(e) => e.stopPropagation()}>
                                                                    <DropdownMenuItem onClick={() => handleViewParcel(parcel)} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold focus:bg-[#ffd428] focus:text-[#242a37] cursor-pointer">
                                                                        <Eye className="size-5 mr-3" />{" "}{tr("View Parcel")}</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleViewHistory(parcel)} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold focus:bg-[#ffd428] focus:text-[#242a37] cursor-pointer">
                                                                        <History className="size-5 mr-3" />{" "}{tr("View History")}</DropdownMenuItem>
                                                                    {parcel.status !== "DELIVERED" && can(parcel.status === "CANCELED" ? "parcels.reverse_cancellation" : "parcels.cancel") && (
                                                                        <>
                                                                            <DropdownMenuSeparator className="my-2 bg-slate-50 dark:bg-white/5" />
                                                                            <DropdownMenuItem
                                                                                onClick={() => handleCancelParcel(parcel)}
                                                                                className={cn("rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold cursor-pointer",
                                                                                    parcel.status === "CANCELED" ? "focus:bg-[#ffd428] focus:text-[#242a37]" : "text-rose-500 focus:bg-rose-500 focus:text-white")}
                                                                            >
                                                                                {parcel.status === "CANCELED" ? (
                                                                                    <><RotateCcw className="size-5 mr-3" />{" "}{tr("Reverse Cancellation")}</>
                                                                                ) : (
                                                                                    <><XIcon className="size-5 mr-3" />{" "}{tr("Cancel Parcel")}</>
                                                                                )}
                                                                            </DropdownMenuItem>
                                                                        </>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                                        <p className="text-xs text-slate-500">
                                            {tr("Page {currentPage} of {totalPages} · {totalItems} parcels", { currentPage, totalPages, totalItems: totalItems.toLocaleString() })}</p>
                                        <div className="flex items-center gap-2">
                                            <Button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage <= 1 || isLoading} variant="outline" size="sm">
                                                <ChevronLeft className="size-4 mr-1" />{" "}{tr("Previous")}</Button>
                                            <Button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage >= totalPages || isLoading} variant="outline" size="sm">{tr("Next")}{" "}<ChevronRight className="size-4 ml-1" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Track Parcel Dialog */}
            <Dialog open={isTrackDialogOpen} onOpenChange={setIsTrackDialogOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[85vh] p-0 overflow-hidden">
                    <DialogHeader className="px-6 pb-4 pt-6 border-b bg-blue-50 dark:bg-blue-950/30">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-[var(--ds-radius-large)] flex items-center justify-center bg-blue-600 text-white shadow-[var(--ds-shadow-raised)]">
                                <PackageSearch className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold">{tr("Track Your Parcel")}</DialogTitle>
                                <p className="text-sm text-muted-foreground">{tr("Real-time parcel tracking and status updates")}</p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="px-6 py-4 overflow-y-auto max-h-[calc(85vh-180px)]">
                        <div className="space-y-6">
                            {/* Search Input */}
                            <div className="space-y-3">
                                <Label htmlFor="trackingNumber" className="text-sm font-medium">{tr("Parcel Tracking Number")}</Label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        id="trackingNumber"
                                        value={trackingNumber}
                                        onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                                        placeholder={tr("Enter parcel number (e.g., PKG123456)")}
                                        className="font-mono text-base h-14 pl-12 pr-4 border-2 focus:border-blue-500"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && trackingNumber.trim()) {
                                                handleTrackSubmit()
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Tracking Results */}
                            {trackingData && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    {/* Status Card */}
                                    <Card className="border-2 shadow-[var(--ds-shadow-raised)] overflow-hidden">
                                        <div className={`p-4 ${getStatusColor(trackingData.parcel?.status || "")}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    {getStatusIcon(trackingData.parcel?.status || "")}
                                                    <div>
                                                        <p className="text-sm font-medium opacity-90">{tr("Current Status")}</p>
                                                        <p className="text-lg font-bold">{trackingData.parcel?.status || tr("Unknown")}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-mono opacity-90">{trackingData.parcel?.parcelNumber}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <CardContent className="p-4 space-y-3 bg-white dark:bg-slate-900">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <MapPin className="h-4 w-4 text-blue-600" />
                                                        <span className="text-xs font-medium text-muted-foreground">{tr("Origin")}</span>
                                                    </div>
                                                    <p className="font-semibold text-sm">{trackingData.parcel?.origin?.name || "—"}</p>
                                                </div>
                                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <MapPin className="h-4 w-4 text-green-600" />
                                                        <span className="text-xs font-medium text-muted-foreground">{tr("Destination")}</span>
                                                    </div>
                                                    <p className="font-semibold text-sm">{trackingData.parcel?.destination?.name || "—"}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border text-center">
                                                    <Weight className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                                                    <p className="text-xs text-muted-foreground">{tr("Weight")}</p>
                                                    <p className="font-bold text-sm">{trackingData.parcel?.weight || 0}{" "}{tr("kg")}</p>
                                                </div>
                                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border text-center">
                                                    <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-600" />
                                                    <p className="text-xs text-muted-foreground">{tr("Value")}</p>
                                                    <p className="font-bold text-sm">{formatTZS(trackingData.parcel?.value || 0)}</p>
                                                </div>
                                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border text-center">
                                                    <Package className="h-5 w-5 mx-auto mb-1 text-orange-600" />
                                                    <p className="text-xs text-muted-foreground">{tr("Type")}</p>
                                                    <p className="font-bold text-sm">{trackingData.parcel?.parcelType || "N/A"}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Sender & Receiver */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <Card className="border">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-sm flex items-center gap-2">
                                                    <User className="h-4 w-4 text-blue-600" />{tr("Sender")}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-2">
                                                <p className="font-semibold">{trackingData.parcel?.sender?.name || "N/A"}</p>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Phone className="h-3 w-3" />
                                                    <span>{trackingData.parcel?.sender?.phoneNumber || "N/A"}</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        <Card className="border">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-sm flex items-center gap-2">
                                                    <User className="h-4 w-4 text-green-600" />{tr("Receiver")}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-2">
                                                <p className="font-semibold">{trackingData.parcel?.recipient?.name || "N/A"}</p>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Phone className="h-3 w-3" />
                                                    <span>{trackingData.parcel?.recipient?.phoneNumber || "N/A"}</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Tracking History */}
                                    {trackingData.parcel?.trackingHistory && trackingData.parcel.trackingHistory.length > 0 && (
                                        <Card className="border">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-sm flex items-center gap-2">
                                                    <History className="h-4 w-4" />{tr("Tracking Timeline")}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                                    {trackingData.parcel.trackingHistory.map((history: any, index: number) => (
                                                        <div key={index} className="flex gap-3">
                                                            <div className="flex flex-col items-center">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${index === 0 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                                                    {getStatusIcon(history.status)}
                                                                </div>
                                                                {index < trackingData.parcel.trackingHistory.length - 1 && (
                                                                    <div className="w-0.5 h-10 bg-slate-200 dark:bg-slate-700 mt-1" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 pb-2">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="font-semibold text-sm">{history.status}</span>
                                                                    <span className="text-xs text-muted-foreground font-mono">
                                                                        {format(new Date(history.timestamp), "MMM dd, HH:mm")}
                                                                    </span>
                                                                </div>
                                                                {history.description && (
                                                                    <p className="text-xs text-muted-foreground">{history.description}</p>
                                                                )}
                                                                {history.location && (
                                                                    <div className="flex items-center gap-1 mt-1">
                                                                        <MapPin className="h-3 w-3 text-muted-foreground" />
                                                                        <span className="text-xs text-muted-foreground">{history.location}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            )}

                            {/* Error State */}
                            {error && !trackingData && (
                                <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
                                    <CardContent className="p-6 text-center">
                                        <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-600" />
                                        <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">{tr("Tracking Error")}</h3>
                                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Empty State */}
                            {!trackingData && !isTrackingParcel && !error && (
                                <Card className="border-2 border-dashed">
                                    <CardContent className="p-8 text-center">
                                        <PackageSearch className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                                        <h3 className="font-semibold text-lg mb-2">{tr("Ready to Track")}</h3>
                                        <p className="text-sm text-muted-foreground">{tr("Enter your tracking number above and click \"Track Now\" to get real-time updates on your parcel")}</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-4 border-t bg-slate-50 dark:bg-slate-900/50">
                        <Button variant="outline" onClick={() => setIsTrackDialogOpen(false)} className="flex-1 sm:flex-none">{tr("Close")}</Button>
                        <Button
                            onClick={handleTrackSubmit}
                            disabled={isTrackingParcel || !trackingNumber.trim()}
                            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white shadow-[var(--ds-shadow-raised)]"
                        >
                            {isTrackingParcel ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{tr("Tracking...")}</>
                            ) : (
                                <>
                                    <Search className="mr-2 h-4 w-4" />{tr("Track Now")}</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Parcel view — the same sheet as the dashboard's Recent parcels */}
            <ParcelViewSheet
                parcel={isViewDialogOpen ? viewingParcel : null}
                onClose={() => setIsViewDialogOpen(false)}
                onChanged={handleRefresh}
            />

            {/* View History Dialog */}
            <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
                <DialogContent className="sm:max-w-[650px] max-h-[85vh] p-0 overflow-hidden">
                    <DialogHeader className="px-6 pb-4 pt-6 border-b bg-indigo-50 dark:bg-indigo-950/30">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-[var(--ds-radius-large)] flex items-center justify-center bg-indigo-600 text-white shadow-[var(--ds-shadow-raised)]">
                                <History className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold">{tr("Parcel History")}</DialogTitle>
                                <p className="text-sm text-muted-foreground">
                                    {tr("Complete tracking history for {parcelNumber}", { parcelNumber: selectedParcel?.parcelNumber })}</p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="overflow-y-auto max-h-[calc(85vh-180px)] p-6">
                        {selectedParcel && (
                            <div className="space-y-6">
                                {/* Parcel Summary */}
                                <Card className="border-2">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
                                                    <Package className="h-5 w-5 text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold font-mono">{selectedParcel.parcelNumber}</h3>
                                                    <p className="text-sm text-muted-foreground">{selectedParcel.name || tr("General Package")}</p>
                                                </div>
                                            </div>
                                            <Badge className={`${getStatusColor(selectedParcel.status)} flex items-center gap-1`}>
                                                {getStatusIcon(selectedParcel.status)}
                                                {selectedParcel.status}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Timeline */}
                                <div className="space-y-4">
                                    {selectedParcel.tracking && selectedParcel.tracking.length > 0 ? (
                                        selectedParcel.tracking.map((track, index) => (
                                            <div key={track.id} className="flex gap-4">
                                                <div className="flex flex-col items-center">
                                                    <div
                                                        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-[var(--ds-shadow-raised)] ${
                                                            index === 0
                                                                ? 'bg-indigo-600 text-white'
                                                                : 'bg-slate-200 dark:bg-slate-700'
                                                        }`}
                                                    >
                                                        {getStatusIcon(track.status)}
                                                    </div>
                                                    {index < selectedParcel.tracking.length - 1 && (
                                                        <div className="w-0.5 h-16 bg-slate-300 dark:bg-slate-700 my-1" />
                                                    )}
                                                </div>

                                                <Card className={`flex-1 border-2 ${index === 0 ? 'border-indigo-200 dark:border-indigo-800' : ''}`}>
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h4 className="font-semibold">{track.status}</h4>
                                                            <span className="text-xs text-muted-foreground font-mono">
                                                                {format(new Date(track.timestamp), "MMM dd, yyyy HH:mm")}
                                                            </span>
                                                        </div>

                                                        {track.location && (
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                                                <MapPin className="h-3 w-3" />
                                                                <span>{track.location}</span>
                                                            </div>
                                                        )}

                                                        {track.description && (
                                                            <p className="text-sm text-muted-foreground mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                                                {track.description}
                                                            </p>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        ))
                                    ) : (
                                        <Card className="border-2 border-dashed">
                                            <CardContent className="p-8 text-center">
                                                <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                                                <h3 className="font-semibold mb-1">{tr("No History Available")}</h3>
                                                <p className="text-sm text-muted-foreground">{tr("Tracking history will appear here once the parcel is processed")}</p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="px-6 py-4 border-t bg-slate-50 dark:bg-slate-900/50">
                        <Button onClick={() => setIsHistoryDialogOpen(false)} className="w-full sm:w-auto">{tr("Close")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel/Reverse Cancellation Dialog */}
            <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader className="pb-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-12 h-12 rounded-[var(--ds-radius-large)] flex items-center justify-center shadow-[var(--ds-shadow-raised)] ${
                                selectedParcel?.status === "CANCELED"
                                    ? 'bg-green-600'
                                    : 'bg-red-600'
                            } text-white`}>
                                {selectedParcel?.status === "CANCELED" ? (
                                    <RotateCcw className="h-6 w-6" />
                                ) : (
                                    <XIcon className="h-6 w-6" />
                                )}
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold">
                                    {selectedParcel?.status === "CANCELED" ? tr("Reverse Cancellation") : tr("Cancel Parcel")}
                                </DialogTitle>
                                <DialogDescription>
                                    {selectedParcel?.status === "CANCELED"
                                        ? tr("Restore this parcel to its previous state")
                                        : tr("This action will mark the parcel as canceled")}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Parcel Info Card */}
                        <Card className="border-2">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                                        <Package className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold font-mono">{selectedParcel?.parcelNumber}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {selectedParcel?.origin?.name || "—"} → {selectedParcel?.destination?.name || "—"}
                                        </p>
                                    </div>
                                    <Badge className={getStatusColor(selectedParcel?.status || "")}>
                                        {selectedParcel?.status}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Reason Input */}
                        {selectedParcel?.status !== "CANCELED" && (
                            <div className="space-y-2">
                                <Label htmlFor="cancelReason" className="text-sm font-medium">{tr("Reason for Cancellation *")}</Label>
                                <Textarea
                                    id="cancelReason"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder={tr("Please provide a detailed reason for canceling this parcel...")}
                                    rows={4}
                                    className="resize-none"
                                />
                                <p className="text-xs text-muted-foreground">{tr("This reason will be recorded in the parcel history")}</p>
                            </div>
                        )}

                        {/* Warning Message */}
                        <Card className={`border-2 ${
                            selectedParcel?.status === "CANCELED"
                                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
                                : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
                        }`}>
                            <CardContent className="p-4 flex items-start gap-3">
                                <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${
                                    selectedParcel?.status === "CANCELED"
                                        ? 'text-green-600 dark:text-green-400'
                                        : 'text-red-600 dark:text-red-400'
                                }`} />
                                <div className="text-sm">
                                    <p className={`font-semibold mb-1 ${
                                        selectedParcel?.status === "CANCELED"
                                            ? 'text-green-900 dark:text-green-100'
                                            : 'text-red-900 dark:text-red-100'
                                    }`}>
                                        {selectedParcel?.status === "CANCELED" ? tr("Important Notice") : tr("Warning")}
                                    </p>
                                    <p className={`${
                                        selectedParcel?.status === "CANCELED"
                                            ? 'text-green-700 dark:text-green-300'
                                            : 'text-red-700 dark:text-red-300'
                                    }`}>
                                        {selectedParcel?.status === "CANCELED"
                                            ? tr("Reversing the cancellation will restore the parcel to its previous state. Make sure this action is intentional.")
                                            : tr("Canceling this parcel will stop all processing and delivery. This action can be reversed later if needed.")}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsCancelDialogOpen(false)}
                            className="flex-1 sm:flex-none"
                        >{tr("Cancel")}</Button>
                        <Button
                            onClick={handleCancelConfirm}
                            disabled={selectedParcel?.status !== "CANCELED" && !cancelReason.trim()}
                            className={`flex-1 sm:flex-none ${
                                selectedParcel?.status === "CANCELED"
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-red-600 hover:bg-red-700'
                            } text-white shadow-[var(--ds-shadow-raised)]`}
                        >
                            {selectedParcel?.status === "CANCELED" ? (
                                <>
                                    <RotateCcw className="mr-2 h-4 w-4" />{tr("Reverse Cancellation")}</>
                            ) : (
                                <>
                                    <XIcon className="mr-2 h-4 w-4" />{tr("Confirm Cancellation")}</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}