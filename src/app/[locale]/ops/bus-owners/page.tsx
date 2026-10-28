"use client"
import { Icon } from "@/components/ui/icon"
import { cardValueClass } from "@/lib/card-text"

import type React from "react"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSearchParams, useRouter, useParams } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useDebounce } from "@/hooks/use-debounce"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Activity01Icon,
    Add01Icon,
    ArrowLeft01Icon,
    ArrowRight01Icon,
    Building03Icon,
    CheckListIcon,
    DashboardCircleIcon,
    Download01Icon,
    FilterIcon,
    Mail01Icon,
    MoreHorizontalIcon,
    Package01Icon,
    PieChart01Icon,
    RefreshIcon,
    Search01Icon,
    UserGroupIcon,
    ViewIcon,
    ContactIcon,
    PassportIcon,
    Settings01Icon,
    ListViewIcon,
    GridViewIcon,
    ChartBarLineIcon,
    Analytics01Icon,
    PencilEdit01Icon,
    Delete02Icon,
    Medal01Icon,
    Sad01Icon,
    Clock01Icon,
    ChartLineData03Icon,
} from "@hugeicons/core-free-icons"
import { motion, AnimatePresence } from "framer-motion"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    AreaChart,
    Area,
} from "recharts"
import { format, subMonths, eachMonthOfInterval, startOfMonth, endOfMonth, isWithinInterval, differenceInCalendarDays } from "date-fns"
import { cn } from "@/lib/utils"

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

import { getUsers, getCompanies, getAdminAccounts } from "@/lib/services/user"
import { getAllCompanies } from "@/lib/services/company"
import { getCompaniesActivity, getCompaniesPeriodMetrics, overviewRange, type OverviewPeriod } from "@/lib/services/parcel"
import { Skeleton } from "@/components/ui/skeleton"
import type { User } from "@/types/user"
import { BusOwnerRegistrationModal } from "@/components/modals/bus-owner-registration-modal"
import { OwnerViewModal } from "@/components/modals/owner-view-modal"
import { useSearchLanding } from "@/hooks/use-search-landing"
import { useTr } from "@/lib/i18n/portal"


// Pagination component
const PaginationControls = ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    isLoading = false,
}: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    onPageChange: (page: number) => void
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

    if (totalPages <= 1 && totalItems <= itemsPerPage) return null

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-8 py-4 bg-white dark:bg-[#1a1f2b] border-t border-slate-100 dark:border-white/5">
            <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="text-xs font-semibold text-slate-400">{tr("Displaying")}{" "}<span className="text-slate-900 dark:text-white px-1.5">{startItem} - {endItem}</span>{tr("of")}{" "}<span className="text-slate-900 dark:text-white px-1.5">{totalItems}</span>{" "}{tr("Stakeholders")}</div>

                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400">{tr("View Capacity:")}</span>
                    <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(value) => onPageChange(1)}
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

