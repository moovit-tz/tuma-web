"use client"

import React, { useState, useMemo, useEffect } from "react"
import { LocationDeleteButton } from "@/components/locations/location-delete-button"
import { cardValueClass } from "@/lib/card-text"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
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
    getDistricts
} from "@/lib/services/district"
import { getOfficeVolumes, rollUpVolumes } from "@/lib/services/parcel"
import { getBookingOffices, getRegions } from "@/lib/services/location"
import { subDays, format, startOfDay, endOfDay } from "date-fns"
import { LoadingSpinner } from "@/components/loading-spinner"
import { useDebounce } from "@/hooks/use-debounce"
import { Icon } from "@/components/ui/icon"
import { 
    Add01Icon, Search01Icon, PencilEdit01Icon, Delete02Icon, ViewIcon, 
    ChartLineData02Icon, Sorting05Icon, Package01Icon, Building03Icon, Search02Icon, Activity01Icon,
    FilterIcon, Clock01Icon, Download01Icon, Chart01Icon, MapsLocation01Icon, ListViewIcon, GridViewIcon,
    ChampionIcon, Sad01Icon, PieChart01Icon, CheckListIcon, PinLocation01Icon, ArrowRight01Icon, GlobeIcon
} from "@hugeicons/core-free-icons"
import { toast } from "@/components/ui/use-toast"
import { DistrictSheet } from "@/components/modals/district-sheet"
import { DistrictViewSheet } from "@/components/modals/district-view-sheet"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { TableBanner } from "@/components/ui/table-banner"
import { ListSkeleton } from "@/components/ui/skeletons"
import { ExportMenu } from "@/components/export/export-menu"
import { useTr } from "@/lib/i18n/portal"
import { ListPager, usePaged } from "@/components/ui/list-pager"

