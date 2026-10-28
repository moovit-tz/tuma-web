"use client"
import { Icon } from "@/components/ui/icon"
import { cardValueClass } from "@/lib/card-text"
import { getCurrentUser } from "@/lib/auth"
import { useAccess } from "@/hooks/use-access"

import React, { useState, useCallback, useEffect, useMemo } from "react"
import type { User } from "@/types/user"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    getUsers,
    createUser,
    updateUser,
    getAllAgents, getAllAgentsWithCounts,
} from "@/lib/services/user"
import { getCompanies } from "@/lib/services/company"
import { getRegions, getBookingOffices } from "@/lib/services/location"
import { getAgentsPeriodMetrics, overviewRange, type OverviewPeriod } from "@/lib/services/parcel"
import { Skeleton } from "@/components/ui/skeleton"
import { AgentModal } from "@/components/modals/agent-modal"
import { AgentViewModal } from "@/components/modals/agent-view-modal"
import { AgentEditModal } from "@/components/modals/agent-edit-modal"
import { useDebounce } from "@/hooks/use-debounce"
import {
    Add01Icon,
    Search01Icon,
    
    PencilEdit01Icon,
    Delete02Icon,
    MoreHorizontalIcon,
    UserGroupIcon,
    ViewIcon,
    ArrowUpRight01Icon,
    ArrowLeft01Icon,
    ArrowRight01Icon,
    FilterIcon,
    GridViewIcon,
    ListViewIcon,
    Chart01Icon,
    PieChart01Icon,
    Package01Icon,
    Clock01Icon,
    UserAdd01Icon,
    Activity01Icon,
    ChampionIcon,
    Cancel01Icon,
    Sad01Icon,
    Building03Icon,
    Money01Icon,
    Shield01Icon,
    CrownIcon,
    Alert01Icon,
    FireIcon,
    DangerIcon,
    CheckListIcon,
    ArrowDown01Icon,
    Medal01Icon,
    ChartLineData03Icon,
    PercentCircleIcon,
} from "@hugeicons/core-free-icons"
import { motion, AnimatePresence } from "framer-motion"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { format, subDays, eachDayOfInterval, differenceInCalendarDays } from "date-fns"
import { cn } from "@/lib/utils"
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
} from "recharts"
import { useSearchLanding } from "@/hooks/use-search-landing"
import { getUser } from "@/lib/services/user"
import { useTr } from "@/lib/i18n/portal"
import { ExportMenu } from "@/components/export/export-menu"

// ─── Brand Colors ────────────────────────────────────────────────────────────
const BRAND_COLORS = {
    primary:  "#ffd428",
    success:  "#10b981",
    warning:  "#f97316",
    danger:   "#ef4444",
    info:     "#3b82f6",
    purple:   "#8b5cf6",
    teal:     "#14b8a6",
    pink:     "#ec4899",
    amber:    "#f59e0b",
    gray:     "#6b7280",
}

// ─── Score helpers ────────────────────────────────────────────────────────────
// Parcels booked in the overview period when known (`volume`), otherwise
// the backend's all-time receivedParcels (e.g. registry rows).
const agentVolume = (a: User) => (a as any).volume ?? a.parcelCounts?.receivedParcels ?? 0

function agentDormancyLabel(agent: { inactiveDays: number | null; allTimeParcels?: number }) {
    if ((agent.allTimeParcels ?? 0) === 0) return "No parcels yet"
    if (agent.inactiveDays === null) return "No parcels in 30+ days"
    return `No parcels for ${agent.inactiveDays} days`
}


function getRoleStyle(role: string) {
    const map: Record<string, string> = {
        SUPER_AGENT: "bg-purple-500/10 text-purple-600",
        AGENT:       "bg-blue-500/10 text-blue-600",
        TRIP_AGENT:  "bg-emerald-500/10 text-emerald-600",
    }
    return map[role] || "bg-slate-500/10 text-slate-500"
}

function formatRole(role: string) {
    return role.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
}

