"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import {
    Search,
    Plus,
    RefreshCw,
    Eye,
    Edit,
    Trash2,
    Users,
    Wallet,
    CalendarClock,
    UserCheck,
    Filter,
    X as XIcon,
    MoreHorizontal,
    PauseCircle,
    PlayCircle,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    HandCoins,
} from "lucide-react"
import type { Beneficiary, BeneficiaryStats } from "@/types/beneficiary"
import { getBeneficiaries, getBeneficiaryStats, deleteBeneficiary, toggleBeneficiaryStatus } from "@/lib/services/beneficiary"
import { BeneficiaryModal } from "@/components/modals/beneficiary-modal"
import { useToast } from "@/components/ui/use-toast"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
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
import { Skeleton } from "@/components/ui/skeleton"
import { ListSkeleton } from "@/components/ui/skeletons"
import { TableBanner } from "@/components/ui/table-banner"
import { SheetSection, DetailList, StatGrid, SheetEmpty, SheetLozenge } from "@/components/sheets/sheet-blocks"
import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/icon"
import { Search01Icon, FilterIcon, Calendar03Icon, Add01Icon, RefreshIcon } from "@hugeicons/core-free-icons"
import { useTr } from "@/lib/i18n/portal"

/*
 * Beneficiaries: people or organisations that receive an automatic
 * deduction from an agent's float (e.g. a daily or monthly payment).
 * Overview figures come from GET /beneficiary/stats, computed by the
 * backend over every beneficiary.
 */

const PAGE_SIZE = 10
const TZS = (n?: number | string | null) => `TZS ${new Intl.NumberFormat("en-TZ").format(Math.round(Number(n) || 0))}`
const day = (d?: string | null) => (d ? format(new Date(d), "d MMM yyyy") : "—")

const FREQUENCY_LABEL: Record<string, string> = { DAILY: "per day", WEEKLY: "per week", MONTHLY: "per month", QUARTERLY: "per quarter", YEARLY: "per year" }
const STATUS_LOZENGE: Record<string, string> = {
    ACTIVE: "bg-[#ffd428] text-[#242a37]",
    PAUSED: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    COMPLETED: "bg-[#242a37] text-white dark:bg-white dark:text-[#242a37]",
    CANCELLED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
}
const STATUS_LABEL: Record<string, string> = { ACTIVE: "Active", PAUSED: "Paused", COMPLETED: "Completed", CANCELLED: "Cancelled" }

function StatusLozenge({ status }: { status: string }) {
    const s = String(status || "").toUpperCase()
    return (
        <Badge className={cn("h-7 rounded-[var(--ds-radius-small)] px-3 text-xs font-semibold border-none", STATUS_LOZENGE[s] ?? "bg-slate-100 text-slate-700")}>
            {STATUS_LABEL[s] ?? s}
        </Badge>
    )
}

function NavyCard({ label, value, sub, icon: IconCmp }: { label: string; value?: string; sub: string; icon: any }) {
    return (
        <Card className="rounded-[var(--ds-radius-large)] border-none h-full bg-[#242a37] relative overflow-hidden shadow-[var(--ds-shadow-raised)]">
            <div className="absolute right-[-15px] bottom-[-15px] opacity-[0.05] text-[#ffd428] pointer-events-none rotate-12"><IconCmp size={100} /></div>
            <CardContent className="p-6 relative z-10">
                <div className="size-10 rounded-[var(--ds-radius-small)] flex items-center justify-center bg-white/5 mb-4"><IconCmp className="size-5 text-[#ffd428]" /></div>
                <p className="text-xs font-semibold text-[#ffd428]/60 mb-1">{label}</p>
                {value === undefined ? <Skeleton className="h-7 w-28 bg-white/10" /> : <h3 className="text-xl font-semibold text-white tabular-nums truncate">{value}</h3>}
                <p className="text-xs font-bold text-white/40 mt-2">{sub}</p>
            </CardContent>
        </Card>
    )
}