export default function BusOwnersPage() {
    const tr = useTr()
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const router = useRouter()
    const searchParams = useSearchParams()
    const params = useParams()
    const locale = params.locale as string

    const [activeTab, setActiveTab] = useState("overview")
    const viewMode = "list" as const
    const [currentPage, setCurrentPage] = useState(1)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCompanyId, setSelectedCompanyId] = useState("all")
    const [statusFilter, setStatusFilter] = useState("all")
    const [pageSize] = useState(10)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)
    const [selectedOwner, setSelectedOwner] = useState<User | null>(null)

    // Initialize state from URL params
    useEffect(() => {
        const page = searchParams.get("page")
        const search = searchParams.get("search")
        const status = searchParams.get("status")
        const company = searchParams.get("company")
        const tab = searchParams.get("tab")

        if (page) setCurrentPage(Number.parseInt(page))
        if (search) setSearchQuery(search)
        if (status) setStatusFilter(status)
        if (company) setSelectedCompanyId(company)
        if (tab) setActiveTab(tab)
    }, [searchParams])

    const debouncedSearchQuery = useDebounce(searchQuery, 300)

    // Fetch ALL bus owners for overview charts.
    // getAdminAccounts hits the real /admins endpoint (no role filter param
    // there), so OWNER accounts are filtered out client-side here.
    const { data: allOwnersData, isLoading: isLoadingAllOwners } = useQuery({
        queryKey: ["all-bus-owners-for-charts"],
        queryFn: async () => {
            const response = await getAdminAccounts({ limit: 1000 })
            const owners = (response.data || []).filter((u: User) => u.role === "OWNER")
            return { data: owners }
        },
    })

    // Main registry query — same endpoint, with search/company/status
    // filtering and pagination all done client-side, since /admins doesn't
    // take those as query params.
    const {
        data: ownersData,
        isLoading: isLoadingOwners,
        isError: isErrorOwners,
        refetch: refetchOwners,
        isFetching: isFetchingOwners,
    } = useQuery({
        queryKey: ["bus-owners", currentPage, pageSize, debouncedSearchQuery, selectedCompanyId, statusFilter],
        queryFn: async () => {
            const response = await getAdminAccounts({ limit: 1000 })
            let filtered = (response.data || []).filter((u: User) => u.role === "OWNER")

            const searchTerm = debouncedSearchQuery.trim().toLowerCase()
            if (searchTerm) {
                filtered = filtered.filter((owner: User) => {
                    const fields = [owner.fullName, owner.email, owner.phoneNumber, owner.username]
                        .filter(Boolean)
                        .map((f) => f!.toLowerCase())
                    return fields.some((f) => f.includes(searchTerm))
                })
            }

            if (selectedCompanyId !== "all") {
                filtered = filtered.filter((o) => String(o.companyId || o.company_id) === selectedCompanyId)
            }

            if (statusFilter !== "all") {
                const isActive = statusFilter === "active"
                filtered = filtered.filter((o) => o.isActive === isActive)
            }

            return {
                data: filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
                total: filtered.length,
            }
        },
        enabled: activeTab === "registry",
        keepPreviousData: true,
    })

    // Update URL when filters change
    const updateURL = useCallback(() => {
        const urlParams = new URLSearchParams()
        if (currentPage > 1) urlParams.set("page", currentPage.toString())
        if (debouncedSearchQuery) urlParams.set("search", debouncedSearchQuery)
        if (selectedCompanyId !== "all") urlParams.set("company", selectedCompanyId)
        if (statusFilter !== "all") urlParams.set("status", statusFilter)
        if (activeTab !== "overview") urlParams.set("tab", activeTab)

        const newUrl = urlParams.toString() ? `?${urlParams.toString()}` : ""
        // Stay on whichever portal shows this page (ops or admin)
        const fullUrl = `${window.location.pathname}${newUrl}`

        if (newUrl !== window.location.search) {
            router.push(fullUrl, { scroll: false })
        }
    }, [currentPage, debouncedSearchQuery, selectedCompanyId, statusFilter, activeTab, router, locale])

    useEffect(() => {
         updateURL()
    }, [updateURL])

    // Reset page when search or filters change
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1)
        }
    }, [debouncedSearchQuery, selectedCompanyId, statusFilter])

    // Fetch companies for filtering
    const { data: companiesResponse } = useQuery({
        queryKey: ["companies-list"],
        queryFn: () => getCompanies({ limit: 1000, paginate: false }),
    })

    const companies = useMemo(() => {
        if (!companiesResponse) return []
        if (Array.isArray(companiesResponse)) return companiesResponse
        if (companiesResponse.data && Array.isArray(companiesResponse.data)) return companiesResponse.data
        return []
    }, [companiesResponse])

    const owners = useMemo(() => {
        if (!ownersData) return []
        if (Array.isArray(ownersData)) return ownersData
        if (ownersData.data && Array.isArray(ownersData.data)) return ownersData.data
        if (ownersData.users && Array.isArray(ownersData.users)) return ownersData.users
        return []
    }, [ownersData])

    const totalOwners = ownersData?.total || ownersData?.meta?.total || owners.length
    const totalPages = Math.ceil(totalOwners / pageSize)

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value)
        if (e.target.value.trim().length > 0 && activeTab !== "registry") {
            setActiveTab("registry")
        }
    }

    const handleViewOwner = (owner: User) => {
        setSelectedOwner(owner)
        setIsViewModalOpen(true)
    }

    const allOwners = useMemo(() => {
        const raw = allOwnersData?.data || (Array.isArray(allOwnersData) ? allOwnersData : [])
        return raw as User[]
    }, [allOwnersData])


    const pagination = useMemo(() => {
        if (!ownersData) return { currentPage: 1, totalPages: 1, totalItems: 0 }
        
        // Handle different metadata structures
        const meta = ownersData.meta || ownersData.pagination
        if (meta) {
            return {
                currentPage: meta.current_page || meta.currentPage || currentPage,
                totalPages: meta.last_page || meta.totalPages || 1,
                totalItems: meta.total || meta.totalItems || 0,
            }
        }
        
        return {
            currentPage: currentPage,
            totalPages: Math.ceil((ownersData.total || owners.length) / pageSize) || 1,
            totalItems: ownersData.total || owners.length || 0
        }
    }, [ownersData, owners.length, pageSize, currentPage])

    const NEW_OWNER_DAYS = 30
    const QUIET_DAYS = 14
    const ownerCompanyId = (o: User) => Number(o.companyId || (o as any).company_id) || null

    const stats = useMemo(() => {
        const data = allOwners.length > 0 ? allOwners : owners
        return {
            total: allOwners.length || pagination.totalItems,
            active: data.filter(o => o.isActive).length,
            inactive: data.filter(o => o.isActive === false).length,
            companies: new Set(data.map(ownerCompanyId).filter(Boolean)).size,
            newOwners: data.filter(o => o.createdAt && differenceInCalendarDays(new Date(), new Date(o.createdAt)) <= NEW_OWNER_DAYS).length,
        }
    }, [allOwners, owners, pagination.totalItems])

    const { data: allCompaniesData } = useQuery({
        queryKey: ["all-companies"],
        queryFn: async () => ({ data: await getAllCompanies() }),
        staleTime: 1000 * 60 * 10,
    })
    // Company names: the full list (shared cache with the Companies page),
    // falling back to the page's own company list.
    const companyName = useCallback(
        (id: number) =>
            ((allCompaniesData?.data as any[]) ?? []).find((c: any) => c.id === id)?.name ??
            companies.find(c => c.id === id)?.name,
        [allCompaniesData, companies],
    )


    // ─── Performance (owner = their company's parcels) ───
    // Same server-side, cached data as the Companies overview.
    const OVERVIEW_PERIOD_OPTIONS = [
        { value: "today", label: tr("Today") },
        { value: "7d", label: tr("Last 7 Days") },
        { value: "30d", label: tr("Last 30 Days") },
        { value: "all", label: tr("All Time") },
    ] as const
    const [overviewPeriod, setOverviewPeriod] = useState<OverviewPeriod>("today")
    const periodLabel = OVERVIEW_PERIOD_OPTIONS.find(o => o.value === overviewPeriod)?.label ?? "Today"

    const allCompanyIds = useMemo(
        () => ((allCompaniesData?.data as any[]) ?? []).map((c: any) => c.id) as number[],
        [allCompaniesData],
    )
    const { data: activityData, isPending: isActivityPending } = useQuery({
        queryKey: ["companies-activity", allCompanyIds],
        queryFn: ({ signal }) => getCompaniesActivity(allCompanyIds, signal),
        enabled: allCompanyIds.length > 0,
        staleTime: 1000 * 60 * 10,
    })
    const { data: periodData, isError: isPeriodError } = useQuery({
        queryKey: ["companies-period-metrics", overviewPeriod],
        queryFn: ({ signal }) => getCompaniesPeriodMetrics(overviewRange(overviewPeriod), { signal }),
        enabled: overviewPeriod !== "all",
        staleTime: 1000 * 60 * 10,
        retry: 1,
    })
    const isPerformanceLoading =
        !allOwnersData || (overviewPeriod === "all" ? isActivityPending : !periodData && !isPeriodError)

    const ownerPerformance = useMemo(() => {
        return allOwners.map(o => {
            const companyId = ownerCompanyId(o)
            const activity = companyId ? activityData?.[companyId] : undefined
            const volume = !companyId ? 0
                : overviewPeriod === "all" ? (activity?.totalParcels ?? 0)
                : (periodData?.[companyId]?.totalParcels ?? 0)
            const last = activity?.lastActivityDate ?? null
            return {
                owner: o,
                companyName: (companyId && companyName(companyId)) || o.companyName || o.company?.name || "No company",
                volume,
                quietDays: last ? Math.max(0, differenceInCalendarDays(new Date(), new Date(last))) : null,
                everActive: (activity?.totalParcels ?? 0) > 0,
            }
        })
    }, [allOwners, activityData, periodData, overviewPeriod, companyName])
    const topOwners = useMemo(
        () => ownerPerformance.filter(p => p.volume > 0).sort((a, b) => b.volume - a.volume).slice(0, 5),
        [ownerPerformance],
    )
    const companyVolumeChart = useMemo(() => {
        const byCompany = new Map<string, number>()
        for (const p of ownerPerformance) if (p.volume > 0) byCompany.set(p.companyName, Math.max(byCompany.get(p.companyName) ?? 0, p.volume))
        return [...byCompany.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name: name.length > 14 ? `${name.slice(0, 14)}…` : name, count }))
    }, [ownerPerformance])
    const quietOwners = useMemo(
        () => (activityData ? ownerPerformance : [])
            .filter(p => p.quietDays === null || p.quietDays >= QUIET_DAYS)
            .sort((a, b) => (a.everActive ? 0 : 1) - (b.everActive ? 0 : 1) || (b.quietDays ?? 0) - (a.quietDays ?? 0))
            .slice(0, 5),
        [ownerPerformance, activityData],
    )
    // Active owners whose company does ship (all-time > 0), fewest parcels this period
    const lowActivityOwners = useMemo(
        () => ownerPerformance
            .filter(p => p.owner.isActive && p.everActive)
            .sort((a, b) => a.volume - b.volume),
        [ownerPerformance],
    )
    const newOwners = useMemo(
        () => [...(allOwners.length > 0 ? allOwners : owners)]
            .filter(o => o.createdAt && differenceInCalendarDays(new Date(), new Date(o.createdAt)) <= NEW_OWNER_DAYS)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        [allOwners, owners],
    )

    const statusData = useMemo(() => [
        { name: "Active", value: stats.active, color: BRAND_COLORS.success },
        { name: "Inactive", value: stats.inactive, color: BRAND_COLORS.danger }
    ], [stats])

    // Opened from the portal search: fill the search and open the result
    useSearchLanding({ setSearch: setSearchQuery, showList: () => setActiveTab("registry"), items: owners, ready: true, onOpen: handleViewOwner })

    return (
        <div className="space-y-10 animate-in fade-in duration-300">

            {/* ── Top Bar — same layout as Agents ── */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 justify-between">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 flex-1 min-w-0">
                    <div className="relative group flex-1 min-w-0 lg:min-w-[16rem]">
                        <Icon icon={Search01Icon} size={20}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ffd428] transition-colors"
                        />
                        <Input
                            placeholder={tr("Search owners")}
                            value={searchQuery}
                            onChange={handleSearch}
                            className="h-10 pl-10 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-normal placeholder:text-slate-400 focus:ring-1 focus:ring-[#ffd428]/50 shadow-none w-full"
                        />
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                            <SelectTrigger className="w-full sm:w-56 h-10 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-medium shadow-none outline-none focus:ring-1 focus:ring-[#ffd428]/50">
                                <div className="flex items-center gap-2">
                                    <Icon icon={Building03Icon} size={16} className="shrink-0 text-slate-500 dark:text-slate-400" />
                                    <SelectValue placeholder="COMPANY" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] max-h-[400px]">
                                <SelectItem value="all" className="text-sm">{tr("All companies")}</SelectItem>
                                {companies.map(c => (
                                    <SelectItem key={c.id} value={String(c.id)} className="text-xs font-semibold py-3">{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-36 h-10 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-medium shadow-none outline-none focus:ring-1 focus:ring-[#ffd428]/50">
                                <div className="flex items-center gap-2">
                                    <Icon icon={FilterIcon} size={16} className="shrink-0 text-slate-500 dark:text-slate-400" />
                                    <SelectValue placeholder="STATUS" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)]">
                                <SelectItem value="all"      className="text-sm">{tr("All statuses")}</SelectItem>
                                <SelectItem value="active"   className="text-sm">{tr("Active")}</SelectItem>
                                <SelectItem value="inactive" className="text-sm">{tr("Inactive")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => refetchOwners()}
                        aria-label={tr("Refresh owners")}
                        className="h-10 w-10 text-slate-400 hover:text-[#ffd428] rounded-[var(--ds-radius-small)]"
                    >
                        <Icon icon={RefreshIcon} size={20} className={isFetchingOwners ? "animate-spin" : ""} />
                    </Button>
                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="h-10 px-5 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-small)] font-semibold text-sm shadow-[var(--ds-shadow-raised)] transition-colors flex items-center gap-3 cursor-pointer"
                    >
                        <Icon icon={Add01Icon} size={20} />{tr("Add Owner")}</Button>
                </div>
            </div>

            {/* ── Tabs ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <TabsList className="portal-sticky-tabs bg-slate-100 dark:bg-black/20 p-1.5 rounded-[var(--ds-radius-small)] w-full items-stretch h-auto">
                    <TabsTrigger value="overview"
                        className="flex-1 h-11 rounded-[var(--ds-radius-large)] text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-[#242a37] data-[state=active]:shadow-[var(--ds-shadow-raised)] transition-all cursor-pointer"
                    >
                        <Icon icon={ChartBarLineIcon} size={18} className="mr-2" />{tr("Overview")}</TabsTrigger>
                    <TabsTrigger value="registry"
                        className="flex-1 h-11 rounded-[var(--ds-radius-large)] text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-[#242a37] data-[state=active]:shadow-[var(--ds-shadow-raised)] transition-all gap-3 cursor-pointer"
                    >
                        <div className="flex items-center gap-2">
                            <Icon icon={UserGroupIcon} size={18} />{tr("All Owners")}</div>
                        <Badge className="bg-[#ffd428] text-[#242a37] border-none text-xs font-semibold h-6 min-w-10 flex items-center justify-center rounded-[var(--ds-radius-small)]">
                            {stats.total}
                        </Badge>
                    </TabsTrigger>
                </TabsList>

                {/* ════════════════ OVERVIEW TAB ════════════════ */}
                <TabsContent value="overview" className="space-y-10 focus:outline-none outline-none">
                        {/* Performance — owners ranked by their company's parcels */}
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <h2 className="text-lg font-semibold text-[#242a37] dark:text-white">{tr("Performance")}</h2>
                                <p className="text-xs font-bold text-slate-400 mt-1">{tr("Owners ranked by their company's parcels in the selected period")}</p>
                            </div>
                            <div className="flex p-1.5 bg-slate-100 dark:bg-black/20 rounded-[var(--ds-radius-small)] w-fit max-w-full overflow-x-auto">
                                {OVERVIEW_PERIOD_OPTIONS.map(option => (
                                    <button
                                        key={option.value}
                                        onClick={() => setOverviewPeriod(option.value)}
                                        aria-pressed={overviewPeriod === option.value}
                                        className={cn(
                                            "h-9 px-4 rounded-[var(--ds-radius-small)] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap",
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
                        {/* Command Cards — same style as Agents */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                {
                                    // Ranked by the company's parcels, so lead with the company
                                    label: tr("Busiest company"),
                                    value: isPerformanceLoading ? "Loading…" : (topOwners[0]?.companyName ?? "No parcels"),
                                    icon: Building03Icon,
                                    sub: topOwners[0]
                                        ? `${topOwners[0].volume.toLocaleString()} parcels · ${periodLabel} · owner ${topOwners[0].owner.fullName}`
                                        : `No parcels · ${periodLabel}`,
                                    badge: topOwners[0] ? "RANK #1" : null,
                                },
                                {
                                    label: tr("New owners"),
                                    value: stats.newOwners,
                                    icon: ChartBarLineIcon,
                                    sub: tr("Owner accounts added in the last {NEW_OWNER_DAYS} days", { NEW_OWNER_DAYS }),
                                    badge: null,
                                },
                                {
                                    label: tr("Active owners"),
                                    value: `${stats.active} / ${stats.total}`,
                                    icon: Activity01Icon,
                                    sub: stats.inactive ? `${stats.inactive} can't sign in (inactive)` : "All can sign in",
                                    badge: null,
                                },
                            ].map((card, i) => (
                                <motion.div key={card.label} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="h-full">
                                    <Card className="rounded-[var(--ds-radius-large)] border-none h-full overflow-hidden relative shadow-[var(--ds-shadow-raised)] bg-[#242a37]">
                                        <CardContent className="p-6 relative z-10">
                                            <div className="flex items-center justify-between gap-3 mb-4">
                                                <div className="size-10 shrink-0 rounded-[var(--ds-radius-small)] flex items-center justify-center bg-white/5">
                                                    <Icon icon={card.icon} className="size-5 text-[#ffd428]" />
                                                </div>
                                                {card.badge && (
                                                    <Badge className="text-xs font-semibold bg-[#ffd428] text-[#242a37] border-none truncate max-w-[60%]">
                                                        {card.badge}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs font-semibold mb-1 text-[#ffd428]/60">{card.label}</p>
                                            <h3 className={cn(cardValueClass(card.value), "font-semibold leading-tight text-white line-clamp-2 break-words")} title={String(card.value)}>{card.value}</h3>
                                            <p className="text-xs font-bold text-white/40 mt-2">{card.sub}</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>


                    {/* Rankings Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden group">
                            <CardHeader className="relative py-8 px-6 overflow-hidden bg-[#242a37] text-white border-none rounded-t-[var(--ds-radius-small)]">
                                <div className="relative z-10 flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                            <Icon icon={Medal01Icon} className="text-amber-500" size={24} />{tr("Top Owners")}</CardTitle>
                                        <CardDescription className="text-xs font-bold text-white/40 mt-1">{tr("Ranked by company parcels · {periodLabel}", { periodLabel })}</CardDescription>
                                    </div>
                                    <Badge className="bg-amber-500 text-white border-none text-xs font-semibold px-5 py-2 rounded-full shadow-[var(--ds-shadow-raised)]">TOP</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-50 dark:divide-white/5">
                                    {isPerformanceLoading ? (
                                        <div className="divide-y divide-slate-50 dark:divide-white/5">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <div key={i} className="p-6 flex items-center justify-between">
                                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                                        <Skeleton className="size-8 shrink-0 rounded-full" />
                                                        <div className="flex-1 min-w-0 space-y-1.5">
                                                            <Skeleton className="h-3.5 w-32" />
                                                            <Skeleton className="h-2.5 w-40" />
                                                        </div>
                                                    </div>
                                                    <Skeleton className="h-3.5 w-10" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : topOwners.length === 0 ? (
                                        <p className="p-6 text-sm text-slate-400">{tr("No parcels")}{" "}{periodLabel === "All Time" ? tr("yet") : periodLabel.toLowerCase()}.</p>
                                    ) : topOwners.slice(0, 5).map((p, i) => (
                                        <button key={p.owner.id} type="button" onClick={() => handleViewOwner(p.owner)}
                                            className="w-full text-left p-6 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors flex items-center justify-between group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className={cn("size-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                                                    i === 0 ? "bg-[#ffd428] text-[#242a37]" : "bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:bg-[#ffd428] group-hover:text-[#242a37]"
                                                )}>{i + 1}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{p.owner.fullName}</p>
                                                    <p className="text-xs font-bold text-slate-400 mt-1 truncate">{p.companyName}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1 shrink-0 ml-4">
                                                <p className="text-[13px] font-semibold leading-none mb-0.5 tabular-nums text-[#242a37] dark:text-white">{p.volume.toLocaleString()}</p>
                                                <p className="text-xs font-semibold text-slate-400">{tr("Parcels")}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden group">
                            <CardHeader className="relative py-8 px-6 overflow-hidden bg-[#242a37] text-white border-none rounded-t-[var(--ds-radius-small)]">
                                <div className="relative z-10 flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                            <Icon icon={Sad01Icon} className="text-rose-500" size={24} />{tr("Low Activity Owners")}</CardTitle>
                                        <CardDescription className="text-xs font-bold text-white/40 mt-1">{tr("Active owners whose company booked the fewest parcels · {periodLabel}", { periodLabel })}</CardDescription>
                                    </div>
                                    <Badge className="bg-rose-500 text-white border-none text-xs font-semibold px-5 py-2 rounded-full shadow-[var(--ds-shadow-raised)]">REVIEW</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-50 dark:divide-white/5">
                                    {isPerformanceLoading || isActivityPending ? (
                                        <div className="divide-y divide-slate-50 dark:divide-white/5">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <div key={i} className="p-6 flex items-center justify-between">
                                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                                        <Skeleton className="size-8 shrink-0 rounded-full" />
                                                        <div className="flex-1 min-w-0 space-y-1.5">
                                                            <Skeleton className="h-3.5 w-32" />
                                                            <Skeleton className="h-2.5 w-40" />
                                                        </div>
                                                    </div>
                                                    <Skeleton className="h-3.5 w-10" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : lowActivityOwners.length === 0 ? (
                                        <p className="p-6 text-sm text-slate-400">{tr("No active owners with parcel history.")}</p>
                                    ) : lowActivityOwners.slice(0, 5).map((p, i) => (
                                        <button key={p.owner.id} type="button" onClick={() => handleViewOwner(p.owner)}
                                            className="w-full text-left p-6 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors flex items-center justify-between group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className={cn("size-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                                                    i === 0 ? "bg-[#ffd428] text-[#242a37]" : "bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:bg-[#ffd428] group-hover:text-[#242a37]"
                                                )}>{i + 1}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{p.owner.fullName}</p>
                                                    <p className="text-xs font-bold text-slate-400 mt-1 truncate">{p.companyName}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1 shrink-0 ml-4">
                                                <p className="text-[13px] font-semibold leading-none mb-0.5 tabular-nums text-rose-500">{p.volume.toLocaleString()}</p>
                                                <p className="text-xs font-semibold text-slate-400">{tr("Parcels")}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Chart Ecosystem */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Account status donut */}
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden flex flex-col group">
                            <CardHeader className="relative py-8 px-6 bg-[#242a37] text-white border-none rounded-t-[var(--ds-radius-small)]">
                                <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                    <Icon icon={PieChart01Icon} className="text-teal-400" size={24} />{tr("Account Status")}</CardTitle>
                                <CardDescription className="text-xs font-bold text-white/40 mt-1">{tr("Active vs inactive owners")}</CardDescription>
                            </CardHeader>
                            <div className="p-6 flex flex-col flex-1">
                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                    <div className="h-[200px] w-[200px] shrink-0 relative">
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                                            <p className="text-2xl font-bold text-[#242a37] dark:text-white leading-none">{stats.total}</p>
                                            <p className="text-xs font-semibold text-slate-400 mt-1">{tr("Total Owners")}</p>
                                        </div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={stats.total > 0 ? statusData : [{ name: "No Data", value: 1, color: "#334155" }]}
                                                    innerRadius="65%" outerRadius="90%" paddingAngle={3} dataKey="value"
                                                    stroke="none" startAngle={90} endAngle={-270}
                                                >
                                                    {(stats.total > 0 ? statusData : [{ name: "No Data", value: 1, color: "#334155" }]).map((entry, i) => (
                                                        <Cell key={i} fill={entry.color} className="focus:outline-none" />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex-1 space-y-3 min-w-0">
                                        {statusData.map((entry, i) => (
                                            <div key={i} className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">{entry.name}</span>
                                                </div>
                                                <span className="text-xs font-semibold text-[#242a37] dark:text-white shrink-0">{entry.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Owners per company */}
                        <Card className="lg:col-span-2 rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden group">
                            <CardHeader className="relative py-8 px-6 bg-[#242a37] text-white border-none">
                                <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                    <Icon icon={ChartLineData03Icon} className="text-blue-400" size={24} />{tr("Parcels by company")}</CardTitle>
                                <CardDescription className="text-xs font-bold text-white/40 mt-1">{tr("Companies with an owner, by parcels booked · {periodLabel}", { periodLabel })}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={companyVolumeChart} barCategoryGap="25%">
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.05)" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} dy={10} />
                                            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                                            <RechartsTooltip cursor={{ fill: "transparent" }} />
                                            <Bar dataKey="count" name="Parcels" fill="#ffd428" radius={[8, 8, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Bottom: Quiet Owners + New Owners */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden group">
                            <CardHeader className="relative py-8 px-6 bg-[#242a37] text-white border-none rounded-t-[var(--ds-radius-small)]">
                                <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                    <Icon icon={Clock01Icon} className="text-[#ffd428]" size={24} />{tr("Quiet Owners")}</CardTitle>
                                <CardDescription className="text-xs font-bold text-white/40 mt-1">{tr("Company has no parcels for {QUIET_DAYS}+ days", { QUIET_DAYS })}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-50 dark:divide-white/5">
                                    {!allOwnersData || isActivityPending ? (
                                        <div className="divide-y divide-slate-50 dark:divide-white/5">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <div key={i} className="p-6 flex items-center justify-between">
                                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                                        <Skeleton className="size-8 shrink-0 rounded-full" />
                                                        <div className="flex-1 min-w-0 space-y-1.5">
                                                            <Skeleton className="h-3.5 w-32" />
                                                            <Skeleton className="h-2.5 w-40" />
                                                        </div>
                                                    </div>
                                                    <Skeleton className="h-3.5 w-10" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : quietOwners.length === 0 ? (
                                        <p className="p-6 text-sm text-slate-400">{tr("Every owner's company sent a parcel in the last {QUIET_DAYS} days.", { QUIET_DAYS })}</p>
                                    ) : quietOwners.map((p, i) => (
                                        <button key={p.owner.id} type="button" onClick={() => handleViewOwner(p.owner)}
                                            className="w-full text-left p-6 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors flex items-center justify-between group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="size-8 shrink-0 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400 group-hover:bg-[#ffd428] group-hover:text-[#242a37] transition-colors">{i + 1}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{p.owner.fullName}</p>
                                                    <p className="text-xs font-bold text-slate-400 mt-1 truncate">
                                                        {!p.everActive ? tr("{companyName} · no parcels yet", { companyName: p.companyName }) : tr("{companyName} · no parcels for {quietDays} days", { companyName: p.companyName, quietDays: p.quietDays })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1 shrink-0 ml-4">
                                                <p className="text-[13px] font-semibold text-[#ffd428] leading-none mb-0.5">{p.quietDays === null ? "—" : `${p.quietDays}d`}</p>
                                                <p className="text-xs font-semibold text-slate-400">{tr("Since last parcel")}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                        {/* New Owners — same style as Agents' "New Agents" */}
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-[#1a1f2b] text-white shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden">
                            <CardHeader className="p-6 bg-black/20 border-b border-white/5 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-semibold text-[#ffd428]">{tr("New Owners")}</CardTitle>
                                    <CardDescription className="text-xs font-bold text-white/40 mt-2">
                                        {tr("Latest added owners ({NEW_OWNER_DAYS} day window)", { NEW_OWNER_DAYS })}</CardDescription>
                                </div>
                                <Button
                                    variant="ghost"
                                    className="text-xs font-semibold text-white/60 hover:text-[#242a37] hover:bg-[#ffd428]"
                                    onClick={() => setActiveTab("registry")}
                                >{tr("All owners")}<Icon icon={ArrowRight01Icon} size={14} className="ml-1" />
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-white/5">
                                    {!allOwnersData ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                            <div key={i} className="p-6 flex items-center gap-4">
                                                <Skeleton className="size-8 rounded-full bg-white/10" />
                                                <div className="flex-1 space-y-1.5">
                                                    <Skeleton className="h-3.5 w-40 bg-white/10" />
                                                    <Skeleton className="h-3 w-28 bg-white/10" />
                                                </div>
                                            </div>
                                        ))
                                    ) : newOwners.length === 0 ? (
                                        <p className="p-6 text-sm text-white/50">{tr("No owners joined in the last {NEW_OWNER_DAYS} days.", { NEW_OWNER_DAYS })}</p>
                                    ) : newOwners.slice(0, 5).map((owner, i) => (
                                        <button
                                            key={owner.id}
                                            type="button"
                                            onClick={() => handleViewOwner(owner)}
                                            className="w-full p-6 flex items-center justify-between gap-4 text-left hover:bg-white/[0.02] transition-colors cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <span className="size-8 shrink-0 rounded-full bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400 group-hover:bg-[#ffd428] group-hover:text-[#242a37] transition-colors">{i + 1}</span>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-white truncate">{owner.fullName}</p>
                                                    <p className="text-xs font-bold text-white/30 mt-1">
                                                        {owner.companyName || owner.company?.name || tr("No company")}{" "}{tr("· joined")}{" "}{format(new Date(owner.createdAt), "MMM dd, yyyy")}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge className="bg-[#ffd428] text-[#242a37] text-[11px] font-semibold h-5 px-3 uppercase">{tr("New owner")}</Badge>
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ════════════════ ALL OWNERS TAB ════════════════ */}
                <TabsContent value="registry" className="space-y-8">
                    <Card className="rounded-[var(--ds-radius-large)] border-slate-100 dark:border-white/5 bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] overflow-hidden relative p-0 gap-0">
                        {/* Banner header — same as All Companies */}
                        <div className="bg-[#242a37] text-white p-8 relative overflow-hidden">
                            <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-[0.08] pointer-events-none transform scale-125">
                                <Icon icon={UserGroupIcon} size={140} />
                            </div>
                            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-2xl font-bold">{tr("All Owners")}</CardTitle>
                                    <CardDescription className="text-white/50 font-medium text-sm">{tr("Browse every bus owner and the company they run")}</CardDescription>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto bg-slate-50/50 dark:bg-black/10">
                            {/* Same table design as Companies */}
                            <Table className="min-w-[900px]">
                                <TableHeader>
                                    <TableRow className="bg-[#242a37] border-b border-transparent hover:bg-[#242a37]">
                                        <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs">{tr("Owner Detail")}</TableHead>
                                        <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Contact Info")}</TableHead>
                                        <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Parcel Summary")}</TableHead>
                                        <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-center">{tr("Status")}</TableHead>
                                        <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingOwners ? (
                                        [...Array(5)].map((_, i) => (
                                            <TableRow key={`loading-row-${i}`} className="animate-pulse">
                                                <TableCell className="px-6 py-4"><div className="h-14 bg-slate-50 dark:bg-white/5 rounded-[var(--ds-radius-large)] w-48" /></TableCell>
                                                <TableCell className="py-4"><div className="h-10 bg-slate-50 dark:bg-white/5 rounded-[var(--ds-radius-small)] w-36" /></TableCell>
                                                <TableCell className="py-4"><div className="h-6 bg-slate-50 dark:bg-white/5 rounded w-24" /></TableCell>
                                                <TableCell className="py-4"><div className="h-8 bg-slate-50 dark:bg-white/5 rounded-full w-20 mx-auto" /></TableCell>
                                                <TableCell className="px-6 py-4"><div className="h-10 bg-slate-50 dark:bg-white/5 rounded-[var(--ds-radius-small)] w-10 ml-auto" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : owners.length === 0 ? (
                                        <TableRow className="hover:bg-transparent">
                                            <TableCell colSpan={5} className="py-16 text-center">
                                                <p className="text-sm font-semibold text-[var(--ds-text)]">{tr("No owners found")}</p>
                                                <p className="mt-1 text-sm text-[var(--ds-text-subtlest)]">{tr("Try a different search or filter.")}</p>
                                                <Button
                                                    variant="ghost"
                                                    className="mt-6 h-10 px-6 rounded-full border border-slate-200 dark:border-white/10 text-xs font-semibold hover:bg-[#ffd428] hover:text-[#242a37] transition-colors cursor-pointer"
                                                    onClick={() => { setSearchQuery(""); setSelectedCompanyId("all"); setStatusFilter("all") }}
                                                >{tr("Reset Filters")}</Button>
                                            </TableCell>
                                        </TableRow>
                                    ) : owners.map((owner) => {
                                        const companyId = Number(owner.companyId || (owner as any).company_id) || null
                                        const company = (companyId && companyName(companyId)) || owner.companyName || owner.company?.name || "No company"
                                        const companyParcels = companyId ? activityData?.[companyId]?.totalParcels : undefined
                                        return (
                                            <TableRow
                                                key={owner.id}
                                                tabIndex={0}
                                                aria-label={tr("Open owner {fullName}", { fullName: owner.fullName })}
                                                onClick={() => handleViewOwner(owner)}
                                                onKeyDown={(e) => {
                                                    if (e.target !== e.currentTarget) return
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault()
                                                        handleViewOwner(owner)
                                                    }
                                                }}
                                                className="hover:bg-white dark:hover:bg-white/[0.04] transition-colors border-b border-slate-200/60 dark:border-white/5 cursor-pointer group outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ds-border-focused)]"
                                            >
                                                <TableCell className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-[#ffd428] transition-colors truncate">{owner.fullName}</p>
                                                            <div className="flex items-center gap-2 mt-1 min-w-0">
                                                                <Badge variant="outline" className="bg-[#ffd428]/10 text-[#ffd428] border-none text-[11px] font-semibold h-5 px-2 rounded-md shrink-0">{tr("ID: {padStart}", { padStart: String(owner.id).padStart(3, '0') })}</Badge>
                                                                <p className="text-xs text-slate-400 font-bold truncate">{company}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="size-1.5 rounded-full bg-[#ffd428]" />
                                                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">{owner.email || owner.phoneNumber || "—"}</p>
                                                        </div>
                                                        <div className="h-[18px] px-2.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[6px] text-xs font-semibold text-slate-400 w-fit flex items-center justify-center">
                                                            {owner.email && owner.phoneNumber ? owner.phoneNumber : `@${owner.username || "—"}`}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2.5">
                                                            <Icon icon={Package01Icon} size={16} className="text-[#ffd428]" />
                                                            <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                                                                {companyParcels === undefined ? (activityData ? "0" : "…") : companyParcels.toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs font-semibold text-slate-400 leading-none ml-6">{tr("Company parcels · all time")}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-center">
                                                    <Badge className={cn(
                                                        "h-7 rounded-[var(--ds-radius-small)] px-3 text-xs font-semibold border-none",
                                                        owner.isActive ? "bg-[#ffd428] text-[#242a37]" : "bg-[#242a37] text-white"
                                                    )}>
                                                        {owner.isActive ? "ACTIVE" : "INACTIVE"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-right">
                                                    <DropdownMenu modal={false}>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" aria-label={tr("Actions for {fullName}", { fullName: owner.fullName })} className="size-10 rounded-[var(--ds-radius-small)] bg-slate-50 dark:bg-white/5 hover:bg-[#ffd428] dark:hover:bg-[#ffd428] hover:text-[#242a37] text-slate-400 transition-colors cursor-pointer" onClick={e => e.stopPropagation()}>
                                                                <Icon icon={MoreHorizontalIcon} size={20} />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-64 rounded-[var(--ds-radius-large)] bg-white dark:bg-[#242a37] border-slate-100 dark:border-white/5 p-2 shadow-[var(--ds-shadow-raised)] mt-2" onClick={e => e.stopPropagation()}>
                                                            <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold text-slate-400 mb-1">{tr("Owner Operations")}</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => handleViewOwner(owner)} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold focus:bg-[#ffd428] focus:text-[#242a37] cursor-pointer">
                                                                <Icon icon={ViewIcon} size={20} className="mr-3" />{tr("View Owner")}</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                        <PaginationControls
                            currentPage={pagination.currentPage}
                            totalPages={pagination.totalPages}
                            totalItems={pagination.totalItems}
                            itemsPerPage={pageSize}
                            onPageChange={setCurrentPage}
                            isLoading={isLoadingOwners}
                        />
                    </Card>
                </TabsContent>
            </Tabs>

            <BusOwnerRegistrationModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    refetchOwners()
                    toast({
                        title: tr("Owner registered"),
                        description: tr("The owner has been added."),
                    })
                }}
            />

            {selectedOwner && (() => {
                const companyId = ownerCompanyId(selectedOwner)
                return (
                    <OwnerViewModal
                        isOpen={isViewModalOpen}
                        onClose={() => {
                            setIsViewModalOpen(false)
                            setSelectedOwner(null)
                        }}
                        owner={selectedOwner}
                        companyName={(companyId && companyName(companyId)) || selectedOwner.companyName || selectedOwner.company?.name || "No company"}
                        activity={companyId ? activityData?.[companyId] : undefined}
                        isActivityLoading={isActivityPending}
                        periodParcels={!companyId ? 0
                            : overviewPeriod === "all" ? activityData?.[companyId]?.totalParcels
                            : periodData ? (periodData[companyId]?.totalParcels ?? 0) : undefined}
                        periodLabel={periodLabel}
                    />
                )
            })()}
        </div>
    )
}
