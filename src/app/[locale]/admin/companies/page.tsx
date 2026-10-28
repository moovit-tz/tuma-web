"use client"
import { Icon } from "@/components/ui/icon"
import { cardValueClass } from "@/lib/card-text"
import { useAccess } from "@/hooks/use-access"

import React from "react"
import type { Company } from "@/types/company"
import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCompanies, getAllCompanies, createCompany, updateCompany, deleteCompany, getCompanyStats, getCompanyVehicles, getCompanyAllAgents, getCompanyAgentCount, getCompanyParcels } from "@/lib/services/company"
import { getCompaniesActivity, getCompaniesPeriodMetrics, overviewRange, type OverviewPeriod } from "@/lib/services/parcel"
import { backgroundRequest, mapWithConcurrency } from "@/lib/concurrency"
import { Skeleton } from "@/components/ui/skeleton"
import { CompanyModal } from "@/components/modals/company-modal"
import { BusOwnerRegistrationModal } from "@/components/modals/bus-owner-registration-modal"
import { useDebounce } from "@/hooks/use-debounce"
import {
    Add01Icon,
    Search01Icon,
    Download01Icon,
    PencilEdit01Icon,
    Delete02Icon,
    MoreHorizontalIcon,
    Building03Icon,
    TruckIcon,
    UserGroupIcon,
    ViewIcon,
    ArrowUpRight01Icon,
    ArrowLeft01Icon,
    ArrowRight01Icon,
    RefreshIcon,
    FilterIcon,
    Chart01Icon,
    PieChart01Icon,
    Package01Icon,
    Clock01Icon,
    UserAdd01Icon,
    Activity01Icon,
    TruckDeliveryIcon,
    ChampionIcon,
    MoneyReceive01Icon,
    CheckListIcon,
    Cancel01Icon,
    Grid02Icon,
    CheckmarkCircle01Icon,
    Tick01Icon,
    Sad01Icon,
    OfficeIcon,
    File01Icon,
} from "@hugeicons/core-free-icons"
import { motion, AnimatePresence } from "framer-motion"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { CompanyViewModal } from "@/components/modals/company-view-modal"
import { format, subDays, addDays, eachDayOfInterval, startOfDay, differenceInCalendarDays } from "date-fns"
import { cn } from "@/lib/utils"
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip
} from "recharts"
import { useSearchLanding } from "@/hooks/use-search-landing"
import { getCompany } from "@/lib/services/company"
import { useTr } from "@/lib/i18n/portal"
import { ExportMenu } from "@/components/export/export-menu"

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
    indigo: "#6366f1",
    gray: "#6b7280",
}

// The backend's "Get All Companies" endpoint only documents a page
// parameter — no limit/all/paginate flag, and nothing that reliably reports
// a true total count. Any feature that needs the *complete* company list
// (search, Overview analytics) has to walk pages itself and stop once a
// page comes back empty or shorter than the one before it.
async function fetchAllCompaniesPaged(): Promise<any[]> {
    return getAllCompanies()
}

