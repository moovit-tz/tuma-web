"use client"

import React, { useState, useMemo, useEffect } from "react"
import { LocationDeleteButton } from "@/components/locations/location-delete-button"
import { cardValueClass } from "@/lib/card-text"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
    Tooltip as RechartsTooltip, PieChart, Pie, Cell, 
    BarChart, Bar, Legend
} from 'recharts'
import {
    getBookingOffices
} from "@/lib/services/booking-office"
import { getOfficeVolumes } from "@/lib/services/parcel"
import { getRegions, getBookingOffices as getAllOffices } from "@/lib/services/location"
import { getAllAgentsWithCounts } from "@/lib/services/user"
import { subDays, format, startOfDay, endOfDay } from "date-fns"
import { LoadingSpinner } from "@/components/loading-spinner"
import { useDebounce } from "@/hooks/use-debounce"
import { Icon } from "@/components/ui/icon"
import { 
    Add01Icon, Search01Icon, PencilEdit01Icon, Delete02Icon, ViewIcon, 
    ChartLineData02Icon, Sorting05Icon, Package01Icon, UserGroupIcon, Sad01Icon, Activity01Icon, MoneyReceive01Icon,
    FilterIcon, Clock01Icon, Download01Icon, Chart01Icon, Building03Icon, ListViewIcon, GridViewIcon,
    ChampionIcon, ZapIcon, CheckListIcon, PinLocation01Icon, ArrowRight01Icon, GlobeIcon
} from "@hugeicons/core-free-icons"
import { toast } from "@/components/ui/use-toast"
import { BookingOfficeSheet } from "@/components/modals/booking-office-sheet"
import { BookingOfficeViewSheet } from "@/components/modals/booking-office-view-sheet"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { TableBanner } from "@/components/ui/table-banner"
import { ListSkeleton } from "@/components/ui/skeletons"
import { ExportMenu } from "@/components/export/export-menu"
import { useSearchLanding } from "@/hooks/use-search-landing"
import { useTr } from "@/lib/i18n/portal"
import { ListPager, usePaged } from "@/components/ui/list-pager"

// Brand color palette
const BRAND_COLORS = {
    primary: "#ffd428",
    secondary: "#ffed4e",
    accent: "#10b981",
    success: "#10b981",
    warning: "#f97316",
    danger: "#ef4444",
    info: "#3b82f6",
    purple: "#8b5cf6",
    teal: "#14b8a6",
    pink: "#ec4899",
}


function getCountryFlag(countryName: string) {
    if (countryName?.toLowerCase().includes("tanzania")) return "🇹🇿"
    if (countryName?.toLowerCase().includes("congo") || countryName?.toLowerCase().includes("drc")) return "🇨🇩"
    if (countryName?.toLowerCase().includes("kenya")) return "🇰🇪"
    if (countryName?.toLowerCase().includes("uganda")) return "🇺🇬"
    if (countryName?.toLowerCase().includes("rwanda")) return "🇷🇼"
    if (countryName?.toLowerCase().includes("burundi")) return "🇧🇮"
    if (countryName?.toLowerCase().includes("zambia")) return "🇿🇲"
    if (countryName?.toLowerCase().includes("malawi")) return "🇲🇼"
    return "🌍"
}