// Brand color palette
const BRAND_COLORS = {
    primary: "#ffd428",
    secondary: "#ffed4e",
    accent: "#6366f1",
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

export default function DistrictsPage() {
    const tr = useTr()
    const queryClient = useQueryClient()
    const router = useRouter()
    const params = useParams()
    const locale = params?.locale as string || "en"
    
    // State
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState("overview")
    const viewMode = "list" as const
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [dateRange, setDateRange] = useState("overall")
    const debouncedSearch = useDebounce(searchQuery, 300)

    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false)
    const [isViewSheetOpen, setIsViewSheetOpen] = useState(false)
    const [selectedDistrict, setSelectedDistrict] = useState<any>(null)

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
    const { data: districtsData, isLoading: isLoadingDistricts, isFetching: isFetchingDistricts } = useQuery({
        queryKey: ["districts-registry", debouncedSearch, statusFilter],
        queryFn: async () => {
            const response = await getDistricts({ name: debouncedSearch, paginate: false })
            let data = Array.isArray(response?.districts) ? response.districts
                     : Array.isArray(response) ? response
                     : Array.isArray(response?.data) ? response.data
                     : Array.isArray(response?.data?.data) ? response.data.data
                     : []
            
            if (statusFilter !== "all") {
                data = data.filter((d: any) => d.isActive === (statusFilter === "active"))
            }
            return data
        },
    })

    // Parcels per booking office, counted by the backend (exact, one cached
    // request), added up per district through each office's district.
    const { data: officeVolumes, isLoading: isLoadingParcels, isError: isVolumesError } = useQuery({
        queryKey: ["office-volumes", dateParams],
        queryFn: ({ signal }) => getOfficeVolumes(dateRange === "overall" ? null : (dateParams as { dateFrom: string; dateTo: string }), signal),
        staleTime: 5 * 60_000,
    })
    const { data: rawOffices = [] } = useQuery({
        queryKey: ["offices-all-for-mapping"],
        queryFn: async () => getBookingOffices(),
        staleTime: 10 * 60_000,
    })
    const { data: rawRegions = [] } = useQuery({
        queryKey: ["regions-all-for-mapping"],
        queryFn: async () => getRegions(),
        staleTime: 10 * 60_000,
    })

    const rawDistricts = districtsData || []
    const isLoading = isLoadingDistricts || isLoadingParcels
    const periodLabel = ({ today: "today", "7d": "last 7 days", "30d": "last 30 days", overall: "all time" } as Record<string, string>)[dateRange] ?? "all time"

    const analyticsData = useMemo(() => {
        const districtOfOffice = new Map<number, number>()
        const officesPerDistrict = new Map<number, number>()
        for (const o of rawOffices as any[]) {
            const d = Number(o.districtId ?? o.district_id)
            districtOfOffice.set(Number(o.id), d)
            officesPerDistrict.set(d, (officesPerDistrict.get(d) ?? 0) + 1)
        }
        const countryOfRegion = new Map<number, string>()
        for (const r of rawRegions as any[]) countryOfRegion.set(Number(r.id), r.country?.name)
        const sent = rollUpVolumes(officeVolumes?.sent, (id) => districtOfOffice.get(id))
        const received = rollUpVolumes(officeVolumes?.received, (id) => districtOfOffice.get(id))
        const totalSent = Object.values(sent).reduce((acc, v) => acc + v.parcels, 0)

        return rawDistricts.map((district: any) => {
            const id = Number(district.id)
            const regionId = Number(district.region_id ?? district.regionId ?? district.region?.id)
            const isActive = district.isActive !== false && String(district.status).toLowerCase() !== "inactive"
            const sentCount = sent[id]?.parcels ?? 0
            const receivedCount = received[id]?.parcels ?? 0
            return {
                ...district,
                sentCount,
                receivedCount,
                parcelCount: sentCount + receivedCount,
                revenue: sent[id]?.revenue ?? 0,
                share: totalSent > 0 ? (sentCount / totalSent) * 100 : 0,
                statusLabel: isActive ? "Active" : "Inactive",
                statusColor: isActive ? BRAND_COLORS.success : BRAND_COLORS.danger,
                isActive,
                regionName: district.region?.name || "—",
                countryName: district.region?.country?.name || countryOfRegion.get(regionId) || "—",
                flagUrl: district.region?.country?.flagUrl,
                officeCount: officesPerDistrict.get(id) ?? 0,
            }
        }).sort((a: any, b: any) => b.parcelCount - a.parcelCount)
    }, [rawDistricts, officeVolumes, rawOffices, rawRegions])

    const stats = useMemo(() => ({
        // Parcels booked at an office in these districts (each counted once, where it was sent from)
        totalParcels: analyticsData.reduce((acc: number, d: any) => acc + d.sentCount, 0),
        totalRevenue: analyticsData.reduce((acc: number, d: any) => acc + d.revenue, 0),
        totalOffices: analyticsData.reduce((acc: number, d: any) => acc + d.officeCount, 0),
        gapsFound: analyticsData.filter((d: any) => d.officeCount === 0).length,
    }), [analyticsData])

    const topDistricts = useMemo(() => [...analyticsData].filter((d: any) => d.parcelCount > 0).slice(0, 5), [analyticsData])
    const quietDistricts = useMemo(
        () => [...analyticsData].filter((d: any) => d.isActive && d.officeCount > 0).sort((a: any, b: any) => a.parcelCount - b.parcelCount).slice(0, 5),
        [analyticsData],
    )

    const handleAdd = () => {
        setSelectedDistrict(null)
        setIsAddSheetOpen(true)
    }
    const handleEdit = (district: any) => {
        setSelectedDistrict(district)
        setIsAddSheetOpen(true)
    }
    const handleView = (district: any) => {
        setSelectedDistrict(district)
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
                        <div key={i} className="grid grid-cols-5 gap-6 items-center">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-5 w-16 rounded-full justify-self-center" />
                            <Skeleton className="h-4 w-12 justify-self-end" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // Table: 10 rows per page, back to the first page when the search or filters change
    const tablePage = usePaged<any>(analyticsData, `${searchQuery}|${statusFilter}|${dateRange}`)

    return (
        <>
            <div className="space-y-10 animate-in fade-in duration-300">
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
                            placeholder={tr("Search districts…")} 
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
                        filename="districts"
                        title={tr("Districts")}
                        subtitle={tr("Parcel counts: {periodLabel}{only}{searchQuery}", { periodLabel, only: statusFilter !== "all" ? ` · ${statusFilter} only` : "", searchQuery: searchQuery ? ` · matching "${searchQuery}"` : "" })}
                        rows={analyticsData}
                        columns={[["District", (r: any) => r.name], ["Status", (r: any) => r.statusLabel], ["Booking offices", (r: any) => r.officeCount], ["Parcels", (r: any) => r.parcelCount]]}
                    />
                    <Button 
                        onClick={handleAdd}
                        className="h-10 px-5 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-small)] font-semibold text-sm shadow-[var(--ds-shadow-raised)] transition-colors flex items-center gap-2 cursor-pointer"
                    >
                        <Icon icon={Add01Icon} size={16} />{tr("New district")}</Button>
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
                                <Icon icon={PinLocation01Icon} size={20} />{tr("All Districts")}</div>
                            <Badge className="bg-[#ffd428] text-[#242a37] border-none text-xs font-semibold h-6 min-w-10 flex items-center justify-center rounded-[var(--ds-radius-small)]">
                                {analyticsData.length}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>

                </div>

                <TabsContent value="overview" className="space-y-10 focus:outline-none">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: tr("Parcels"), value: isLoadingParcels ? "…" : isVolumesError ? "—" : stats.totalParcels.toLocaleString(), icon: Package01Icon, sub: tr("Booked at district offices, {periodLabel}", { periodLabel }) },
                            { label: tr("Booking offices"), value: stats.totalOffices.toLocaleString(), icon: Building03Icon, sub: tr("In {analyticsData} districts", { analyticsData: analyticsData.length.toLocaleString() }) },
                            { label: tr("Districts without an office"), value: stats.gapsFound.toLocaleString(), icon: Search02Icon, sub: tr("Parcels can't be booked there yet"), color: stats.gapsFound > 0 ? "text-amber-500" : "text-[#ffd428]" },
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
                        {/* Elite Market Zones */}
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] overflow-hidden group col-span-1">
                           <CardHeader className="py-8 px-6 bg-[#242a37] text-white border-none rounded-t-[var(--ds-radius-small)]">
                                <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                    <Icon icon={ChampionIcon} className="text-[#ffd428]" size={24} />{tr("Busiest districts")}</CardTitle>
                                <CardDescription className="text-xs font-semibold text-white/40 mt-1">{tr("Parcels sent plus received · {periodLabel}", { periodLabel })}</CardDescription>
                           </CardHeader>
                           <CardContent className="p-0 bg-white dark:bg-[#1a1f2b]">
                                <div className="divide-y divide-slate-100 dark:divide-white/5">
                                    {isLoadingParcels ? (
                                        <ListSkeleton rows={5} avatar />
                                    ) : topDistricts.length === 0 ? (
                                        <p className="p-6 text-sm text-slate-400">{tr("No parcels {periodLabel}.", { periodLabel })}</p>
                                    ) : topDistricts.map((district: any, i: number) => (
                                        <div key={district.id} onClick={() => handleView(district)} className="p-6 hover:bg-slate-50 dark:hover:bg-white/[0.02] flex items-center justify-between cursor-pointer group/item transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="size-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400 group-hover/item:bg-[#ffd428] group-hover/item:text-[#242a37] transition-all">
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{district.name}</p>
                                                    <p className="text-xs font-semibold text-[#ffd428] mt-0.5">{district.regionName}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{district.parcelCount.toLocaleString()}</p>
                                                <p className="text-xs font-semibold text-slate-400 mt-0.5 font-mono">{district.sentCount.toLocaleString()} sent · {district.receivedCount.toLocaleString()} received</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                           </CardContent>
                        </Card>

                        {/* Quiet districts */}
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] overflow-hidden group col-span-1 lg:col-span-2">
                            <CardHeader className="py-8 px-6 bg-[#242a37] text-white border-none rounded-t-[var(--ds-radius-small)]">
                                <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                    <Icon icon={Activity01Icon} className="text-rose-400" size={24} />{tr("Fewest parcels")}</CardTitle>
                                <CardDescription className="text-xs font-semibold text-white/40 mt-1">{tr("Active districts with an office, quietest first · {periodLabel}", { periodLabel })}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-100 dark:divide-white/5">
                                    {isLoadingParcels ? (
                                        <ListSkeleton rows={5} avatar />
                                    ) : quietDistricts.length === 0 ? (
                                        <p className="p-6 text-sm text-slate-400">{tr("No active districts with an office.")}</p>
                                    ) : quietDistricts.map((district: any, i: number) => (
                                        <div key={district.id} onClick={() => handleView(district)} className="p-6 hover:bg-slate-50 dark:hover:bg-white/[0.02] flex items-center justify-between cursor-pointer transition-colors">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="size-8 shrink-0 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400">{i + 1}</div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{district.name}</p>
                                                    <p className="text-xs font-semibold text-slate-400 mt-0.5 truncate">{district.regionName} · {district.officeCount}{" "}{tr("office")}{district.officeCount === 1 ? "" : "s"}</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-4">
                                                <p className="text-sm font-semibold text-rose-500 tabular-nums">{district.parcelCount.toLocaleString()}</p>
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
                                    {isFetchingDistricts && (
                                        <div className="absolute top-0 left-0 w-full h-1 bg-transparent animate-shimmer z-30" />
                                    )}
                                    <TableBanner title={tr("All Districts")} description={tr("Districts grouped by region")} icon="places" />
                                    <CardContent className="p-0">
                                         <div className="overflow-x-auto min-h-[500px]">
                                             <Table>
                                                 <TableHeader>
                                                     <TableRow className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/5 hover:bg-transparent">
                                                         <TableHead className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-xs">{tr("District")}</TableHead>
                                                         <TableHead className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-xs">{tr("Region and offices")}</TableHead>
                                                         <TableHead className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-xs">{tr("Parcels · {periodLabel}", { periodLabel })}</TableHead>
                                                         <TableHead className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-xs text-center">{tr("Status")}</TableHead>
                                                         <TableHead className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-xs text-right">{tr("Actions")}</TableHead>
                                                     </TableRow>
                                                 </TableHeader>
                                                 <TableBody>
                                                     <AnimatePresence>
                                                         {tablePage.pageRows.map((district, i) => (
                                                             <motion.tr 
                                                                 key={district.id}
                                                                 initial={{ opacity: 0, y: 10 }}
                                                                 animate={{ opacity: 1, y: 0 }}
                                                                 exit={{ opacity: 0, scale: 0.95 }}
                                                                 transition={{ delay: i * 0.05 }}
                                                                 onClick={() => handleView(district)}
                                                                 className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors border-b border-slate-100 dark:border-white/5 cursor-pointer group"
                                                             >
                                                                     <TableCell className="px-6 py-8">
                                                                         <div className="flex items-center gap-6">
                                                                             <div className="space-y-1.5">
                                                                                 <p className="font-semibold text-base text-slate-900 dark:text-white group-hover:text-[#ffd428] transition-colors">{district.name}</p>
                                                                                 <p className="text-xs text-slate-400 font-bold flex items-center gap-2">
                                                                                     <Icon icon={PinLocation01Icon} size={12} className="text-[#ffd428]" />
                                                                                     
                                                                                     {district.regionName}
                                                                                 </p>
                                                                             </div>
                                                                         </div>
                                                                     </TableCell>
                                                                     <TableCell className="px-6 py-8">
                                                                         <div className="space-y-3">
                                                                             <div className="flex flex-wrap gap-2">
                                                                                 <Badge className="bg-indigo-500/10 text-indigo-500 border-none font-semibold text-[11px] uppercase px-3 py-1 rounded-full">
                                                                                     {district.regionName}
                                                                                 </Badge>
                                                                                 <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full border border-slate-200 dark:border-white/5">
                                                                                     <span className="text-xs">{getCountryFlag(district.countryName)}</span>
                                                                                     <span className="text-xs font-semibold text-slate-500">{district.countryName}</span>
                                                                                 </div>
                                                                             </div>
                                                                             <button 
                                                                                 onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/ops/locations/booking-offices?districtId=${district.id}`) }}
                                                                                 className="flex items-center gap-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 px-3 py-1.5 rounded-full font-semibold text-xs transition-colors cursor-pointer"
                                                                             >
                                                                                 {district.officeCount}{" "}{tr("office")}{district.officeCount === 1 ? "" : "s"}
                                                                             </button>
                                                                         </div>
                                                                     </TableCell>
                                                                     <TableCell className="px-6 py-8">
                                                                         <div className="space-y-1">
                                                                             <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                                                 {district.parcelCount.toLocaleString()} <span className="text-xs text-slate-400 font-bold">{tr("parcels")}</span>
                                                                             </p>
                                                                         </div>
                                                                     </TableCell>
                                                                     <TableCell className="px-6 py-8 text-center">
                                                                         <div className="flex justify-center">
                                                                             <div 
                                                                                 className="px-3 py-1.5 rounded-full flex items-center gap-1.5" 
                                                                                 style={{ backgroundColor: `${district.statusColor}15` }}
                                                                             >
                                                                                 <div className="size-1.5 rounded-full" style={{ backgroundColor: district.statusColor }} />
                                                                                 <span className="text-xs font-semibold" style={{ color: district.statusColor }}>
                                                                                     {district.statusLabel}
                                                                                 </span>
                                                                             </div>
                                                                         </div>
                                                                     </TableCell>
                                                                     <TableCell className="px-6 py-8 text-right">
                                                                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-colors transform translate-x-4">
                                                                             <Button 
                                                                                 size="icon" 
                                                                                 variant="ghost" 
                                                                                 onClick={(e) => { e.stopPropagation(); handleView(district); }}
                                                                                 className="size-10 bg-slate-100 dark:bg-white/5 hover:bg-[#ffd428] hover:text-[#242a37] rounded-[var(--ds-radius-small)] transition-colors"
                                                                             >
                                                                                 <Icon icon={ViewIcon} size={18} />
                                                                             </Button>
                                                                             <Button 
                                                                                 size="icon" 
                                                                                 variant="ghost" 
                                                                                 onClick={(e) => { e.stopPropagation(); handleEdit(district); }}
                                                                                 className="size-10 bg-slate-100 dark:bg-white/5 hover:bg-blue-500 hover:text-white rounded-[var(--ds-radius-small)] transition-colors"
                                                                             >
                                                                                 <Icon icon={PencilEdit01Icon} size={18} />
                                                                             </Button>
                                                                            <LocationDeleteButton kind="district" id={district.id} name={district.name} />
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

            <DistrictSheet isOpen={isAddSheetOpen} onClose={() => setIsAddSheetOpen(false)} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["districts-registry"] })} district={selectedDistrict} />
            <DistrictViewSheet 
                isOpen={isViewSheetOpen} 
                onClose={() => setIsViewSheetOpen(false)} 
                district={selectedDistrict} 
                onEdit={(district) => {
                    setIsViewSheetOpen(false)
                    setSelectedDistrict(district)
                    setIsAddSheetOpen(true)
                }}
            />
        </div>
        </>
    )
}
