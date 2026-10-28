"use client"

import React, { useState, useMemo, useEffect, useCallback } from "react"
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
import { getCountries, getRegions, getDistricts, getBookingOffices } from "@/lib/services/location"
import { getRegionVolumes, rollUpVolumes } from "@/lib/services/parcel"
import { getCompanies } from "@/lib/services/company"
import { getCountryFlag } from "@/lib/utils/country"
import { toast } from "@/components/ui/use-toast"
import { LoadingSpinner } from "@/components/loading-spinner"
import { useDebounce } from "@/hooks/use-debounce"
import { Icon } from "@/components/ui/icon"
import { 
    Add01Icon, Search01Icon, PencilEdit01Icon, Delete02Icon, ViewIcon, 
    ChartLineData02Icon, Sorting05Icon, Package01Icon, Chart01Icon, Building03Icon, Activity01Icon, MoneyReceive01Icon,
    GlobeIcon, FilterIcon, Download01Icon, ListViewIcon, GridViewIcon, ArrowLeft01Icon, ArrowRight01Icon,
    ChampionIcon, Sad01Icon, PieChart01Icon, Clock01Icon, CheckListIcon,
    City01Icon, ProfileIcon
} from "@hugeicons/core-free-icons"
import { CountrySheet } from "@/components/modals/country-sheet"
import { CountryViewSheet } from "@/components/modals/country-view-sheet"
import { GlobalReachModal } from "@/components/modals/global-reach-modal"
import { PerformanceAuditModal } from "@/components/modals/performance-audit-modal"
import { cn } from "@/lib/utils"
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
    Tooltip as RechartsTooltip, PieChart, Pie, Cell, 
    BarChart, Bar, Legend
} from 'recharts'
import { motion, AnimatePresence } from "framer-motion"
import { format, subDays, eachDayOfInterval } from "date-fns"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { TableBanner } from "@/components/ui/table-banner"
import { ExportMenu } from "@/components/export/export-menu"
import { useTr } from "@/lib/i18n/portal"
import { ListPager, usePaged } from "@/components/ui/list-pager"

// Brand color palette (from companies page)
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
    indigo: "#6366f1",
    gray: "#6b7280",
}