export default function BookingOfficesPage() {
    const tr = useTr()
    const queryClient = useQueryClient()
    
    // State
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState("overview")
    const viewMode = "list" as const
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [dateRange, setDateRange] = useState("overall")
    const debouncedSearch = useDebounce(searchQuery, 300)

    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false)
    const [isViewSheetOpen, setIsViewSheetOpen] = useState(false)
    const [selectedOffice, setSelectedOffice] = useState<any>(null)

    // Helper to get date params for API
    const dateParams = useMemo(() => {
        if (dateRange === "overall") return {}
        const today = new Date()
        let from: Date
        if (dateRange === "today") from = today
        else if (dateRange === "7d") from = subDays(today, 7)
        else from = subDays(today, 30)
        
        return {
            dateFrom: format(from, "yyyy-MM-dd"),
            dateTo: format(today, "yyyy-MM-dd")
        }
    }, [dateRange])

    // Data Fetching
    // Same source as the Regions/Districts pages: every office in one request
    // (GET /location/booking-offices → { bookingOffices }), shared cache.
    // The backend doesn't filter by name, so search and status filter here.
    const { data: allOffices = [], isLoading: isLoadingOffices, isFetching: isFetchingOffices } = useQuery({
        queryKey: ["offices-all-for-mapping"],
        queryFn: async () => getAllOffices(),
        staleTime: 10 * 60_000,
    })
    const officesData = useMemo(() => {
        const q = debouncedSearch.trim().toLowerCase()
        return (allOffices as any[]).filter((o) => {
            if (statusFilter !== "all" && (o.isActive !== false) !== (statusFilter === "active")) return false
            if (!q) return true
            return [o.name, o.code, o.district?.name, o.region?.name].some((v) => String(v ?? "").toLowerCase().includes(q))
        })
    }, [allOffices, debouncedSearch, statusFilter])

    // Parcels per office, counted by the backend (exact, one cached request)
    const { data: officeVolumes, isLoading: isLoadingParcels, isError: isVolumesError } = useQuery({
        queryKey: ["office-volumes", dateParams],
        queryFn: ({ signal }) => getOfficeVolumes(dateRange === "overall" ? null : (dateParams as { dateFrom: string; dateTo: string }), signal),
        staleTime: 5 * 60_000,
    })
    // Agents and their booking offices (UserOffice), from the cached agents list
    const { data: agentsWithCounts } = useQuery({
        queryKey: ["agents-with-counts"],
        queryFn: getAllAgentsWithCounts,
        staleTime: 10 * 60_000,
    })
    // Older backends don't return each agent's offices — show "—" rather than 0
    const hasOfficeAssignments = !!agentsWithCounts?.some((a: any) => Array.isArray(a.offices))
    const { data: rawRegions = [] } = useQuery({
        queryKey: ["regions-all-for-mapping"],
        queryFn: async () => getRegions(),
        staleTime: 10 * 60_000,
    })

    const rawOffices = officesData || []
    const isLoading = isLoadingOffices || isLoadingParcels
    const periodLabel = ({ today: "today", "7d": "last 7 days", "30d": "last 30 days", overall: "all time" } as Record<string, string>)[dateRange] ?? "all time"

    const analyticsData = useMemo(() => {
        const agentsPerOffice = new Map<number, number>()
        for (const a of (agentsWithCounts ?? []) as any[]) {
            for (const officeId of new Set<number>((a.offices ?? []).map((o: any) => Number(o.officeId ?? o.office?.id)))) {
                agentsPerOffice.set(officeId, (agentsPerOffice.get(officeId) ?? 0) + 1)
            }
        }
        const countryOfRegion = new Map<number, any>()
        for (const r of rawRegions as any[]) countryOfRegion.set(Number(r.id), r.country)
        const totalSent = Object.values(officeVolumes?.sent ?? {}).reduce((acc, v) => acc + v.parcels, 0)

        return rawOffices.map((office: any) => {
            const id = Number(office.id)
            const sentCount = officeVolumes?.sent[id]?.parcels ?? 0
            const receivedCount = officeVolumes?.received[id]?.parcels ?? 0
            const isActive = office.isActive !== false && String(office.status).toLowerCase() !== "inactive"
            const country = office.district?.region?.country ?? countryOfRegion.get(Number(office.regionId ?? office.region?.id))
            return {
                ...office,
                sentCount,
                receivedCount,
                parcelCount: sentCount + receivedCount,
                revenue: officeVolumes?.sent[id]?.revenue ?? 0,
                share: totalSent > 0 ? (sentCount / totalSent) * 100 : 0,
                agentCount: hasOfficeAssignments ? (agentsPerOffice.get(id) ?? 0) : null,
                statusLabel: isActive ? "Active" : "Inactive",
                isActive,
                districtName: office.district?.name || "—",
                regionName: office.region?.name || office.district?.region?.name || "—",
                countryName: country?.name || "—",
                flagUrl: country?.flagUrl,
            }
        }).sort((a: any, b: any) => b.parcelCount - a.parcelCount)
    }, [rawOffices, officeVolumes, rawRegions, agentsWithCounts, hasOfficeAssignments])

    const stats = useMemo(() => ({
        totalParcels: analyticsData.reduce((acc: number, o: any) => acc + o.sentCount, 0),
        totalRevenue: analyticsData.reduce((acc: number, o: any) => acc + o.revenue, 0),
        inactiveOffices: analyticsData.filter((o: any) => o.isActive && o.parcelCount === 0).length,
        // Agents with at least one office in this list (an agent can cover several)
        totalAgents: (agentsWithCounts ?? []).filter((a: any) => (a.offices ?? []).length > 0).length,
    }), [analyticsData])

    const topOffices = useMemo(() => [...analyticsData].filter((o: any) => o.parcelCount > 0).sort((a: any, b: any) => b.parcelCount - a.parcelCount).slice(0, 5), [analyticsData])
    const quietOffices = useMemo(() => [...analyticsData].filter((o: any) => o.isActive).sort((a: any, b: any) => a.parcelCount - b.parcelCount).slice(0, 5), [analyticsData])

    const handleAdd = () => {
        setSelectedOffice(null)
        setIsAddSheetOpen(true)
    }
    const handleEdit = (office: any) => {
        setSelectedOffice(office)
        setIsAddSheetOpen(true)
    }
    const handleView = (office: any) => {
        setSelectedOffice(office)
        setIsViewSheetOpen(true)
    }

    if (isLoading && analyticsData.length === 0) {
        return (
            <div className="space-y-10 p-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-11 w-40 rounded-[var(--ds-radius-small)]" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-[var(--ds-radius-large)] border border-slate-100 dark:border-white/5 p-6 space-y-3">
                            <Skeleton className="h-9 w-9 rounded-[var(--ds-radius-small)]" />
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-6 w-16" />
                        </div>
                    ))}
                </div>
                <div className="rounded-[var(--ds-radius-large)] border border-slate-100 dark:border-white/5 p-6 space-y-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="grid grid-cols-4 gap-6 items-center">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-12 justify-self-end" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // Opened from the portal search: fill the search and open the result
    useSearchLanding({ setSearch: setSearchQuery, showList: () => setActiveTab("all"), items: analyticsData, ready: !isLoadingOffices, onOpen: handleView })

    // Table: 10 rows per page, back to the first page when the search or filters change
    const tablePage = usePaged<any>(analyticsData, `${searchQuery}|${statusFilter}|${dateRange}`)

    return (
        <>
            <div className="space-y-10 animate-in fade-in duration-300">
             {/* -- Header -- */}
             <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 justify-between">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 min-w-0">
                    <div className="relative group flex-1 min-w-0">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                            <Icon icon={Search01Icon} 
                                    size={20} 
                                    className="text-slate-400 group-focus-within:text-[#ffd428] transition-colors" 
                                />
                        </div>
                        <Input 
                            placeholder={tr("Search offices…")} 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 pl-10 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-normal placeholder:text-slate-400 focus:ring-1 focus:ring-[#ffd428]/50 shadow-none transition-all w-full"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery("")}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                            >
                                <Icon icon={Delete02Icon} size={18} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-40 h-10 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-medium shadow-none outline-none focus:ring-1 focus:ring-[#ffd428]/50 transition-all">
                                <div className="flex items-center gap-2">
                                    <Icon icon={FilterIcon} size={16} className="shrink-0 text-slate-500 dark:text-slate-400" />
                                    <SelectValue placeholder="STATUS" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)]">
                                <SelectItem value="all" className="text-sm">{tr("All statuses")}</SelectItem>
                                <SelectItem value="active" className="text-sm text-[#10b981]">{tr("Active")}</SelectItem>
                                <SelectItem value="inactive" className="text-sm text-[#ef4444]">{tr("Inactive")}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={dateRange} onValueChange={setDateRange}>
                            <SelectTrigger className="w-full sm:w-40 h-10 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-medium shadow-none outline-none focus:ring-1 focus:ring-[#ffd428]/50 transition-all">
                                <div className="flex items-center gap-2">
                                    <Icon icon={Clock01Icon} size={16} className="shrink-0 text-slate-500 dark:text-slate-400" />
                                    <SelectValue placeholder={tr("Period")} />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)]">
                                <SelectItem value="today" className="text-sm">{tr("Today")}</SelectItem>
                                <SelectItem value="7d" className="text-sm">{tr("Last 7 days")}</SelectItem>
                                <SelectItem value="30d" className="text-sm">{tr("Last 30 days")}</SelectItem>
                                <SelectItem value="overall" className="text-sm">{tr("All time")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <ExportMenu
                        filename="booking-offices"
                        title={tr("Booking offices")}
                        subtitle={tr("Parcel counts: {periodLabel}{only}{searchQuery}", { periodLabel, only: statusFilter !== "all" ? ` · ${statusFilter} only` : "", searchQuery: searchQuery ? ` · matching "${searchQuery}"` : "" })}
                        rows={analyticsData}
                        columns={[["Office", (r: any) => r.name], ["Status", (r: any) => r.statusLabel], ["Agents", (r: any) => r.agentCount ?? ""], ["Parcels", (r: any) => r.parcelCount]]}
                    />
                    <Button 
                        onClick={handleAdd}
                        className="h-10 px-5 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-small)] font-semibold text-sm shadow-[var(--ds-shadow-raised)] transition-colors flex items-center gap-2 cursor-pointer"
                    >
                        <Icon icon={Add01Icon} size={16} />{tr("New booking office")}</Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <div className="portal-sticky-wrap flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <TabsList className="portal-sticky-tabs bg-slate-100 dark:bg-black/20 p-1.5 rounded-[var(--ds-radius-small)] w-full items-stretch h-auto max-w-xl">
                        <TabsTrigger 
                            value="overview" 
                            className="flex-1 h-11 rounded-[var(--ds-radius-large)] text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-[#242a37] data-[state=active]:shadow-[var(--ds-shadow-raised)] transition-all cursor-pointer"
                        >
                            <Icon icon={Chart01Icon} size={20} className="mr-2" />{tr("Overview")}</TabsTrigger>
                        <TabsTrigger 
                            value="all" 
                            className="flex-1 h-11 rounded-[var(--ds-radius-large)] text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-[#242a37] data-[state=active]:shadow-[var(--ds-shadow-raised)] transition-all gap-3 cursor-pointer"
                        >
                            <div className="flex items-center gap-2">
                                <Icon icon={Building03Icon} size={20} />{tr("All Booking Offices")}</div>
                            <Badge className="bg-[#ffd428] text-[#242a37] border-none text-xs font-semibold h-6 min-w-10 flex items-center justify-center rounded-[var(--ds-radius-small)]">
                                {analyticsData.length}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>

                </div>

                <TabsContent value="overview" className="space-y-10 focus:outline-none">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: tr("Parcels"), value: isLoadingParcels ? "…" : isVolumesError ? "—" : stats.totalParcels.toLocaleString(), icon: Package01Icon, sub: tr("Booked at offices, {periodLabel}", { periodLabel }) },
                            { label: tr("Agents"), value: !agentsWithCounts ? "…" : hasOfficeAssignments ? stats.totalAgents.toLocaleString() : "—", icon: UserGroupIcon, sub: hasOfficeAssignments || !agentsWithCounts ? `Assigned to ${analyticsData.length.toLocaleString()} offices` : "Office assignments unavailable" },
                            { label: tr("Quiet offices"), value: isLoadingParcels ? "…" : stats.inactiveOffices.toLocaleString(), icon: Sad01Icon, sub: tr("Active offices with no parcels {periodLabel}", { periodLabel }), color: stats.inactiveOffices > 0 ? "text-rose-500" : "text-[#ffd428]" },
                        ].map((card, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                                <Card className="rounded-[var(--ds-radius-large)] border-none h-full bg-[#242a37] relative group shadow-[var(--ds-shadow-raised)] transition-all overflow-hidden">
                                     <div className="absolute right-[-15px] bottom-[-15px] opacity-[0.05] text-[#ffd428] pointer-events-none transform rotate-12 transition-transform">
                                        <Icon icon={card.icon} size={100} />
                                    </div>
                                    <CardContent className="p-6 relative z-10">
                                        <div className="size-10 rounded-[var(--ds-radius-small)] flex items-center justify-center bg-white/5 mb-4">
                                            <Icon icon={card.icon} className={cn("size-5", card.color || "text-[#ffd428]")} />
                                        </div>
                                        <p className="text-xs font-semibold text-[#ffd428]/60 mb-1">{card.label}</p>
                                        <h3 className={cn(cardValueClass(card.value), "font-semibold leading-tight line-clamp-2 break-words", card.color || "text-white")} title={(card as any).title ?? String(card.value)}>{card.value}</h3>
                                        <p className="text-xs font-bold text-white/40 mt-2">{card.sub}</p>
                                        {card.progress !== undefined && (
                                            <div className="h-1.5 w-full bg-black/20 rounded-full mt-4 overflow-hidden">
                                                <div className="h-full bg-[#ffd428] rounded-full" style={{ width: `${card.progress}%` }} />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Elite Hubs */}
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] overflow-hidden group col-span-1">
                           <CardHeader className="py-8 px-6 bg-[#242a37] text-white border-none rounded-t-[var(--ds-radius-small)]">
                                <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                    <Icon icon={ChampionIcon} className="text-[#ffd428]" size={24} />{tr("Busiest offices")}</CardTitle>
                                <CardDescription className="text-xs font-semibold text-white/40 mt-1">{tr("Most parcels · {periodLabel}", { periodLabel })}</CardDescription>
                           </CardHeader>
                           <CardContent className="p-0 bg-white dark:bg-[#1a1f2b]">
                                <div className="divide-y divide-slate-100 dark:divide-white/5">
                                    {isLoadingParcels ? (
                                        <ListSkeleton rows={5} avatar />
                                    ) : topOffices.length === 0 ? (
                                        <p className="p-6 text-sm text-slate-400">{tr("No parcels {periodLabel}.", { periodLabel })}</p>
                                    ) : topOffices.map((office: any, i: number) => (
                                        <div key={office.id} onClick={() => handleView(office)} className="p-6 hover:bg-slate-50 dark:hover:bg-white/[0.02] flex items-center justify-between cursor-pointer group/item transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="size-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400 group-hover/item:bg-[#ffd428] group-hover/item:text-[#242a37] transition-all">
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{office.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{office.parcelCount.toLocaleString()}</p>
                                                <p className="text-xs font-semibold text-slate-400 mt-0.5 font-mono">{office.sentCount.toLocaleString()} sent</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                           </CardContent>
                        </Card>

                        {/* Quiet offices */}
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] overflow-hidden group col-span-1 lg:col-span-2">
                            <CardHeader className="py-8 px-6 bg-[#242a37] text-white border-none rounded-t-[var(--ds-radius-small)]">
                                <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                    <Icon icon={Activity01Icon} className="text-rose-400" size={24} />{tr("Fewest parcels")}</CardTitle>
                                <CardDescription className="text-xs font-semibold text-white/40 mt-1">{tr("Active offices, quietest first (sent plus received) · {periodLabel}", { periodLabel })}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-100 dark:divide-white/5">
                                    {isLoadingParcels ? (
                                        <ListSkeleton rows={5} avatar />
                                    ) : quietOffices.length === 0 ? (
                                        <p className="p-6 text-sm text-slate-400">{tr("No active offices.")}</p>
                                    ) : quietOffices.map((office: any, i: number) => (
                                        <div key={office.id} onClick={() => handleView(office)} className="p-6 hover:bg-slate-50 dark:hover:bg-white/[0.02] flex items-center justify-between cursor-pointer transition-colors">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="size-8 shrink-0 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400">{i + 1}</div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{office.name}</p>
                                                    <p className="text-xs font-semibold text-slate-400 mt-0.5 truncate">{office.districtName} · {office.regionName}</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-4">
                                                <p className="text-sm font-semibold text-rose-500 tabular-nums">{office.parcelCount.toLocaleString()}</p>
                                                <p className="text-xs font-semibold text-slate-400 mt-0.5">{tr("parcels")}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="all" className="space-y-8">
                     <AnimatePresence mode="wait">
                        {(
                            <motion.div
                                key="list-view"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Card className="p-0 gap-0 overflow-hidden rounded-[var(--ds-radius-large)] border-slate-100 dark:border-white/5 bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] overflow-hidden relative">
                                    {isFetchingOffices && (
                                        <div className="absolute top-0 left-0 w-full h-1 bg-transparent animate-shimmer z-30" />
                                    )}
                                    <TableBanner title={tr("All Booking Offices")} description={tr("Offices where parcels are booked and collected")} icon="places" />
                                    <CardContent className="p-0">
                                         <div className="overflow-x-auto min-h-[500px]">
                                             <Table>
                                                 <TableHeader>
                                                     <TableRow className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/5 hover:bg-transparent">
                                                         <TableHead className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-xs">{tr("Office")}</TableHead>
                                                         <TableHead className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-xs">{tr("Location")}</TableHead>
                                                         <TableHead className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-xs">{tr("Activity · {periodLabel}", { periodLabel })}</TableHead>
                                                         <TableHead className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-xs text-right">{tr("Actions")}</TableHead>
                                                     </TableRow>
                                                 </TableHeader>
                                                 <TableBody>
                                                     <AnimatePresence>
                                                         {tablePage.pageRows.map((office, i) => (
                                                             <motion.tr 
                                                                 key={office.id}
                                                                 initial={{ opacity: 0, y: 10 }}
                                                                 animate={{ opacity: 1, y: 0 }}
                                                                 exit={{ opacity: 0, scale: 0.95 }}
                                                                 transition={{ delay: i * 0.05 }}
                                                                 onClick={() => handleView(office)}
                                                                 className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors border-b border-slate-100 dark:border-white/5 cursor-pointer group"
                                                             >
                                                                 <TableCell className="px-6 py-8">
                                                                         <div className="flex items-center gap-6">
                                                                             <div className="space-y-1.5">
                                                                                 <p className="font-semibold text-base text-slate-900 dark:text-white group-hover:text-[#ffd428] transition-colors">{office.name}</p>
                                                                                 <p className="text-xs text-slate-400 font-bold flex items-center gap-2">
                                                                                     <Icon icon={Building03Icon} size={12} className="text-[#ffd428]" />{tr("ID:")}{" "}{office.id}
                                                                                 </p>
                                                                             </div>
                                                                         </div>
                                                                     </TableCell>
                                                                     <TableCell className="px-6 py-8">
                                                                         <div className="space-y-3">
                                                                             <div className="flex flex-wrap gap-2">
                                                                                 <Badge className="bg-blue-500/10 text-blue-500 border-none font-semibold text-[11px] uppercase px-3 py-1 rounded-full">
                                                                                     {office.districtName}
                                                                                 </Badge>
                                                                                 <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full border border-slate-200 dark:border-white/5">
                                                                                     <span className="text-xs">{getCountryFlag(office.countryName)}</span>
                                                                                     <span className="text-xs font-semibold text-slate-500">{office.countryName}</span>
                                                                                 </div>
                                                                             </div>
                                                                         </div>
                                                                     </TableCell>
                                                                     <TableCell className="px-6 py-8">
                                                                         <div className="space-y-3">
                                                                             <div className="flex items-center gap-4">
                                                                                 <div className="flex items-center gap-2">
                                                                                     <Icon icon={Package01Icon} size={14} className="text-[#ffd428]" />
                                                                                     <span className="text-xs font-semibold text-slate-900 dark:text-white">{tr("{parcelCount} parcels", { parcelCount: office.parcelCount.toLocaleString() })}</span>
                                                                                 </div>
                                                                                 <div className="flex items-center gap-2">
                                                                                     <Icon icon={UserGroupIcon} size={14} className="text-teal-500 dark:text-teal-400" />
                                                                                     <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                                                                         {office.agentCount === null ? "—" : tr("{agentCount} agent{s}", { agentCount: office.agentCount.toLocaleString(), s: office.agentCount === 1 ? "" : "s" })}
                                                                                     </span>
                                                                                 </div>
                                                                             </div>
                                                                         </div>
                                                                     </TableCell>
                                                                     <TableCell className="px-6 py-8 text-right">
                                                                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-colors transform translate-x-4">
                                                                             <Button 
                                                                                 size="icon" 
                                                                                 variant="ghost" 
                                                                                 onClick={(e) => { e.stopPropagation(); handleView(office); }}
                                                                                 className="size-10 bg-slate-100 dark:bg-white/5 hover:bg-[#ffd428] hover:text-[#242a37] rounded-[var(--ds-radius-small)] transition-colors"
                                                                             >
                                                                                 <Icon icon={ViewIcon} size={18} />
                                                                             </Button>
                                                                             <Button 
                                                                                 size="icon" 
                                                                                 variant="ghost" 
                                                                                 onClick={(e) => { e.stopPropagation(); handleEdit(office); }}
                                                                                 className="size-10 bg-slate-100 dark:bg-white/5 hover:bg-blue-500 hover:text-white rounded-[var(--ds-radius-small)] transition-colors"
                                                                             >
                                                                                 <Icon icon={PencilEdit01Icon} size={18} />
                                                                             </Button>
                                                                            <LocationDeleteButton kind="office" id={office.id} name={office.name} />
                                                                         </div>
                                                                     </TableCell>
                                                             </motion.tr>
                                                         ))}
                                                     </AnimatePresence>
                                                 </TableBody>
                                             </Table>
                                            <ListPager page={tablePage.page} totalPages={tablePage.totalPages} total={tablePage.total} onPage={tablePage.setPage} />
                                         </div>
                                     </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </TabsContent>
            </Tabs>

            <BookingOfficeSheet isOpen={isAddSheetOpen} onClose={() => setIsAddSheetOpen(false)} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["booking-offices-registry"] })} office={selectedOffice} />
            <BookingOfficeViewSheet 
                isOpen={isViewSheetOpen} 
                onClose={() => setIsViewSheetOpen(false)} 
                office={selectedOffice} 
                onEdit={(office) => {
                    setIsViewSheetOpen(false)
                    setSelectedOffice(office)
                    setIsAddSheetOpen(true)
                }}
            />
        </div>
        </>
    )
}
