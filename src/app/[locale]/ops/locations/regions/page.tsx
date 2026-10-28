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
    getRegions, getCountries, getDistricts, getBookingOffices 
} from "@/lib/services/location"
import { 
    getRegionVolumes,
} from "@/lib/services/parcel"
import { getCountryFlag } from "@/lib/utils/country"
import { toast } from "@/components/ui/use-toast"
import { LoadingSpinner } from "@/components/loading-spinner"
import { useDebounce } from "@/hooks/use-debounce"
import { Icon } from "@/components/ui/icon"
import { 
    Search01Icon, Delete02Icon, FilterIcon, Clock01Icon, Download01Icon, Add01Icon, 
    Chart01Icon, MapsLocation01Icon, ListViewIcon, GridViewIcon, Package01Icon, Building03Icon, 
    Activity01Icon, ChampionIcon, ViewIcon, PencilEdit01Icon, ArrowRight01Icon
} from "@hugeicons/core-free-icons"
import { RegionSheet } from "@/components/modals/region-sheet"
import { RegionViewSheet } from "@/components/modals/region-view-sheet"
import { RegionalViewAnalyticsModal } from "@/components/modals/regional-view-analytics-modal"
import { cn } from "@/lib/utils"
import { subDays, format, startOfDay, endOfDay } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { TableBanner } from "@/components/ui/table-banner"
import { ListSkeleton } from "@/components/ui/skeletons"
import { ExportMenu } from "@/components/export/export-menu"
import { useSearchLanding } from "@/hooks/use-search-landing"
import { useTr } from "@/lib/i18n/portal"
import { ListPager, usePaged } from "@/components/ui/list-pager"

// --- UI HELPERS ---
const BRAND_GRADIENTS = {
    primary: "bg-[#ffd428]",
    blue: "bg-blue-600",
    indigo: "bg-indigo-600",
}


// Brand color palette
const BRAND_COLORS = {
    primary: "#ffd428",
    secondary: "#ffed4e",
    accent: "#f59e0b",
    success: "#10b981",
    warning: "#f97316",
    danger: "#ef4444",
    info: "#3b82f6",
    purple: "#8b5cf6",
    teal: "#14b8a6",
    pink: "#ec4899",
}