function getInitials(name: string) {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

// ─── Pagination Component ─────────────────────────────────────────────────────
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
    const endItem   = Math.min(currentPage * itemsPerPage, totalItems)

    const getPageNumbers = () => {
        const delta = 2
        const range: (number | string)[] = []
        const rangeWithDots: (number | string)[] = []
        for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
            range.push(i)
        }
        if (currentPage - delta > 2) rangeWithDots.push(1, "...")
        else rangeWithDots.push(1)
        rangeWithDots.push(...range)
        if (currentPage + delta < totalPages - 1) rangeWithDots.push("...", totalPages)
        else if (totalPages > 1) rangeWithDots.push(totalPages)
        return rangeWithDots
    }

    if (totalPages <= 1) return null

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-8 py-4 bg-white dark:bg-[#1a1f2b] border-t border-slate-100 dark:border-white/5">
            <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="text-xs font-semibold text-slate-400">{tr("Displaying")}{" "}<span className="text-slate-900 dark:text-white px-1.5">{startItem} – {endItem}</span>{tr("of")}{" "}<span className="text-slate-900 dark:text-white px-1.5">{totalItems}</span>{" "}{tr("Agents")}</div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400">{tr("View Capacity:")}</span>
                    <Select
                        value={itemsPerPage.toString()}
                        onValueChange={v => { onPageSizeChange?.(parseInt(v)); onPageChange(1) }}
                        disabled={isLoading}
                    >
                        <SelectTrigger className="w-20 h-9 bg-slate-50 dark:bg-black/20 border-slate-100 dark:border-white/5 rounded-[var(--ds-radius-small)] text-xs font-semibold outline-none focus:ring-1 focus:ring-[#ffd428]/50">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-[var(--ds-radius-small)] bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/5">
                            {[5,10,20,50].map(n => <SelectItem key={n} value={n.toString()}>{String(n).padStart(2,"0")}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost" size="icon"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || isLoading}
                    className="h-9 w-9 bg-slate-50 dark:bg-white/5 hover:bg-[#ffd428] dark:hover:bg-[#ffd428] hover:text-[#242a37] text-slate-600 dark:text-white rounded-[var(--ds-radius-small)] transition-colors"
                >
                    <Icon icon={ArrowLeft01Icon} size={20} />
                </Button>
                <div className="flex items-center gap-1">
                    {getPageNumbers().map((p, i) => (
                        <React.Fragment key={i}>
                            {p === "..." ? (
                                <span className="px-2 text-slate-300 font-semibold">...</span>
                            ) : (
                                <Button
                                    variant="ghost"
                                    onClick={() => onPageChange(p as number)}
                                    disabled={isLoading}
                                    className={cn(
                                        "h-9 min-w-[36px] px-2 rounded-[var(--ds-radius-small)] text-xs font-semibold transition-all",
                                        currentPage === p
                                            ? "bg-[#ffd428] text-[#242a37] shadow-[var(--ds-shadow-raised)]"
                                            : "bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                                    )}
                                >{p}</Button>
                            )}
                        </React.Fragment>
                    ))}
                </div>
                <Button
                    variant="ghost" size="icon"
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AgentsPage() {
    const tr = useTr()
    const queryClient = useQueryClient()
    // Owners can view agents but not add or edit them (agents.manage)
    const { can, role } = useAccess()
    const canManageAgents = can("agents.manage")
    // Owners only see their own company (the API scopes it), so no company filter
    const isOwner = role === "OWNER"
    const router      = useRouter()

    useEffect(() => { document.title = "MySafari Parcel | Agents" }, [])

    const searchParams = useSearchParams()
    const params       = useParams()
    const locale       = params.locale as string

    // ── UI State ──────────────────────────────────────────────────────────────
    const [searchQuery,  setSearchQuery]  = useState("")
    const [currentPage,  setCurrentPage]  = useState(1)
    const [pageSize,     setPageSize]     = useState(10)
    const [roleFilter,   setRoleFilter]   = useState("all")
    const [companyFilter,setCompanyFilter]= useState("all")
    // Owners: pin the lists to their own company (the API scopes it too)
    useEffect(() => {
        if (!isOwner) return
        const companyId = (getCurrentUser() as any)?.companyId
        if (companyId) setCompanyFilter(String(companyId))
    }, [isOwner])
    const [statusFilter, setStatusFilter] = useState("all")
    const [activeTab,    setActiveTab]    = useState("overview")
    const viewMode = "list" as const
    const [chartView,    setChartView]    = useState<"bar" | "area">("bar")

    // Intelligence thresholds (adjustable sliders)
    const [thresholds, setThresholds] = useState({
        eliteVolume:    80,
        quietInactivity:14,
        riskScore:      30,
        newAgentDays:   30,
    })

    // Modal state
    const [isAddModalOpen,  setIsAddModalOpen]  = useState(false)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [selectedAgent,   setSelectedAgent]   = useState<User | null>(null)

    // Intelligence panel sheets
    const [showPortfolioSheet,  setShowPortfolioSheet]  = useState(false)
    const [showAuditSheet,      setShowAuditSheet]      = useState(false)
    const [showInactiveSheet,   setShowInactiveSheet]   = useState(false)
    const [showNewAgentsSheet,  setShowNewAgentsSheet]  = useState(false)

    // Sync from URL
    useEffect(() => {
        const page    = searchParams.get("page")
        const search  = searchParams.get("search")
        const role    = searchParams.get("role")
        const company = searchParams.get("company")
        const status  = searchParams.get("status")
        if (page)    setCurrentPage(parseInt(page))
        if (search)  setSearchQuery(search)
        if (role)    setRoleFilter(role)
        if (company) setCompanyFilter(company)
        if (status)  setStatusFilter(status)
    }, [searchParams])

    const debouncedSearch = useDebounce(searchQuery, 300)

    // Update URL on filter change
    const updateURL = useCallback(() => {
        const p = new URLSearchParams()
        if (currentPage > 1)    p.set("page",   currentPage.toString())
        if (debouncedSearch)    p.set("search", debouncedSearch)
        if (roleFilter    !== "all") p.set("role",    roleFilter)
        if (companyFilter !== "all") p.set("company", companyFilter)
        if (statusFilter  !== "all") p.set("status",  statusFilter)
        const newUrl  = p.toString() ? `?${p.toString()}` : ""
        const fullUrl = `${window.location.pathname}${newUrl}`
        if (newUrl !== window.location.search) router.push(fullUrl, { scroll: false })
    }, [currentPage, debouncedSearch, roleFilter, companyFilter, statusFilter, router, locale])

    useEffect(() => { updateURL() }, [updateURL])

    // Reset page when filters change
    useEffect(() => { if (currentPage !== 1) setCurrentPage(1) }, [debouncedSearch, roleFilter, companyFilter, statusFilter])

    // ── Queries ───────────────────────────────────────────────────────────────
    // All Infrastructure Data (Companies, Regions, Offices)
    const { data: infrastructureData } = useQuery({
        queryKey: ["agents-page-infrastructure"],
        queryFn: async () => {
            const [compRes, regRes, offRes] = await Promise.allSettled([
                getCompanies({ all: true, limit: 1000 }),
                getRegions({ paginate: false, limit: 1000 }),
                getBookingOffices({ paginate: false, limit: 1000 })
            ]);

            const companies = compRes.status === 'fulfilled' ? (compRes.value.data || (compRes.value as any).companies || compRes.value || []) : [];
            const regions = regRes.status === 'fulfilled' ? (regRes.value.data || (regRes.value as any).regions || regRes.value || []) : [];
            const offices = offRes.status === 'fulfilled' ? (offRes.value.data || (offRes.value as any).bookingOffices || (offRes.value as any).offices || offRes.value || []) : [];

            return { companies, regions, offices };
        },
        staleTime: 1000 * 60 * 10,
    })

    const companies = useMemo(() => Array.isArray(infrastructureData?.companies) ? infrastructureData!.companies : [], [infrastructureData])
    const regions = useMemo(() => Array.isArray(infrastructureData?.regions) ? infrastructureData!.regions : [], [infrastructureData])
    const offices = useMemo(() => Array.isArray(infrastructureData?.offices) ? infrastructureData!.offices : [], [infrastructureData])
    
    // Mapped Companies for Dropdowns (to match modals)
    const mappedCompanies = useMemo(() => {
        return companies.map(c => {
            const region = regions.find((r: any) => r.id === (c as any).regionId || r.id === (c as any).registrationRegionId);
            const office = offices.find((o: any) => o.id === (c as any).bookingOfficeId || o.id === (c as any).primaryOfficeId);
            return {
                ...c,
                displayName: `${c.name} [${region?.name || '---'} · ${office?.name || '---'}]`
            };
        });
    }, [companies, regions, offices]);

    // All agents (no pagination) — for analytics / overview
    const { data: allAgentsData } = useQuery({
        queryKey: ["all-agents-analytics"],
        queryFn: async () => {
            try {
                const withCounts = await getAllAgentsWithCounts()
                if (withCounts.length) return withCounts
                const res = await getAllAgents()
                return Array.isArray(res) ? res : Array.isArray((res as any)?.data) ? (res as any).data : []
            } catch {
                return []
            }
        },
        staleTime: 1000 * 60 * 10,
    })
    const allAgents: User[] = useMemo(() => allAgentsData ?? [], [allAgentsData])

    // ─── Overview period ───
    // Same windows and server-side data as the Companies overview: volume per
    // booking agent for the period, read once from the parcel list and cached.
    const OVERVIEW_PERIOD_OPTIONS = [
        { value: "today", label: tr("Today") },
        { value: "7d", label: tr("Last 7 Days") },
        { value: "30d", label: tr("Last 30 Days") },
        { value: "all", label: tr("All Time") },
    ] as const
    const [overviewPeriod, setOverviewPeriod] = useState<OverviewPeriod>("today")
    const periodLabel = OVERVIEW_PERIOD_OPTIONS.find((o) => o.value === overviewPeriod)?.label ?? "Today"

    const { data: periodData, isError: isPeriodError, refetch: refetchPeriod } = useQuery({
        queryKey: ["agents-period-metrics", overviewPeriod],
        queryFn: ({ signal }) => getAgentsPeriodMetrics(overviewRange(overviewPeriod), { signal }),
        enabled: overviewPeriod !== "all",
        staleTime: 1000 * 60 * 10,
        retry: 1,
    })

    // Last parcel per agent within 30 days (drives Dormant Agents). Agents
    // not in it have no parcel for 30+ days — no per-agent lookups needed.
    const { data: recentActivity, isPending: isRecentActivityPending } = useQuery({
        queryKey: ["agents-period-metrics", "30d"],
        queryFn: ({ signal }) => getAgentsPeriodMetrics(overviewRange("30d"), { signal }),
        staleTime: 1000 * 60 * 10,
        retry: 1,
    })

    // Enriched agents: `volume` is parcels booked in the selected period
    // (all-time: the backend's receivedParcels), lastActivityAt the newest
    // parcel within 30 days. parcelCounts stays the backend's all-time counts.
    const enrichedAgents = useMemo(() => {
        return allAgents.map(a => {
            const allTime = a.parcelCounts?.receivedParcels ?? 0
            const volume = overviewPeriod === "all" ? allTime : (periodData?.[a.id]?.totalParcels ?? 0)
            const last = recentActivity?.[a.id]?.lastActivityDate ?? null
            return {
                ...a,
                volume,
                allTimeParcels: allTime,
                lastActivityAt: last,
                // Calendar days since the last parcel; null = none in 30 days
                lastActivityDays: last ? Math.max(0, differenceInCalendarDays(new Date(), new Date(last))) : null,
            }
        })
    }, [allAgents, overviewPeriod, periodData, recentActivity])
    // Report: every agent matching the list's filters (not just this page)
    const reportAgents = useMemo(() => {
        const q = debouncedSearch.trim().toLowerCase()
        return enrichedAgents.filter((a: any) => {
            if (q && ![a.fullName, a.username, a.email, a.phoneNumber].filter(Boolean).some((f: string) => f.toLowerCase().includes(q))) return false
            if (roleFilter !== "all" && a.role !== roleFilter) return false
            if (companyFilter !== "all" && String(a.company?.id) !== companyFilter) return false
            if (statusFilter !== "all" && a.isActive !== (statusFilter === "active")) return false
            return true
        })
    }, [enrichedAgents, debouncedSearch, roleFilter, companyFilter, statusFilter])
    // The filtered company's name, for the report title
    const reportCompany = companyFilter !== "all" ? (reportAgents[0]?.company?.name ?? null) : null
    const isOverviewLoading = !allAgentsData || (overviewPeriod !== "all" && !periodData && !isPeriodError)

    // Paginated agents for registry tab
    const {
        data: agentsResponse,
        isLoading: isLoadingAgents,
        isFetching: isFetchingAgents,
        refetch: refetchAgents,
    } = useQuery({
        queryKey: ["agents", currentPage, pageSize, debouncedSearch, roleFilter, companyFilter, statusFilter],
        queryFn: async () => {
            if (debouncedSearch.trim()) {
                // Client-side search over all agents
                const searchTerm = debouncedSearch.trim().toLowerCase()
                const filtered = allAgents.filter(a =>
                    [a.fullName, a.username, a.email, a.phoneNumber]
                        .filter(Boolean)
                        .some(f => f!.toLowerCase().includes(searchTerm))
                ).filter(a => {
                    if (roleFilter    !== "all" && a.role    !== roleFilter) return false
                    if (companyFilter !== "all" && String(a.company?.id) !== companyFilter) return false
                    if (statusFilter  !== "all" && a.isActive !== (statusFilter === "active")) return false
                    return true
                })
                const start     = (currentPage - 1) * pageSize
                const paginated = filtered.slice(start, start + pageSize)
                return {
                    data: paginated,
                    pagination: {
                        currentPage,
                        totalPages: Math.ceil(filtered.length / pageSize) || 1,
                        totalItems: filtered.length,
                        perPage:    pageSize,
                    },
                }
            }
            return getUsers({
                page:      currentPage,
                per_page:  pageSize,
                role:      roleFilter    !== "all" ? roleFilter    : undefined,
                company_id: companyFilter !== "all" ? Number(companyFilter) : undefined,
                is_active: statusFilter  !== "all" ? (statusFilter === "active") : undefined,
                paginate:  true
            })
        },
        staleTime: 1000 * 60 * 5,

    })

    const agents: User[] = useMemo(() => {
        const raw = (agentsResponse as any)?.data
        return Array.isArray(raw) ? raw : []
    }, [agentsResponse])

    const pagination = useMemo(() => {
        const p = (agentsResponse as any)?.pagination
        return {
            currentPage: p?.currentPage || 1,
            totalPages:  p?.totalPages  || 1,
            totalItems:  p?.totalItems  || 0,
            perPage:     pageSize,
        }
    }, [agentsResponse, pageSize])

    // ── Analytics (computed from allAgents) ───────────────────────────────────
    const analytics = useMemo(() => {
        if (!enrichedAgents.length) return null

        // Ranked by parcels booked in the selected period (`volume`). There is
        // no composite score: the old one gave points for simply being active.
        const scored = enrichedAgents
            .map(a => ({ agent: a, parcels: agentVolume(a) }))
            .sort((a, b) => b.parcels - a.parcels)

        const totalParcels = enrichedAgents.reduce((s, a) =>
            s + ((a as any)?.volume ?? 0), 0)

        // Top: most parcels this period. Low activity: active agents who do
        // book parcels (all-time > 0) but booked the fewest this period.
        const topPerforming    = scored.filter(s => s.parcels > 0)
        const underperforming  = scored
            .filter(s => s.agent.isActive && s.agent.allTimeParcels > 0)
            .sort((a, b) => a.parcels - b.parcels || b.agent.allTimeParcels - a.agent.allTimeParcels)
        const top5             = topPerforming.slice(0, 5)
        const bottom5          = underperforming.slice(0, 5)

        // Dormant: no parcel for quietInactivity+ days. lastActivityDays is
        // null when there's none in the last 30 days (shown as "30+ days");
        // agents who never booked a parcel are listed last.
        const quietAgents = (recentActivity ? enrichedAgents : [])
            .filter(a => a.lastActivityDays === null || a.lastActivityDays >= thresholds.quietInactivity)
            .map(a => ({ ...a, inactiveDays: a.lastActivityDays }))
            .sort((a, b) =>
                (a.allTimeParcels === 0 ? 1 : 0) - (b.allTimeParcels === 0 ? 1 : 0) ||
                (a.inactiveDays === null ? 0 : 1) - (b.inactiveDays === null ? 0 : 1) ||
                (b.inactiveDays ?? 0) - (a.inactiveDays ?? 0) ||
                b.allTimeParcels - a.allTimeParcels)

        // Active agents with history but no parcels this period
        const atRisk = underperforming.filter(s => s.parcels === 0).map(s => s.agent)

        // Float stats
        const withFloat = enrichedAgents.filter(a => a.floatAccountNumber || a.isUsingFloat)

        // New agents (joined within newAgentDays)
        const recentAgents = enrichedAgents
            .filter(a => a.createdAt && differenceInCalendarDays(new Date(), new Date(a.createdAt)) <= thresholds.newAgentDays)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        // Activity breakdown for the pie (selected period)
        const bookingCount = enrichedAgents.filter(a => a.isActive && agentVolume(a) > 0).length
        const quietCount   = enrichedAgents.filter(a => a.isActive && agentVolume(a) === 0 && a.allTimeParcels > 0).length
        const neverCount   = enrichedAgents.filter(a => a.isActive && a.allTimeParcels === 0).length
        const inactiveCount = enrichedAgents.filter(a => !a.isActive).length

        // Bar chart data (top 5 by parcels)
        // Booked only: the backend's deliveredParcels needs a recorded
        // deliverer, which almost no parcel has, so it reads as 0.
        const activityData = top5.map(({ agent, parcels }) => ({
            name:   agent.fullName.split(" ")[0],
            booked: parcels,
        }))

        // Registration trend (30 days)
        const trendData = eachDayOfInterval({ start: subDays(new Date(), 30), end: new Date() }).map(date => ({
            date:   format(date, "MMM dd"),
            agents: enrichedAgents.filter(a => format(new Date(a.createdAt), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")).length,
        }))

        // Company breakdown
        const companyMap = new Map<string, { name: string; total: number; parcels: number }>()
        enrichedAgents.forEach(a => {
            const k = a.company?.name || "Freelance"
            const e = companyMap.get(k) || { name: k, total: 0, parcels: 0 }
            e.total++
            e.parcels += agentVolume(a)
            companyMap.set(k, e)
        })
        const companyInsights = Array.from(companyMap.values()).sort((a, b) => b.parcels - a.parcels)

        const topByVolume   = topPerforming[0] ?? null
        const topByScore    = topByVolume

        // Most registered agents
        const workforceTitan = [...companyInsights].filter(c => c.name !== "Freelance").sort((a, b) => b.total - a.total)[0]
        const newThisMonth  = recentAgents.length

        return {
            scored, topPerforming, underperforming, top5, bottom5,
            quietAgents, atRisk, withFloat,
            recentAgents, activityData, trendData, companyInsights,
            totalParcels, atRiskCount: atRisk.length,
            floatCount: withFloat.length, totalAgents: enrichedAgents.length,
            activeCount: enrichedAgents.filter(a => a.isActive).length,
            avgParcels: enrichedAgents.length ? Math.round(totalParcels / enrichedAgents.length) : 0,
            floatPct: enrichedAgents.length ? Math.round((withFloat.length / enrichedAgents.length) * 100) : 0,
            bookingCount, quietCount, neverCount, inactiveCount,
            topByScore, topByVolume, workforceTitan, newThisMonth,
        }
    }, [enrichedAgents, recentActivity, thresholds])

    // Pie data
    const scorePieData = useMemo(() => analytics ? [
        { name: "Booked parcels",   value: analytics.bookingCount,  fill: BRAND_COLORS.success },
        { name: "Quiet this period", value: analytics.quietCount,   fill: BRAND_COLORS.amber },
        { name: "Never booked",     value: analytics.neverCount,    fill: BRAND_COLORS.gray },
        { name: "Inactive account", value: analytics.inactiveCount, fill: BRAND_COLORS.danger },
    ] : [], [analytics])

    // ── Mutations ─────────────────────────────────────────────────────────────
    const createMutation = useMutation({
        mutationFn: createUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["agents"] })
            queryClient.invalidateQueries({ queryKey: ["all-agents-analytics"] })
            toast({ title: tr("Success"), description: tr("Agent enlisted successfully"), variant: "success" })
            setIsAddModalOpen(false)
        },
        onError: (err: any) => toast({ title: tr("Error"), description: err.message, variant: "destructive" }),
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => updateUser(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["agents"] })
            queryClient.invalidateQueries({ queryKey: ["all-agents-analytics"] })
            toast({ title: tr("Success"), description: tr("Agent updated successfully"), variant: "success" })
            setIsEditModalOpen(false)
        },
        onError: (err: any) => toast({ title: tr("Error"), description: err.message, variant: "destructive" }),
    })

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleView = (agent: User) => { setSelectedAgent(agent); setIsViewModalOpen(true) }
    const handleEdit = (agent: User) => { setSelectedAgent(agent); setIsEditModalOpen(true) }

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value)
        if (e.target.value.trim() && activeTab !== "all-agents") setActiveTab("all-agents")
    }

    // ── Render ────────────────────────────────────────────────────────────────
    // Opened from the portal search: fill the search and open the result
    useSearchLanding({ setSearch: setSearchQuery, showList: () => setActiveTab("all-agents"), items: agents, ready: !isLoadingAgents, onOpen: handleView, fetchOne: (id) => getUser(Number(id)) as any })

    return (
        <div className="space-y-10 animate-in fade-in duration-300">

            {/* ── Top Bar ── */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 justify-between">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 flex-1 min-w-0">
                    {/* Search */}
                    <div className="relative group flex-1 min-w-0 lg:min-w-[16rem]">
                        <Icon icon={Search01Icon} size={20}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ffd428] transition-colors"
                        />
                        <Input
                            placeholder={tr("Search agents")}
                            value={searchQuery}
                            onChange={handleSearch}
                            className="h-10 pl-10 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-normal placeholder:text-slate-400 focus:ring-1 focus:ring-[#ffd428]/50 shadow-none w-full"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Role */}
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-full sm:w-40 h-10 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-medium shadow-none outline-none focus:ring-1 focus:ring-[#ffd428]/50">
                                <div className="flex items-center gap-2">
                                    <Icon icon={Shield01Icon} size={16} className="shrink-0 text-slate-500 dark:text-slate-400" />
                                    <SelectValue placeholder="ROLE" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)]">
                                <SelectItem value="all"         className="text-sm">{tr("All roles")}</SelectItem>
                                <SelectItem value="SUPER_AGENT" className="text-sm">{tr("Super agent")}</SelectItem>
                                <SelectItem value="AGENT"       className="text-sm">{tr("Field agent")}</SelectItem>
                                <SelectItem value="TRIP_AGENT"  className="text-sm">{tr("Trip operator")}</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Company */}
                        {!isOwner && (
                        <Select value={companyFilter} onValueChange={setCompanyFilter}>
                            <SelectTrigger className="w-full sm:w-56 h-10 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-medium shadow-none outline-none focus:ring-1 focus:ring-[#ffd428]/50">
                                <div className="flex items-center gap-2">
                                    <Icon icon={Building03Icon} size={16} className="shrink-0 text-slate-500 dark:text-slate-400" />
                                    <SelectValue placeholder="COMPANY" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] max-h-[400px]">
                                <SelectItem value="all" className="text-sm">{tr("All companies")}</SelectItem>
                                {mappedCompanies.map((c: any) => (
                                    <SelectItem key={c.id} value={String(c.id)} className="text-xs font-semibold py-3">
                                        <div className="flex flex-col gap-0.5">
                                            <span>{c.name}</span>
                                            <span className="text-xs opacity-40 font-mono">
                                                {regions.find((r: any) => r.id === c.regionId || r.id === c.registrationRegionId)?.name || 'GLOBAL'}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        )}

                        {/* Status */}
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

                <div className="flex items-center gap-3">
                    <ExportMenu
                        filename={reportCompany ? `agents-${reportCompany.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : "agents"}
                        // One company's agents: name it in the title and leave the Company column out
                        title={reportCompany ? tr("Agents · {name}", { name: reportCompany }) : tr("Agents report")}
                        subtitle={[
                            tr("Parcels: {periodLabel}", { periodLabel: tr(periodLabel) }),
                            roleFilter !== "all" && String(roleFilter).replace("_", " ").toLowerCase(),
                            statusFilter !== "all" && (statusFilter === "active" ? tr("Active") : tr("Inactive")),
                            debouncedSearch.trim() && tr("Search: \"{searchQuery}\"", { searchQuery: debouncedSearch.trim() }),
                        ].filter(Boolean).join(" · ")}
                        rows={reportAgents}
                        columns={([
                            [tr("Agent"), (a: any) => a.fullName || a.username],
                            [tr("Username"), (a: any) => a.username ?? ""],
                            [tr("Phone"), (a: any) => a.phoneNumber ?? ""],
                            [tr("Role"), (a: any) => String(a.role ?? "").replace("_", " ").toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase())],
                            ...(reportCompany ? [] : [[tr("Company"), (a: any) => a.company?.name ?? ""]]),
                            [tr("Status"), (a: any) => (a.isActive ? tr("Active") : tr("Inactive"))],
                            [tr("Parcels ({periodLabel})", { periodLabel: tr(periodLabel) }), (a: any) => a.volume ?? 0],
                            [tr("All-time parcels"), (a: any) => a.allTimeParcels ?? 0],
                            [tr("Last parcel"), (a: any) => (a.lastActivityAt ? format(new Date(a.lastActivityAt), "d MMM yyyy") : "")],
                            [tr("Joined"), (a: any) => (a.createdAt ? format(new Date(a.createdAt), "d MMM yyyy") : "")],
                        ]) as [string, (a: any) => unknown][]}
                        summary={(rows: any[]) => [
                            [tr("Agents"), rows.length.toLocaleString()],
                            [tr("Active"), rows.filter((a) => a.isActive).length.toLocaleString()],
                            [tr("Parcels ({periodLabel})", { periodLabel: tr(periodLabel) }), rows.reduce((s, a) => s + (a.volume ?? 0), 0).toLocaleString()],
                            [tr("All-time parcels"), rows.reduce((s, a) => s + (a.allTimeParcels ?? 0), 0).toLocaleString()],
                        ]}
                    />
                    {canManageAgents && (
                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="h-10 px-5 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-small)] font-semibold text-sm shadow-[var(--ds-shadow-raised)] transition-colors flex items-center gap-3 cursor-pointer"
                    >
                        <Icon icon={Add01Icon} size={20} />{tr("Add Agent")}</Button>
                    )}
                </div>
            </div>

            {/* ── Tabs ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <div className="portal-sticky-wrap flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <TabsList className="portal-sticky-tabs bg-slate-100 dark:bg-black/20 p-1.5 rounded-[var(--ds-radius-small)] w-full items-stretch h-auto">
                        <TabsTrigger value="overview"
                            className="flex-1 h-11 rounded-[var(--ds-radius-large)] text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-[#242a37] data-[state=active]:shadow-[var(--ds-shadow-raised)] transition-all cursor-pointer"
                        >
                            <Icon icon={Chart01Icon} size={18} className="mr-2" />{tr("Overview")}</TabsTrigger>
                        <TabsTrigger value="all-agents"
                            className="flex-1 h-11 rounded-[var(--ds-radius-large)] text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-[#242a37] data-[state=active]:shadow-[var(--ds-shadow-raised)] transition-all gap-3 cursor-pointer"
                        >
                            <div className="flex items-center gap-2">
                                <Icon icon={UserGroupIcon} size={18} />{tr("All Agents")}</div>
                            <Badge className="bg-[#ffd428] text-[#242a37] border-none text-xs font-semibold h-6 min-w-10 flex items-center justify-center rounded-[var(--ds-radius-small)]">
                                {pagination.totalItems || analytics?.totalAgents || 0}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>

                </div>

                {/* ════════════════ OVERVIEW TAB ════════════════ */}
                <TabsContent value="overview" className="space-y-10 focus:outline-none outline-none">

                    {/* Period filter — same windows as the Companies overview */}
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <h2 className="text-lg font-semibold text-[#242a37] dark:text-white">{tr("Performance")}</h2>
                            <p className="text-xs font-bold text-slate-400 mt-1">{tr("Parcels booked by each agent in the selected period")}</p>
                            {isPeriodError && overviewPeriod !== "all" && (
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
                                    aria-pressed={overviewPeriod === option.value}
                                    className={cn(
                                        "h-9 px-4 rounded-[var(--ds-radius-small)] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap",
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

                    {/* Command Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                label: tr("Top Performer"),
                                value: isOverviewLoading ? "Loading…" : (analytics?.topByScore?.agent?.fullName ?? "No parcels"),
                                icon: CrownIcon,
                                sub: tr("{v} parcels · {periodLabel}", { v: (analytics?.topByScore?.parcels ?? 0).toLocaleString(), periodLabel }),
                                badge: analytics?.topByScore ? `#${String(analytics.topByScore.agent.id).padStart(3,"0")}` : null,
                            },
                            {
                                label: tr("Agents Booking"),
                                value: isOverviewLoading ? "Loading…" : `${analytics?.bookingCount ?? 0} / ${analytics?.activeCount ?? 0}`,
                                icon: FireIcon,
                                sub: tr("Active agents with parcels · {periodLabel}", { periodLabel }),
                                badge: null,
                            },
                            {
                                label: tr("New Agents"),
                                value: analytics?.newThisMonth ?? 0,
                                icon: UserAdd01Icon,
                                sub: tr("Joined in the last {newAgentDays} days", { newAgentDays: thresholds.newAgentDays }),
                                badge: null,
                            },
                            {
                                label: tr("Largest Workforce"),
                                value: analytics?.workforceTitan?.name ?? "---",
                                icon: UserGroupIcon,
                                sub: tr("{total} Registered Agents", { total: analytics?.workforceTitan?.total ?? 0 }),
                                badge: analytics?.workforceTitan ? "RANK #1" : null,
                            },
                        ].map((card, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="h-full">
                                <Card className="rounded-[var(--ds-radius-large)] border-none h-full transition-all duration-300 overflow-hidden relative group shadow-[var(--ds-shadow-raised)] bg-[#242a37]">
                                    <div className="absolute right-[-15px] bottom-[-15px] opacity-[0.05] text-[#ffd428] pointer-events-none transform rotate-12 transition-transform">
                                        <Icon icon={card.icon} size={100} />
                                    </div>
                                    <CardContent className="p-6 relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="size-10 rounded-[var(--ds-radius-small)] flex items-center justify-center bg-white/5">
                                                <Icon icon={card.icon} className="size-5 text-[#ffd428]" />
                                            </div>
                                            {card.badge && (
                                                <Badge className="text-xs font-semibold bg-[#ffd428] text-[#242a37] border-none">
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
                        {/* Top Performers */}
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden group">
                            <CardHeader className="relative py-8 px-6 overflow-hidden bg-[#242a37] text-white border-none rounded-t-[var(--ds-radius-small)]">
                                <div className="absolute inset-0 bg-amber-500/10 opacity-30" />
                                <div className="absolute right-[-20px] top-[-20px] opacity-[0.1] text-amber-500 pointer-events-none transform transition-transform duration-300">
                                    <Icon icon={Medal01Icon} size={180} />
                                </div>
                                <div className="relative z-10 flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                            <Icon icon={Medal01Icon} className="text-amber-500" size={24} />{tr("Top Performing Agents")}</CardTitle>
                                        <CardDescription className="text-xs font-bold text-white/40 mt-1">{tr("Ranked by parcels booked · {periodLabel}", { periodLabel })}</CardDescription>
                                    </div>
                                    <Badge className="bg-amber-500 text-white border-none text-xs font-semibold px-5 py-2 rounded-full shadow-[var(--ds-shadow-raised)]">TOP</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-50 dark:divide-white/5">
                                    {!analytics ? (
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
                                    ) : analytics.top5.length === 0 ? (
                                        <div className="p-6 text-center text-xs font-semibold text-slate-400">{tr("No parcels")}{" "}{periodLabel === "All Time" ? tr("yet") : periodLabel.toLowerCase()}</div>
                                    ) : analytics.top5.map(({ agent, parcels }, i) => {
                                        const total = parcels
                                        const pct   = analytics.totalParcels > 0 ? ((total / analytics.totalParcels) * 100).toFixed(2) : "0.00"
                                        return (
                                            <div key={`summary-agent-${agent.id}-${i}`} onClick={() => handleView(agent)}
                                                className="p-6 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors flex items-center justify-between group cursor-pointer"
                                            >
                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                    <div className={cn("size-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                                                        i === 0 ? "bg-[#ffd428] text-[#242a37]" : "bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:bg-[#ffd428] group-hover:text-[#242a37]"
                                                    )}>{i + 1}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{agent.fullName}</p>
                                                        <p className="text-xs font-bold text-amber-500 mt-1">{tr("{pct}% of network volume · {periodLabel}", { pct, periodLabel })}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right flex flex-col items-end gap-1 shrink-0 ml-4">
                                                    <p className="text-[13px] font-semibold leading-none mb-0.5 text-[#242a37] dark:text-white tabular-nums">{parcels.toLocaleString()}</p>
                                                    <p className="text-xs font-semibold text-slate-400">{tr("Parcels")}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                            <div className="p-6 border-t border-slate-50 dark:border-white/5">
                                <Button onClick={() => setShowPortfolioSheet(true)} className="w-full h-11 bg-slate-50 dark:bg-white/5 hover:bg-[#ffd428] hover:text-[#242a37] text-slate-400 font-semibold text-xs rounded-[var(--ds-radius-small)] transition-colors group/btn cursor-pointer">{tr("View all top agents")}<Icon icon={ArrowUpRight01Icon} size={16} className="ml-2 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
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
                                            <Icon icon={Sad01Icon} className="text-rose-500" size={24} />{tr("Low Activity Agents")}</CardTitle>
                                        <CardDescription className="text-xs font-bold text-white/40 mt-1">{tr("Active agents with the fewest parcels · {periodLabel}", { periodLabel })}</CardDescription>
                                    </div>
                                    <Badge className="bg-rose-500 text-white border-none text-xs font-semibold px-5 py-2 rounded-full shadow-[var(--ds-shadow-raised)]">REVIEW</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-50 dark:divide-white/5">
                                    {!analytics ? (
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
                                    ) : analytics.bottom5.length === 0 ? (
                                        <div className="p-6 text-center">
                                            <Icon icon={CheckListIcon} size={32} className="text-emerald-500 mx-auto mb-3" />
                                            <p className="text-xs font-semibold text-slate-400">{tr("No active agents with parcel history")}</p>
                                        </div>
                                    ) : analytics.bottom5.map(({ agent, parcels }, i) => {
                                        const total = parcels
                                        return (
                                            <div key={`summary-agent-${agent.id}-${i}`} onClick={() => handleView(agent)}
                                                className="p-6 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors flex items-center justify-between group cursor-pointer"
                                            >
                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                    <div className="size-8 shrink-0 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400 group-hover:bg-rose-500 group-hover:text-white transition-colors">{i + 1}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{agent.fullName}</p>
                                                        <p className="text-xs font-bold text-rose-400 mt-1">
                                                            {total === 0
                                                                ? tr("No parcels {v}", { v: periodLabel === "All Time" ? "yet" : periodLabel.toLowerCase() })
                                                                : tr("{total} parcels · low volume", { total: total.toLocaleString() })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right flex flex-col items-end gap-1 shrink-0 ml-4">
                                                    <p className="text-[13px] font-semibold text-rose-500 leading-none mb-0.5 tabular-nums">{parcels.toLocaleString()}</p>
                                                    <p className="text-xs font-semibold text-slate-400">{tr("Parcels")}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                            <div className="p-6 border-t border-slate-50 dark:border-white/5">
                                <Button onClick={() => setShowAuditSheet(true)} className="w-full h-11 bg-rose-500/5 hover:bg-rose-500 text-rose-500 hover:text-white font-semibold text-xs rounded-[var(--ds-radius-small)] transition-colors group/btn cursor-pointer">{tr("View all low-activity agents")}<Icon icon={ArrowUpRight01Icon} size={16} className="ml-2 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {/* Chart Ecosystem */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Score Distribution Donut */}
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden flex flex-col group">
                            <CardHeader className="relative py-8 px-6 bg-[#242a37] text-white border-none rounded-t-[var(--ds-radius-small)]">
                                <div className="absolute inset-0 bg-teal-500/10 opacity-30" />
                                <div>
                                    <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                        <Icon icon={PieChart01Icon} className="text-teal-400" size={24} />{tr("Agent Activity")}</CardTitle>
                                    <CardDescription className="text-xs font-bold text-white/40 mt-1">{tr("What agents did · {periodLabel}", { periodLabel })}</CardDescription>
                                </div>
                            </CardHeader>
                            <div className="p-6 flex flex-col flex-1">
                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                    <div className="h-[200px] w-[200px] shrink-0 relative">
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                                            <p className="text-2xl font-bold text-[#242a37] dark:text-white leading-none">
                                                {analytics?.totalAgents ?? 0}
                                            </p>
                                            <p className="text-xs font-semibold text-slate-400 mt-1">{tr("Total Agents")}</p>
                                        </div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={scorePieData.length > 0 ? scorePieData : [{ name: "No Data", value: 1, fill: "#334155" }]}
                                                    innerRadius="65%" outerRadius="90%" paddingAngle={3} dataKey="value"
                                                    stroke="none" startAngle={90} endAngle={-270}
                                                >
                                                    {(scorePieData.length > 0 ? scorePieData : [{ name: "No Data", value: 1, fill: "#334155" }]).map((entry, i) => (
                                                        <Cell key={i} fill={entry.fill} className="focus:outline-none" />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip content={({ active, payload }) => {
                                                    if (!active || !payload?.length) return null
                                                    return (
                                                        <div className="bg-[#1a1f2b] text-white px-4 py-3 rounded-[var(--ds-radius-large)] border border-white/10 shadow-[var(--ds-shadow-raised)]">
                                                            <p className="text-xs font-semibold text-slate-400">{payload[0].name}</p>
                                                            <p className="text-xl font-semibold text-[#ffd428]">{payload[0].value}</p>
                                                        </div>
                                                    )
                                                }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex-1 space-y-3 min-w-0">
                                        {scorePieData.map((entry, i) => (
                                            <div key={i} className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.fill }} />
                                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">{entry.name}</span>
                                                </div>
                                                <span className="text-xs font-semibold text-[#242a37] dark:text-white shrink-0">{entry.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Activity Trends */}
                        <Card className="lg:col-span-2 rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden group">
                            <CardHeader className="relative py-8 px-6 bg-[#242a37] text-white border-none flex flex-row items-center justify-between">
                                <div className="absolute inset-0 bg-blue-500/10 opacity-30" />
                                <div className="relative z-10">
                                    <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                        <Icon icon={ChartLineData03Icon} className="text-blue-400" size={24} />{tr("Activity Trends")}</CardTitle>
                                    <CardDescription className="text-xs font-bold text-white/40 mt-1">
                                        {chartView === "bar" ? tr("Top 5 agents · parcels booked · {periodLabel}", { periodLabel }) : tr("Agent registrations over 30 days")}
                                    </CardDescription>
                                </div>
                                <div className="relative z-10 flex items-center gap-1 bg-white/5 rounded-[var(--ds-radius-small)] p-1">
                                    {(["bar", "area"] as const).map(v => (
                                        <button key={v} onClick={() => setChartView(v)}
                                            className={cn("px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-all",
                                                chartView === v ? "bg-[#ffd428] text-[#242a37]" : "text-white/40 hover:text-white"
                                            )}
                                        >{v === "bar" ? tr("Volume") : tr("Trend")}</button>
                                    ))}
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {chartView === "bar" ? (
                                            <BarChart data={analytics?.activityData ?? []} barGap={4} barCategoryGap="25%">
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.05)" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: "#94a3b8" }} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: "#94a3b8" }} />
                                                <RechartsTooltip content={({ active, payload, label }) => {
                                                    if (!active || !payload?.length) return null
                                                    return (
                                                        <div className="bg-[#242a37] text-white p-4 rounded-[var(--ds-radius-large)] border border-white/10 shadow-[var(--ds-shadow-raised)] space-y-1">
                                                            <p className="text-xs font-semibold text-slate-400">{label}</p>
                                                            {payload.map((p: any, i: number) => (
                                                                <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>{p.name}: {p.value}</p>
                                                            ))}
                                                        </div>
                                                    )
                                                }} />
                                                <Bar dataKey="booked" name="Parcels booked" fill="#ffd428" radius={[8,8,0,0]} />
                                            </BarChart>
                                        ) : (
                                            <AreaChart data={analytics?.trendData ?? []}>
                                                <defs>
                                                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%"  stopColor="#ffd428" stopOpacity={0.15} />
                                                        <stop offset="95%" stopColor="#ffd428" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.05)" />
                                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: "#94a3b8" }} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: "#94a3b8" }} />
                                                <RechartsTooltip content={({ active, payload, label }) => {
                                                    if (!active || !payload?.length) return null
                                                    return (
                                                        <div className="bg-[#242a37] text-white p-4 rounded-[var(--ds-radius-large)] border border-white/10 shadow-[var(--ds-shadow-raised)]">
                                                            <p className="text-xs font-semibold text-slate-400">{label}</p>
                                                            <p className="text-lg font-semibold">{payload[0].value} <span className="text-xs text-[#ffd428]">{tr("Agents")}</span></p>
                                                        </div>
                                                    )
                                                }} />
                                                <Area type="monotone" dataKey="agents" stroke="#ffd428" strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)" />
                                            </AreaChart>
                                        )}
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                            <div className="p-6 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {chartView === "bar" ? (
                                        <>
                                            <div className="flex items-center gap-2"><div className="size-2 rounded-full bg-[#ffd428]" /><span className="text-xs font-semibold text-slate-400">{tr("Parcels booked")}</span></div>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-2"><div className="size-2 rounded-full bg-[#ffd428]" /><span className="text-xs font-semibold text-slate-400">{tr("Registrations")}</span></div>
                                    )}
                                </div>
                                <Button variant="ghost" className="h-9 px-4 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">{tr("Export Data")}</Button>
                            </div>
                        </Card>
                    </div>


                    {/* Bottom: Quiet Agents + New Integrations */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Quiet Agents */}
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden group">
                            <CardHeader className="relative py-8 px-6 bg-[#242a37] text-white border-none rounded-t-[var(--ds-radius-small)]">
                                <div className="absolute inset-0 bg-[#ffd428]/20 opacity-30" />
                                <div className="absolute right-[-20px] top-[-20px] opacity-[0.1] text-[#ffd428] pointer-events-none transform transition-transform duration-300">
                                    <Icon icon={Clock01Icon} size={180} />
                                </div>
                                <div className="relative z-10 flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                                            <Icon icon={Clock01Icon} className="text-[#ffd428]" size={24} />{tr("Dormant Agents")}</CardTitle>
                                        <CardDescription className="text-xs font-bold text-white/40 mt-1">
                                            {tr("No parcels booked in {quietInactivity}+ days", { quietInactivity: thresholds.quietInactivity })}</CardDescription>
                                    </div>
                                    <Badge className="bg-[#ffd428] text-[#242a37] border-none text-xs font-semibold px-5 py-2 rounded-full shadow-[var(--ds-shadow-raised)]">MONITORING</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-50 dark:divide-white/5">
                                    {!analytics || isRecentActivityPending ? (
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
                                    ) : analytics.quietAgents.length === 0 ? (
                                        <p className="p-6 text-sm text-slate-400">{tr("Every agent booked a parcel in the last {quietInactivity} days.", { quietInactivity: thresholds.quietInactivity })}</p>
                                    ) : analytics.quietAgents.slice(0, 5).map((agent: any, i: number) => (
                                        <div key={`summary-agent-${agent.id}-${i}`} onClick={() => handleView(agent)}
                                            className="p-6 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors flex items-center justify-between group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="size-8 shrink-0 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400 group-hover:bg-[#ffd428] group-hover:text-[#242a37] transition-colors">{i + 1}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{agent.fullName}</p>
                                                    <p className="text-xs font-bold text-slate-400 mt-1">{agentDormancyLabel(agent)}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1 shrink-0 ml-4">
                                                <p className="text-[13px] font-semibold text-[#ffd428] leading-none mb-0.5">{agent.inactiveDays === null ? "30+d" : `${agent.inactiveDays}d`}</p>
                                                <p className="text-xs font-semibold text-slate-400">{tr("Since last parcel")}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                            <div className="p-6 border-t border-slate-50 dark:border-white/5">
                                <Button onClick={() => setShowInactiveSheet(true)} className="w-full h-11 bg-[#242a37] dark:bg-white/5 hover:bg-[#ffd428] hover:text-[#242a37] text-white font-semibold text-xs rounded-[var(--ds-radius-small)] transition-colors cursor-pointer">{tr("View More Inactive Agents")}</Button>
                            </div>
                        </Card>

                        {/* New Integrations */}
                        <Card className="rounded-[var(--ds-radius-large)] border-none bg-[#1a1f2b] text-white shadow-[var(--ds-shadow-raised)] p-0 relative overflow-hidden group flex flex-col">
                            <CardHeader className="p-6 bg-black/20 border-b border-white/5">
                                <CardTitle className="text-xl font-semibold flex items-center gap-3 text-[#ffd428]">
                                    <div className="size-3 rounded-full bg-[#ffd428] animate-pulse" />{tr("New Agents")}</CardTitle>
                                <CardDescription className="text-xs font-bold text-white/40 mt-2">
                                    {tr("Latest Added Agents ({newAgentDays} Day Window)", { newAgentDays: thresholds.newAgentDays })}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-white/5">
                                    {!analytics ? (
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
                                    ) : analytics.recentAgents.slice(0, 5).map((agent, i) => (
                                        <div key={`summary-agent-${agent.id}-${i}`} onClick={() => handleView(agent)}
                                            className="p-6 hover:bg-white/[0.02] transition-colors flex items-center justify-between group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="size-8 shrink-0 rounded-full bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400 group-hover:bg-[#ffd428] group-hover:text-[#242a37] transition-colors">{i + 1}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-white truncate">{agent.fullName}</p>
                                                    <p className="text-xs font-bold text-white/30 mt-1">
                                                        {tr("Onboarded {yyyy}", { yyyy: format(new Date(agent.createdAt), "MMM dd, yyyy") })}</p>
                                                </div>
                                            </div>
                                            <Badge className="bg-[#ffd428] text-[#242a37] text-[11px] font-semibold h-5 px-3 uppercase">{tr("New Agent")}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                            <div className="p-6 mt-auto">
                                <Button onClick={() => setShowNewAgentsSheet(true)} className="w-full h-14 bg-white/5 hover:bg-[#ffd428] hover:text-[#242a37] text-white font-semibold text-xs rounded-[var(--ds-radius-small)] transition-colors border border-white/10 cursor-pointer">{tr("View More New Agents")}</Button>
                            </div>
                        </Card>
                    </div>
                </TabsContent>

                {/* ════════════════ REGISTRY TAB ════════════════ */}
                <TabsContent value="all-agents" className="space-y-8">

                    <Card className="rounded-[var(--ds-radius-large)] border-slate-100 dark:border-white/5 bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] overflow-hidden relative p-0 gap-0">
                        {isFetchingAgents && (
                            <div className="absolute top-0 left-0 w-full h-1 bg-transparent z-30 animate-pulse" />
                        )}

                        {/* Banner header — same as All Companies */}
                        <div className="bg-[#242a37] text-white p-8 relative overflow-hidden">
                            <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-[0.08] pointer-events-none transform scale-125">
                                <Icon icon={UserGroupIcon} size={140} />
                            </div>
                            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-2xl font-bold">{tr("All Agents")}</CardTitle>
                                    <CardDescription className="text-white/50 font-medium text-sm">{tr("Browse and manage every agent across partner companies")}</CardDescription>
                                </div>
                            </div>
                        </div>

                        <CardContent className="p-0 bg-slate-50/50 dark:bg-black/10">
                            {(
                                <div className="overflow-x-auto min-h-[600px]">
                                    {agents.length === 0 && !isLoadingAgents ? (
                                        <div className="flex flex-col items-center justify-center h-[600px] gap-6 grayscale opacity-40">
                                            <Icon icon={Sad01Icon} size={80} />
                                            <div className="text-center space-y-2">
                                                <p className="text-xl font-semibold text-slate-900 dark:text-white">{tr("No Results Found")}</p>
                                                <p className="text-xs font-bold text-slate-400">{tr("We couldn't find what you are searching for")}</p>
                                                <Button variant="ghost" onClick={() => { setSearchQuery(""); setRoleFilter("all"); setStatusFilter("all"); if (!isOwner) setCompanyFilter("all") }}
                                                    className="mt-6 h-10 px-6 rounded-full border border-slate-200 dark:border-white/10 text-xs font-semibold hover:bg-[#ffd428] hover:text-[#242a37] transition-colors cursor-pointer"
                                                >{tr("Reset Filters")}</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        // Same table design as Companies
                                        <Table className="min-w-[960px]">
                                            <TableHeader>
                                                <TableRow className="bg-[#242a37] border-b border-transparent hover:bg-[#242a37]">
                                                    <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs">{tr("Agent Detail")}</TableHead>
                                                    <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Company")}</TableHead>
                                                    <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Role")}</TableHead>
                                                    <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Parcel Summary")}</TableHead>
                                                    <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-center">{tr("Status")}</TableHead>
                                                    <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Actions")}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {isLoadingAgents ? (
                                                    [...Array(5)].map((_, i) => (
                                                        <TableRow key={`loading-row-${i}`} className="animate-pulse">
                                                            <TableCell className="px-6 py-4"><div className="h-14 bg-slate-50 dark:bg-white/5 rounded-[var(--ds-radius-large)] w-48" /></TableCell>
                                                            <TableCell className="py-4"><div className="h-10 bg-slate-50 dark:bg-white/5 rounded-[var(--ds-radius-small)] w-36" /></TableCell>
                                                            <TableCell className="py-4"><div className="h-6 bg-slate-50 dark:bg-white/5 rounded w-20" /></TableCell>
                                                            <TableCell className="py-4"><div className="h-6 bg-slate-50 dark:bg-white/5 rounded w-24" /></TableCell>
                                                            <TableCell className="py-4"><div className="h-8 bg-slate-50 dark:bg-white/5 rounded-full w-20 mx-auto" /></TableCell>
                                                            <TableCell className="px-6 py-4"><div className="h-10 bg-slate-50 dark:bg-white/5 rounded-[var(--ds-radius-small)] w-10 ml-auto" /></TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : agents.map((agent, i) => {
                                                    const region = agent.company
                                                        ? regions.find((r: any) => r.id === (agent.company as any)?.regionId || r.id === (agent.company as any)?.registrationRegionId)?.name
                                                        : null
                                                    return (
                                                        <TableRow
                                                            key={`table-agent-${agent.id}-${i}`}
                                                            tabIndex={0}
                                                            aria-label={tr("Open agent {fullName}", { fullName: agent.fullName })}
                                                            onClick={() => handleView(agent)}
                                                            onKeyDown={(e) => {
                                                                if (e.target !== e.currentTarget) return
                                                                if (e.key === "Enter" || e.key === " ") {
                                                                    e.preventDefault()
                                                                    handleView(agent)
                                                                }
                                                            }}
                                                            className="hover:bg-white dark:hover:bg-white/[0.04] transition-colors border-b border-slate-200/60 dark:border-white/5 cursor-pointer group outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ds-border-focused)]"
                                                        >
                                                            <TableCell className="px-6 py-4">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="min-w-0">
                                                                        <p className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-[#ffd428] transition-colors truncate">{agent.fullName}</p>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <Badge variant="outline" className="bg-[#ffd428]/10 text-[#ffd428] border-none text-[11px] font-semibold h-5 px-2 rounded-md">{tr("ID: {padStart}", { padStart: String(agent.id).padStart(3, '0') })}</Badge>
                                                                            <p className="text-xs text-slate-400 font-bold truncate">@{agent.username}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="py-4">
                                                                <div className="space-y-1.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="size-1.5 rounded-full bg-[#ffd428]" />
                                                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">{agent.company?.name || tr("No company")}</p>
                                                                    </div>
                                                                    <div className="h-[18px] px-2.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[6px] text-xs font-semibold text-slate-400 w-fit flex items-center justify-center">
                                                                        {agent.phoneNumber || region || "—"}
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="py-4">
                                                                <Badge className={cn("border-none", getRoleStyle(agent.role))}>{formatRole(agent.role)}</Badge>
                                                            </TableCell>
                                                            <TableCell className="py-4">
                                                                <div className="flex flex-col gap-1.5">
                                                                    <div className="flex items-center gap-2.5">
                                                                        <Icon icon={Package01Icon} size={16} className="text-[#ffd428]" />
                                                                        <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                                                                            {(agent.parcelCounts?.receivedParcels ?? 0).toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs font-semibold text-slate-400 leading-none ml-6">{tr("Parcels booked · all time")}</p>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="px-6 py-4 text-center">
                                                                <Badge className={cn(
                                                                    "h-7 rounded-[var(--ds-radius-small)] px-3 text-xs font-semibold border-none",
                                                                    agent.isActive ? "bg-[#ffd428] text-[#242a37]" : "bg-[#242a37] text-white"
                                                                )}>
                                                                    {agent.isActive ? "ACTIVE" : "INACTIVE"}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="px-6 py-4 text-right">
                                                                <DropdownMenu modal={false}>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon" aria-label={tr("Actions for {fullName}", { fullName: agent.fullName })} className="size-10 rounded-[var(--ds-radius-small)] bg-slate-50 dark:bg-white/5 hover:bg-[#ffd428] dark:hover:bg-[#ffd428] hover:text-[#242a37] text-slate-400 transition-colors cursor-pointer" onClick={e => e.stopPropagation()}>
                                                                            <Icon icon={MoreHorizontalIcon} size={20} />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="w-64 rounded-[var(--ds-radius-large)] bg-white dark:bg-[#242a37] border-slate-100 dark:border-white/5 p-2 shadow-[var(--ds-shadow-raised)] mt-2" onClick={e => e.stopPropagation()}>
                                                                        <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold text-slate-400 mb-1">{tr("Agent Operations")}</DropdownMenuLabel>
                                                                        <DropdownMenuItem onClick={() => handleView(agent)} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold focus:bg-[#ffd428] focus:text-[#242a37] cursor-pointer">
                                                                            <Icon icon={ViewIcon} size={20} className="mr-3" />{tr("View Agent")}</DropdownMenuItem>
                                                                        {canManageAgents && (
                                                                            <DropdownMenuItem onClick={() => handleEdit(agent)} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold focus:bg-[#ffd428] focus:text-[#242a37] cursor-pointer">
                                                                                <Icon icon={PencilEdit01Icon} size={20} className="mr-3" />{tr("Edit Agent")}</DropdownMenuItem>
                                                                        )}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    )}
                                </div>
                            )}

                            <PaginationControls
                                currentPage={pagination.currentPage}
                                totalPages={pagination.totalPages}
                                totalItems={pagination.totalItems}
                                itemsPerPage={pagination.perPage}
                                onPageChange={setCurrentPage}
                                onPageSizeChange={setPageSize}
                                isLoading={isLoadingAgents || isFetchingAgents}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ══════════════════════════════════════════════════════
                Intelligence Panel Sheets
            ══════════════════════════════════════════════════════ */}

            {/* 1. Portfolio — Top Performers */}
            <Sheet key="portfolio-sheet" open={showPortfolioSheet} onOpenChange={setShowPortfolioSheet}>
                <SheetContent side="right" className="p-0 sm:max-w-[720px] border-none bg-white dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full outline-none overflow-hidden [&>button]:hidden">
                    <SheetTitle className="sr-only">{tr("Top Agents")}</SheetTitle>
                    <SheetDescription className="sr-only">{tr("Agents ranked by parcels booked")}</SheetDescription>
                    <div className="relative px-6 py-10 bg-[#242a37] text-white flex-shrink-0">
                        <div className="relative z-10 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <Icon icon={Medal01Icon} className="text-amber-400" size={26} />{" "}{tr("Top Agents")}</h2>
                                <p className="text-xs font-bold text-white/40 mt-2">
                                    {analytics?.topPerforming.length ?? 0}{" "}{tr("agents with parcels ·")}{" "}{periodLabel}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge className="bg-amber-500 text-white border-none text-xs font-semibold px-3 py-1.5 rounded-full">TOP</Badge>
                                <button onClick={() => setShowPortfolioSheet(false)} className="size-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition cursor-pointer">
                                    <Icon icon={Cancel01Icon} size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden">
                        <div className="p-8 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1f2b]">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                    { label: tr("Total Parcels"), val: analytics?.totalParcels.toLocaleString() ?? 0, color: "text-amber-500" },
                                    { label: tr("Most by one agent"), val: (analytics?.topPerforming[0]?.parcels ?? 0).toLocaleString(), color: "text-[#ffd428]" },
                                    { label: tr("Agents booking"),    val: analytics?.topPerforming.length ?? 0,                         color: "text-emerald-500" },
                                ].map((s, i) => (
                                    <div key={i} className="p-4 rounded-[var(--ds-radius-small)] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 shadow-[var(--ds-shadow-raised)]">
                                        <p className="text-xs font-semibold text-slate-400 mb-1">{s.label}</p>
                                        <p className={cn("text-xl font-semibold", s.color)}>{s.val}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {(analytics?.topPerforming ?? []).map(({ agent, parcels }, i) => {
                                return (
                                    <div key={`portfolio-agent-${agent.id}-${i}`} onClick={() => { setShowPortfolioSheet(false); handleView(agent) }}
                                        className="px-6 py-5 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] flex items-center justify-between gap-4 cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className={cn("size-9 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                                                i === 0 ? "bg-amber-400 text-[#242a37]" : i === 1 ? "bg-slate-300 dark:bg-slate-600 text-[#242a37] dark:text-white" : i === 2 ? "bg-orange-400 text-white" : "bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:bg-[#ffd428] group-hover:text-[#242a37]"
                                            )}>{i + 1}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{agent.fullName}</p>
                                                <p className="text-xs font-bold text-slate-400 mt-0.5">{agent.company?.name || tr("Freelance")}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[15px] font-semibold leading-none text-[#242a37] dark:text-white tabular-nums">{parcels.toLocaleString()}</p>
                                            <p className="text-xs font-semibold text-slate-400 mt-0.5">{tr("Parcels")}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3 flex-shrink-0">
                        <Button variant="ghost" onClick={() => setShowPortfolioSheet(false)} className="text-xs font-semibold cursor-pointer">{tr("Close")}</Button>
                        <Button onClick={() => { setShowPortfolioSheet(false); setActiveTab("all-agents") }} className="bg-[#242a37] hover:bg-[#ffd428] hover:text-[#242a37] text-white text-xs font-semibold rounded-[var(--ds-radius-small)] cursor-pointer">{tr("View all")}</Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* 2. Audit — Underperformers */}
            <Sheet key="audit-sheet" open={showAuditSheet} onOpenChange={setShowAuditSheet}>
                <SheetContent side="right" className="p-0 sm:max-w-[720px] border-none bg-white dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full outline-none overflow-hidden [&>button]:hidden">
                    <SheetTitle className="sr-only">{tr("Low Activity Agents")}</SheetTitle>
                    <SheetDescription className="sr-only">{tr("Active agents with the fewest parcels this period")}</SheetDescription>
                    <div className="relative px-6 py-10 bg-[#242a37] text-white flex-shrink-0">
                        <div className="relative z-10 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <Icon icon={Sad01Icon} className="text-rose-400" size={26} />{" "}{tr("Low Activity Agents")}</h2>
                                <p className="text-xs font-bold text-white/40 mt-2">{tr("Active agents with the fewest parcels · {periodLabel}", { periodLabel })}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge className="bg-rose-500 text-white border-none text-xs font-semibold px-3 py-1.5 rounded-full">REVIEW</Badge>
                                <button onClick={() => setShowAuditSheet(false)} className="size-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition cursor-pointer">
                                    <Icon icon={Cancel01Icon} size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden">
                        <div className="p-8 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1f2b]">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                    { label: tr("No parcels"),     val: analytics?.atRiskCount ?? 0, color: "text-rose-500" },
                                    { label: tr("Active agents"),  val: analytics?.activeCount ?? 0, color: "text-[#242a37] dark:text-white" },
                                    { label: tr("Never booked"),   val: analytics?.neverCount ?? 0,  color: "text-slate-500" },
                                ].map((s, i) => (
                                    <div key={i} className="p-4 rounded-[var(--ds-radius-small)] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 shadow-[var(--ds-shadow-raised)]">
                                        <p className="text-xs font-semibold text-slate-400 mb-1">{s.label}</p>
                                        <p className={cn("text-xl font-semibold", s.color)}>{s.val}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {(analytics?.underperforming ?? []).slice(0, 50).map(({ agent, parcels }, i) => {
                                const total = parcels
                                return (
                                    <div key={`audit-agent-${agent.id}-${i}`} onClick={() => { setShowAuditSheet(false); handleView(agent) }}
                                        className="px-6 py-5 hover:bg-rose-50/40 dark:hover:bg-rose-500/[0.04] flex items-center justify-between gap-4 cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="size-9 shrink-0 rounded-full bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center text-xs font-semibold text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-colors">{i + 1}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{agent.fullName}</p>
                                                <p className="text-xs font-bold text-rose-400 mt-0.5">
                                                    {total === 0
                                                        ? tr("No parcels {v} · {allTimeParcels} all time", { v: periodLabel === "All Time" ? "yet" : periodLabel.toLowerCase(), allTimeParcels: agent.allTimeParcels.toLocaleString() })
                                                        : tr("{total} parcels · {allTimeParcels} all time", { total: total.toLocaleString(), allTimeParcels: agent.allTimeParcels.toLocaleString() })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[15px] font-semibold text-rose-500 leading-none tabular-nums">{parcels.toLocaleString()}</p>
                                            <p className="text-xs font-semibold text-slate-400 mt-0.5">{tr("Parcels")}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3 flex-shrink-0">
                        <Button variant="ghost" onClick={() => setShowAuditSheet(false)} className="text-xs font-semibold cursor-pointer">{tr("Close")}</Button>
                        <Button onClick={() => { setShowAuditSheet(false); setActiveTab("all-agents") }} className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold rounded-[var(--ds-radius-small)] cursor-pointer">{tr("View all")}</Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* 3. Quiet (Inactive) Agents */}
            <Sheet key="inactive-sheet" open={showInactiveSheet} onOpenChange={setShowInactiveSheet}>
                <SheetContent side="right" className="p-0 sm:max-w-[720px] border-none bg-white dark:bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full outline-none overflow-hidden [&>button]:hidden">
                    <SheetTitle className="sr-only">{tr("Dormant Agents")}</SheetTitle>
                    <SheetDescription className="sr-only">{tr("Agents with no recent activity")}</SheetDescription>
                    <div className="relative px-6 py-10 bg-[#242a37] text-white flex-shrink-0">
                        <div className="relative z-10 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <Icon icon={Clock01Icon} className="text-[#ffd428]" size={26} />{" "}{tr("Dormant Agents")}</h2>
                                <p className="text-xs font-bold text-white/40 mt-2">
                                    {analytics?.quietAgents.length ?? 0}{" "}{tr("Agents · No Recent Traffic (")}{thresholds.quietInactivity}{tr("+ Days)")}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <button onClick={() => setShowInactiveSheet(false)} className="size-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition cursor-pointer">
                                    <Icon icon={Cancel01Icon} size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden">
                        <div className="p-8 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1f2b]">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-[var(--ds-radius-small)] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 shadow-[var(--ds-shadow-raised)]">
                                    <p className="text-xs font-semibold text-slate-400 mb-1">{tr("Avg Offline")}</p>
                                    <p className="text-xl font-semibold text-slate-500">
                                        {(() => {
                                            const dated = (analytics?.quietAgents ?? []).filter((a: any) => a.inactiveDays !== null)
                                            return dated.length ? `${Math.round(dated.reduce((s: number, a: any) => s + a.inactiveDays, 0) / dated.length)}d` : "30+d"
                                        })()}
                                    </p>
                                </div>
                                <div className="p-4 rounded-[var(--ds-radius-small)] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 shadow-[var(--ds-shadow-raised)]">
                                    <p className="text-xs font-semibold text-slate-400 mb-1">{tr("Total Quiet")}</p>
                                    <p className="text-xl font-semibold text-[#ffd428]">{analytics?.quietAgents.length ?? 0}</p>
                                </div>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {(analytics?.quietAgents ?? []).map((agent: any, i: number) => (
                                <div key={`quiet-agent-${agent.id}-${i}`} onClick={() => { setShowInactiveSheet(false); handleView(agent) }}
                                    className="px-6 py-5 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] flex items-center justify-between gap-4 cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="size-9 shrink-0 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400 group-hover:bg-[#ffd428] group-hover:text-[#242a37] transition-colors">{i + 1}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{agent.fullName}</p>
                                            <p className="text-xs font-bold text-slate-400 mt-0.5">{agentDormancyLabel(agent)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[15px] font-semibold text-[#ffd428] leading-none">{agent.inactiveDays === null ? "30+d" : `${agent.inactiveDays}d`}</p>
                                        <p className="text-xs font-semibold text-slate-400 mt-0.5">{tr("Since last parcel")}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3 flex-shrink-0">
                        <Button variant="ghost" onClick={() => setShowInactiveSheet(false)} className="text-xs font-semibold cursor-pointer">{tr("Close")}</Button>
                        <Button onClick={() => { setShowInactiveSheet(false); setActiveTab("all-agents"); setStatusFilter("inactive") }} className="bg-[#242a37] hover:bg-[#ffd428] hover:text-[#242a37] text-white text-xs font-semibold rounded-[var(--ds-radius-small)] cursor-pointer">{tr("View All Inactive")}</Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* 4. New Agents — dark sheet */}
            <Sheet key="new-agents-sheet" open={showNewAgentsSheet} onOpenChange={setShowNewAgentsSheet}>
                <SheetContent side="right" className="p-0 sm:max-w-[720px] border-none bg-[#0f1117] shadow-[var(--ds-shadow-raised)] flex flex-col h-full outline-none overflow-hidden [&>button]:hidden">
                    <SheetTitle className="sr-only">{tr("New companies")}</SheetTitle>
                    <SheetDescription className="sr-only">{tr("Recently enlisted agents")}</SheetDescription>
                    <div className="relative px-6 py-10 bg-black/40 border-b border-white/5 flex-shrink-0">
                        <div className="relative z-10 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-[#ffd428] flex items-center gap-3">{tr("New companies")}</h2>
                                <p className="text-xs font-bold text-white/40 mt-2">{tr("Enlisted Within {newAgentDays} Days", { newAgentDays: thresholds.newAgentDays })}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <button onClick={() => setShowNewAgentsSheet(false)} className="size-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition cursor-pointer">
                                    <Icon icon={Cancel01Icon} size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden">
                        <div className="p-8 border-b border-white/5 bg-white/5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-[var(--ds-radius-small)] bg-black/20 border border-white/5 shadow-[var(--ds-shadow-raised)]">
                                    <p className="text-xs font-semibold text-white/40 mb-1">{tr("Total Agents")}</p>
                                    <p className="text-xl font-semibold text-white">{analytics?.totalAgents ?? 0}</p>
                                </div>
                                <div className="p-4 rounded-[var(--ds-radius-small)] bg-black/20 border border-white/5 shadow-[var(--ds-shadow-raised)]">
                                    <p className="text-xs font-semibold text-white/40 mb-1">{tr("New This Period")}</p>
                                    <p className="text-xl font-semibold text-[#ffd428]">{analytics?.recentAgents.length ?? 0}</p>
                                </div>
                            </div>
                        </div>
                        <div className="divide-y divide-white/5">
                            {(analytics?.recentAgents ?? []).map((agent, i) => (
                                <div key={`recent-agent-${agent.id}-${i}`} onClick={() => { setShowNewAgentsSheet(false); handleView(agent) }}
                                    className="px-6 py-5 hover:bg-white/[0.03] flex items-center justify-between gap-4 cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="size-9 shrink-0 rounded-full bg-white/5 flex items-center justify-center text-xs font-semibold text-slate-400 group-hover:bg-[#ffd428] group-hover:text-[#242a37] transition-colors">{i + 1}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-white truncate">{agent.fullName}</p>
                                            <p className="text-xs font-bold text-white/30 mt-0.5">
                                                {tr("Onboarded {yyyy}", { yyyy: format(new Date(agent.createdAt), "MMM dd, yyyy") })}</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-[#ffd428] text-[#242a37] text-[11px] font-semibold h-5 px-3 uppercase shrink-0">{tr("New Agent")}</Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="px-6 py-4 border-t border-white/5 flex justify-end gap-3 flex-shrink-0">
                        <Button variant="ghost" onClick={() => setShowNewAgentsSheet(false)} className="text-xs font-semibold text-white/60 hover:text-white cursor-pointer">{tr("Close")}</Button>
                        <Button onClick={() => { setShowNewAgentsSheet(false); setActiveTab("all-agents") }} className="bg-white/10 hover:bg-[#ffd428] hover:text-[#242a37] text-white text-xs font-semibold rounded-[var(--ds-radius-small)] border border-white/10 cursor-pointer">{tr("View all")}</Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* ── Modals ── */}
            <AgentModal
                key="add-agent-modal"
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                companies={companies}
                regions={regions}
                bookingOffices={offices}
                onSave={async data => createMutation.mutateAsync(data)}
                onViewAgent={agent => { setSelectedAgent(agent); setIsViewModalOpen(true) }}
                isLoading={createMutation.isPending}
            />

            <AgentEditModal
                key="edit-agent-modal"
                isOpen={isEditModalOpen}
                onClose={() => { setIsEditModalOpen(false); setSelectedAgent(null) }}
                agent={selectedAgent}
                onSave={async (id, data) => updateMutation.mutateAsync({ id, data })}
                onAgentRefresh={() => queryClient.invalidateQueries({ queryKey: ["agents"] })}
                isLoading={updateMutation.isPending}
            />

            <AgentViewModal
                key="view-agent-modal"
                isOpen={isViewModalOpen}
                onClose={() => { setIsViewModalOpen(false); setSelectedAgent(null) }}
                agent={selectedAgent}
                onEdit={canManageAgents ? agent => { setIsViewModalOpen(false); handleEdit(agent) } : undefined}
            />
        </div>
    )
}