// Pagination component
const PaginationControls = ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    onPageSizeChange,
    isLoading = false,
}: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    onPageChange: (page: number) => void
    onPageSizeChange?: (size: number) => void
    isLoading?: boolean
}) => {
    const tr = useTr()
    const startItem = (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(currentPage * itemsPerPage, totalItems)

    const getPageNumbers = () => {
        const delta = 2
        const range: (number | string)[] = []
        const rangeWithDots: (number | string)[] = []

        for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
            range.push(i)
        }

        if (currentPage - delta > 2) {
            rangeWithDots.push(1, "...")
        } else {
            rangeWithDots.push(1)
        }

        rangeWithDots.push(...range)

        if (currentPage + delta < totalPages - 1) {
            rangeWithDots.push("...", totalPages)
        } else if (totalPages > 1) {
            rangeWithDots.push(totalPages)
        }

        return rangeWithDots
    }

    if (totalPages <= 1) return null

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-8 py-4 bg-white dark:bg-[#1a1f2b] border-t border-slate-100 dark:border-white/5">
            <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="text-xs font-semibold text-slate-400">{tr("Displaying")}{" "}<span className="text-slate-900 dark:text-white px-1.5">{startItem} - {endItem}</span>{tr("of")}{" "}<span className="text-slate-900 dark:text-white px-1.5">{totalItems}</span>{" "}{tr("companies")}</div>

                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400">{tr("Rows per page")}</span>
                    <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(value) => {
                            if (onPageSizeChange) {
                                onPageSizeChange(parseInt(value))
                                onPageChange(1)
                            }
                        }}
                        disabled={isLoading}
                    >
                        <SelectTrigger className="w-20 h-9 bg-slate-50 dark:bg-black/20 border-slate-100 dark:border-white/5 rounded-[var(--ds-radius-small)] text-xs font-semibold outline-none focus:ring-1 focus:ring-[#ffd428]/50">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-[var(--ds-radius-small)] bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/5">
                            <SelectItem value="5">05</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || isLoading}
                    className="h-9 w-9 bg-slate-50 dark:bg-white/5 hover:bg-[#ffd428] dark:hover:bg-[#ffd428] hover:text-[#242a37] text-slate-600 dark:text-white rounded-[var(--ds-radius-small)] transition-colors"
                >
                    <Icon icon={ArrowLeft01Icon} size={20} />
                </Button>

                <div className="flex items-center gap-1">
                    {getPageNumbers().map((pageNum, index) => (
                        <React.Fragment key={index}>
                            {pageNum === "..." ? (
                                <span className="px-2 text-slate-300 font-semibold">...</span>
                            ) : (
                                <Button
                                    variant="ghost"
                                    onClick={() => onPageChange(pageNum as number)}
                                    disabled={isLoading}
                                    className={cn(
                                        "h-9 min-w-[36px] px-2 rounded-[var(--ds-radius-small)] text-xs font-semibold transition-all",
                                        currentPage === pageNum
                                            ? "bg-[#ffd428] text-[#242a37] shadow-[var(--ds-shadow-raised)]"
                                            : "bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                                    )}
                                >
                                    {pageNum}
                                </Button>
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || isLoading}
                    className="h-9 w-9 bg-slate-50 dark:bg-white/5 hover:bg-[#ffd428] dark:hover:bg-[#ffd428] hover:text-[#242a37] text-slate-600 dark:text-white rounded-[var(--ds-radius-small)] transition-colors"
                >
                    <Icon icon={ArrowRight01Icon} size={20} />
                </Button>
            </div>
        </div>
    )
}

function CompanyInventoryCell({ company }: { company: Company }) {
    const hasMappedStats = (company.totalVehicles ?? 0) > 0 || (company.totalAgents ?? 0) > 0;

    const { data: vehiclesData, isLoading: isLoadingVehicles } = useQuery({
        queryKey: ["company", company.id, "vehicles-count"],
        queryFn: () => getCompanyVehicles(company.id),
        staleTime: 1000 * 60 * 5,
        enabled: !hasMappedStats
    })

    const { data: agentsData, isLoading: isLoadingAgents } = useQuery({
        queryKey: ["company", company.id, "agents-count"],
        queryFn: () => getCompanyAllAgents(company.id),
        staleTime: 1000 * 60 * 5,
        enabled: !hasMappedStats
    })

    const vehiclesCount = hasMappedStats ? company.totalVehicles : (vehiclesData?.length ?? 0);
    const agentsCount = hasMappedStats ? company.totalAgents : (agentsData?.length ?? 0);

    return (
        <TableCell className="px-6 py-4">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-600 px-2 py-1 rounded-md min-w-[48px] justify-center">
                    {isLoadingVehicles ? <Skeleton className="h-3 w-6" /> : (
                        <>
                            <Icon icon={TruckIcon} size={12} />
                            <span className="text-xs font-semibold tabular-nums">{vehiclesCount}</span>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-1.5 bg-[#ffd428]/10 text-[#242a37] dark:text-[#ffd428] px-2 py-1 rounded-md min-w-[48px] justify-center">
                    {isLoadingAgents ? <Skeleton className="h-3 w-6" /> : (
                        <>
                            <Icon icon={UserGroupIcon} size={12} />
                            <span className="text-xs font-semibold tabular-nums">{agentsCount}</span>
                        </>
                    )}
                </div>
            </div>
        </TableCell>
    )
}

function formatDaysAgo(days: number) {
    if (days === 0) return "today"
    if (days === 1) return "yesterday"
    return `${days} days ago`
}

function dormancyLabel(days: number | null) {
    return days === null ? "No parcels yet" : `No parcels for ${days} days`
}

function OverviewListSkeleton() {
    return (
        <div className="divide-y divide-slate-50 dark:divide-white/5">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-6">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-10" />
                </div>
            ))}
        </div>
    )
}

export default function CompaniesPage() {
    const tr = useTr()
    const queryClient = useQueryClient()
    const { can } = useAccess()
    const router = useRouter()

    useEffect(() => {
        document.title = "MySafari Parcel | Companies"
    }, [])

    const searchParams = useSearchParams()
    const params = useParams()
    const locale = params.locale as string

    // State management
    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [tierFilter, setTierFilter] = useState<string>("all")
    const [activeTab, setActiveTab] = useState("overview")
    const [chartView, setChartView] = useState<"area" | "bar">("area")

    // ─── Overview period filter ───
    // Same pattern as the Ops Dashboard: rank/aggregate companies over a
    // selected window instead of always pulling all-time totals. Cheaper
    // (each company-report call scopes to a tighter date range) and answers
    // "who's performing right now" rather than "who's biggest historically."
    const OVERVIEW_PERIOD_OPTIONS = [
        { value: "today", label: tr("Today") },
        { value: "7d", label: tr("Last 7 Days") },
        { value: "30d", label: tr("Last 30 Days") },
        { value: "all", label: tr("All Time") },
    ] as const
    const [overviewPeriod, setOverviewPeriod] = useState<typeof OVERVIEW_PERIOD_OPTIONS[number]["value"]>("today")

    // Shared with background-loader.tsx so its warm-up hits the same cache keys.
    const overviewPeriodRange = useCallback((value: string) => overviewRange(value as OverviewPeriod), [])

    // Initialize state from URL params
    useEffect(() => {
        const page = searchParams.get("page")
        const search = searchParams.get("search")
        const status = searchParams.get("status")
        const tier = searchParams.get("tier")

        if (page) setCurrentPage(Number.parseInt(page))
        if (search) setSearchQuery(search)
        if (status) setStatusFilter(status)
        if (tier) setTierFilter(tier)
    }, [searchParams])

    const debouncedSearchQuery = useDebounce(searchQuery, 300)

    // Update URL when filters change
    const updateURL = useCallback(() => {
        const urlParams = new URLSearchParams()
        if (currentPage > 1) urlParams.set("page", currentPage.toString())
        if (debouncedSearchQuery) urlParams.set("search", debouncedSearchQuery)
        if (statusFilter && statusFilter !== "all") urlParams.set("status", statusFilter)
        if (tierFilter && tierFilter !== "all") urlParams.set("tier", tierFilter)

        const newUrl = urlParams.toString() ? `?${urlParams.toString()}` : ""
        const fullUrl = `${window.location.pathname}${newUrl}`

        if (newUrl !== window.location.search) {
            router.push(fullUrl, { scroll: false })
        }
    }, [currentPage, debouncedSearchQuery, statusFilter, router, locale])

    useEffect(() => {
        updateURL()
    }, [updateURL])

    // Reset page when search or filters change
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1)
        }
    }, [debouncedSearchQuery, statusFilter, tierFilter])

    // Modal states
    const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)
    const [viewModalMode, setViewModalMode] = useState<"view" | "delete" | "edit">("view")
    const [isBusOwnerModalOpen, setIsBusOwnerModalOpen] = useState(false)
    // ── Intelligence panel modals ──
    const [showPortfolioModal, setShowPortfolioModal] = useState(false)
    const [showAuditModal, setShowAuditModal] = useState(false)
    const [showInactiveModal, setShowInactiveModal] = useState(false)
    const [showNewPartnersModal, setShowNewPartnersModal] = useState(false)

    // Intelligence Criterias (Thresholds)
    const [thresholds, setThresholds] = useState({
        eliteVolume: 100,      // Total parcels to be considered ELITE
        highRiskVolume: 10,    // Total parcels below which is HIGH RISK
        quietInactivity: 14,   // Days of inactivity
        newPartnerDays: 30     // Days since registration for NEW INTEGRATIONS
    })

    // All-time parcel counts per company (filled once the activity query
    // below resolves). Tiers are defined by all-time volume, and the company
    // list itself carries no counts, so the tier filter reads them from here.
    const allTimeParcelsRef = useRef<Record<number, number>>({})
    const [allTimeParcelsVersion, setAllTimeParcelsVersion] = useState(0)

    // Query keys
    const companiesQueryKey = [
        "companies", currentPage, pageSize, debouncedSearchQuery, statusFilter, tierFilter,
        // Re-filter by tier once real counts arrive
        tierFilter !== "all" ? allTimeParcelsVersion : 0,
    ]
    const statsQueryKey = ["company-stats"]
    // Static key — global dataset for Overview; not tied to search/filter/pagination
    const allCompaniesQueryKey = ["all-companies"]

    // Fetch companies
    const {
        data: companiesResponse,
        isLoading: isLoadingCompanies,
        isError: isErrorCompanies,
        refetch: refetchCompanies,
        error: companiesError,
        isFetching: isFetchingCompanies,
    } = useQuery({
        queryKey: companiesQueryKey,
        queryFn: async () => {
            // This endpoint only documents a "page" param — no limit, and no
            // server-side search/status support. A full page-walk gives
            // correct results for search/status/tier filtering, but doing
            // that on every plain page view (no filter at all) is what made
            // the page take forever to load — it had to fetch every company
            // in the system before showing row one. So: plain browsing stays
            // a single fast page request; only an active filter pays for the
            // full walk.
            const hasSearch = !!(debouncedSearchQuery && debouncedSearchQuery.trim())
            const hasStatusFilter = statusFilter && statusFilter !== "all"
            const hasTierFilter = tierFilter && tierFilter !== "all"

            if (!hasSearch && !hasStatusFilter && !hasTierFilter) {
                return getCompanies({ page: currentPage })
            }

            const searchTerm = hasSearch ? debouncedSearchQuery.trim().toLowerCase() : ""
            const companiesData = await fetchAllCompaniesPaged()

            const filtered = !searchTerm ? companiesData : companiesData.filter((company: Company) => {
                const searchFields = [
                    company.name,
                    company.email,
                    company.phoneNumber,
                    company.tin,
                    company.address
                ].filter(Boolean).map(f => f!.toLowerCase())

                return searchFields.some(f => f.includes(searchTerm))
            })

            let finalResults = filtered
            if (hasStatusFilter) {
                finalResults = finalResults.filter(c =>
                    c.isActive === (statusFilter === "active")
                )
            }

            if (hasTierFilter) {
                finalResults = finalResults.filter(c => {
                    const count = allTimeParcelsRef.current[c.id] ?? c.totalParcels ?? 0
                    if (tierFilter === "bronze") return count <= 500
                    if (tierFilter === "silver") return count > 500 && count <= 1000
                    if (tierFilter === "gold") return count > 1000 && count <= 1500
                    if (tierFilter === "platinum") return count > 1500 && count <= 2000
                    if (tierFilter === "diamond") return count > 2000
                    return true
                })
            }

            const startIndex = (currentPage - 1) * pageSize
            const endIndex = startIndex + pageSize
            const paginated = finalResults.slice(startIndex, endIndex)

            return {
                data: paginated,
                pagination: {
                    currentPage,
                    totalPages: Math.ceil(finalResults.length / pageSize) || 1,
                    totalItems: finalResults.length,
                    perPage: pageSize
                }
            }
        },
        staleTime: 1000 * 60 * 5,
        keepPreviousData: true,
    })

    // Fetch company stats
    const {
        data: statsData,
        isLoading: isLoadingStats,
        refetch: refetchStats,
    } = useQuery({
        queryKey: statsQueryKey,
        queryFn: () => getCompanyStats(),
        staleTime: 1000 * 60 * 5,
    })

    // Fetch ALL companies for Overview analytics (System-wide dataset)
    const { data: allCompaniesData, isPending: isCompanyListPending } = useQuery({
        queryKey: ["all-companies"],
        queryFn: async () => ({ data: await fetchAllCompaniesPaged() }),
        staleTime: 1000 * 60 * 10,
    })

    // Fetch REAL parcel counts from parcels service for each company in parallel
    const allCompanyIds = useMemo(() => {
        if (!allCompaniesData?.data) return []
        return (Array.isArray(allCompaniesData.data) ? allCompaniesData.data : []).map((c: any) => c.id) as number[]
    }, [allCompaniesData])

    // All-time volume and the real last-activity date per company. Doesn't
    // depend on the period (it drives "Dormant Partners" and the All Time
    // view), so it's fetched once — background-loader.tsx warms this key.
    const { data: activityData, isPending: isActivityPending } = useQuery({
        queryKey: ["companies-activity", allCompanyIds],
        queryFn: ({ signal }) => getCompaniesActivity(allCompanyIds, signal),
        enabled: allCompanyIds.length > 0,
        staleTime: 1000 * 60 * 10,
    })

    useEffect(() => {
        if (!activityData) return
        allTimeParcelsRef.current = Object.fromEntries(
            Object.entries(activityData).map(([id, a]) => [Number(id), a.totalParcels]),
        )
        setAllTimeParcelsVersion((v) => v + 1)
    }, [activityData])

    // Exact volume and revenue for the selected period, read from every
    // parcel in it. All Time would mean reading the whole parcel history,
    // so that view uses the all-time counts above and has no revenue.
    const revenueAvailable = overviewPeriod !== "all"
    const periodLabel = OVERVIEW_PERIOD_OPTIONS.find((o) => o.value === overviewPeriod)?.label ?? "Today"
    const {
        data: periodData,
        isFetching: isPeriodFetching,
        isError: isPeriodError,
        refetch: refetchPeriod,
    } = useQuery({
        queryKey: ["companies-period-metrics", overviewPeriod],
        queryFn: ({ signal }) => getCompaniesPeriodMetrics(overviewPeriodRange(overviewPeriod), { signal }),
        // Independent of the company list, so it starts immediately.
        enabled: revenueAvailable,
        staleTime: 1000 * 60 * 10,
        retry: 1,
    })
    // Rankings need both the figures and the company list they're joined to.
    const isOverviewLoading =
        isCompanyListPending || (revenueAvailable ? !periodData && !isPeriodError : isActivityPending)

    const { data: agentCountsData } = useQuery({
        queryKey: ["companies-agent-counts-map-v3", allCompanyIds],
        queryFn: async () => {
            if (allCompanyIds.length === 0) return {}
            const counts = await mapWithConcurrency(allCompanyIds, allCompanyIds.length, (id) => backgroundRequest(() => getCompanyAgentCount(id)))
            const map: Record<number, number> = {}
            allCompanyIds.forEach((id, i) => { map[id] = counts[i] })
            return map
        },
        enabled: allCompanyIds.length > 0,
        staleTime: 1000 * 60 * 10,
    })

    // Mutations
    const createCompanyMutation = useMutation({
        mutationFn: (data: Partial<Company>) => createCompany(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["companies"] })
            queryClient.invalidateQueries({ queryKey: statsQueryKey })
            toast({ title: tr("Success"), description: tr("Company registered successfully"), variant: "success" })
            setIsAddEditDialogOpen(false)
            setSelectedCompany(null)
        },
        onError: (err: any) => {
            toast({ title: tr("Error"), description: err.message, variant: "destructive" })
        }
    })

    const updateCompanyMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: Partial<Company> }) => updateCompany(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["companies"] })
            queryClient.invalidateQueries({ queryKey: statsQueryKey })
            toast({ title: tr("Success"), description: tr("Company updated successfully"), variant: "success" })
            setIsAddEditDialogOpen(false)
            setSelectedCompany(null)
        },
        onError: (err: any) => {
            toast({ title: tr("Error"), description: err.message, variant: "destructive" })
        }
    })

    const deleteCompanyMutation = useMutation({
        mutationFn: (id: number) => deleteCompany(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["companies"] })
            queryClient.invalidateQueries({ queryKey: statsQueryKey })
            toast({ title: tr("Success"), description: tr("Company deleted successfully"), variant: "success" })
            setIsDeleteDialogOpen(false)
        },
        onError: (err: any) => {
            toast({ title: tr("Couldn't delete company"), description: err.message, variant: "destructive" })
        }
    })
    // Data processing
    const companies = useMemo((): Company[] => {
        if (!companiesResponse?.data) return []
        const data = Array.isArray(companiesResponse.data) ? companiesResponse.data : []

        // Safety net: if the backend ignored page/limit and returned more
        // than one page's worth, slice to the current page client-side
        // instead of rendering every company in one unbroken list (the
        // "endless scroll" the pagination controls were meant to prevent).
        if (data.length > pageSize) {
            const startIndex = (currentPage - 1) * pageSize
            return data.slice(startIndex, startIndex + pageSize)
        }
        return data
    }, [companiesResponse, currentPage, pageSize])

    const allCompanies = useMemo((): Company[] => {
        if (!allCompaniesData?.data) return []
        const raw = Array.isArray(allCompaniesData.data) ? allCompaniesData.data : []

        return raw.map((c: any) => {
            const hasAgents = agentCountsData && (c.id in agentCountsData)
            const agents = agentCountsData?.[c.id]
            const activity = activityData?.[c.id]

            // Volume/revenue for the selected period. A company missing from
            // a loaded period map simply had no parcels in it.
            const period = revenueAvailable
                ? (periodData ? (periodData[c.id] ?? { totalParcels: 0, totalRevenue: 0 }) : null)
                : (activity ? { totalParcels: activity.totalParcels, totalRevenue: 0 } : null)

            const lastActivityDate = activity?.lastActivityDate ?? null
            return {
                ...c,
                totalParcels: period?.totalParcels ?? 0,
                totalRevenue: period?.totalRevenue ?? 0,
                allTimeParcels: activity?.totalParcels ?? null,
                totalAgents: hasAgents ? (agents ?? 0) : (c.totalAgents ?? 0),
                // Calendar days since the company's newest parcel (0 = today,
                // 1 = yesterday); null = never sent one
                lastActivityDays: lastActivityDate
                    ? Math.max(0, differenceInCalendarDays(new Date(), new Date(lastActivityDate)))
                    : null,
                lastActivityDate,
                isEnriched: !!period && !!activity && !!hasAgents,
            }
        })
    }, [allCompaniesData, activityData, periodData, revenueAvailable, agentCountsData])

    // Report: every company matching the search and status (not just this page)
    const reportCompanies = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        return (allCompanies.length ? allCompanies : companies).filter((c: any) =>
            (!q || [c.name, c.email, c.phoneNumber, c.tin].some((v) => String(v ?? "").toLowerCase().includes(q))) &&
            (statusFilter === "all" || (c.isActive !== false) === (statusFilter === "active")))
    }, [allCompanies, companies, searchQuery, statusFilter])

    const pagination = useMemo(() => {
        if (!companiesResponse?.pagination) {
            return {
                currentPage: 1,
                totalPages: Math.ceil(companies.length / pageSize) || 1,
                totalItems: companies.length,
                perPage: pageSize,
            }
        }
        const pag = companiesResponse.pagination
        return {
            currentPage: pag.currentPage || (pag as any).current_page || 1,
            totalPages: pag.totalPages || (pag as any).total_pages || 1,
            totalItems: pag.totalItems || (pag as any).total || 0,
            perPage: pageSize,
        }
    }, [companiesResponse, companies.length, pageSize])

    const stats = useMemo(() => {
        // Explicitly prioritize allCompaniesData which fetches non-paginated results
        const isGlobalLoaded = allCompanies.length > 0
        const dataSource = isGlobalLoaded ? allCompanies : companies

        return {
            total: dataSource.length,
            active: dataSource.filter((c) => c.isActive).length,
            inactive: dataSource.filter((c) => !c.isActive).length,
            // Use server-provided total values if available, otherwise aggregate safely
            totalParcels: isGlobalLoaded
                ? dataSource.reduce((sum, c) => sum + (c.totalParcels || 0), 0)
                : (statsData?.totalParcels || dataSource.reduce((sum, c) => sum + (c.totalParcels || 0), 0)),
            totalRevenue: isGlobalLoaded
                ? dataSource.reduce((sum, c) => sum + (c.totalRevenue || 0), 0)
                : (statsData?.totalRevenue || dataSource.reduce((sum, c) => sum + (c.totalRevenue || 0), 0)),
            totalVehicles: isGlobalLoaded
                ? dataSource.reduce((sum, c) => sum + (c.totalVehicles || 0), 0)
                : (statsData?.activeVehicles || statsData?.totalVehicles || dataSource.reduce((sum, c) => sum + (c.totalVehicles || 0), 0)),
            totalAgents: isGlobalLoaded
                ? dataSource.reduce((sum, c) => sum + (c.totalAgents || 0), 0)
                : (statsData?.activeAgents || statsData?.totalAgents || dataSource.reduce((sum, c) => sum + (c.totalAgents || 0), 0)),
            bronze: dataSource.filter(c => ((c as any).allTimeParcels ?? c.totalParcels ?? 0) <= 500).length,
            silver: dataSource.filter(c => ((c as any).allTimeParcels ?? c.totalParcels ?? 0) > 500 && ((c as any).allTimeParcels ?? c.totalParcels ?? 0) <= 1000).length,
            gold: dataSource.filter(c => ((c as any).allTimeParcels ?? c.totalParcels ?? 0) > 1000 && ((c as any).allTimeParcels ?? c.totalParcels ?? 0) <= 1500).length,
            platinum: dataSource.filter(c => ((c as any).allTimeParcels ?? c.totalParcels ?? 0) > 1500 && ((c as any).allTimeParcels ?? c.totalParcels ?? 0) <= 2000).length,
            diamond: dataSource.filter(c => ((c as any).allTimeParcels ?? c.totalParcels ?? 0) > 2000).length,
        }
    }, [allCompanies, companies, statsData])

    // Charts data logic remains similar but UI updated
    const statusDistributionData = useMemo(() => {
        const dataSource = allCompanies.length > 0 ? allCompanies : companies
        return [
            { name: "Active", value: dataSource.filter(c => c.isActive).length, fill: BRAND_COLORS.success },
            { name: "Inactive", value: dataSource.filter(c => !c.isActive).length, fill: BRAND_COLORS.danger },
        ]
    }, [allCompanies, companies])

    // Registered within the new-partner window (calendar days, today = 0)
    const newCompanies = useMemo(
        () =>
            allCompanies
                .filter((c) => c.createdAt && differenceInCalendarDays(new Date(), new Date(c.createdAt)) <= thresholds.newPartnerDays)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        [allCompanies, thresholds.newPartnerDays],
    )

    const registrationTrendsData = useMemo(() => {
        const endDate = new Date()
        const startDate = subDays(endDate, 30)
        const range = eachDayOfInterval({ start: startDate, end: endDate })
        return range.map(date => ({
            date: format(date, "MMM dd"),
            companies: allCompanies.filter(c => format(new Date(c.createdAt), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")).length
        }))
    }, [allCompanies])

    const performanceAnalytics = useMemo(() => {
        // Always prioritize the global dataset for Overview analytics
        const dataSource = allCompanies.length > 0 ? allCompanies : []
        if (dataSource.length === 0) return null

        const totalSystemVolume = dataSource.reduce((sum, c) => sum + (Number(c.totalParcels) || 0), 0)
        const scored = dataSource.map(c => {
            const volume = Number(c.totalParcels || 0)
            const revenue = Number(c.totalRevenue || 0)
            const growth = Number((c as any).growthTrend || 0)
            const allTimeParcels = (c as any).allTimeParcels as number | null
            // Days since the last parcel; null when the company never sent one
            const lastActivity = c.lastActivityDays as number | null

            const platformDays = Math.max(1, Math.floor((new Date().getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
            const riskIndex = ((lastActivity ?? platformDays) / platformDays) * 100

            // Volume is the dominant driver
            const score = (volume * 100) + (revenue * 0.0001) + (growth * 2) - (riskIndex * 5)
            const efficiency = (c.totalAgents && c.totalAgents > 0) ? (volume / c.totalAgents) : volume
            const contribution = totalSystemVolume > 0 ? ((volume / totalSystemVolume) * 100) : 0

            return { ...c, score, volume, revenue, growth, efficiency, contribution, lastActivity, allTimeParcels, platformDays, riskIndex }
        })

        const sortedByVolume = [...scored].filter(c => c.volume > 0).sort((a, b) => b.volume - a.volume)
        const sortedByRevenue = revenueAvailable ? [...scored].filter(c => c.revenue > 0).sort((a, b) => b.revenue - a.revenue) : []
        const sortedByRisk = [...scored].sort((a, b) => b.riskIndex - a.riskIndex)
        // Ensure Titan must have > 0 to be a titan
        const sortedByAgents = [...scored].filter(c => (c.totalAgents || 0) > 0).sort((a, b) => (b.totalAgents || 0) - (a.totalAgents || 0))

        // Dormant: no parcel for quietInactivity+ days, or never sent one
        // (listed last). Needs the activity data, not the period.
        const inactive = activityData
            ? scored
                .filter(c => c.lastActivity === null || c.lastActivity >= thresholds.quietInactivity)
                .sort((a, b) => (a.lastActivity === null ? 1 : 0) - (b.lastActivity === null ? 1 : 0) || (b.lastActivity ?? 0) - (a.lastActivity ?? 0))
            : []

        // Quiet in this period: companies that do operate, lowest period
        // volume first, busiest historically first among ties.
        const sortedByLowestVolume = scored
            .filter(c => (c.allTimeParcels ?? 0) > 0)
            .sort((a, b) => a.volume - b.volume || (b.allTimeParcels ?? 0) - (a.allTimeParcels ?? 0))

        return {
            topPerforming: sortedByVolume,
            underperforming: sortedByLowestVolume,
            mostDeclining: sortedByRisk[0],
            highestRevenue: sortedByRevenue[0] ?? null,
            workforceTitan: sortedByAgents[0],
            topByVolume: sortedByVolume[0] ?? null,
            inactive,
            totalSystemVolume,
            scoredData: scored
        }
    }, [allCompanies, activityData, revenueAvailable, thresholds])

    const contributionChartData = useMemo(() => {
        if (!performanceAnalytics) return []
        const top5 = [...performanceAnalytics.scoredData]
            .sort((a, b) => b.contribution - a.contribution)
            .slice(0, 5)

        const totalContribution = top5.reduce((sum, c) => sum + c.contribution, 0)

        const COLORS = [BRAND_COLORS.primary, BRAND_COLORS.info, BRAND_COLORS.purple, BRAND_COLORS.teal, BRAND_COLORS.pink]

        const processedTop5 = top5.map((c, i) => ({
            name: c.name,
            value: totalContribution > 0 ? Number(c.contribution.toFixed(1)) : 20, // Fallback for visibility
            fill: COLORS[i]
        }))

        const otherVolume = performanceAnalytics.scoredData
            .sort((a, b) => b.contribution - a.contribution)
            .slice(5)
            .reduce((sum, c) => sum + c.contribution, 0)

        const data = [...processedTop5]

        if (otherVolume > 0) {
            data.push({ name: "Others", value: Number(otherVolume.toFixed(1)), fill: "#94a3b8" })
        }

        return data
    }, [performanceAnalytics])

    // Event handlers
    const handleRefresh = () => {
        refetchCompanies()
        refetchStats()
    }

    const handleCreate = () => {
        setSelectedCompany(null)
        setIsAddEditDialogOpen(true)
    }

    const handleEdit = (company: Company) => {
        setSelectedCompany(company)
        setViewModalMode("edit")
        setIsViewModalOpen(true)
    }

    const handleView = (company: Company) => {
        setSelectedCompany(company)
        setIsViewModalOpen(true)
    }

    const handleDelete = (company: Company) => {
        setSelectedCompany(company)
        setViewModalMode("delete")
        setIsViewModalOpen(true)
    }

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
    }

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value)
        // Page will be reset by useEffect
        if (e.target.value.trim().length > 0 && activeTab !== "all-companies") {
            setActiveTab("all-companies")
        }
    }

    const handleAddVehicle = (company: Company) => {
        router.push(`/${locale}/admin/vehicles/vehicles?companyId=${company.id}&action=add`)
    }

    const handleAddAgent = (company: Company) => {
        router.push(`/${locale}/admin/users/agents?companyId=${company.id}&action=add`)
    }

    // Opened from the portal search: fill the search and open the result
    useSearchLanding({ setSearch: setSearchQuery, showList: () => setActiveTab("all-companies"), items: companies, ready: true, onOpen: handleView, fetchOne: (id) => getCompany(Number(id)) as any })

    return (
        <div className="space-y-10 animate-in fade-in duration-300">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 justify-between">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 flex-1 min-w-0 order-1 lg:order-1">
                    {/* Integrated Search */}
                    <div className="relative group flex-1 min-w-0 lg:min-w-[16rem]">
                        <Icon icon={Search01Icon}
                            size={20}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ffd428] transition-colors"
                        />
                        <Input
                            placeholder={tr("Search companies")}
                            value={searchQuery}
                            onChange={handleSearch}
                            className="h-10 pl-10 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-normal placeholder:text-slate-400 focus:ring-1 focus:ring-[#ffd428]/50 shadow-none transition-all w-full"
                        />
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
                                <SelectItem value="active" className="text-sm">{tr("Active")}</SelectItem>
                                <SelectItem value="inactive" className="text-sm">{tr("Inactive")}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={tierFilter} onValueChange={setTierFilter}>
                            <SelectTrigger className="w-full sm:w-40 h-10 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-medium shadow-none outline-none focus:ring-1 focus:ring-[#ffd428]/50">
                                <div className="flex items-center gap-2">
                                    <Icon icon={ChampionIcon} size={16} className="shrink-0 text-slate-500 dark:text-slate-400" />
                                    <SelectValue placeholder="TIER" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)]">
                                <SelectItem value="all" className="text-sm">{tr("All tiers")}</SelectItem>
                                <SelectItem value="bronze" className="text-xs font-semibold text-orange-600">{tr("Bronze")}</SelectItem>
                                <SelectItem value="silver" className="text-xs font-semibold text-slate-400">{tr("Silver")}</SelectItem>
                                <SelectItem value="gold" className="text-xs font-semibold text-amber-500">{tr("Gold")}</SelectItem>
                                <SelectItem value="platinum" className="text-xs font-semibold text-cyan-400">{tr("Platinum")}</SelectItem>
                                <SelectItem value="diamond" className="text-xs font-semibold text-blue-400">{tr("Diamond")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-3 order-2 lg:order-2">
                    <ExportMenu
                        filename="companies"
                        title={tr("Companies report")}
                        subtitle={[
                            tr("Parcels: {periodLabel}", { periodLabel: tr(periodLabel) }),
                            statusFilter !== "all" && (statusFilter === "active" ? tr("Active") : tr("Inactive")),
                            searchQuery.trim() && tr("Search: \"{searchQuery}\"", { searchQuery: searchQuery.trim() }),
                        ].filter(Boolean).join(" · ")}
                        rows={reportCompanies}
                        columns={[
                            [tr("Company"), (c: any) => c.name],
                            [tr("Status"), (c: any) => (c.isActive === false ? tr("Inactive") : tr("Active"))],
                            [tr("Phone"), (c: any) => c.phoneNumber ?? ""],
                            [tr("Email"), (c: any) => c.email ?? ""],
                            [tr("TIN"), (c: any) => c.tin ?? ""],
                            [tr("Agents"), (c: any) => c.totalAgents ?? 0],
                            [tr("Parcels ({periodLabel})", { periodLabel: tr(periodLabel) }), (c: any) => c.totalParcels ?? 0],
                            [tr("All-time parcels"), (c: any) => c.allTimeParcels ?? ""],
                            [tr("Last parcel"), (c: any) => (c.lastActivityDate ? new Date(c.lastActivityDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "")],
                            [tr("Joined"), (c: any) => (c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "")],
                        ]}
                        summary={(rows: any[]) => [
                            [tr("Companies"), rows.length.toLocaleString()],
                            [tr("Active"), rows.filter((c) => c.isActive !== false).length.toLocaleString()],
                            [tr("Agents"), rows.reduce((s, c) => s + (c.totalAgents ?? 0), 0).toLocaleString()],
                            [tr("Parcels ({periodLabel})", { periodLabel: tr(periodLabel) }), rows.reduce((s, c) => s + (c.totalParcels ?? 0), 0).toLocaleString()],
                        ]}
                    />
                    <Button
                        onClick={handleCreate}
                        className="h-10 px-5 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-small)] font-semibold text-sm shadow-[var(--ds-shadow-raised)] transition-colors flex items-center gap-3 cursor-pointer"
                    >
                        <Icon icon={Add01Icon} size={20} />{tr("Register Company")}</Button>
                </div>
            </div>

            {/* ── Navigation Tabs ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <div className="portal-sticky-wrap flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <TabsList className="portal-sticky-tabs bg-slate-100 dark:bg-black/20 p-1.5 rounded-[var(--ds-radius-small)] w-full items-stretch h-auto">
                        <TabsTrigger
                            value="overview"
                            className="flex-1 h-11 rounded-[var(--ds-radius-large)] text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-[#242a37] data-[state=active]:shadow-[var(--ds-shadow-raised)] transition-all cursor-pointer"
                        >
                            <Icon icon={Chart01Icon} size={20} className="mr-2" />{tr("Overview")}</TabsTrigger>
                        <TabsTrigger
                            value="all-companies"
                            className="flex-1 h-11 rounded-[var(--ds-radius-large)] text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-[#242a37] data-[state=active]:shadow-[var(--ds-shadow-raised)] transition-all gap-3 cursor-pointer"
                        >
                            <div className="flex items-center gap-2">
                                <Icon icon={Building03Icon} size={20} />{tr("All Companies")}</div>
                            <Badge className="bg-[#ffd428] text-[#242a37] border-none text-xs font-semibold h-6 min-w-10 flex items-center justify-center rounded-[var(--ds-radius-small)]">
                                {pagination.totalItems}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* ── Overview Tab ── */}
                <TabsContent value="overview" className="space-y-10 focus:outline-none outline-none">

                    {/* Period filter — scopes every ranking/stat below to a window instead of always all-time */}
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <h2 className="text-lg font-semibold text-[#242a37] dark:text-white">{tr("Performance")}</h2>
                            <p className="text-xs font-bold text-slate-400 mt-1">{tr("Rankings scoped to the selected period")}{revenueAvailable && isPeriodFetching && !isOverviewLoading && (
                                    <span className="ml-2 text-slate-500">{tr("· Updating…")}</span>
                                )}
                            </p>
                            {isPeriodError && revenueAvailable && (
                                <p className="text-xs font-semibold text-rose-500 mt-1">{tr("Couldn't load this period.")}{" "}
                                    <button onClick={() => refetchPeriod()} className="underline cursor-pointer">{tr("Retry")}</button>
                                </p>
                            )}
                        </div>
                        <div className="flex p-1.5 bg-slate-100 dark:bg-black/20 rounded-[var(--ds-radius-small)] w-fit max-w-full overflow-x-auto">
                            {OVERVIEW_PERIOD_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setOverviewPeriod(option.value)}
                                    className={cn(
                                        "h-9 px-4 rounded-[var(--ds-radius-small)] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                                        overviewPeriod === option.value
                                            ? "bg-white dark:bg-[#242a37] shadow-[var(--ds-shadow-raised)] text-[#ffd428]"
                                            : "text-slate-400"
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Performance Command Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                label: tr("Volume Leader"),
                                value: isOverviewLoading ? "Loading…" : (performanceAnalytics?.topByVolume?.name || "No parcels"),
                                icon: ChampionIcon,
                                color: "text-[#ffd428]", iconBg: "bg-[#ffd428]/10",
                                cardBg: "bg-[#242a37]",
                                border: "border-none",
                                sub: isOverviewLoading ? periodLabel : `${(performanceAnalytics?.topByVolume?.volume || 0).toLocaleString()} parcels · ${periodLabel}`,
                                badge: performanceAnalytics?.topByVolume ? `#${String(performanceAnalytics.topByVolume.id).padStart(3, '0')}` : null,
                            },
                            {
                                label: tr("Highest Earner"),
                                value: !revenueAvailable ? "—" : isOverviewLoading ? "Loading…" : (performanceAnalytics?.highestRevenue?.name || "No revenue"),
                                icon: MoneyReceive01Icon,
                                color: "text-[#ffd428]", iconBg: "bg-[#ffd428]/10",
                                cardBg: "bg-[#242a37]",
                                border: "border-none",
                                sub: !revenueAvailable
                                    ? "Revenue isn't available for All Time"
                                    : isOverviewLoading
                                        ? periodLabel
                                        : `TZS ${new Intl.NumberFormat("en-TZ").format(Math.round(performanceAnalytics?.highestRevenue?.totalRevenue || 0))} · ${periodLabel}`,
                                badge: performanceAnalytics?.highestRevenue ? `${(performanceAnalytics.highestRevenue.totalParcels || 0).toLocaleString()} PKG` : null,
                            },
                            {
                                label: tr("Partner Growth"),
                                value: registrationTrendsData.reduce((acc, d) => acc + d.companies, 0),
                                icon: Building03Icon,
                                color: "text-[#ffd428]", iconBg: "bg-[#ffd428]/10",
                                cardBg: "bg-[#242a37]",
                                border: "border-none",
                                sub: tr("New Partners (30 Days)"),
                            },
                            {
                                label: tr("Largest Workforce"),
                                value: performanceAnalytics?.workforceTitan?.name || "---",
                                icon: UserGroupIcon,
                                color: "text-[#ffd428]", iconBg: "bg-[#ffd428]/10",
                                cardBg: "bg-[#242a37]",
                                border: "border-none",
                                sub: tr("{totalAgents} Registered Agents", { totalAgents: performanceAnalytics?.workforceTitan?.totalAgents || 0 }),
                                badge: performanceAnalytics?.workforceTitan ? `RANK #1` : null,
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
                                            <div className={cn("size-10 rounded-[var(--ds-radius-small)] flex items-center justify-center shadow-[var(--ds-shadow-raised)] bg-white/5")}>
                                                <Icon icon={card.icon} className={cn("size-5", card.color)} />
                                            </div>
                                            {(card as any).badge && (
                                                <Badge className={cn("text-xs font-semibold bg-[#ffd428] text-[#242a37] border-none")}>
                                                    {(card as any).badge}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className={cn("text-xs font-semibold mb-1 text-[#ffd428]/60")}>{card.label}</p>
                                        <h3 className={cn(cardValueClass(card.value), "font-semibold leading-tight text-white line-clamp-2 break-words")} title={String(card.value)}>{card.value}</h3>
                                        <p className="text-xs font-bold text-white/40 mt-2">{card.sub}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    {/* Rankings Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Top Performers */}
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden group">
                            <CardHeader className="relative py-8 px-6 overflow-hidden bg-[#242a37] text-white border-none rounded-t-[var(--ds-radius-small)]">
                                <div className="absolute inset-0 bg-amber-500/10 opacity-30" />
                                <div className="absolute right-[-20px] top-[-20px] opacity-[0.1] text-amber-500 pointer-events-none transform transition-transform duration-300">
                                    <Icon icon={ChampionIcon} size={180} />
                                </div>
                                <div className="relative z-10 flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                            <Icon icon={ChampionIcon} className="text-amber-500" size={24} />{tr("Top Performing Companies")}</CardTitle>
                                        <CardDescription className="text-xs font-bold text-white/40 mt-1">{tr("Ranked by parcel volume · {periodLabel}", { periodLabel })}</CardDescription>
                                    </div>
                                    <Badge className="bg-amber-500 text-white border-none text-xs font-semibold px-5 py-2 rounded-full shadow-[var(--ds-shadow-raised)]">{tr("TOP PERFORMERS")}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-50 dark:divide-white/5 font-sans">
                                    {isOverviewLoading ? (
                                        <OverviewListSkeleton />
                                    ) : (performanceAnalytics?.topPerforming || []).length === 0 ? (
                                        <p className="p-6 text-sm text-slate-400">{tr("No parcels")}{" "}{periodLabel === "All Time" ? tr("yet") : tr("in {periodLabel}", { periodLabel: periodLabel.toLowerCase() })}.</p>
                                    ) : (performanceAnalytics?.topPerforming || []).slice(0, 5).map((company, i) => (
                                        <div
                                            key={company.id}
                                            onClick={() => handleView(company)}
                                            className="p-6 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors flex items-center justify-between group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="size-8 shrink-0 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400 group-hover:bg-[#ffd428] group-hover:text-[#242a37] transition-colors">                                                    {i + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{company.name}</p>
                                                    <p className="text-xs font-bold text-amber-500 mt-1">
                                                        {tr("{contribution}% of network volume", { contribution: company.contribution.toFixed(1) })}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1 shrink-0 ml-4">
                                                <p className="text-[13px] font-semibold text-[#ffd428] leading-none mb-0.5">
                                                    {company.totalParcels?.toLocaleString() || 0}
                                                </p>
                                                <p className="text-xs font-semibold text-slate-400">{tr("Parcels")}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                            <div className="p-6 border-t border-slate-50 dark:border-white/5">
                                <Button onClick={() => setShowPortfolioModal(true)} className="w-full h-11 bg-slate-50 dark:bg-white/5 hover:bg-[#ffd428] hover:text-[#242a37] text-slate-400 font-semibold text-xs rounded-[var(--ds-radius-small)] transition-colors group/btn cursor-pointer">{tr("Analyze Volume Distribution")}<Icon icon={ArrowUpRight01Icon} size={16} className="ml-2 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                                </Button>
                            </div>
                        </Card>

                        {/* Underperformers */}
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden group">
                            <CardHeader className="relative py-8 px-6 overflow-hidden bg-[#242a37] text-white border-none rounded-t-[var(--ds-radius-small)]">
                                <div className="absolute inset-0 bg-rose-500/10 opacity-30" />
                                <div className="absolute right-[-20px] top-[-20px] opacity-[0.1] text-rose-500 pointer-events-none transform transition-transform duration-300">
                                    <Icon icon={Sad01Icon} size={180} />
                                </div>
                                <div className="relative z-10 flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                            <Icon icon={Sad01Icon} className="text-rose-500" size={24} />{tr("Inactive Partners")}</CardTitle>
                                        <CardDescription className="text-xs font-bold text-white/40 mt-1">{tr("Lowest volume · {periodLabel}", { periodLabel })}</CardDescription>
                                    </div>
                                    <Badge className="bg-rose-500 text-white border-none text-xs font-semibold px-5 py-2 rounded-full shadow-[var(--ds-shadow-raised)]">{tr("URGENT ATTENTION")}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-50 dark:divide-white/5 font-sans">
                                    {isOverviewLoading || isActivityPending ? (
                                        <OverviewListSkeleton />
                                    ) : (performanceAnalytics?.underperforming || []).slice(0, 5).map((company, i) => (
                                        <div
                                            key={company.id}
                                            onClick={() => handleView(company)}
                                            className="p-6 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors flex items-center justify-between group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="size-8 shrink-0 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                                    {i + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{company.name}</p>
                                                    <p className="text-xs font-bold text-rose-400 mt-1">
                                                        {company.volume === 0
                                                            ? `No parcels ${periodLabel === "All Time" ? "yet" : periodLabel.toLowerCase()}${company.lastActivity !== null ? ` · last ${formatDaysAgo(company.lastActivity)}` : ""}`
                                                            : tr("{volume} parcels · low volume", { volume: company.volume.toLocaleString() })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1 shrink-0 ml-4">
                                                <p className="text-[13px] font-semibold text-rose-500 leading-none mb-0.5">
                                                    {company.volume.toLocaleString()}
                                                </p>
                                                <p className="text-xs font-semibold text-slate-400">{tr("Parcels")}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                            <div className="p-6 border-t border-slate-50 dark:border-white/5">
                                <Button onClick={() => setShowAuditModal(true)} className="w-full h-11 bg-rose-500/5 hover:bg-rose-500 text-rose-500 hover:text-white font-semibold text-xs rounded-[var(--ds-radius-small)] transition-colors group/btn cursor-pointer">{tr("Verify Partner Connectivity")}<Icon icon={ArrowUpRight01Icon} size={16} className="ml-2 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {/* Chart Ecosystem */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Contribution Donut */}
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden focus:outline-none flex flex-col justify-between group">
                            <CardHeader className="relative py-8 px-6 bg-[#242a37] text-white border-none rounded-t-[var(--ds-radius-small)]">
                                <div className="absolute inset-0 bg-teal-500/10 opacity-30" />
                                <div>
                                    <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                        <Icon icon={PieChart01Icon} className="text-teal-400" size={24} />{tr("Parcel Volume Share")}</CardTitle>
                                    <CardDescription className="text-xs font-bold text-white/40 mt-1">{tr("Market Contribution by Partner")}</CardDescription>
                                </div>
                            </CardHeader>
                            <div className="p-6 flex flex-col flex-1">
                                <div className="flex items-center gap-6">
                                    {/* Donut */}
                                    <div className="h-[200px] w-[200px] shrink-0 relative">
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                                            <p className="text-2xl font-bold text-[#242a37] dark:text-white leading-none">
                                                {stats.totalParcels.toLocaleString()}
                                            </p>
                                            <p className="text-xs font-semibold text-slate-400 mt-1">{tr("Total Parcels")}</p>
                                        </div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={contributionChartData.length > 0 ? contributionChartData : [{ name: "No Data", value: 1, fill: "#334155" }]}
                                                    innerRadius="65%"
                                                    outerRadius="90%"
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                    stroke="none"
                                                    startAngle={90}
                                                    endAngle={-270}
                                                >
                                                    {(contributionChartData.length > 0 ? contributionChartData : [{ name: "No Data", value: 1, fill: "#334155" }]).map((entry, index) => (
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
                                    {/* Legend */}
                                    <div className="flex-1 space-y-3 min-w-0">
                                        {contributionChartData.map((entry, i) => (
                                            <div key={i} className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.fill }} />
                                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">{entry.name}</span>
                                                </div>
                                                <span className="text-xs font-semibold text-[#242a37] dark:text-white shrink-0">{entry.value}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-50 dark:border-white/5">
                                <Button className="w-full h-11 bg-slate-50 dark:bg-white/5 hover:bg-[#ffd428] hover:text-[#242a37] text-[#242a37] dark:text-white font-semibold text-xs rounded-[var(--ds-radius-small)] transition-colors cursor-pointer">{tr("Export Market Report")}</Button>
                            </div>
                        </Card>

                        {/* Recent Trends */}
                        <Card className="lg:col-span-2 rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden focus:outline-none group">
                            <CardHeader className="relative py-8 px-6 bg-[#242a37] text-white border-none flex flex-row items-center justify-between">
                                <div className="absolute inset-0 bg-blue-500/10 opacity-30" />
                                <div className="relative z-10">
                                    <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                        <Icon icon={Activity01Icon} className="text-blue-400" size={24} />{tr("Company Registrations")}</CardTitle>
                                    <CardDescription className="text-xs font-bold text-white/40 mt-1">{tr("New Partners Over 30 Days")}</CardDescription>
                                </div>
                                {/* Graph switcher */}
                                <div className="relative z-10 flex items-center gap-1 bg-white/5 rounded-[var(--ds-radius-small)] p-1">
                                    <button
                                        onClick={() => setChartView("area")}
                                        className={cn(
                                            "px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-all",
                                            chartView === "area" ? "bg-[#ffd428] text-[#242a37]" : "text-white/40 hover:text-white"
                                        )}
                                    >{tr("Wave")}</button>
                                    <button
                                        onClick={() => setChartView("bar")}
                                        className={cn(
                                            "px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-all",
                                            chartView === "bar" ? "bg-[#ffd428] text-[#242a37]" : "text-white/40 hover:text-white"
                                        )}
                                    >{tr("Bar")}</button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="h-[320px] w-full focus:outline-none">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {chartView === "area" ? (
                                            <AreaChart data={registrationTrendsData}>
                                                <defs>
                                                    <linearGradient id="colorTraj" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#ffd428" stopOpacity={0.15} />
                                                        <stop offset="95%" stopColor="#ffd428" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.05)" />
                                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: "#94a3b8" }} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: "#94a3b8" }} />
                                                <RechartsTooltip
                                                    content={({ active, payload, label }) => {
                                                        if (active && payload && payload.length) {
                                                            return (
                                                                <div className="bg-[#242a37] text-white p-4 rounded-[var(--ds-radius-large)] border border-white/10 shadow-[var(--ds-shadow-raised)] space-y-1">
                                                                    <p className="text-xs font-semibold text-slate-400">{label}</p>
                                                                    <p className="text-lg font-semibold">{payload[0].value} <span className="text-xs text-[#ffd428]">{tr("Companies")}</span></p>
                                                                </div>
                                                            )
                                                        }
                                                        return null
                                                    }}
                                                />
                                                <Area type="monotone" dataKey="companies" stroke="#ffd428" strokeWidth={3} fillOpacity={1} fill="url(#colorTraj)" animationDuration={1500} />
                                            </AreaChart>
                                        ) : (
                                            <AreaChart data={registrationTrendsData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.05)" />
                                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: "#94a3b8" }} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: "#94a3b8" }} />
                                                <RechartsTooltip
                                                    content={({ active, payload, label }) => {
                                                        if (active && payload && payload.length) {
                                                            return (
                                                                <div className="bg-[#242a37] text-white p-4 rounded-[var(--ds-radius-large)] border border-white/10 shadow-[var(--ds-shadow-raised)]">
                                                                    <p className="text-xs font-semibold text-slate-400">{label}</p>
                                                                    <p className="text-lg font-semibold">{payload[0].value} <span className="text-xs text-[#ffd428]">{tr("Companies")}</span></p>
                                                                </div>
                                                            )
                                                        }
                                                        return null
                                                    }}
                                                />
                                                <Area type="step" dataKey="companies" stroke="#ffd428" strokeWidth={2} fill="#ffd428" fillOpacity={0.2} animationDuration={1500} />
                                            </AreaChart>
                                        )}
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                            <div className="p-6 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="size-2 rounded-full bg-[#ffd428]" />
                                    <span className="text-xs font-semibold text-slate-400">{tr("Registrations")}</span>
                                </div>
                                <Button variant="ghost" className="h-9 px-4 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">{tr("Export Data")}</Button>
                            </div>
                        </Card>
                    </div>

                    {/* Inactive & Efficiency Hub */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Inactive Alert List */}
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden group">
                            <CardHeader className="relative py-8 px-6 bg-[#242a37] text-white border-none rounded-t-[var(--ds-radius-small)]">
                                <div className="absolute inset-0 bg-[#ffd428]/20 opacity-30" />
                                <div className="absolute right-[-20px] top-[-20px] opacity-[0.1] text-[#ffd428] pointer-events-none transform transition-transform duration-300">
                                    <Icon icon={Chart01Icon} size={180} />
                                </div>
                                <div className="relative z-10 flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                            <Icon icon={Chart01Icon} className="text-[#ffd428]" size={24} />{tr("Dormant Partners")}</CardTitle>
                                        <CardDescription className="text-xs font-bold text-white/40 mt-1">{tr("Partners with No Recent Parcels ({quietInactivity}+ Days)", { quietInactivity: thresholds.quietInactivity })}</CardDescription>
                                    </div>
                                    <Badge className="bg-[#ffd428] text-[#242a37] border-none text-xs font-semibold px-5 py-2 rounded-full shadow-[var(--ds-shadow-raised)]">{tr("MONITORING ACTIVE")}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-50 dark:divide-white/5 font-sans">
                                    {isActivityPending ? (
                                        <OverviewListSkeleton />
                                    ) : (performanceAnalytics?.inactive || []).length === 0 ? (
                                        <p className="p-6 text-sm text-slate-400">{tr("Every partner sent a parcel in the last {quietInactivity} days.", { quietInactivity: thresholds.quietInactivity })}</p>
                                    ) : (performanceAnalytics?.inactive || []).slice(0, 5).map((company, i) => (
                                        <div
                                            key={company.id}
                                            onClick={() => handleView(company)}
                                            className="p-6 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors flex items-center justify-between group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="size-8 shrink-0 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400 group-hover:bg-[#ffd428] group-hover:text-[#242a37] transition-colors">
                                                    {i + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{company.name}</p>
                                                    <p className="text-xs font-bold text-slate-400 mt-1">{dormancyLabel(company.lastActivity)}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1 shrink-0 ml-4">
                                                <p className="text-[13px] font-semibold text-[#ffd428] leading-none mb-0.5">
                                                    {company.lastActivity === null ? "—" : `${company.lastActivity}d`}
                                                </p>
                                                <p className="text-xs font-semibold text-slate-400">{tr("Since last parcel")}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                            <div className="p-8 border-t border-slate-50 dark:border-white/5">
                                <Button
                                    onClick={() => setShowInactiveModal(true)}
                                    className="w-full h-12 bg-[#242a37] dark:bg-white/5 hover:bg-[#ffd428] hover:text-[#242a37] text-white dark:text-white font-semibold text-xs rounded-[var(--ds-radius-small)] transition-colors cursor-pointer"
                                >{tr("View More Inactive Partners")}</Button>
                            </div>
                        </Card>

                        {/* Recent Integrations (Redesigned) */}
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-[#1a1f2b] text-white shadow-[var(--ds-shadow-raised)] p-0 relative overflow-hidden group flex flex-col">
                            <CardHeader className="p-6 bg-black/20 border-b border-white/5">
                                <CardTitle className="text-xl font-semibold flex items-center gap-3 text-[#ffd428]">
                                    <div className="size-3 rounded-full bg-[#ffd428] animate-pulse" />{tr("New Companies")}</CardTitle>
                                <CardDescription className="text-xs font-bold text-white/40 mt-2">
                                    {tr("Latest added companies ({newPartnerDays} day window)", { newPartnerDays: thresholds.newPartnerDays })}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-white/5 font-sans">
                                    {isCompanyListPending ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className="p-6 flex items-center gap-4">
                                                <Skeleton className="size-8 shrink-0 rounded-full bg-white/10" />
                                                <div className="flex-1 space-y-1.5">
                                                    <Skeleton className="h-3.5 w-32 bg-white/10" />
                                                    <Skeleton className="h-2.5 w-40 bg-white/10" />
                                                </div>
                                            </div>
                                        ))
                                    ) : newCompanies.length === 0 ? (
                                        <p className="p-6 text-sm text-white/50">{tr("No companies registered in the last {newPartnerDays} days.", { newPartnerDays: thresholds.newPartnerDays })}</p>
                                    ) : newCompanies.slice(0, 5).map((company, i) => (
                                            <div
                                                key={company.id}
                                                onClick={() => handleView(company)}
                                                className="p-6 hover:bg-white/[0.02] transition-colors flex items-center justify-between group cursor-pointer"
                                            >
                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                    <div className="size-8 shrink-0 rounded-full bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400 group-hover:bg-[#ffd428] group-hover:text-[#242a37] transition-colors">
                                                        {i + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-white truncate">{company.name}</p>
                                                        <p className="text-xs font-bold text-white/30 mt-1">{tr("Onboarded {yyyy}", { yyyy: format(new Date(company.createdAt), "MMM dd, yyyy") })}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right flex flex-col items-end gap-1 shrink-0 ml-4">
                                                    <Badge className="bg-[#ffd428] text-[#242a37] text-[11px] font-semibold h-5 px-3 uppercase">{tr("New Partner")}</Badge>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </CardContent>
                            <div className="p-6 mt-auto">
                                <Button
                                    onClick={() => setShowNewPartnersModal(true)}
                                    className="w-full h-14 bg-white/5 hover:bg-[#ffd428] hover:text-[#242a37] text-white font-semibold text-xs rounded-[var(--ds-radius-small)] transition-colors border border-white/10 cursor-pointer"
                                >{tr("View More New Partners")}</Button>
                            </div>
                        </Card>
                    </div>
                </TabsContent>

                {/* ── Registry Tab ── */}
                <TabsContent value="all-companies" className="space-y-8">
                    {/* Content Display */}
                    <Card className="rounded-[var(--ds-radius-large)] border-slate-100 dark:border-white/5 bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] overflow-hidden relative p-0 gap-0">
                        {isFetchingCompanies && (
                            <div className="absolute top-0 left-0 w-full h-1 bg-transparent animate-shimmer z-30" />
                        )}

                        {/* Banner header — same list design as the Dashboard's Recent Parcels card */}
                        <div className="bg-[#242a37] text-white p-8 relative overflow-hidden">
                            <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-[0.08] pointer-events-none transform scale-125">
                                <Icon icon={Building03Icon} size={140} />
                            </div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-2xl font-bold">{tr("All Companies")}</CardTitle>
                                    <CardDescription className="text-white/50 font-medium text-sm">{tr("Browse and manage every registered partner on the network")}</CardDescription>
                                </div>
                            </div>
                        </div>

                        <CardContent className="p-0 bg-slate-50/50 dark:bg-black/10">
                                <div className="min-h-[600px]">
                                    {companies.length === 0 && !isLoadingCompanies ? (
                                        <div className="flex flex-col items-center justify-center h-[600px] gap-6 grayscale opacity-40">
                                            <Icon icon={Sad01Icon} size={80} />
                                            <div className="text-center space-y-2">
                                                <p className="text-xl font-semibold text-slate-900 dark:text-white">{tr("Oops!")}</p>
                                                <p className="text-xs font-bold text-slate-400">{tr("We couldn't find what you are searching for")}</p>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}
                                                    className="mt-6 h-10 px-6 rounded-full border border-slate-200 dark:border-white/10 text-xs font-semibold hover:bg-[#ffd428] hover:text-[#242a37] transition-colors cursor-pointer"
                                                >{tr("Reset Filters")}</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-[#242a37] border-b border-transparent hover:bg-[#242a37]">
                                                    <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs">{tr("Company Detail")}</TableHead>
                                                    <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Contact Info")}</TableHead>
                                                    <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Parcel Summary")}</TableHead>
                                                    <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-center">{tr("Status")}</TableHead>
                                                    <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Actions")}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <AnimatePresence mode="popLayout">
                                                    {isLoadingCompanies ? (
                                                        [...Array(5)].map((_, i) => (
                                                            <TableRow key={i} className="animate-pulse">
                                                                <TableCell className="px-6 py-4"><div className="h-14 bg-slate-50 dark:bg-white/5 rounded-[var(--ds-radius-large)] w-48" /></TableCell>
                                                                <TableCell className="py-4"><div className="h-10 bg-slate-50 dark:bg-white/5 rounded-[var(--ds-radius-small)] w-36" /></TableCell>
                                                                <TableCell className="py-4"><div className="h-6 bg-slate-50 dark:bg-white/5 rounded w-24" /></TableCell>
                                                                <TableCell className="py-4"><div className="h-8 bg-slate-50 dark:bg-white/5 rounded-full w-20 mx-auto" /></TableCell>
                                                                <TableCell className="px-6 py-4"><div className="h-10 bg-slate-50 dark:bg-white/5 rounded-[var(--ds-radius-small)] w-10 ml-auto" /></TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        companies.map((company, i) => (
                                                            <motion.tr
                                                                key={company.id}
                                                                initial={{ opacity: 0, x: -12 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: i * 0.04 }}
                                                                onClick={() => handleView(company)}
                                                                className="hover:bg-white dark:hover:bg-white/[0.04] transition-colors border-b border-slate-200/60 dark:border-white/5 cursor-pointer group"
                                                            >
                                                                <TableCell className="px-6 py-4">
                                                                    <div className="flex items-center gap-4">
                                                                        <div>
                                                                            <p className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-[#ffd428] transition-colors">{company.name}</p>
                                                                            <div className="flex items-center gap-2 mt-1">
                                                                                <Badge variant="outline" className="bg-[#ffd428]/10 text-[#ffd428] border-none text-[11px] font-semibold h-5 px-2 rounded-md">{tr("ID: {padStart}", { padStart: String(company.id).padStart(3, '0') })}</Badge>
                                                                                <p className="text-xs text-slate-400 font-bold">{company.code}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="py-4">
                                                                    <div className="space-y-1.5">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="size-1.5 rounded-full bg-[#ffd428]" />
                                                                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">{company.email || company.phoneNumber}</p>
                                                                        </div>
                                                                        <div className="h-[18px] px-2.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[6px] text-xs font-semibold text-slate-400 w-fit flex items-center justify-center">{tr("TIN:")}{" "}{company.tin || "VERIFYING"}
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="py-4">
                                                                    <div className="flex flex-col gap-1.5">
                                                                        <div className="flex items-center gap-2.5">
                                                                            <Icon icon={Package01Icon} size={16} className="text-[#ffd428]" />
                                                                            {/* All-time total — the table isn't scoped to the Overview period */}
                                                                            <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                                                                                {activityData
                                                                                    ? (activityData[company.id]?.totalParcels ?? 0).toLocaleString()
                                                                                    : "…"}
                                                                            </span>
                                                                        </div>
                                                                         <p className="text-xs font-semibold text-slate-400 leading-none ml-6">{tr("Parcels handled · all time")}</p>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="px-6 py-4 text-center">
                                                                    <Badge className={cn(
                                                                        "h-7 rounded-[var(--ds-radius-small)] px-3 text-xs font-semibold border",
                                                                        company.isActive
                                                                            ? "bg-[#ffd428] text-[#242a37] border-none"
                                                                            : "bg-[#242a37] text-white border-none"
                                                                    )}>
                                                                        {company.isActive ? "ACTIVE" : "INACTIVE"}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="px-6 py-4 text-right">
                                                                    <DropdownMenu modal={false}>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button variant="ghost" size="icon" className="size-10 rounded-[var(--ds-radius-small)] bg-slate-50 dark:bg-white/5 hover:bg-[#ffd428] dark:hover:bg-[#ffd428] hover:text-[#242a37] text-slate-400 transition-colors cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                                                                <Icon icon={MoreHorizontalIcon} size={20} />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end" className="w-64 rounded-[var(--ds-radius-large)] bg-white dark:bg-[#242a37] border-slate-100 dark:border-white/5 p-2 shadow-[var(--ds-shadow-raised)] mt-2" onClick={(e) => e.stopPropagation()}>
                                                                            <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold text-slate-400 mb-1">{tr("Company Operations")}</DropdownMenuLabel>
                                                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleView(company); }} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold focus:bg-[#ffd428] focus:text-[#242a37] cursor-pointer">
                                                                                <Icon icon={ViewIcon} size={20} className="mr-3" />{tr("View Company")}</DropdownMenuItem>
                                                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(company); }} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold focus:bg-[#ffd428] focus:text-[#242a37] cursor-pointer">
                                                                                <Icon icon={PencilEdit01Icon} size={20} className="mr-3" />{tr("Edit Company")}</DropdownMenuItem>
                                                                            {can("companies.delete") && (
                                                                                <>
                                                                                    <DropdownMenuSeparator className="my-2 bg-slate-50 dark:bg-white/5" />
                                                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(company); }} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold text-rose-500 focus:bg-rose-500 focus:text-white cursor-pointer">
                                                                                        <Icon icon={Delete02Icon} size={20} className="mr-3" />{tr("Delete Company")}</DropdownMenuItem>
                                                                                </>
                                                                            )}
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </TableCell>
                                                            </motion.tr>
                                                        ))
                                                    )}
                                                </AnimatePresence>
                                            </TableBody>
                                        </Table>
                                    )}
                                </div>

                            <PaginationControls
                                currentPage={pagination.currentPage}
                                totalPages={pagination.totalPages}
                                totalItems={pagination.totalItems}
                                itemsPerPage={pagination.perPage}
                                onPageChange={handlePageChange}
                                onPageSizeChange={setPageSize}
                                isLoading={isLoadingCompanies || isFetchingCompanies}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ── Modals ── */}
            <CompanyModal
                open={isAddEditDialogOpen}
                setOpen={(open) => {
                    setIsAddEditDialogOpen(open)
                    if (!open) setSelectedCompany(null)
                }}
                company={selectedCompany}
                mode={selectedCompany ? "edit" : "create"}
                onSubmit={async (values) => {
                    if (selectedCompany?.id) {
                        await updateCompanyMutation.mutateAsync({ id: selectedCompany.id, data: values })
                    } else {
                        await createCompanyMutation.mutateAsync(values)
                    }
                }}
                onDelete={(company) => handleDelete(company)}
            />

            <CompanyViewModal
                open={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false)
                    setViewModalMode("view")
                }}
                company={selectedCompany}
                mode={viewModalMode}
                onEdit={() => setViewModalMode("edit")}
                onUpdate={async (id, data) => {
                    await updateCompanyMutation.mutateAsync({ id, data })
                }}
                onDelete={can("companies.delete") ? async (company) => {
                    await deleteCompanyMutation.mutateAsync(company.id)
                    setIsViewModalOpen(false)
                } : undefined}
                onDeactivate={async (company) => {
                    await updateCompanyMutation.mutateAsync({ id: company.id, data: { isActive: false } })
                }}
                onAddVehicle={handleAddVehicle}
                onAddAgent={handleAddAgent}
            />

            {/* ══════════════════════════════════════════════════════
                Intelligence Panel Modals
            ══════════════════════════════════════════════════════ */}

            {/* 1. Portfolio Performance — right-slide Sheet */}
            <Sheet open={showPortfolioModal} onOpenChange={setShowPortfolioModal}>
                <SheetContent side="right" className="p-0 sm:max-w-[720px] border-none bg-white dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full outline-none overflow-hidden [&>button]:hidden">
                    <SheetTitle className="sr-only">{tr("Portfolio Performance")}</SheetTitle>
                    <SheetDescription className="sr-only">{tr("Top performing partner companies ranked by parcel volume")}</SheetDescription>
                    {/* Header */}
                    <div className="relative px-6 py-10 bg-[#242a37] text-white flex-shrink-0">
                        <div className="relative z-10 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold text-white/40 mb-2">{tr("Management Review")}</p>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <Icon icon={ChampionIcon} className="text-amber-400" size={26} />{tr("Top Partners")}</h2>
                                <p className="text-xs font-bold text-white/40 mt-2">
                                    {tr("Top {v} partners ranked by volume", { v: (performanceAnalytics?.topPerforming || []).length })}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge className="bg-amber-500 text-white border-none text-xs font-semibold px-3 py-1.5 rounded-full">TOP</Badge>
                                <button onClick={() => setShowPortfolioModal(false)} className="size-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition cursor-pointer">
                                    <Icon icon={Cancel01Icon} size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Body */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
                        <div className="p-8 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1f2b]">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 rounded-[var(--ds-radius-small)] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 shadow-[var(--ds-shadow-raised)] text-left">
                                    <p className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-2">
                                        <Icon icon={Package01Icon} size={12} />{" "}{tr("Total Volume")}</p>
                                    <p className="text-xl font-semibold text-amber-500">
                                        {(performanceAnalytics?.totalSystemVolume || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-4 rounded-[var(--ds-radius-small)] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 shadow-[var(--ds-shadow-raised)] text-left">
                                    <p className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-2">
                                        <Icon icon={ChampionIcon} size={12} />{" "}{tr("Top Company Vol")}</p>
                                    <p className="text-xl font-semibold text-[#ffd428]">
                                        {((performanceAnalytics?.topPerforming || [])[0]?.volume || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-4 rounded-[var(--ds-radius-small)] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 shadow-[var(--ds-shadow-raised)] text-left">
                                    <p className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-2">
                                        <Icon icon={Activity01Icon} size={12} />{" "}{tr("Partners Ranked")}</p>
                                    <p className="text-xl font-semibold text-emerald-500">
                                        {(performanceAnalytics?.topPerforming || []).length}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {(performanceAnalytics?.topPerforming || []).map((company, i) => (
                                <div
                                    key={company.id}
                                    onClick={() => { setShowPortfolioModal(false); handleView(company) }}
                                    className="px-6 py-5 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] flex items-center justify-between gap-4 cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={cn(
                                            "size-9 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                                            i === 0 ? "bg-amber-400 text-[#242a37]" :
                                                i === 1 ? "bg-slate-300 dark:bg-slate-600 text-[#242a37] dark:text-white" :
                                                    i === 2 ? "bg-orange-400 text-white" :
                                                        "bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:bg-[#ffd428] group-hover:text-[#242a37]"
                                        )}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{company.name}</p>
                                            <p className="text-xs font-bold text-slate-400 mt-0.5">
                                                {tr("{v}% of system volume", { v: ((company.contribution || 0)).toFixed(2) })}</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[15px] font-semibold text-[#ffd428] leading-none">{company.totalParcels?.toLocaleString() || 0}</p>
                                        <p className="text-xs font-semibold text-slate-400 mt-0.5">{tr("Total Parcels")}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3 flex-shrink-0">
                        <Button variant="ghost" onClick={() => setShowPortfolioModal(false)} className="text-xs font-semibold cursor-pointer">{tr("Close")}</Button>
                        <Button onClick={() => { setShowPortfolioModal(false); setActiveTab("all-companies") }} className="bg-[#242a37] hover:bg-[#ffd428] hover:text-[#242a37] text-white text-xs font-semibold rounded-[var(--ds-radius-small)] cursor-pointer">{tr("View Full List")}</Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* 2. Performance Audit — right-slide Sheet */}
            <Sheet open={showAuditModal} onOpenChange={setShowAuditModal}>
                <SheetContent side="right" className="p-0 sm:max-w-[720px] border-none bg-white dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full outline-none overflow-hidden [&>button]:hidden">
                    <SheetTitle className="sr-only">{tr("Performance Audit")}</SheetTitle>
                    <SheetDescription className="sr-only">{tr("Companies that need attention")}</SheetDescription>
                    {/* Header */}
                    <div className="relative px-6 py-10 bg-[#242a37] text-white flex-shrink-0">
                        <div className="relative z-10 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold text-white/40 mb-2">{tr("Management Review")}</p>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <Icon icon={Sad01Icon} className="text-rose-400" size={26} />{tr("Dormancy Review")}</h2>
                                <p className="text-xs font-bold text-white/40 mt-2">
                                    {tr("{v} partners flagged for activity review", { v: (performanceAnalytics?.underperforming || []).length })}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge className="bg-rose-500 text-white border-none text-xs font-semibold px-3 py-1.5 rounded-full">URGENT</Badge>
                                <button onClick={() => setShowAuditModal(false)} className="size-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition cursor-pointer">
                                    <Icon icon={Cancel01Icon} size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Body */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
                        <div className="p-8 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1f2b]">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 rounded-[var(--ds-radius-small)] bg-white dark:bg-white/[0.02] border border-rose-100 dark:border-white/5 shadow-[var(--ds-shadow-raised)] text-left">
                                    <p className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-2">
                                        <Icon icon={Package01Icon} size={12} />{" "}{tr("Zero Volume")}</p>
                                    <p className="text-xl font-semibold text-rose-500">
                                        {(performanceAnalytics?.underperforming || []).filter(c => c.volume === 0).length}
                                    </p>
                                </div>
                                <div className="p-4 rounded-[var(--ds-radius-small)] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 shadow-[var(--ds-shadow-raised)] text-left">
                                    <p className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-2">
                                        <Icon icon={Activity01Icon} size={12} />{" "}{tr("Avg Volume")}</p>
                                    <p className="text-xl font-semibold text-[#242a37] dark:text-white">
                                        {Math.round((performanceAnalytics?.underperforming || []).reduce((sum, c) => sum + (c.volume || 0), 0) / Math.max(1, (performanceAnalytics?.underperforming || []).length)).toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-4 rounded-[var(--ds-radius-small)] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 shadow-[var(--ds-shadow-raised)] text-left">
                                    <p className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-2">
                                        <Icon icon={Sad01Icon} size={12} />{" "}{tr("Total Flagged")}</p>
                                    <p className="text-xl font-semibold text-rose-500">
                                        {(performanceAnalytics?.underperforming || []).length}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {(performanceAnalytics?.underperforming || []).map((company, i) => (
                                <div
                                    key={company.id}
                                    onClick={() => { setShowAuditModal(false); handleView(company) }}
                                    className="px-6 py-5 hover:bg-rose-50/40 dark:hover:bg-rose-500/[0.04] flex items-center justify-between gap-4 cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="size-9 shrink-0 rounded-full bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center text-xs font-semibold text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{company.name}</p>
                                            <p className="text-xs font-bold text-rose-400 mt-0.5">
                                                {company.volume === 0 ? tr("No Parcels · Completely Idle") : tr("{volume} Parcels · Below Threshold", { volume: company.volume.toLocaleString() })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[15px] font-semibold text-rose-500 leading-none">{company.volume.toLocaleString()}</p>
                                        <p className="text-xs font-semibold text-slate-400 mt-0.5">{tr("Parcels")}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3 flex-shrink-0">
                        <Button variant="ghost" onClick={() => setShowAuditModal(false)} className="text-xs font-semibold cursor-pointer">{tr("Close")}</Button>
                        <Button onClick={() => { setShowAuditModal(false); setActiveTab("all-companies") }} className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold rounded-[var(--ds-radius-small)] cursor-pointer">{tr("View all")}</Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* 3. Quiet (Inactive) Partners — right-slide Sheet */}
            <Sheet open={showInactiveModal} onOpenChange={setShowInactiveModal}>
                <SheetContent side="right" className="p-0 sm:max-w-[720px] border-none bg-white dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full outline-none overflow-hidden [&>button]:hidden">
                    <SheetTitle className="sr-only">{tr("Dormant Partners")}</SheetTitle>
                    <SheetDescription className="sr-only">{tr("Partners with no recent parcels in 14 or more days")}</SheetDescription>
                    {/* Header */}
                    <div className="relative px-6 py-10 bg-[#242a37] text-white flex-shrink-0">
                        <div className="relative z-10 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <Icon icon={Chart01Icon} className="text-[#ffd428]" size={26} />{tr("Dormant Partners")}</h2>
                                <p className="text-xs font-bold text-white/40 mt-2">
                                    {(performanceAnalytics?.inactive || []).length}{" "}{tr("Partners · No Recent Parcels (")}{thresholds.quietInactivity}{tr("+ Days)")}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <button onClick={() => setShowInactiveModal(false)} className="size-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition cursor-pointer">
                                    <Icon icon={Cancel01Icon} size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Body */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
                        <div className="p-8 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1f2b]">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-[var(--ds-radius-small)] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 shadow-[var(--ds-shadow-raised)] text-left">
                                    <p className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-2">
                                        <Icon icon={Clock01Icon} size={12} />{" "}{tr("Avg days since last parcel")}</p>
                                    <p className="text-xl font-semibold text-slate-500">
                                        {(() => {
                                            const dated = (performanceAnalytics?.inactive || []).filter(c => c.lastActivity !== null)
                                            return dated.length ? `${Math.round(dated.reduce((sum, c) => sum + (c.lastActivity ?? 0), 0) / dated.length)}d` : "—"
                                        })()}
                                    </p>
                                </div>
                                <div className="p-4 rounded-[var(--ds-radius-small)] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 shadow-[var(--ds-shadow-raised)] text-left">
                                    <p className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-2">
                                        <Icon icon={Chart01Icon} size={12} />{" "}{tr("All-time parcels")}</p>
                                    <p className="text-xl font-semibold text-[#ffd428]">
                                        {(performanceAnalytics?.inactive || []).reduce((sum, c) => sum + (c.allTimeParcels || 0), 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {(performanceAnalytics?.inactive || []).map((company, i) => (
                                <div
                                    key={company.id}
                                    onClick={() => { setShowInactiveModal(false); handleView(company) }}
                                    className="px-6 py-5 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] flex items-center justify-between gap-4 cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="size-9 shrink-0 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400 group-hover:bg-[#ffd428] group-hover:text-[#242a37] transition-colors">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{company.name}</p>
                                            <p className="text-xs font-bold text-slate-400 mt-0.5">{dormancyLabel(company.lastActivity)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[15px] font-semibold text-[#ffd428] leading-none">{company.lastActivity === null ? "—" : `${company.lastActivity}d`}</p>
                                        <p className="text-xs font-semibold text-slate-400 mt-0.5">{tr("Since last parcel")}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3 flex-shrink-0">
                        <Button variant="ghost" onClick={() => setShowInactiveModal(false)} className="text-xs font-semibold cursor-pointer">{tr("Close")}</Button>
                        <Button onClick={() => { setShowInactiveModal(false); setActiveTab("all-companies"); setStatusFilter("inactive") }} className="bg-[#242a37] hover:bg-[#ffd428] hover:text-[#242a37] text-white text-xs font-semibold rounded-[var(--ds-radius-small)] cursor-pointer">{tr("View All Inactive")}</Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* 4. New Partners — right-slide Sheet (dark) */}
            <Sheet open={showNewPartnersModal} onOpenChange={setShowNewPartnersModal}>
                <SheetContent side="right" className="p-0 sm:max-w-[720px] border-none bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full outline-none overflow-hidden [&>button]:hidden">
                    <SheetTitle className="sr-only">{tr("New Companies")}</SheetTitle>
                    <SheetDescription className="sr-only">{tr("Companies added recently")}</SheetDescription>
                    {/* Header */}
                    <div className="relative px-6 py-10 bg-black/40 border-b border-white/5 flex-shrink-0">
                        <div className="relative z-10 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-[#ffd428] flex items-center gap-3">{tr("New Companies")}</h2>
                                <p className="text-xs font-bold text-white/40 mt-2">{tr("Companies added recently")}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <button onClick={() => setShowNewPartnersModal(false)} className="size-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition cursor-pointer">
                                    <Icon icon={Cancel01Icon} size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Body */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
                        <div className="p-8 border-b border-white/5 bg-white/5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-[var(--ds-radius-small)] bg-black/20 border border-white/5 shadow-[var(--ds-shadow-raised)] text-left">
                                    <p className="text-xs font-semibold text-white/40 mb-1 flex items-center gap-2">
                                        <Icon icon={Building03Icon} size={12} />{" "}{tr("New in")}{" "}{thresholds.newPartnerDays}{" "}{tr("days")}</p>
                                    <p className="text-xl font-semibold text-white">
                                        {newCompanies.length}
                                    </p>
                                </div>
                                <div className="p-4 rounded-[var(--ds-radius-small)] bg-black/20 border border-white/5 shadow-[var(--ds-shadow-raised)] text-left">
                                    <p className="text-xs font-semibold text-white/40 mb-1 flex items-center gap-2">
                                        <Icon icon={Package01Icon} size={12} />{" "}{tr("Parcels so far")}</p>
                                    <p className="text-xl font-semibold text-[#ffd428]">
                                        {activityData
                                            ? newCompanies.reduce((sum, c) => sum + (activityData[c.id]?.totalParcels ?? 0), 0).toLocaleString()
                                            : "…"}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="divide-y divide-white/5">
                            {newCompanies.length === 0 && (
                                <p className="px-6 py-5 text-sm text-white/50">{tr("No companies registered in the last {newPartnerDays} days.", { newPartnerDays: thresholds.newPartnerDays })}</p>
                            )}
                            {newCompanies.map((company, i) => (
                                <div
                                    key={company.id}
                                    onClick={() => { setShowNewPartnersModal(false); handleView(company) }}
                                    className="px-6 py-5 hover:bg-white/[0.03] flex items-center justify-between gap-4 cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="size-9 shrink-0 rounded-full bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400 group-hover:bg-[#ffd428] group-hover:text-[#242a37] transition-colors">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-white truncate">{company.name}</p>
                                            <p className="text-xs font-bold text-white/30 mt-0.5">{tr("Onboarded {yyyy}", { yyyy: format(new Date(company.createdAt), "MMM dd, yyyy") })}</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-[#ffd428] text-[#242a37] text-[11px] font-semibold h-5 px-3 uppercase shrink-0">{tr("New Partner")}</Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-white/5 flex justify-end gap-3 flex-shrink-0">
                        <Button variant="ghost" onClick={() => setShowNewPartnersModal(false)} className="text-xs font-semibold text-white/60 hover:text-white cursor-pointer">{tr("Close")}</Button>
                        <Button onClick={() => { setShowNewPartnersModal(false); setActiveTab("all-companies") }} className="bg-white/10 hover:bg-[#ffd428] hover:text-[#242a37] text-white text-xs font-semibold rounded-[var(--ds-radius-small)] border border-white/10 cursor-pointer">{tr("View all")}</Button>
                    </div>
                </SheetContent>
            </Sheet>

        </div>
    )
}