export default function RegionsPage() {
    const tr = useTr()
    const queryClient = useQueryClient()
    const router = useRouter()
    const searchParams = useSearchParams()
    const params = useParams()
    const locale = (params?.locale as string) || "en"
    const countryIdParam = searchParams.get("countryId")
    
    // State
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState("insights")
    const viewMode = "list" as const
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [dateRange, setDateRange] = useState<string>("overall")
    const [expandedRegions, setExpandedRegions] = useState<Set<number>>(new Set())
    const debouncedSearch = useDebounce(searchQuery, 300)

    const toggleRegion = (id: number) => {
        const next = new Set(expandedRegions)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setExpandedRegions(next)
    }

    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false)
    const [isViewSheetOpen, setIsViewSheetOpen] = useState(false)
    const [selectedRegion, setSelectedRegion] = useState<any>(null)
    const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false)
    const [analyticsModalType, setAnalyticsModalType] = useState<"origin" | "destination" | "needs_visibility">("origin")

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
    const { data: rawRegions = [], isLoading: isLoadingRegions, isFetching: isFetchingRegions } = useQuery({
        queryKey: ["regions-registry", debouncedSearch, statusFilter, countryIdParam],
        queryFn: async () => {
            const response = await getRegions({ 
                search: debouncedSearch, 
                country_id: countryIdParam ? parseInt(countryIdParam) : undefined,
                paginate: false, 
                include: "districts,districts.bookingOffices,country" 
            })
            let data = Array.isArray(response) ? response : (Array.isArray(response.data) ? response.data : [])
            
            if (statusFilter !== "all") {
                data = data.filter((r: any) => r.isActive === (statusFilter === "active"))
            }
            return data
        },
    })

    // Parcels sent from / received in each region — counted by the backend
    // in one grouped query, so these are exact totals, not a sample.
    const { data: volumes, isLoading: isLoadingParcels, isError: isVolumesError } = useQuery({
        queryKey: ["region-volumes", dateParams],
        queryFn: ({ signal }) => getRegionVolumes(dateRange === "overall" ? null : (dateParams as { dateFrom: string; dateTo: string }), signal),
        staleTime: 5 * 60_000,
    })

    // The region list doesn't carry its districts/offices, so count them from
    // the district and office lists (shared, cached with the Countries page).
    const { data: rawDistricts = [] } = useQuery({
        queryKey: ["districts-all-for-mapping"],
        queryFn: async () => getDistricts(),
        staleTime: 10 * 60_000,
    })
    const { data: rawOffices = [] } = useQuery({
        queryKey: ["offices-all-for-mapping"],
        queryFn: async () => getBookingOffices(),
        staleTime: 10 * 60_000,
    })
    const districtsPerRegion = useMemo(() => {
        const m = new Map<number, number>()
        for (const d of rawDistricts as any[]) {
            const id = Number(d.region_id ?? d.regionId)
            m.set(id, (m.get(id) ?? 0) + 1)
        }
        return m
    }, [rawDistricts])
    const officesPerRegion = useMemo(() => {
        const m = new Map<number, number>()
        for (const o of rawOffices as any[]) {
            const id = Number(o.regionId ?? o.region_id)
            m.set(id, (m.get(id) ?? 0) + 1)
        }
        return m
    }, [rawOffices])

    const isLoading = isLoadingRegions || isLoadingParcels

    const analyticsData = useMemo(() => {
        return rawRegions.map((region: any) => {
            const sent = volumes?.sent[region.id]
            const received = volumes?.received[region.id]
            return {
                ...region,
                originCount: sent?.parcels ?? 0,
                destinationCount: received?.parcels ?? 0,
                parcelCount: (sent?.parcels ?? 0) + (received?.parcels ?? 0),
                /** Revenue is booked where a parcel is sent from */
                revenue: sent?.revenue ?? 0,
                countryName: region.country?.name || "—",
                flagUrl: region.country?.flagUrl,
                districtCount: districtsPerRegion.get(Number(region.id)) ?? region.districts?.length ?? 0,
                officeCount: officesPerRegion.get(Number(region.id)) ?? 0,
            }
        }).sort((a: any, b: any) => b.parcelCount - a.parcelCount)
    }, [rawRegions, volumes, districtsPerRegion, officesPerRegion])

    const stats = useMemo(() => ({
        // Every parcel has exactly one origin, so summing "sent" counts each parcel once
        totalParcels: analyticsData.reduce((acc: number, r: any) => acc + r.originCount, 0),
        totalRevenue: analyticsData.reduce((acc: number, r: any) => acc + r.revenue, 0),
        totalRegions: analyticsData.length,
        activeRegions: analyticsData.filter((r: any) => r.parcelCount > 0).length,
        totalDistricts: analyticsData.reduce((acc: number, r: any) => acc + r.districtCount, 0),
        totalOffices: analyticsData.reduce((acc: number, r: any) => acc + r.officeCount, 0),
    }), [analyticsData])

    const periodLabel = ({ today: "today", "7d": "last 7 days", "30d": "last 30 days", overall: "all time" } as Record<string, string>)[dateRange] ?? "all time"
    const topOriginRegions = useMemo(() => [...analyticsData].filter((r: any) => r.originCount > 0).sort((a: any, b: any) => b.originCount - a.originCount), [analyticsData])
    const topDestRegions = useMemo(() => [...analyticsData].filter((r: any) => r.destinationCount > 0).sort((a: any, b: any) => b.destinationCount - a.destinationCount), [analyticsData])
    // Active regions with the least traffic (sent + received) in the period
    const weakRegions = useMemo(() => [...analyticsData].filter((r: any) => r.isActive !== false).sort((a: any, b: any) => a.parcelCount - b.parcelCount), [analyticsData])

    const handleAdd = () => {
        setSelectedRegion(null)
        setIsAddSheetOpen(true)
    }
    const handleEdit = (region: any) => {
        setSelectedRegion(region)
        setIsAddSheetOpen(true)
    }
    const handleView = (region: any) => {
        setSelectedRegion(region)
        setIsViewSheetOpen(true)
    }

    const openDetailedAnalytics = (type: "origin" | "destination" | "needs_visibility") => {
        setAnalyticsModalType(type)
        setIsAnalyticsModalOpen(true)
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
    // Opened from the portal search: fill the search and open the result
    useSearchLanding({ setSearch: setSearchQuery, showList: () => setActiveTab("all"), items: analyticsData, ready: !isLoadingRegions, onOpen: handleView })

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
                            placeholder={tr("Search regions…")} 
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

                        <Select value={dateRange} onValueChange={(val: any) => setDateRange(val)}>
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
                        filename="regions"
                        title={tr("Regions")}
                        subtitle={tr("Parcel counts: {periodLabel}{only}{searchQuery}", { periodLabel, only: statusFilter !== "all" ? ` · ${statusFilter} only` : "", searchQuery: searchQuery ? ` · matching "${searchQuery}"` : "" })}
                        rows={analyticsData}
                        columns={[["Region", (r: any) => r.name], ["Country", (r: any) => r.countryName], ["Status", (r: any) => r.isActive === false ? "Inactive" : "Active"], ["Districts", (r: any) => r.districtCount], ["Booking offices", (r: any) => r.officeCount], ["Parcels sent", (r: any) => r.originCount], ["Parcels received", (r: any) => r.destinationCount]]}
                    />
                    <Button 
                        onClick={handleAdd}
                        className="h-10 px-5 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-small)] font-semibold text-sm shadow-[var(--ds-shadow-raised)] transition-colors flex items-center gap-2 cursor-pointer"
                    >
                        <Icon icon={Add01Icon} size={16} />{tr("New region")}</Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <div className="portal-sticky-wrap flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <TabsList className="portal-sticky-tabs bg-slate-100 dark:bg-black/20 p-1.5 rounded-[var(--ds-radius-small)] w-full items-stretch h-auto max-w-xl">
                        <TabsTrigger 
                            value="insights" 
                            className="flex-1 h-11 rounded-[var(--ds-radius-large)] text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-[#242a37] data-[state=active]:shadow-[var(--ds-shadow-raised)] transition-all cursor-pointer"
                        >
                            <Icon icon={Chart01Icon} size={20} className="mr-2" />{tr("Overview")}</TabsTrigger>
                        <TabsTrigger 
                            value="all" 
                            className="flex-1 h-11 rounded-[var(--ds-radius-large)] text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-[#242a37] data-[state=active]:shadow-[var(--ds-shadow-raised)] transition-all gap-3 cursor-pointer"
                        >
                            <div className="flex items-center gap-2">
                                <Icon icon={MapsLocation01Icon} size={20} />{tr("All Regions")}</div>
                            <Badge className="bg-[#ffd428] text-[#242a37] border-none text-xs font-semibold h-6 min-w-10 flex items-center justify-center rounded-[var(--ds-radius-small)]">
                                {analyticsData.length}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>

                </div>

                <TabsContent value="insights" className="space-y-10 focus:outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: tr("Parcels"), value: isLoadingParcels ? "…" : isVolumesError ? "—" : stats.totalParcels.toLocaleString(), icon: Package01Icon, sub: tr("Booked {periodLabel}", { periodLabel }) },
                            { label: tr("Regions"), value: stats.totalRegions.toLocaleString(), icon: Building03Icon, sub: isLoadingParcels ? "…" : `${stats.activeRegions.toLocaleString()} with parcels ${periodLabel}` },
                            { label: tr("Districts"), value: stats.totalDistricts.toLocaleString(), icon: MapsLocation01Icon, sub: tr("{totalOffices} booking offices", { totalOffices: stats.totalOffices.toLocaleString() }) },
                        ].map((card, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                                <Card className="rounded-[var(--ds-radius-large)] border-none h-full bg-[#242a37] relative group shadow-[var(--ds-shadow-raised)] transition-all overflow-hidden">
                                     <div className="absolute right-[-15px] bottom-[-15px] opacity-[0.05] text-[#ffd428] pointer-events-none transform rotate-12 transition-transform">
                                        <Icon icon={card.icon} size={100} />
                                    </div>
                                    <CardContent className="p-6 relative z-10">
                                        <div className="size-10 rounded-[var(--ds-radius-small)] flex items-center justify-center bg-white/5 mb-4">
                                            <Icon icon={card.icon} className="size-5 text-[#ffd428]" />
                                        </div>
                                        <p className="text-xs font-semibold text-[#ffd428]/60 mb-1">{card.label}</p>
                                        <h3 className={cn(cardValueClass(card.value), "font-semibold leading-tight text-white line-clamp-2 break-words")} title={(card as any).title ?? String(card.value)}>{card.value}</h3>
                                        <p className="text-xs font-bold text-white/40 mt-2">{card.sub}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* High Performance Origin Regions */}
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] overflow-hidden group col-span-1 flex flex-col">
                           <CardHeader className="relative py-8 px-6 bg-[#242a37] text-white border-none rounded-t-[var(--ds-radius-small)] shrink-0">
                                <div className="absolute inset-0 bg-[#ffd428]/5 opacity-30" />
                                <div className="relative z-10">
                                    <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                        <Icon icon={ChampionIcon} className="text-[#ffd428]" size={24} />{tr("Most parcels sent")}</CardTitle>
                                    <CardDescription className="text-xs font-semibold text-white/40 mt-1">{tr("Regions parcels are sent from · {periodLabel}", { periodLabel })}</CardDescription>
                                </div>
                           </CardHeader>
                           <CardContent className="p-0 bg-white dark:bg-[#1a1f2b] flex-1">
                                <div className="divide-y divide-slate-100 dark:divide-white/5">
                                    {isLoadingParcels ? (
                                        <ListSkeleton rows={5} avatar />
                                    ) : topOriginRegions.length === 0 ? (
                                        <p className="p-6 text-sm text-slate-400">{tr("No parcels sent {periodLabel}.", { periodLabel })}</p>
                                    ) : topOriginRegions.slice(0, 5).map((region, i) => (
                                        <div key={region.id} onClick={() => handleView(region)} className="p-6 hover:bg-slate-50 dark:hover:bg-white/[0.02] flex items-center justify-between cursor-pointer group/item transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="size-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400 group-hover/item:bg-[#ffd428] group-hover/item:text-[#242a37] transition-all">
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{region.name}</p>
                                                    <p className="text-xs font-semibold text-[#ffd428] mt-0.5">{region.countryName}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{region.originCount.toLocaleString()}</p>
                                                <p className="text-xs font-semibold text-slate-400 mt-0.5">{tr("sent")}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-6 bg-slate-50/50 dark:bg-black/10 border-t border-slate-100 dark:border-white/5">
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => openDetailedAnalytics("origin")}
                                        className="w-full h-11 text-xs font-semibold text-[#ffd428] hover:bg-[#ffd428] hover:text-[#242a37] transition-colors rounded-[var(--ds-radius-small)]"
                                    >{tr("See all regions by parcels sent")}<Icon icon={ArrowRight01Icon} size={16} className="ml-2" />
                                    </Button>
                                </div>
                           </CardContent>
                        </Card>

                        {/* High Performance Destination Regions */}
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] overflow-hidden group col-span-1 flex flex-col">
                           <CardHeader className="relative py-8 px-6 bg-[#242a37] text-white border-none rounded-t-[var(--ds-radius-small)] shrink-0">
                                <div className="absolute inset-0 bg-teal-500/5 opacity-30" />
                                <div className="relative z-10">
                                    <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                        <Icon icon={Package01Icon} className="text-teal-400" size={24} />{tr("Most parcels received")}</CardTitle>
                                    <CardDescription className="text-xs font-semibold text-white/40 mt-1">{tr("Regions parcels are sent to · {periodLabel}", { periodLabel })}</CardDescription>
                                </div>
                           </CardHeader>
                           <CardContent className="p-0 bg-white dark:bg-[#1a1f2b] flex-1">
                                <div className="divide-y divide-slate-100 dark:divide-white/5">
                                    {isLoadingParcels ? (
                                        <ListSkeleton rows={5} avatar />
                                    ) : topDestRegions.length === 0 ? (
                                        <p className="p-6 text-sm text-slate-400">{tr("No parcels received {periodLabel}.", { periodLabel })}</p>
                                    ) : topDestRegions.slice(0, 5).map((region, i) => (
                                        <div key={region.id} onClick={() => handleView(region)} className="p-6 hover:bg-slate-50 dark:hover:bg-white/[0.02] flex items-center justify-between cursor-pointer group/item transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="size-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400 group-hover/item:bg-teal-500 group-hover/item:text-white transition-all">
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{region.name}</p>
                                                    <p className="text-xs font-semibold text-teal-500 mt-0.5">{region.countryName}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{region.destinationCount.toLocaleString()}</p>
                                                <p className="text-xs font-semibold text-slate-400 mt-0.5">{tr("received")}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-6 bg-slate-50/50 dark:bg-black/10 border-t border-slate-100 dark:border-white/5">
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => openDetailedAnalytics("destination")}
                                        className="w-full h-11 text-xs font-semibold text-teal-500 hover:bg-teal-500 hover:text-white transition-colors rounded-[var(--ds-radius-small)]"
                                    >{tr("See all regions by parcels received")}<Icon icon={ArrowRight01Icon} size={16} className="ml-2" />
                                    </Button>
                                </div>
                           </CardContent>
                        </Card>

                        {/* Underperforming Regions */}
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] overflow-hidden group col-span-1 flex flex-col">
                           <CardHeader className="relative py-8 px-6 bg-[#242a37] text-white border-none rounded-t-[var(--ds-radius-small)] shrink-0">
                                <div className="absolute inset-0 bg-rose-500/5 opacity-30" />
                                <div className="relative z-10">
                                    <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                        <Icon icon={Activity01Icon} className="text-rose-500" size={24} />{tr("Quietest regions")}</CardTitle>
                                    <CardDescription className="text-xs font-semibold text-white/40 mt-1">{tr("Fewest parcels sent or received · {periodLabel}", { periodLabel })}</CardDescription>
                                </div>
                           </CardHeader>
                           <CardContent className="p-0 bg-white dark:bg-[#1a1f2b] flex-1">
                                <div className="divide-y divide-slate-100 dark:divide-white/5">
                                    {weakRegions.length > 0 ? weakRegions.slice(0, 5).map((region, i) => (
                                        <div key={region.id} onClick={() => handleView(region)} className="p-6 hover:bg-slate-50 dark:hover:bg-white/[0.02] flex items-center justify-between cursor-pointer group/item transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="size-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400 group-hover/item:bg-rose-500 group-hover/item:text-white transition-all">
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{region.name}</p>
                                                    <p className="text-xs font-semibold text-rose-500 mt-0.5">{region.countryName}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-rose-500">{region.parcelCount.toLocaleString()}</p>
                                                <p className="text-xs font-semibold text-slate-400 mt-0.5">{tr("parcels")}</p>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="p-6 text-center">
                                            <p className="text-xs font-semibold text-slate-400">{tr("No active regions")}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-6 bg-slate-50/50 dark:bg-black/10 border-t border-slate-100 dark:border-white/5">
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => openDetailedAnalytics("needs_visibility")}
                                        className="w-full h-11 text-xs font-semibold text-rose-500 hover:bg-rose-500 hover:text-white transition-colors rounded-[var(--ds-radius-small)]"
                                    >{tr("See all regions by activity")}<Icon icon={ArrowRight01Icon} size={16} className="ml-2" />
                                    </Button>
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
                                    {isFetchingRegions && (
                                        <div className="absolute top-0 left-0 w-full h-1 bg-transparent animate-shimmer z-30" />
                                    )}
                                    <TableBanner title={tr("All Regions")} description={tr("Regions and their districts and offices")} icon="regions" />
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto min-h-[500px]">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-slate-100/30 dark:bg-white/[0.01] border-b border-slate-200 dark:border-white/5 hover:bg-transparent">
                                                        <TableHead className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-xs">{tr("Region name")}</TableHead>
                                                        <TableHead className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-xs">{tr("Coverage")}</TableHead>
                                                        <TableHead className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-xs">{tr("Parcels · {periodLabel}", { periodLabel })}</TableHead>
                                                        <TableHead className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-xs text-center">{tr("Sent / received")}</TableHead>
                                                        <TableHead className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-xs text-right">{tr("Action")}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    <AnimatePresence>
                                                        {tablePage.pageRows.map((region, i) => (
                                                            <React.Fragment key={region.id}>
                                                                <motion.tr 
                                                                    initial={{ opacity: 0, x: -10 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    transition={{ delay: i * 0.03 }}
                                                                    onClick={() => handleView(region)}
                                                                    className={cn(
                                                                        "hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors border-b border-slate-100 dark:border-white/5 cursor-pointer group",
                                                                        expandedRegions.has(region.id) && "bg-slate-50/50 dark:bg-white/[0.02]"
                                                                    )}
                                                                >
                                                                    <TableCell className="px-6 py-8">
                                                                        <div className="flex items-center gap-5">
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); toggleRegion(region.id); }}
                                                                                className="size-6 rounded-md bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-[#ffd428] hover:text-[#242a37] transition-colors"
                                                                            >
                                                                                <Icon 
                                                                                    icon={ArrowRight01Icon} 
                                                                                    size={14} 
                                                                                    className={cn("transition-transform duration-300", expandedRegions.has(region.id) && "rotate-90")} 
                                                                                />
                                                                            </button>
                                                                            <div>
                                                                                <p className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-[#ffd428] transition-colors">{region.name}</p>
                                                                                <div className="flex items-center gap-2 mt-1">
                                                                                    {region.flagUrl ? (
                                                                                        <div className="size-4 rounded-full overflow-hidden border border-slate-200">
                                                                                            <img src={region.flagUrl} alt={tr("flag")} className="size-full object-cover" />
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className="text-[12px] leading-none">{getCountryFlag(region.countryName)}</span>
                                                                                    )}
                                                                                    <span className="text-xs text-slate-400 font-bold">{region.countryName}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="px-6 py-8">
                                                                        <div className="flex flex-wrap gap-2">
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/ops/locations/districts?regionId=${region.id}`) }}
                                                                                className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 px-3 py-1.5 rounded-full font-semibold text-xs transition-colors cursor-pointer"
                                                                            >
                                                                                {tr("{districtCount} Districts", { districtCount: region.districtCount })}</button>
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/ops/locations/booking-offices?regionId=${region.id}`) }}
                                                                                className="flex items-center gap-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 px-3 py-1.5 rounded-full font-semibold text-xs transition-colors cursor-pointer"
                                                                            >
                                                                                {tr("{officeCount} Offices", { officeCount: region.officeCount })}</button>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="px-6 py-8">
                                                                        <div className="space-y-1">
                                                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                                                {region.parcelCount.toLocaleString()} <span className="text-xs text-slate-400">{tr("parcels")}</span>
                                                                            </p>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="px-6 py-8 text-center">
                                                                        <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                                                                            {region.originCount.toLocaleString()}
                                                                            <span className="mx-1.5 text-slate-300">/</span>
                                                                            {region.destinationCount.toLocaleString()}
                                                                        </p>
                                                                    </TableCell>
                                                                    <TableCell className="px-6 py-8 text-right">
                                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-colors transform translate-x-4">
                                                                            <Button 
                                                                                size="icon" 
                                                                                variant="ghost" 
                                                                                onClick={(e) => { e.stopPropagation(); handleView(region); }}
                                                                                className="size-10 bg-slate-100 dark:bg-white/5 hover:bg-[#ffd428] hover:text-[#242a37] rounded-[var(--ds-radius-small)] transition-colors"
                                                                            >
                                                                                <Icon icon={ViewIcon} size={18} />
                                                                            </Button>
                                                                            <Button 
                                                                                size="icon" 
                                                                                variant="ghost" 
                                                                                onClick={(e) => { e.stopPropagation(); handleEdit(region); }}
                                                                                className="size-10 bg-slate-100 dark:bg-white/5 hover:bg-blue-500 hover:text-white rounded-[var(--ds-radius-small)] transition-colors"
                                                                            >
                                                                                <Icon icon={PencilEdit01Icon} size={18} />
                                                                            </Button>
                                                                            <LocationDeleteButton kind="region" id={region.id} name={region.name} />
                                                                        </div>
                                                                    </TableCell>
                                                                </motion.tr>
                                                            </React.Fragment>
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

            <RegionSheet isOpen={isAddSheetOpen} onClose={() => setIsAddSheetOpen(false)} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["regions-registry"] })} region={selectedRegion} />
            <RegionViewSheet 
                isOpen={isViewSheetOpen} 
                onClose={() => setIsViewSheetOpen(false)} 
                region={selectedRegion} 
                onEdit={(region) => {
                    setIsViewSheetOpen(false)
                    setSelectedRegion(region)
                    setIsAddSheetOpen(true)
                }}
            />

            <RegionalViewAnalyticsModal 
                isOpen={isAnalyticsModalOpen}
                onClose={() => setIsAnalyticsModalOpen(false)}
                type={analyticsModalType}
                data={analyticsModalType === "origin" ? topOriginRegions : analyticsModalType === "destination" ? topDestRegions : weakRegions}
                onViewRegion={(region) => {
                    setIsAnalyticsModalOpen(false)
                    handleView(region)
                }}
                dateRange={dateRange}
            />
        </div>
        </>
    )
}