function ListCard({ title, description, icon: IconCmp, children }: { title: string; description: string; icon: any; children: React.ReactNode }) {
    return (
        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden">
            <CardHeader className="py-8 px-6 bg-[#242a37] text-white border-none">
                <CardTitle className="text-xl font-semibold text-white flex items-center gap-3"><IconCmp className="size-6 text-[#ffd428]" />{title}</CardTitle>
                <CardDescription className="text-xs font-bold text-white/40 mt-1">{description}</CardDescription>
            </CardHeader>
            <CardContent className="p-6">{children}</CardContent>
        </Card>
    )
}

function Bars({ rows, total }: { rows: { label: string; value: number; color: string }[]; total: number }) {
    return (
        <div className="space-y-5">
            {rows.map((row) => {
                const share = total > 0 ? (row.value / total) * 100 : 0
                return (
                    <div key={row.label}>
                        <div className="mb-2 flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm font-semibold text-[#242a37] dark:text-white">
                                <span className="size-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                                {row.label}
                            </span>
                            <span className="text-sm font-semibold tabular-nums text-[#242a37] dark:text-white">
                                {row.value.toLocaleString()}
                                <span className="ml-2 text-xs font-normal text-slate-400">{total > 0 ? `${share.toFixed(1)}%` : "—"}</span>
                            </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                            <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: row.color }} />
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export function BeneficiariesPage() {
    const tr = useTr()
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState("overview")
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [frequencyFilter, setFrequencyFilter] = useState("all")
    const [page, setPage] = useState(1)
    const [modal, setModal] = useState<{ open: boolean; beneficiary: Beneficiary | null }>({ open: false, beneficiary: null })
    const [viewing, setViewing] = useState<Beneficiary | null>(null)
    const [deleting, setDeleting] = useState<Beneficiary | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const debouncedSearch = useDebounce(searchQuery, 400)
    const hasFilters = !!searchQuery || statusFilter !== "all" || frequencyFilter !== "all"

    const statsQuery = useQuery({
        queryKey: ["beneficiary-stats"],
        queryFn: async () => ((await getBeneficiaryStats()) as any)?.data as BeneficiaryStats,
        staleTime: 60_000,
    })
    const stats = statsQuery.data

    const listQuery = useQuery({
        queryKey: ["beneficiaries", page, debouncedSearch, statusFilter, frequencyFilter],
        queryFn: async () => {
            const params: any = { page, limit: PAGE_SIZE }
            if (statusFilter !== "all") params.status = statusFilter
            if (frequencyFilter !== "all") params.frequency = frequencyFilter
            if (debouncedSearch) params.search = debouncedSearch
            const response: any = await getBeneficiaries(params)
            return {
                rows: (response?.data ?? []) as Beneficiary[],
                totalPages: Number(response?.pagination?.pages ?? response?.pagination?.totalPages) || 1,
                total: Number(response?.pagination?.total ?? response?.pagination?.totalItems ?? response?.data?.length) || 0,
            }
        },
        staleTime: 30_000,
        placeholderData: (prev) => prev,
    })
    const rows = listQuery.data?.rows ?? []
    const totalPages = listQuery.data?.totalPages ?? 1

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ["beneficiary-stats"] })
        queryClient.invalidateQueries({ queryKey: ["beneficiaries"] })
    }
    const clearFilters = () => {
        setSearchQuery("")
        setStatusFilter("all")
        setFrequencyFilter("all")
        setPage(1)
    }
    const goToList = () => setActiveTab("beneficiaries")

    const toggle = async (b: Beneficiary) => {
        try {
            await toggleBeneficiaryStatus(b.id)
            toast({ title: b.status === "ACTIVE" ? "Beneficiary paused" : "Beneficiary resumed", description: b.name })
            refresh()
            if (viewing?.id === b.id) setViewing(null)
        } catch (error: any) {
            toast({ variant: "destructive", title: tr("Couldn't update the status"), description: error?.message || "Please try again." })
        }
    }
    const confirmDelete = async () => {
        if (!deleting) return
        setIsDeleting(true)
        try {
            await deleteBeneficiary(deleting.id)
            toast({ title: tr("Beneficiary deleted"), description: deleting.name })
            setDeleting(null)
            if (viewing?.id === deleting.id) setViewing(null)
            refresh()
        } catch (error: any) {
            toast({ variant: "destructive", title: tr("Couldn't delete the beneficiary"), description: error?.message || "Please try again." })
        } finally {
            setIsDeleting(false)
        }
    }

    const cancelled = stats ? Math.max(0, stats.total - stats.active - stats.paused - stats.completed) : 0

    return (
        <div className="space-y-10 animate-in fade-in duration-300">
            {/* ── Top bar — same layout as Companies ── */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 justify-between">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 flex-1 min-w-0">
                    <div className="relative group flex-1 min-w-0 lg:min-w-[16rem]">
                        <Icon icon={Search01Icon} size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ffd428] transition-colors" />
                        <Input
                            placeholder={tr("Search beneficiaries")}
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); if (e.target.value) goToList() }}
                            className="h-10 pl-10 pr-9 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-normal placeholder:text-slate-400 focus:ring-1 focus:ring-[#ffd428]/50 shadow-none w-full"
                        />
                        {searchQuery && (
                            <button type="button" aria-label={tr("Clear search")} onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-[#242a37] dark:hover:text-white">
                                <XIcon className="size-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); goToList() }}>
                            <SelectTrigger className="w-full sm:w-40 h-10 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-medium shadow-none outline-none focus:ring-1 focus:ring-[#ffd428]/50">
                                <div className="flex items-center gap-2"><Icon icon={FilterIcon} size={16} className="shrink-0 text-slate-500 dark:text-slate-400" /><SelectValue placeholder="STATUS" /></div>
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)]">
                                <SelectItem value="all" className="text-sm">{tr("All statuses")}</SelectItem>
                                <SelectItem value="ACTIVE" className="text-sm">{tr("Active")}</SelectItem>
                                <SelectItem value="PAUSED" className="text-sm">{tr("Paused")}</SelectItem>
                                <SelectItem value="COMPLETED" className="text-sm">{tr("Completed")}</SelectItem>
                                <SelectItem value="CANCELLED" className="text-sm">{tr("Cancelled")}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={frequencyFilter} onValueChange={(v) => { setFrequencyFilter(v); setPage(1); goToList() }}>
                            <SelectTrigger className="w-full sm:w-40 h-10 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-medium shadow-none outline-none focus:ring-1 focus:ring-[#ffd428]/50">
                                <div className="flex items-center gap-2"><Icon icon={Calendar03Icon} size={16} className="shrink-0 text-slate-500 dark:text-slate-400" /><SelectValue placeholder="FREQUENCY" /></div>
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)]">
                                <SelectItem value="all" className="text-sm">{tr("Any frequency")}</SelectItem>
                                <SelectItem value="DAILY" className="text-sm">{tr("Daily")}</SelectItem>
                                <SelectItem value="WEEKLY" className="text-sm">{tr("Weekly")}</SelectItem>
                                <SelectItem value="MONTHLY" className="text-sm">{tr("Monthly")}</SelectItem>
                                <SelectItem value="YEARLY" className="text-sm">{tr("Yearly")}</SelectItem>
                            </SelectContent>
                        </Select>
                        {hasFilters && (
                            <Button variant="ghost" onClick={clearFilters} className="h-10 text-sm font-medium"><XIcon className="size-4 mr-1" />{" "}{tr("Clear")}</Button>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={refresh} aria-label={tr("Refresh beneficiaries")}
                        className="h-10 w-10 text-slate-400 hover:text-[#ffd428] rounded-[var(--ds-radius-small)]">
                        <Icon icon={RefreshIcon} size={20} className={cn((statsQuery.isFetching || listQuery.isFetching) && "animate-spin")} />
                    </Button>
                    <Button onClick={() => setModal({ open: true, beneficiary: null })}
                        className="h-10 px-5 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-small)] font-semibold text-sm shadow-[var(--ds-shadow-raised)] flex items-center gap-3 cursor-pointer">
                        <Icon icon={Add01Icon} size={20} />{tr("Add Beneficiary")}</Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <TabsList className="portal-sticky-tabs bg-slate-100 dark:bg-black/20 p-1.5 rounded-[var(--ds-radius-small)] w-full items-stretch h-auto">
                    <TabsTrigger value="overview" className="flex-1 h-11 text-xs font-semibold cursor-pointer"><BarChart3 className="size-4 mr-2" />{" "}{tr("Overview")}</TabsTrigger>
                    <TabsTrigger value="beneficiaries" className="flex-1 h-11 text-xs font-semibold gap-3 cursor-pointer">
                        <div className="flex items-center gap-2"><Users className="size-4" />{" "}{tr("All Beneficiaries")}</div>
                        <Badge className="bg-[#ffd428] text-[#242a37] border-none text-xs font-semibold h-6 min-w-10 flex items-center justify-center rounded-[var(--ds-radius-small)]">
                            {(stats?.total ?? listQuery.data?.total ?? 0).toLocaleString()}
                        </Badge>
                    </TabsTrigger>
                </TabsList>

                {/* ════════ OVERVIEW ════════ */}
                <TabsContent value="overview" className="space-y-10 focus:outline-none">
                    {statsQuery.isError && (
                        <p className="text-sm font-semibold text-rose-500">{tr("Couldn't load the figures.")}{" "}<button onClick={() => statsQuery.refetch()} className="underline cursor-pointer">{tr("Retry")}</button>
                        </p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <NavyCard label={tr("Beneficiaries")} value={stats ? stats.total.toLocaleString() : statsQuery.isError ? "—" : undefined} sub={stats ? tr("{active} active", { active: stats.active.toLocaleString() }) : "—"} icon={Users} />
                        <NavyCard label={tr("Deducted so far")} value={stats ? TZS(stats.totalDeducted) : statsQuery.isError ? "—" : undefined} sub={stats ? tr("{totalDeductionCount} deductions", { totalDeductionCount: stats.totalDeductionCount.toLocaleString() }) : "—"} icon={Wallet} />
                        <NavyCard label={tr("Monthly commitment")} value={stats ? TZS(stats.monthlyCommitment) : statsQuery.isError ? "—" : undefined} sub={tr("Active deductions, per month")} icon={CalendarClock} />
                        <NavyCard label={tr("Assigned to agents")} value={stats ? stats.assigned.toLocaleString() : statsQuery.isError ? "—" : undefined} sub={stats ? tr("{unassigned} not assigned yet", { unassigned: stats.unassigned.toLocaleString() }) : "—"} icon={UserCheck} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <ListCard title={tr("Status")} description={tr("Where every beneficiary stands")} icon={BarChart3}>
                            {!stats ? <ListSkeleton rows={4} className="-mx-5 -my-4" /> : stats.total === 0 ? (
                                <p className="text-sm text-slate-400">{tr("No beneficiaries yet.")}</p>
                            ) : (
                                <Bars total={stats.total} rows={[
                                    { label: tr("Active"), value: stats.active, color: "#ffd428" },
                                    { label: tr("Paused"), value: stats.paused, color: "#f59e0b" },
                                    { label: tr("Completed"), value: stats.completed, color: "#242a37" },
                                    ...(cancelled > 0 ? [{ label: tr("Cancelled"), value: cancelled, color: "#f43f5e" }] : []),
                                ]} />
                            )}
                        </ListCard>
                        <ListCard title={tr("Agent assignment")} description={tr("Beneficiaries linked to an agent's float")} icon={UserCheck}>
                            {!stats ? <ListSkeleton rows={2} className="-mx-5 -my-4" /> : stats.total === 0 ? (
                                <p className="text-sm text-slate-400">{tr("No beneficiaries yet.")}</p>
                            ) : (
                                <div className="space-y-6">
                                    <Bars total={stats.total} rows={[
                                        { label: tr("Assigned"), value: stats.assigned, color: "#ffd428" },
                                        { label: tr("Not assigned"), value: stats.unassigned, color: "#94a3b8" },
                                    ]} />
                                    {stats.unassigned > 0 && (
                                        <p className="rounded-[var(--ds-radius-small)] bg-slate-50 p-3 text-xs text-slate-500 dark:bg-white/5">{tr("Beneficiaries that aren't assigned don't receive any deductions until they're linked to an agent (from the agent's Beneficiaries tab).")}</p>
                                    )}
                                </div>
                            )}
                        </ListCard>
                    </div>
                </TabsContent>

                {/* ════════ ALL BENEFICIARIES ════════ */}
                <TabsContent value="beneficiaries" className="space-y-8">
                    <div className="bg-white dark:bg-[#1a1f2b] rounded-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)] border border-slate-100 dark:border-white/5 overflow-hidden">
                        <TableBanner title={tr("All Beneficiaries")} description={tr("Everyone receiving automatic deductions from agents' float")} icon="users" />
                        {listQuery.isPending ? (
                            <ListSkeleton rows={8} />
                        ) : listQuery.isError ? (
                            <div className="px-6 py-16 text-center">
                                <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Couldn't load beneficiaries")}</p>
                                <Button variant="outline" className="mt-4" onClick={() => listQuery.refetch()}>{tr("Try again")}</Button>
                            </div>
                        ) : rows.length === 0 ? (
                            <div className="px-6 py-16 text-center">
                                <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("No beneficiaries found")}</p>
                                <p className="mt-1 text-sm text-slate-500">{hasFilters ? tr("Try a different search or filter.") : tr("Add a beneficiary to start automatic deductions.")}</p>
                                {hasFilters && <Button variant="outline" className="mt-4" onClick={clearFilters}>{tr("Reset filters")}</Button>}
                            </div>
                        ) : (
                            <div className="bg-slate-50/50 dark:bg-black/10">
                                <div className="overflow-x-auto">
                                    <Table className="min-w-[1000px]">
                                        <TableHeader>
                                            <TableRow className="bg-[#242a37] border-b border-transparent hover:bg-[#242a37]">
                                                <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs">{tr("Beneficiary")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Agent")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Deduction")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Deducted so far")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-center">{tr("Status")}</TableHead>
                                                <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Actions")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rows.map((b) => (
                                                <TableRow
                                                    key={b.id}
                                                    tabIndex={0}
                                                    aria-label={tr("Open beneficiary {name}", { name: b.name })}
                                                    onClick={() => setViewing(b)}
                                                    onKeyDown={(e) => {
                                                        if (e.target !== e.currentTarget) return
                                                        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setViewing(b) }
                                                    }}
                                                    className="hover:bg-white dark:hover:bg-white/[0.04] transition-colors border-b border-slate-200/60 dark:border-white/5 cursor-pointer group outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ds-border-focused)]"
                                                >
                                                    <TableCell className="px-6 py-4 max-w-[280px]">
                                                        <p className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-[#ffd428] transition-colors truncate">{b.name}</p>
                                                        <div className="flex items-center gap-2 mt-1 min-w-0">
                                                            <Badge variant="outline" className="bg-[#ffd428]/10 text-[#ffd428] border-none text-[11px] font-semibold h-5 px-2 rounded-md shrink-0">{tr("ID: {padStart}", { padStart: String(b.id).padStart(3, "0") })}</Badge>
                                                            <p className="text-xs text-slate-400 font-bold truncate">{b.description || tr("No description")}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        {b.User ? (
                                                            <div className="space-y-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="size-1.5 rounded-full bg-[#ffd428]" />
                                                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">{b.User.fullName}</p>
                                                                </div>
                                                                <div className="h-[18px] px-2.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[6px] text-xs font-semibold text-slate-400 w-fit flex items-center tabular-nums">
                                                                    {b.User.phoneNumber || b.User.floatAccountNumber || "—"}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs font-semibold text-slate-400">{tr("Not assigned")}</p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{TZS(b.deduction_amount)}</p>
                                                        <p className="mt-1 text-xs font-semibold text-slate-400">{FREQUENCY_LABEL[b.deduction_frequency] ?? String(b.deduction_frequency).toLowerCase()}</p>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{TZS(b.total_deducted)}</p>
                                                        <p className="mt-1 text-xs font-semibold text-slate-400">
                                                            {(b.deduction_count || 0).toLocaleString()}{" "}{tr("deduction")}{b.deduction_count === 1 ? "" : "s"}
                                                            {b.failed_deductions ? tr(" · {failed_deductions} failed", { failed_deductions: b.failed_deductions }) : ""}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="py-4 text-center"><StatusLozenge status={b.status} /></TableCell>
                                                    <TableCell className="px-6 py-4 text-right">
                                                        <DropdownMenu modal={false}>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" aria-label={tr("Actions for {name}", { name: b.name })} onClick={(e) => e.stopPropagation()}
                                                                    className="size-10 rounded-[var(--ds-radius-small)] bg-slate-50 dark:bg-white/5 hover:bg-[#ffd428] dark:hover:bg-[#ffd428] hover:text-[#242a37] text-slate-400 transition-colors cursor-pointer">
                                                                    <MoreHorizontal className="size-5" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-64 rounded-[var(--ds-radius-large)] p-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                                                <DropdownMenuItem onClick={() => setViewing(b)} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold focus:bg-[#ffd428] focus:text-[#242a37] cursor-pointer">
                                                                    <Eye className="size-5 mr-3" />{" "}{tr("View beneficiary")}</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => setModal({ open: true, beneficiary: b })} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold focus:bg-[#ffd428] focus:text-[#242a37] cursor-pointer">
                                                                    <Edit className="size-5 mr-3" />{" "}{tr("Edit")}</DropdownMenuItem>
                                                                {(b.status === "ACTIVE" || b.status === "PAUSED") && (
                                                                    <DropdownMenuItem onClick={() => toggle(b)} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold focus:bg-[#ffd428] focus:text-[#242a37] cursor-pointer">
                                                                        {b.status === "ACTIVE" ? <><PauseCircle className="size-5 mr-3" />{" "}{tr("Pause deductions")}</> : <><PlayCircle className="size-5 mr-3" />{" "}{tr("Resume deductions")}</>}
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuSeparator className="my-2" />
                                                                <DropdownMenuItem onClick={() => setDeleting(b)} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold text-rose-500 focus:bg-rose-500 focus:text-white cursor-pointer">
                                                                    <Trash2 className="size-5 mr-3" />{" "}{tr("Delete")}</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <p className="text-xs text-slate-500">{tr("Page {page} of {totalPages}", { page, totalPages })}</p>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" disabled={page <= 1 || listQuery.isFetching} onClick={() => setPage(page - 1)}><ChevronLeft className="size-4 mr-1" />{" "}{tr("Previous")}</Button>
                                        <Button variant="outline" size="sm" disabled={page >= totalPages || listQuery.isFetching} onClick={() => setPage(page + 1)}>{tr("Next")}{" "}<ChevronRight className="size-4 ml-1" /></Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* ── Beneficiary sheet (agent-sheet design) ── */}
            <Sheet open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
                <SheetContent side="right" className="[&>button]:hidden flex h-full w-full flex-col overflow-hidden border-l p-0 outline-none sm:max-w-[640px] bg-white dark:bg-[#0f1117]">
                    {viewing && (
                        <>
                            <SheetTitle className="sr-only">{tr("Beneficiary {name}", { name: viewing.name })}</SheetTitle>
                            <SheetDescription className="sr-only">{tr("Deduction details and history.")}</SheetDescription>
                            <div className="shrink-0 bg-[#242a37] p-5 pt-6 sm:p-8 sm:pt-10 text-white">
                                <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                                    <div className="flex size-14 items-center justify-center rounded-[var(--ds-radius-small)] bg-[#ffd428]"><HandCoins className="size-7 text-[#242a37]" /></div>
                                    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                                        <Button onClick={() => setModal({ open: true, beneficiary: viewing })}
                                            className="h-9 gap-2 rounded-[var(--ds-radius-small)] border-none bg-[#ffd428] px-4 text-xs font-semibold text-[#242a37] hover:bg-[#ffdb4d]">
                                            <Edit className="size-4" />{" "}{tr("Edit")}</Button>
                                        <Button variant="ghost" onClick={() => setViewing(null)} aria-label={tr("Close")}
                                            className="flex size-9 items-center justify-center rounded-full bg-white/10 p-0 text-white hover:bg-white/20 hover:text-white">
                                            <XIcon className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-end justify-between gap-4">
                                    <div className="min-w-0">
                                        <h2 className="truncate text-2xl font-bold leading-none">{viewing.name}</h2>
                                        <p className="mt-2 truncate text-xs font-semibold text-white/50">{tr("Beneficiary ID: #")}{String(viewing.id).padStart(4, "0")} <span className="text-white/20">•</span> {TZS(viewing.deduction_amount)} {FREQUENCY_LABEL[viewing.deduction_frequency] ?? ""}
                                        </p>
                                    </div>
                                    <StatusLozenge status={viewing.status} />
                                </div>
                            </div>
                            <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto bg-[#f1f3f6] p-4 sm:p-8 dark:bg-[#0a0c10]">
                                <StatGrid columns={3} tiles={[
                                    { label: tr("Deducted so far"), value: TZS(viewing.total_deducted), emphasis: true },
                                    { label: tr("Deductions"), value: (viewing.deduction_count || 0).toLocaleString(), hint: viewing.failed_deductions ? `${viewing.failed_deductions} failed` : "None failed" },
                                    { label: tr("Next deduction"), value: viewing.next_deduction_date ? format(new Date(viewing.next_deduction_date), "d MMM") : "—", hint: viewing.status === "ACTIVE" ? "Scheduled" : "Not scheduled" },
                                ]} />
                                <SheetSection title={tr("Deduction")}>
                                    <DetailList rows={[
                                        { label: tr("Amount"), value: TZS(viewing.deduction_amount) },
                                        { label: tr("How often"), value: (FREQUENCY_LABEL[viewing.deduction_frequency] ?? String(viewing.deduction_frequency).toLowerCase()).replace(/^per /, "Every ") },
                                        { label: tr("Starts"), value: day(viewing.start_date) },
                                        { label: tr("Ends"), value: day(viewing.end_date) },
                                        { label: tr("Last deduction"), value: day(viewing.last_deduction_date) },
                                        { label: tr("Description"), value: viewing.description || "—" },
                                    ]} />
                                </SheetSection>
                                <SheetSection title={tr("Paid from")}>
                                    {viewing.User ? (
                                        <DetailList rows={[
                                            { label: tr("Agent"), value: viewing.User.fullName },
                                            { label: tr("Phone"), value: viewing.User.phoneNumber || "—", mono: true },
                                            { label: tr("Float account"), value: viewing.User.floatAccountNumber || "—", mono: true },
                                        ]} />
                                    ) : (
                                        <SheetEmpty title={tr("Not assigned to an agent")} description={tr("No deductions happen until it's linked to an agent's float.")} />
                                    )}
                                </SheetSection>
                                <SheetSection title={tr("Recent deductions")}>
                                    {(viewing.beneficiary_transactions?.length ?? 0) === 0 ? (
                                        <SheetEmpty title={tr("No deductions yet")} />
                                    ) : (
                                        <ul className="divide-y divide-slate-100 dark:divide-white/5">
                                            {viewing.beneficiary_transactions!.slice(0, 10).map((t: any) => (
                                                <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3">
                                                    <div>
                                                        <p className="text-sm font-semibold tabular-nums text-[#242a37] dark:text-white">{TZS(t.amount)}</p>
                                                        <p className="mt-0.5 text-xs text-slate-500">{t.processed_date ? format(new Date(t.processed_date), "d MMM yyyy, HH:mm") : t.scheduled_date ? tr("Scheduled {day}", { day: day(t.scheduled_date) }) : "—"}</p>
                                                    </div>
                                                    <SheetLozenge status={t.status} />
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </SheetSection>
                                <div className="flex flex-wrap gap-3">
                                    {(viewing.status === "ACTIVE" || viewing.status === "PAUSED") && (
                                        <Button variant="outline" onClick={() => toggle(viewing)}>
                                            {viewing.status === "ACTIVE" ? <><PauseCircle className="size-4 mr-2" />{" "}{tr("Pause deductions")}</> : <><PlayCircle className="size-4 mr-2" />{" "}{tr("Resume deductions")}</>}
                                        </Button>
                                    )}
                                    <Button variant="outline" className="text-rose-600 hover:text-rose-700" onClick={() => setDeleting(viewing)}>
                                        <Trash2 className="size-4 mr-2" />{" "}{tr("Delete")}</Button>
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            <BeneficiaryModal
                isOpen={modal.open}
                onClose={() => setModal({ open: false, beneficiary: null })}
                onSuccess={() => { refresh(); setViewing(null) }}
                beneficiary={modal.beneficiary}
            />

            <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{tr("Delete this beneficiary?")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            <span className="font-semibold text-[#242a37] dark:text-white">{deleting?.name}</span>{" "}{tr("will stop receiving deductions. This can't be undone.")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tr("Keep")}</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete() }} disabled={isDeleting} className="bg-rose-600 text-white hover:bg-rose-700">
                            {isDeleting ? tr("Deleting…") : tr("Delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