export default function CountriesPage() {
    const tr = useTr()
    const queryClient = useQueryClient()
    const router = useRouter()
    const searchParams = useSearchParams()
    const params = useParams()
    const locale = params.locale as string

    // State management
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState("overview")
    const viewMode = "list" as const
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [dateRange, setDateRange] = useState("overall")
    
    const debouncedSearch = useDebounce(searchQuery, 300)

    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false)
    const [isViewSheetOpen, setIsViewSheetOpen] = useState(false)
    const [isGlobalReachModalOpen, setIsGlobalReachModalOpen] = useState(false)
    const [isPerformanceAuditModalOpen, setIsPerformanceAuditModalOpen] = useState(false)
    const [selectedCountry, setSelectedCountry] = useState<any>(null)
    const [expandedCountries, setExpandedCountries] = useState<Set<number>>(new Set())
    const [expandedRegions, setExpandedRegions] = useState<Set<number>>(new Set())

    const toggleCountry = (id: number) => {
        const next = new Set(expandedCountries)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setExpandedCountries(next)
    }

    const toggleRegion = (id: number) => {
        const next = new Set(expandedRegions)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setExpandedRegions(next)
    }

    // Helper to get date params for API
    const dateParams = useMemo(() => {
        if (dateRange === "overall") return {}
        return {
            dateFrom: dateRange === 'today' ? format(new Date(), 'yyyy-MM-dd') : 
                     dateRange !== 'overall' ? format(subDays(new Date(), dateRange === '7d' ? 7 : 30), 'yyyy-MM-dd') : undefined,
            dateTo: dateRange !== 'overall' ? format(new Date(), 'yyyy-MM-dd') : undefined,
        }
    }, [dateRange])

    const { data: rawCountries = [], isLoading: isLoadingCountries, isFetching: isFetchingCountries } = useQuery({
        queryKey: ["countries-registry", debouncedSearch, statusFilter],
        queryFn: async () => {
            const response = await getCountries({ 
                search: debouncedSearch || undefined,
                include: "regions,regions.districts,regions.districts.bookingOffices",
                paginate: false
            })
            // getCountries returns enriched data directly
            let data = Array.isArray(response) ? response : []
            
            // Filter for status if applicable
            if (statusFilter !== "all" && statusFilter !== undefined) {
                data = data.filter((c: any) => c.isActive === (statusFilter === "active"))
            }
            return data
        },
    })


    // Parcels per region, counted by the backend (exact, one cached request);
    // added up per country below.
    const { data: regionVolumes, isLoading: isLoadingParcels, isError: isVolumesError } = useQuery({
        queryKey: ["region-volumes", dateParams],
        queryFn: ({ signal }) => getRegionVolumes(dateRange === "overall" ? null : (dateParams as { dateFrom: string; dateTo: string }), signal),
        staleTime: 5 * 60_000,
    })

    const { data: rawRegions = [], isLoading: isLoadingRegions } = useQuery({
        queryKey: ["regions-all-for-mapping"],
        queryFn: async () => getRegions()
    })

    const { data: rawDistricts = [], isLoading: isLoadingDistricts } = useQuery({
        queryKey: ["districts-all-for-mapping"],
        queryFn: async () => getDistricts()
    })

    const { data: rawOffices = [], isLoading: isLoadingOffices } = useQuery({
        queryKey: ["offices-all-for-mapping"],
        queryFn: async () => getBookingOffices()
    })

    const apiRegions = Array.isArray(rawRegions?.data) ? rawRegions.data : (Array.isArray(rawRegions) ? rawRegions : [])
    const apiDistricts = Array.isArray(rawDistricts?.data) ? rawDistricts.data : (Array.isArray(rawDistricts) ? rawDistricts : [])
    const apiOffices = Array.isArray(rawOffices?.data) ? rawOffices.data : (Array.isArray(rawOffices) ? rawOffices : [])

    const isLoading = isLoadingCountries || isLoadingParcels || isLoadingRegions || isLoadingDistricts || isLoadingOffices

    const periodLabel = ({ today: "today", "7d": "last 7 days", "30d": "last 30 days", overall: "all time" } as Record<string, string>)[dateRange] ?? "all time"

    const analyticsData = useMemo(() => {
        const countryOfRegion = new Map<number, number>()
        for (const r of apiRegions as any[]) countryOfRegion.set(Number(r.id), Number(r.countryId ?? r.country_id))
        const sent = rollUpVolumes(regionVolumes?.sent, (id) => countryOfRegion.get(id))
        const received = rollUpVolumes(regionVolumes?.received, (id) => countryOfRegion.get(id))
        // Every parcel has one origin, so the sum of "sent" is every parcel
        const totalSent = Object.values(sent).reduce((acc, v) => acc + v.parcels, 0)

        return rawCountries.map((country: any) => {
            const countryId = Number(country.id ?? country.ID)
            const cRegions = (apiRegions as any[]).filter((r) => Number(r.countryId ?? r.country_id) === countryId)
            const regionIds = new Set(cRegions.map((r) => Number(r.id)))
            const cDistricts = (apiDistricts as any[]).filter((d) => regionIds.has(Number(d.region_id ?? d.regionId)))
            const cOffices = (apiOffices as any[]).filter((o) => regionIds.has(Number(o.regionId ?? o.region_id)))
            const isActive = country.isActive !== false && String(country.status).toLowerCase() !== "inactive"
            const parcelCount = sent[countryId]?.parcels ?? 0
            return {
                ...country,
                parcelCount,
                receivedCount: received[countryId]?.parcels ?? 0,
                revenue: sent[countryId]?.revenue ?? 0,
                contribution: totalSent > 0 ? (parcelCount / totalSent) * 100 : 0,
                regionCount: cRegions.length,
                districtCount: cDistricts.length,
                officeCount: cOffices.length,
                score: parcelCount,
                statusLabel: isActive ? "Active" : "Inactive",
                statusColor: isActive ? BRAND_COLORS.success : BRAND_COLORS.danger,
                isActive,
            }
        }).sort((a: any, b: any) => b.parcelCount - a.parcelCount)
    }, [rawCountries, regionVolumes, apiRegions, apiDistricts, apiOffices])

    const stats = useMemo(() => ({
        totalParcels: analyticsData.reduce((acc: number, c: any) => acc + c.parcelCount, 0),
        totalRevenue: analyticsData.reduce((acc: number, c: any) => acc + c.revenue, 0),
        totalRegions: analyticsData.reduce((acc: number, c: any) => acc + c.regionCount, 0),
        totalDistricts: analyticsData.reduce((acc: number, c: any) => acc + c.districtCount, 0),
        totalOffices: analyticsData.reduce((acc: number, c: any) => acc + c.officeCount, 0),
        totalCountries: analyticsData.length,
        countriesWithParcels: analyticsData.filter((c: any) => c.parcelCount > 0).length,
        activeCountries: analyticsData.filter((c: any) => c.isActive).length,
    }), [analyticsData])

    const handleAdd = () => {
        setSelectedCountry(null)
        setIsAddSheetOpen(true)
    }

    const handleEdit = (country: any) => {
        setSelectedCountry(country)
        setIsAddSheetOpen(true)
    }

    const handleView = (country: any) => {
        setSelectedCountry(country)
        setIsViewSheetOpen(true)
    }

    // Distributions for charts
    const topCountriesByParcels = useMemo(() => [...analyticsData].sort((a, b) => b.parcelCount - a.parcelCount).slice(0, 5), [analyticsData])
    const underperformingCountries = useMemo(() => [...analyticsData].filter((c: any) => c.isActive).sort((a: any, b: any) => a.parcelCount - b.parcelCount), [analyticsData])
    
    const contributionChartData = useMemo(() => {
        const top5 = topCountriesByParcels
        const COLORS = [BRAND_COLORS.primary, BRAND_COLORS.info, BRAND_COLORS.purple, BRAND_COLORS.teal, BRAND_COLORS.pink]
        
        const data = top5.map((c, i) => ({
            name: c.name,
            value: Number(c.contribution.toFixed(1)),
            fill: COLORS[i]
        }))

        const totalTop5 = top5.reduce((acc, c) => acc + c.contribution, 0)
        if (totalTop5 < 100) {
            data.push({ name: "Others", value: Number((100 - totalTop5).toFixed(1)), fill: "#94a3b8" })
        }
        return data
    }, [topCountriesByParcels])


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
            {/* -- Header -- */}
            <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 justify-between">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 min-w-0">
                    {/* Integrated Search */}
                    <div className="relative group flex-1 min-w-0">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                            <Icon icon={Search01Icon} 
                                    size={20} 
                                    className="text-slate-400 group-focus-within:text-[#ffd428] transition-colors" 
                                />
                        </div>
                        <Input 
                            placeholder={tr("Search countries…")} 
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

                    {/* Integrated Filters */}
                    <div className="flex items-center gap-3">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-36 h-10 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-medium shadow-none outline-none focus:ring-1 focus:ring-[#ffd428]/50">
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
                        filename="countries"
                        title={tr("Countries")}
                        subtitle={tr("Parcel counts: {periodLabel}{only}{searchQuery}", { periodLabel, only: statusFilter !== "all" ? ` · ${statusFilter} only` : "", searchQuery: searchQuery ? ` · matching "${searchQuery}"` : "" })}
                        rows={analyticsData}
                        columns={[["Country", (r: any) => r.name], ["Code", (r: any) => r.code], ["Status", (r: any) => r.statusLabel], ["Regions", (r: any) => r.regionCount], ["Districts", (r: any) => r.districtCount], ["Booking offices", (r: any) => r.officeCount], ["Parcels", (r: any) => r.parcelCount]]}
                    />
                    <Button 
                        onClick={handleAdd}
                        className="h-10 px-5 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-small)] font-semibold text-sm shadow-[var(--ds-shadow-raised)] transition-colors flex items-center gap-2 cursor-pointer"
                    >
                        <Icon icon={Add01Icon} size={16} />{tr("New country")}</Button>
                </div>
            </div>

            {/* -- Navigation Tabs -- */}
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
                                <Icon icon={GlobeIcon} size={20} />{tr("All Countries")}</div>
                            <Badge className="bg-[#ffd428] text-[#242a37] border-none text-xs font-semibold h-6 min-w-10 flex items-center justify-center rounded-[var(--ds-radius-small)]">
                                {analyticsData.length}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>

                </div>

                {/* -- Overview Tab -- */}
                <TabsContent value="overview" className="space-y-10 focus:outline-none">
                    {/* Performance Command Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                label: tr("Parcels"),
                                value: isLoadingParcels ? "…" : isVolumesError ? "—" : stats.totalParcels.toLocaleString(),
                                icon: Package01Icon,
                                color: "text-[#ffd428]", 
                                iconBg: "bg-white/5",
                                cardBg: "bg-[#242a37]",
                                sub: tr("Booked {periodLabel}", { periodLabel }),
                            },
                            {
                                label: tr("Countries"),
                                value: stats.totalCountries.toLocaleString(),
                                icon: GlobeIcon,
                                color: "text-[#ffd428]", 
                                iconBg: "bg-white/5",
                                cardBg: "bg-[#242a37]",
                                sub: isLoadingParcels ? "…" : `${stats.countriesWithParcels} with parcels ${periodLabel}`,
                            },
                            {
                                label: tr("Booking offices"),
                                value: stats.totalOffices.toLocaleString(),
                                icon: Building03Icon,
                                color: "text-[#ffd428]", 
                                iconBg: "bg-white/5",
                                cardBg: "bg-[#242a37]",
                                sub: tr("In {totalDistricts} districts", { totalDistricts: stats.totalDistricts.toLocaleString() }),
                            },
                        ].map((card, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.07 }}
                                className="h-full"
                            >
                                <Card className={cn("rounded-[var(--ds-radius-large)] border-none h-full transition-all duration-300 overflow-hidden relative group shadow-[var(--ds-shadow-raised)]", card.cardBg)}>
                                    <div className="absolute right-[-15px] bottom-[-15px] opacity-[0.05] text-[#ffd428] pointer-events-none transform rotate-12 transition-transform">
                                        <Icon icon={card.icon} size={100} />
                                    </div>
                                    <CardContent className="p-6 relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={cn("size-10 rounded-[var(--ds-radius-small)] flex items-center justify-center shadow-[var(--ds-shadow-raised)]", card.iconBg)}>
                                                <Icon icon={card.icon} className={cn("size-5", card.color)} />
                                            </div>
                                        </div>
                                        <p className={cn("text-xs font-semibold mb-1 text-[#ffd428]/60")}>{card.label}</p>
                                        <h3 className={cn(cardValueClass(card.value), "font-semibold leading-tight leading-tight text-white line-clamp-2 break-words")} title={(card as any).title ?? String(card.value)}>{card.value}</h3>
                                        <p className="text-xs font-bold text-white/40 mt-2">{card.sub}</p>
                                        
                                        {(card as any).progress !== undefined && (
                                            <div className="h-1.5 w-full bg-black/20 rounded-full mt-4 overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(card as any).progress}%` }}
                                                    className="h-full bg-[#ffd428]"
                                                />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    {/* Charts Ecosystem */}
                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
                        {/* Contribution Donut */}
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden group flex flex-col justify-between lg:col-span-2">
                            <CardHeader className="relative py-8 px-6 bg-[#242a37] text-white border-none rounded-t-[var(--ds-radius-small)]">
                                <div className="absolute inset-0 bg-teal-500/10 opacity-30" />
                                <div>
                                    <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                        <Icon icon={PieChart01Icon} className="text-teal-400" size={24} />{tr("Share of parcels")}</CardTitle>
                                    <CardDescription className="text-xs font-bold text-white/40 mt-1">{tr("Where parcels are sent from · {periodLabel}", { periodLabel })}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 flex flex-col flex-1">
                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                    <div className="h-[200px] w-[200px] shrink-0 relative">
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                                            <p className="text-2xl font-bold text-[#242a37] dark:text-white leading-none">
                                                {stats.totalParcels.toLocaleString()}
                                            </p>
                                            <p className="text-xs font-semibold text-slate-400 mt-1">{tr("Parcels")}</p>
                                        </div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={contributionChartData}
                                                    innerRadius="65%"
                                                    outerRadius="90%"
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                    stroke="none"
                                                    startAngle={90}
                                                    endAngle={-270}
                                                >
                                                    {contributionChartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} className="focus:outline-none" />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip 
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            return (
                                                                <div className="bg-[#1a1f2b] text-white px-4 py-3 rounded-[var(--ds-radius-large)] border border-white/10 shadow-[var(--ds-shadow-raised)]">
                                                                    <p className="text-xs font-semibold text-slate-400">{payload[0].name}</p>
                                                                    <p className="text-xl font-semibold text-[#ffd428]">{payload[0].value}%</p>
                                                                </div>
                                                            )
                                                        }
                                                        return null
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex-1 space-y-3 min-w-0 w-full">
                                        {contributionChartData.slice(0, 4).map((entry, i) => (
                                            <div key={i} className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.fill }} />
                                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate font-sans">{entry.name}</span>
                                                </div>
                                                <span className="text-xs font-semibold text-[#242a37] dark:text-white shrink-0 font-sans">{entry.value}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Top Performance Countries */}
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden group lg:col-span-2">
                           <CardHeader className="py-8 px-6 bg-[#242a37] text-white">
                                <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                    <Icon icon={ChampionIcon} className="text-[#ffd428]" size={24} />{tr("Most parcels")}</CardTitle>
                                <CardDescription className="text-xs font-semibold text-white/40 mt-1">{tr("Countries parcels are sent from · {periodLabel}", { periodLabel })}</CardDescription>
                           </CardHeader>
                           <CardContent className="p-0">
                                <div className="divide-y divide-slate-100 dark:divide-white/5 font-sans">
                                    {analyticsData.slice(0, 5).map((country, i) => (
                                        <div key={country.id} onClick={() => handleView(country)} className="p-6 hover:bg-slate-50 dark:hover:bg-white/[0.02] flex items-center justify-between cursor-pointer group/item transition-colors">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="size-8 shrink-0 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400 group-hover/item:bg-[#ffd428] group-hover/item:text-[#242a37] transition-all">
                                                    {i + 1}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{country.name}</p>
                                                    <p className="text-xs font-semibold text-[#ffd428] mt-0.5">{tr("{regionCount} regions", { regionCount: country.regionCount })}</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-4">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{country.parcelCount.toLocaleString()}</p>
                                                <p className="text-xs font-semibold text-slate-400 mt-0.5">{tr("{v}% of parcels", { v: (country.contribution || 0).toFixed(1) })}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                           </CardContent>
                        </Card>

                        {/* Growth Opportunities */}
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden group lg:col-span-2">
                           <CardHeader className="py-8 px-6 bg-[#242a37] text-white">
                                <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                    <Icon icon={Sad01Icon} className="text-rose-500" size={24} />{tr("Fewest parcels")}</CardTitle>
                                <CardDescription className="text-xs font-semibold text-white/40 mt-1">{tr("Active countries with the fewest parcels sent · {periodLabel}", { periodLabel })}</CardDescription>
                           </CardHeader>
                           <CardContent className="p-0">
                                <div className="divide-y divide-slate-100 dark:divide-white/5 font-sans">
                                    {underperformingCountries.slice(0, 5).map((country: any, i: number) => (
                                        <div key={country.id} onClick={() => handleView(country)} className="p-6 hover:bg-slate-50 dark:hover:bg-white/[0.02] flex items-center justify-between cursor-pointer group/item transition-colors">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="size-8 shrink-0 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400 group-hover/item:bg-rose-500 group-hover/item:text-white transition-all">
                                                    {i + 1}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{country.name}</p>
                                                    <p className="text-xs font-semibold text-rose-400 mt-0.5">{tr("{regionCount} regions", { regionCount: country.regionCount })}</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-4">
                                                <p className="text-sm font-semibold text-rose-500">{country.parcelCount.toLocaleString()}</p>
                                                <p className="text-xs font-semibold text-slate-400 mt-0.5">{tr("parcels")}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                           </CardContent>
                        </Card>
                    </div>

                </TabsContent>

                {/* -- Registry Tab -- */}
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
                                    {isFetchingCountries && (
                                        <div className="absolute top-0 left-0 w-full h-1 bg-transparent animate-shimmer z-30" />
                                    )}
                                    <TableBanner title={tr("All Countries")} description={tr("Countries the network operates in")} icon="countries" />
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto min-h-[600px]">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-slate-100/30 dark:bg-white/[0.01] border-b border-slate-200 dark:border-white/5 hover:bg-transparent">
                                                        <TableHead className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-xs">{tr("Country")}</TableHead>
                                                        <TableHead className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-xs">{tr("Coverage")}</TableHead>
                                                        <TableHead className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-xs">{tr("Parcels sent · {periodLabel}", { periodLabel })}</TableHead>
                                                        <TableHead className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-xs text-center">{tr("Status")}</TableHead>
                                                        <TableHead className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-xs text-right">{tr("Action")}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    <AnimatePresence>
                                                        {tablePage.pageRows.map((country, i) => (
                                                            <React.Fragment key={country.id}>
                                                                <motion.tr 
                                                                    initial={{ opacity: 0, x: -12 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    transition={{ delay: i * 0.04 }}
                                                                    className={cn(
                                                                        "hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors border-b border-slate-100 dark:border-white/5 cursor-pointer group",
                                                                        expandedCountries.has(country.id) && "bg-slate-50/50 dark:bg-white/[0.02]"
                                                                    )}
                                                                    onClick={() => handleView(country)}
                                                                >
                                                                    <TableCell className="px-6 py-8">
                                                                        <div className="flex items-center gap-5">
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); toggleCountry(country.id); }}
                                                                                className="size-6 rounded-md bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-[#ffd428] hover:text-[#242a37] transition-colors"
                                                                            >
                                                                                <Icon 
                                                                                    icon={ArrowRight01Icon} 
                                                                                    size={14} 
                                                                                    className={cn("transition-transform duration-300", expandedCountries.has(country.id) && "rotate-90")} 
                                                                                />
                                                                            </button>
                                                                            <div className="space-y-1">
                                                                                <p className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-[#ffd428] transition-colors flex items-center gap-2">
                                                                                    <Icon icon={ProfileIcon} size={14} className="text-slate-400 opacity-50" />
                                                                                    {country.name}
                                                                                </p>
                                                                                <p className="text-xs text-slate-400 font-bold flex items-center gap-2">
                                                                                    <Icon icon={City01Icon} size={12} className="opacity-50" />
                                                                                    {country.capital}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="px-6 py-8">
                                                                        <div className="flex flex-wrap gap-2">
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/ops/locations/regions?countryId=${country.id}`) }}
                                                                                className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 px-3 py-1.5 rounded-full font-semibold text-xs transition-colors cursor-pointer"
                                                                            >
                                                                                {tr("{regionCount} Regions", { regionCount: country.regionCount })}</button>
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/ops/locations/districts?countryId=${country.id}`) }}
                                                                                className="flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 px-3 py-1.5 rounded-full font-semibold text-xs transition-colors cursor-pointer"
                                                                            >
                                                                                {tr("{districtCount} Districts", { districtCount: country.districtCount })}</button>
                                                                            <div className="flex items-center gap-1.5 bg-teal-500/10 text-teal-600 px-3 py-1.5 rounded-full font-semibold text-xs">
                                                                                {tr("{officeCount} Offices", { officeCount: country.officeCount })}</div>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="px-6 py-8">
                                                                        <div className="space-y-1">
                                                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                                                {country.parcelCount.toLocaleString()} <span className="text-xs text-slate-400">{tr("parcels")}</span>
                                                                            </p>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="px-6 py-8 text-center">
                                                                        <div className="flex justify-center">
                                                                            <div 
                                                                                className="px-3 py-1.5 rounded-full flex items-center gap-1.5" 
                                                                                style={{ backgroundColor: `${country.statusColor}15` }}
                                                                            >
                                                                                <div className="size-1.5 rounded-full" style={{ backgroundColor: country.statusColor }} />
                                                                                <span className="text-xs font-semibold" style={{ color: country.statusColor }}>
                                                                                    {country.statusLabel}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="px-6 py-8 text-right">
                                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-colors transform translate-x-4">
                                                                            <Button 
                                                                                variant="ghost" 
                                                                                size="icon" 
                                                                                onClick={(e) => { e.stopPropagation(); handleView(country); }}
                                                                                className="size-10 bg-slate-100 dark:bg-white/5 hover:bg-[#ffd428] hover:text-[#242a37] rounded-[var(--ds-radius-small)] transition-colors"
                                                                            >
                                                                                <Icon icon={ViewIcon} size={18} />
                                                                            </Button>
                                                                            <Button 
                                                                                variant="ghost" 
                                                                                size="icon" 
                                                                                onClick={(e) => { e.stopPropagation(); handleEdit(country); }}
                                                                                className="size-10 bg-slate-100 dark:bg-white/5 hover:bg-blue-500 hover:text-white rounded-[var(--ds-radius-small)] transition-colors"
                                                                            >
                                                                                <Icon icon={PencilEdit01Icon} size={18} />
                                                                            </Button>
                                                                            <LocationDeleteButton kind="country" id={country.id} name={country.name} />
                                                                        </div>
                                                                    </TableCell>
                                                                </motion.tr>

                                                                {/* -- Nested Regions -- */}
                                                                <AnimatePresence>
                                                                    {expandedCountries.has(country.id) && (
                                                                        <motion.tr
                                                                            initial={{ opacity: 0, height: 0 }}
                                                                            animate={{ opacity: 1, height: "auto" }}
                                                                            exit={{ opacity: 0, height: 0 }}
                                                                            className="bg-slate-50/30 dark:bg-black/10 overflow-hidden"
                                                                        >
                                                                            <TableCell colSpan={5} className="p-0">
                                                                                <div className="pl-24 py-4 pr-10 space-y-2 border-l-[3px] border-[#ffd428] ml-14">
                                                                                    <div className="flex items-center justify-between mb-4 mt-2">
                                                                                        <p className="text-xs font-semibold text-slate-400">{tr("Offices in {name}", { name: country.name })}</p>
                                                                                        <Badge className="bg-[#ffd428]/10 text-[#ffd428] border-none text-xs font-semibold">{country.regions?.length || 0}{" "}{tr("Registered")}</Badge>
                                                                                    </div>
                                                                                    <div className="grid gap-2">
                                                                                        {country.regions?.map((region: any) => (
                                                                                            <div key={region.id} className="space-y-1">
                                                                                                <div className="flex items-center justify-between p-4 rounded-[var(--ds-radius-small)] bg-white dark:bg-[#1a1f2b] border border-slate-200 dark:border-white/5 shadow-[var(--ds-shadow-raised)] group/reg">
                                                                                                    <div className="flex items-center gap-4">
                                                                                                        <button 
                                                                                                            onClick={() => toggleRegion(region.id)}
                                                                                                            className="size-5 rounded bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-colors"
                                                                                                        >
                                                                                                            <Icon 
                                                                                                                icon={ArrowRight01Icon} 
                                                                                                                size={12} 
                                                                                                                className={cn("transition-transform duration-300", expandedRegions.has(region.id) && "rotate-90")} 
                                                                                                            />
                                                                                                        </button>
                                                                                                        <div>
                                                                                                            <p className="text-xs font-semibold text-slate-900 dark:text-white">{region.name}</p>
                                                                                                            <p className="text-xs font-bold text-slate-400">{region.districts?.length || 0}{" "}{tr("Districts")}</p>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="flex items-center gap-4 text-right">
                                                                                                        <div>
                                                                                                            <p className="text-xs font-semibold text-indigo-500">{region.parcelCount?.toLocaleString() || 0}</p>
                                                                                                            <p className="text-xs font-bold text-slate-400">{tr("Volume")}</p>
                                                                                                        </div>
                                                                                                        <Button size="icon" variant="ghost" className="size-8 opacity-0 group-hover/reg:opacity-100 transition-opacity">
                                                                                                            <Icon icon={ViewIcon} size={14} />
                                                                                                        </Button>
                                                                                                    </div>
                                                                                                </div>
                                                                                                
                                                                                                {/* -- Nested Districts -- */}
                                                                                                <AnimatePresence>
                                                                                                    {expandedRegions.has(region.id) && (
                                                                                                        <motion.div
                                                                                                            initial={{ opacity: 0, scale: 0.98, y: -10 }}
                                                                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                                                            exit={{ opacity: 0, scale: 0.98, y: -10 }}
                                                                                                            className="pl-8 pt-2 pb-4 space-y-2 border-l border-indigo-400/30 ml-4"
                                                                                                        >
                                                                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                                                                                {region.districts?.map((district: any) => (
                                                                                                                    <div key={district.id} className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 flex items-center justify-between group/dist hover:border-indigo-400/50 transition-colors">
                                                                                                                        <div className="flex items-center gap-2">
                                                                                                                            <div className="size-2 rounded-full bg-indigo-400" />
                                                                                                                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[100px]">{district.name}</span>
                                                                                                                        </div>
                                                                                                                        <span className="text-xs font-semibold text-slate-400">{district.bookingOffices?.length || 0}{" "}{tr("Offices")}</span>
                                                                                                                    </div>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                        </motion.div>
                                                                                                    )}
                                                                                                </AnimatePresence>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            </TableCell>
                                                                        </motion.tr>
                                                                    )}
                                                                </AnimatePresence>
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

            <CountrySheet isOpen={isAddSheetOpen} onClose={() => setIsAddSheetOpen(false)} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["countries-registry"] })} country={selectedCountry} />
            <CountryViewSheet 
                isOpen={isViewSheetOpen} 
                onClose={() => setIsViewSheetOpen(false)} 
                country={selectedCountry} 
                onEdit={(country) => {
                    setIsViewSheetOpen(false)
                    setSelectedCountry(country)
                    setIsAddSheetOpen(true)
                }}
            />
        </div>
        </>
    )
}