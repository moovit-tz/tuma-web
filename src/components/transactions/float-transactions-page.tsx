"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, subDays } from "date-fns"
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    PieChart,
    Pie,
    Cell,
} from "recharts"
import {
    Search,
    RefreshCw,
    Download,
    Filter,
    X as XIcon,
    Wallet,
    CheckCircle,
    Clock,
    XCircle,
    CreditCard,
    BarChart3,
    Users,
    Building2,
    Eye,
    Copy,
    MoreHorizontal,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { ListSkeleton } from "@/components/ui/skeletons"
import { TableBanner } from "@/components/ui/table-banner"
import { SheetSection, DetailList } from "@/components/sheets/sheet-blocks"
import { useToast } from "@/components/ui/use-toast"
import { useDebounce } from "@/hooks/use-debounce"
import { apiRequest } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/icon"
import { Search01Icon, FilterIcon, MoneyReceive01Icon, Download01Icon, RefreshIcon } from "@hugeicons/core-free-icons"
import {
    searchFloatTransactions,
    getPaymentProviders,
    getProviderName,
    providerDisplayName,
    formatStatus,
    type FloatTransaction,
    type PaymentProvider,
} from "@/lib/services/float-transactions"
import { ExportMenu } from "@/components/export/export-menu"
import type { ExportColumn } from "@/lib/export-pdf"
import { useTr } from "@/lib/i18n/portal"
import { getAgentFloatBalance } from "@/lib/services/user"
import { NeedsAttention } from "@/components/transactions/needs-attention"

/*
 * Float transactions: agents topping up their float through a mobile-money
 * provider. Figures come from the portal's float aggregator
 * (/api/portal-insights/float-period), which counts every status exactly and
 * adds up every PAID transaction in the period.
 */

const PERIODS = [
    { value: "today", label: "Today" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "all", label: "All Time" },
] as const
type Period = (typeof PERIODS)[number]["value"]

const PAGE_SIZE = 10
const CHART_COLORS = ["#ffd428", "#242a37", "#3b82f6", "#14b8a6", "#8b5cf6", "#f43f5e"]

const TZS = (n?: number | string | null) => `TZS ${new Intl.NumberFormat("en-TZ").format(Math.round(Number(n) || 0))}`

const STATUS_LOZENGE: Record<string, string> = {
    PAID: "bg-[#ffd428] text-[#242a37]",
    PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    FAILED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
}
const STATUS_LABEL: Record<string, string> = { PAID: "Paid", PENDING: "Pending", FAILED: "Failed" }

interface FloatGroup { id: number; name: string; transactions: number; amount: number; phoneNumber?: string | null; companyName?: string | null }
interface FloatPeriod {
    counts: { paid: number; pending: number; failed: number; total: number }
    paidAmount: number | null
    byDay: { date: string; transactions: number; amount: number }[]
    byProvider: FloatGroup[]
    byCompany: FloatGroup[]
    byAgent: FloatGroup[]
}

/** GET /float/transactions/search returns { success, summary, transactions, pagination } — no `data` wrapper */
const unwrapSearch = (result: any) => (Array.isArray(result?.transactions) ? result : result?.data ?? result)

function rangeFor(period: Period) {
    if (period === "all") return null
    const today = new Date()
    const from = period === "today" ? today : subDays(today, period === "7d" ? 6 : 29)
    return { from: format(from, "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") }
}

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
            <div className="absolute right-[-15px] bottom-[-15px] opacity-[0.05] text-[#ffd428] pointer-events-none rotate-12">
                <IconCmp size={100} />
            </div>
            <CardContent className="p-6 relative z-10">
                <div className="size-10 rounded-[var(--ds-radius-small)] flex items-center justify-center bg-white/5 mb-4">
                    <IconCmp className="size-5 text-[#ffd428]" />
                </div>
                <p className="text-xs font-semibold text-[#ffd428]/60 mb-1">{label}</p>
                {value === undefined ? (
                    <Skeleton className="h-7 w-28 bg-white/10" />
                ) : (
                    <h3 className="text-xl font-semibold text-white tabular-nums truncate">{value}</h3>
                )}
                <p className="text-xs font-bold text-white/40 mt-2">{sub}</p>
            </CardContent>
        </Card>
    )
}

function ListCard({ title, description, icon: IconCmp, children, className }: { title: string; description: string; icon: any; children: React.ReactNode; className?: string }) {
    return (
        <Card className={cn(className, "rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden")}>
            <CardHeader className="py-8 px-6 bg-[#242a37] text-white border-none">
                <CardTitle className="text-xl font-semibold text-white flex items-center gap-3">
                    <IconCmp className="size-6 text-[#ffd428]" />
                    {title}
                </CardTitle>
                <CardDescription className="text-xs font-bold text-white/40 mt-1">{description}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">{children}</CardContent>
        </Card>
    )
}

export function FloatTransactionsPage() {
    const tr = useTr()
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState("overview")
    const [period, setPeriod] = useState<Period>("today")
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [providerFilter, setProviderFilter] = useState("all")
    const [page, setPage] = useState(1)
    const [selected, setSelected] = useState<FloatTransaction | null>(null)
    const debouncedSearch = useDebounce(searchQuery, 400)

    const range = useMemo(() => rangeFor(period), [period])
    const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? "Today"

    const { data: providers = [] } = useQuery({
        queryKey: ["payment-providers"],
        queryFn: async () => {
            const result: any = await getPaymentProviders()
            const data = result?.success ? result.data : result
            return ((Array.isArray(data) ? data : []) as PaymentProvider[]).map((p) => ({ ...p, name: providerDisplayName(p.name) }))
        },
        staleTime: 10 * 60_000,
    })

    // Exact period figures (server-side aggregation, cached)
    const periodQuery = useQuery({
        queryKey: ["float-period", range],
        queryFn: async ({ signal }) => {
            const qs = range ? `?from=${range.from}&to=${range.to}` : ""
            return (await apiRequest(`/api/portal-insights/float-period${qs}`, { silent: true, signal })) as FloatPeriod
        },
        staleTime: 60_000,
        retry: 1,
    })
    const fp = periodQuery.data

    // The agent's float balance right now (transactions don't carry it)
    const balanceQuery = useQuery({
        queryKey: ["agent-balance", selected?.userId],
        queryFn: () => getAgentFloatBalance(selected!.userId),
        enabled: !!selected?.userId,
        retry: false,
        staleTime: 30_000,
    })
    const balanceNow = ((balanceQuery.data as any)?.data ?? balanceQuery.data)?.totalBalance ?? selected?.float?.balance

    // The list itself (server paginated and filtered)
    const listQuery = useQuery({
        queryKey: ["float-transactions-list", page, debouncedSearch, statusFilter, providerFilter],
        queryFn: async () => {
            const result: any = await searchFloatTransactions({
                q: debouncedSearch || undefined,
                status: statusFilter !== "all" ? statusFilter : undefined,
                provider: providerFilter !== "all" ? providerFilter : undefined,
                limit: PAGE_SIZE,
                page,
            })
            const data = unwrapSearch(result)
            return {
                transactions: (data?.transactions ?? []) as FloatTransaction[],
                totalPages: Number(data?.pagination?.totalPages) || 1,
                totalItems: Number(data?.pagination?.totalItems ?? data?.summary?.totalTransactions) || 0,
            }
        },
        staleTime: 30_000,
        placeholderData: (prev) => prev,
    })
    const transactions = listQuery.data?.transactions ?? []
    const totalPages = listQuery.data?.totalPages ?? 1
    const totalItems = listQuery.data?.totalItems ?? 0
    const hasFilters = !!searchQuery || statusFilter !== "all" || providerFilter !== "all"

    // Every provider (zero when none paid in the period) + top-ups with no provider recorded
    const providerRows = useMemo(() => {
        if (!fp) return []
        const paid = new Map(fp.byProvider.map((p) => [p.id, p]))
        const rows: FloatGroup[] = providers.map((p) => ({ ...(paid.get(p.id) ?? { id: p.id, transactions: 0, amount: 0 }), name: p.name }))
        for (const p of fp.byProvider) if (!providers.some((x) => x.id === p.id)) rows.push({ ...p, name: providerDisplayName(p.name) })
        const attributed = rows.reduce((acc, r) => acc + r.amount, 0)
        const unattributed = (fp.paidAmount ?? 0) - attributed
        if (unattributed > 0.5) rows.push({ id: 0, name: tr("Provider not recorded"), transactions: 0, amount: unattributed })
        return rows.sort((a, b) => b.amount - a.amount)
    }, [fp, providers])
    const pct = (n?: number) => (fp && fp.counts.total > 0 ? `${(((n ?? 0) / fp.counts.total) * 100).toFixed(1)}%` : "—")
    const providerName = (t: FloatTransaction) =>
        providerDisplayName((t as any).provider?.name) || providers.find((p) => p.id === t.providerId)?.name || "—"

    const clearFilters = () => {
        setSearchQuery("")
        setStatusFilter("all")
        setProviderFilter("all")
        setPage(1)
    }
    const refresh = () => {
        periodQuery.refetch()
        listQuery.refetch()
    }
    const goToList = () => setActiveTab("transactions")

    // Report rows: up to 1,000 transactions matching the current filters
    const loadReportRows = async (): Promise<FloatTransaction[]> => {
        const result: any = await searchFloatTransactions({
            q: debouncedSearch || undefined,
            status: statusFilter !== "all" ? statusFilter : undefined,
            provider: providerFilter !== "all" ? providerFilter : undefined,
            limit: 1000,
            page: 1,
        })
        return unwrapSearch(result)?.transactions ?? []
    }

    const reportColumns: ExportColumn<FloatTransaction>[] = [
        ["Reference", (t) => t.transactionReference],
        ["Agent", (t) => t.user?.fullName || t.user?.username || ""],
        ["Phone", (t) => t.phoneNumber],
        ["Float account", (t) => t.floatAccountNumber],
        ["Amount (TZS)", (t) => Number(t.amount) || 0],
        ["Provider", (t) => getProviderName(t.providerId, providers)],
        ["Status", (t) => formatStatus(t.status)],
        ["Date", (t) => (t.createdAt ? format(new Date(t.createdAt), "yyyy-MM-dd HH:mm") : "")],
    ]

    // PDF summary: real counts and totals of the exported rows (no estimated fees)
    const reportSummary = (rows: FloatTransaction[]): [string, string][] => {
        const total = (s?: string) => rows.filter((t) => !s || t.status === s).reduce((acc, t) => acc + (Number(t.amount) || 0), 0)
        const count = (s: string) => rows.filter((t) => t.status === s).length.toLocaleString()
        return [
            ["Total amount", `TZS ${total().toLocaleString()}`],
            ["Paid", `${count("PAID")} · TZS ${total("PAID").toLocaleString()}`],
            ["Pending", `${count("PENDING")} · TZS ${total("PENDING").toLocaleString()}`],
            ["Failed", `${count("FAILED")} · TZS ${total("FAILED").toLocaleString()}`],
        ]
    }
    const reportFilters = [
        searchQuery && `Search "${searchQuery}"`,
        statusFilter !== "all" && `Status: ${formatStatus(statusFilter)}`,
        providerFilter !== "all" && `Provider: ${getProviderName(Number(providerFilter), providers) || providerFilter}`,
    ].filter(Boolean).join("  ·  ")

    const copy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            toast({ title: tr("Copied"), description: tr("Reference copied.") })
        } catch {
            toast({ variant: "destructive", title: tr("Copy failed"), description: tr("Select the text and copy it manually.") })
        }
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-300">
            {/* ── Top bar — same layout as Companies ── */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 justify-between">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 flex-1 min-w-0">
                    <div className="relative group flex-1 min-w-0 lg:min-w-[16rem]">
                        <Icon icon={Search01Icon} size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ffd428] transition-colors" />
                        <Input
                            placeholder={tr("Search transactions")}
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
                            <SelectTrigger className="w-full sm:w-36 h-10 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-medium shadow-none outline-none focus:ring-1 focus:ring-[#ffd428]/50">
                                <div className="flex items-center gap-2"><Icon icon={FilterIcon} size={16} className="shrink-0 text-slate-500 dark:text-slate-400" /><SelectValue placeholder="STATUS" /></div>
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)]">
                                <SelectItem value="all" className="text-sm">{tr("All statuses")}</SelectItem>
                                <SelectItem value="PAID" className="text-sm">{tr("Paid")}</SelectItem>
                                <SelectItem value="PENDING" className="text-sm">{tr("Pending")}</SelectItem>
                                <SelectItem value="FAILED" className="text-sm">{tr("Failed")}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={providerFilter} onValueChange={(v) => { setProviderFilter(v); setPage(1); goToList() }}>
                            <SelectTrigger className="w-full sm:w-44 h-10 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-medium shadow-none outline-none focus:ring-1 focus:ring-[#ffd428]/50">
                                <div className="flex items-center gap-2"><Icon icon={MoneyReceive01Icon} size={16} className="shrink-0 text-slate-500 dark:text-slate-400" /><SelectValue placeholder="PROVIDER" /></div>
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)]">
                                <SelectItem value="all" className="text-sm">{tr("All providers")}</SelectItem>
                                {providers.map((p) => (
                                    <SelectItem key={p.id} value={String(p.id)} className="text-xs font-semibold uppercase">{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {hasFilters && (
                            <Button variant="ghost" onClick={clearFilters} className="h-10 text-sm font-medium">
                                <XIcon className="size-4 mr-1" />{" "}{tr("Clear")}</Button>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={refresh} aria-label={tr("Refresh transactions")}
                        className="h-10 w-10 text-slate-400 hover:text-[#ffd428] rounded-[var(--ds-radius-small)]">
                        <Icon icon={RefreshIcon} size={20} className={cn((periodQuery.isFetching || listQuery.isFetching) && "animate-spin")} />
                    </Button>
                    <ExportMenu
                        filename="float-transactions"
                        title={tr("Float transactions")}
                        label={tr("Download report")}
                        variant="primary"
                        rows={loadReportRows}
                        columns={reportColumns}
                        subtitle={tr("{transactions} · newest 1,000 at most", { transactions: reportFilters || "All transactions" })}
                        summary={reportSummary}
                    />
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <TabsList className="portal-sticky-tabs bg-slate-100 dark:bg-black/20 p-1.5 rounded-[var(--ds-radius-small)] w-full items-stretch h-auto">
                    <TabsTrigger value="overview" className="flex-1 h-11 text-xs font-semibold cursor-pointer">
                        <BarChart3 className="size-4 mr-2" />{" "}{tr("Overview")}</TabsTrigger>
                    <TabsTrigger value="transactions" className="flex-1 h-11 text-xs font-semibold gap-3 cursor-pointer">
                        <div className="flex items-center gap-2"><Wallet className="size-4" />{" "}{tr("All Transactions")}</div>
                        <Badge className="bg-[#ffd428] text-[#242a37] border-none text-xs font-semibold h-6 min-w-10 flex items-center justify-center rounded-[var(--ds-radius-small)]">
                            {totalItems.toLocaleString()}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="attention" className="flex-1 h-11 text-xs font-semibold gap-3 cursor-pointer">
                        <div className="flex items-center gap-2"><AlertTriangle className="size-4" />{" "}{tr("Needs attention")}</div>
                        {fp && fp.counts.pending + fp.counts.failed > 0 && (
                            <Badge className="bg-rose-500 text-white border-none text-xs font-semibold h-6 min-w-10 flex items-center justify-center rounded-[var(--ds-radius-small)]">
                                {(fp.counts.pending + fp.counts.failed).toLocaleString()}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* ════════ NEEDS ATTENTION ════════ */}
                <TabsContent value="attention" className="focus:outline-none">
                    <NeedsAttention range={range} providerName={providerName} onOpen={setSelected} />
                </TabsContent>

                {/* ════════ OVERVIEW ════════ */}
                <TabsContent value="overview" className="space-y-10 focus:outline-none">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <h2 className="text-lg font-semibold text-[#242a37] dark:text-white">{tr("Float top-ups")}</h2>
                            <p className="text-xs font-bold text-slate-400 mt-1">{tr("Agents adding money to their float ·")}{" "}{periodLabel}
                                {periodQuery.isFetching && fp && <span className="ml-2 text-slate-500">{tr("· Updating…")}</span>}
                            </p>
                            {periodQuery.isError && (
                                <p className="text-xs font-semibold text-rose-500 mt-1">{tr("Couldn't load this period.")}{" "}
                                    <button onClick={() => periodQuery.refetch()} className="underline cursor-pointer">{tr("Retry")}</button>
                                </p>
                            )}
                        </div>
                        <div className="flex p-1.5 bg-slate-100 dark:bg-black/20 rounded-[var(--ds-radius-small)] w-fit max-w-full overflow-x-auto">
                            {PERIODS.map((option) => (
                                <button key={option.value} onClick={() => setPeriod(option.value)}
                                    className={cn("h-9 px-4 rounded-[var(--ds-radius-small)] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                                        period === option.value ? "bg-white dark:bg-[#242a37] shadow-[var(--ds-shadow-raised)] text-[#ffd428]" : "text-slate-400")}>
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <NavyCard
                            label={tr("Float topped up")}
                            value={fp ? (fp.paidAmount === null ? "—" : TZS(fp.paidAmount)) : periodQuery.isError ? "—" : undefined}
                            sub={fp?.paidAmount === null ? tr("Too many to add up — pick a shorter period") : tr("Successful top-ups only")}
                            icon={Wallet}
                        />
                        <NavyCard label={tr("Successful")} value={fp ? fp.counts.paid.toLocaleString() : periodQuery.isError ? "—" : undefined} sub={tr("{pct} of attempts", { pct: pct(fp?.counts.paid) })} icon={CheckCircle} />
                        <NavyCard label={tr("Pending")} value={fp ? fp.counts.pending.toLocaleString() : periodQuery.isError ? "—" : undefined} sub={tr("Waiting for the provider")} icon={Clock} />
                        <NavyCard label={tr("Failed")} value={fp ? fp.counts.failed.toLocaleString() : periodQuery.isError ? "—" : undefined} sub={tr("{pct} of attempts", { pct: pct(fp?.counts.failed) })} icon={XCircle} />
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <ListCard title={tr("Top-ups per day")} description={tr("Paid amount by day · {periodLabel}", { periodLabel })} icon={BarChart3} className="lg:col-span-2">
                            <div className="p-6 h-[300px]">
                                {!fp ? (
                                    <Skeleton className="h-full w-full" />
                                ) : fp.byDay.length === 0 ? (
                                    <p className="text-sm text-slate-400">{fp.paidAmount === null ? tr("Pick a shorter period to see the daily chart.") : tr("No top-ups {periodLabel}.", { periodLabel: periodLabel.toLowerCase() })}</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={fp.byDay.map((d) => ({ ...d, label: format(new Date(d.date), "d MMM") }))} barCategoryGap="25%">
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                                            <RechartsTooltip cursor={{ fill: "transparent" }} formatter={(v: any) => [TZS(v), "Topped up"]} />
                                            <Bar dataKey="amount" name="Topped up" fill="#ffd428" radius={[8, 8, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </ListCard>
                        <ListCard title={tr("Providers")} description={tr("Share of float topped up · {periodLabel}", { periodLabel })} icon={CreditCard}>
                            <div className="p-6">
                                {!fp ? (
                                    <ListSkeleton rows={4} className="-mx-5" />
                                ) : fp.paidAmount === null ? (
                                    <p className="text-sm text-slate-400">{tr("Pick a shorter period to see providers.")}</p>
                                ) : providerRows.every((p) => p.amount === 0) ? (
                                    <div className="space-y-3">
                                        <p className="text-sm text-slate-400">{tr("No top-ups {periodLabel}.", { periodLabel: periodLabel.toLowerCase() })}</p>
                                        {providerRows.map((p) => (
                                            <div key={p.id} className="flex items-center justify-between text-xs font-semibold text-slate-500">
                                                <span>{p.name}</span><span className="tabular-nums">{TZS(0)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-6">
                                        <div className="h-[180px] w-[180px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={providerRows.filter((p) => p.amount > 0)} dataKey="amount" nameKey="name" innerRadius="65%" outerRadius="90%" paddingAngle={3} stroke="none">
                                                        {providerRows.filter((p) => p.amount > 0).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                                    </Pie>
                                                    <RechartsTooltip formatter={(v: any) => TZS(v)} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="w-full space-y-3">
                                            {providerRows.map((p, i) => (
                                                <div key={p.id} className={cn("flex items-center justify-between gap-2", p.amount === 0 && "opacity-50")}>
                                                    <span className="flex items-center gap-2 min-w-0 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.amount > 0 ? CHART_COLORS[providerRows.filter((r) => r.amount > 0).indexOf(p) % CHART_COLORS.length] : "#cbd5e1" }} />
                                                        <span className="truncate">{p.name}</span>
                                                        {p.transactions > 0 && <span className="shrink-0 font-normal text-slate-400">· {p.transactions.toLocaleString()}</span>}
                                                    </span>
                                                    <span className="text-xs font-semibold tabular-nums text-[#242a37] dark:text-white">{TZS(p.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ListCard>
                    </div>

                    {/* Rankings */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {[
                            { title: tr("Agents"), desc: `Most float topped up · ${periodLabel}`, icon: Users, rows: fp?.byAgent ?? [], detail: (r: FloatGroup) => [r.companyName, r.phoneNumber].filter(Boolean).join(" · ") || "—" },
                            { title: tr("Companies"), desc: `Float topped up by their agents · ${periodLabel}`, icon: Building2, rows: fp?.byCompany ?? [], detail: (r: FloatGroup) => `${r.transactions.toLocaleString()} top-up${r.transactions === 1 ? "" : "s"}` },
                        ].map((list) => (
                            <ListCard key={list.title} title={list.title} description={list.desc} icon={list.icon}>
                                <div className="divide-y divide-slate-50 dark:divide-white/5">
                                    {!fp ? (
                                        <ListSkeleton rows={5} avatar />
                                    ) : list.rows.length === 0 ? (
                                        <p className="p-6 text-sm text-slate-400">{fp.paidAmount === null ? tr("Pick a shorter period to see rankings.") : tr("No top-ups {periodLabel}.", { periodLabel: periodLabel.toLowerCase() })}</p>
                                    ) : list.rows.slice(0, 5).map((row, i) => (
                                        <div key={row.id} className="px-6 py-4 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className={cn("size-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold",
                                                    i === 0 ? "bg-[#ffd428] text-[#242a37]" : "bg-slate-100 dark:bg-white/5 text-slate-400")}>{i + 1}</div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{row.name}</p>
                                                    <p className="text-xs font-bold text-slate-400 mt-1 truncate">{list.detail(row)}</p>
                                                </div>
                                            </div>
                                            <p className="shrink-0 text-[13px] font-semibold tabular-nums text-[#242a37] dark:text-white">{TZS(row.amount)}</p>
                                        </div>
                                    ))}
                                </div>
                            </ListCard>
                        ))}
                    </div>
                </TabsContent>

                {/* ════════ ALL TRANSACTIONS ════════ */}
                <TabsContent value="transactions" className="space-y-8">
                    <div className="bg-white dark:bg-[#1a1f2b] rounded-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)] border border-slate-100 dark:border-white/5 overflow-hidden">
                        <TableBanner title={tr("All Transactions")} description={tr("Every float top-up attempt, newest first")} icon="transactions" />
                        {listQuery.isPending ? (
                            <ListSkeleton rows={8} />
                        ) : listQuery.isError ? (
                            <div className="px-6 py-16 text-center">
                                <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Couldn't load transactions")}</p>
                                <Button variant="outline" className="mt-4" onClick={() => listQuery.refetch()}>{tr("Try again")}</Button>
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="px-6 py-16 text-center">
                                <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("No transactions found")}</p>
                                <p className="mt-1 text-sm text-slate-500">{hasFilters ? tr("Try a different search or filter.") : tr("Top-ups will appear here.")}</p>
                                {hasFilters && <Button variant="outline" className="mt-4" onClick={clearFilters}>{tr("Reset filters")}</Button>}
                            </div>
                        ) : (
                            <div className="bg-slate-50/50 dark:bg-black/10">
                                <div className="overflow-x-auto">
                                    <Table className="min-w-[980px]">
                                        <TableHeader>
                                            <TableRow className="bg-[#242a37] border-b border-transparent hover:bg-[#242a37]">
                                                <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs">{tr("Transaction")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Agent")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Provider")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Amount")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-center">{tr("Status")}</TableHead>
                                                <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Actions")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {transactions.map((t) => (
                                                <TableRow
                                                    key={t.id}
                                                    tabIndex={0}
                                                    aria-label={tr("Open transaction {transactionReference}", { transactionReference: t.transactionReference })}
                                                    onClick={() => setSelected(t)}
                                                    onKeyDown={(e) => {
                                                        if (e.target !== e.currentTarget) return
                                                        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(t) }
                                                    }}
                                                    className="hover:bg-white dark:hover:bg-white/[0.04] transition-colors border-b border-slate-200/60 dark:border-white/5 cursor-pointer group outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ds-border-focused)]"
                                                >
                                                    <TableCell className="px-6 py-4 max-w-[260px]">
                                                        <p className="font-mono font-semibold text-sm text-slate-900 dark:text-white group-hover:text-[#ffd428] transition-colors truncate">{t.transactionReference || "—"}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge variant="outline" className="bg-[#ffd428]/10 text-[#ffd428] border-none text-[11px] font-semibold h-5 px-2 rounded-md">{tr("ID: {padStart}", { padStart: String(t.id).padStart(3, "0") })}</Badge>
                                                            <p className="text-xs text-slate-400 font-bold">{format(new Date(t.createdAt), "d MMM yyyy, HH:mm")}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="size-1.5 rounded-full bg-[#ffd428]" />
                                                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">{t.user?.fullName || t.user?.username || "—"}</p>
                                                            </div>
                                                            <div className="h-[18px] px-2.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[6px] text-xs font-semibold text-slate-400 w-fit flex items-center tabular-nums">
                                                                {(t as any).user?.company?.name || t.phoneNumber || "—"}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{providerName(t)}</p>
                                                        <p className="mt-1 text-xs text-slate-400 tabular-nums">{t.phoneNumber || "—"}</p>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{TZS(t.amount)}</p>
                                                        <p className="mt-1 text-xs font-mono text-slate-400">{t.floatAccountNumber || "—"}</p>
                                                    </TableCell>
                                                    <TableCell className="py-4 text-center"><StatusLozenge status={t.status} /></TableCell>
                                                    <TableCell className="px-6 py-4 text-right">
                                                        <DropdownMenu modal={false}>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" aria-label={tr("Actions for {transactionReference}", { transactionReference: t.transactionReference })} onClick={(e) => e.stopPropagation()}
                                                                    className="size-10 rounded-[var(--ds-radius-small)] bg-slate-50 dark:bg-white/5 hover:bg-[#ffd428] dark:hover:bg-[#ffd428] hover:text-[#242a37] text-slate-400 transition-colors cursor-pointer">
                                                                    <MoreHorizontal className="size-5" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-64 rounded-[var(--ds-radius-large)] p-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                                                <DropdownMenuItem onClick={() => setSelected(t)} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold focus:bg-[#ffd428] focus:text-[#242a37] cursor-pointer">
                                                                    <Eye className="size-5 mr-3" />{" "}{tr("View transaction")}</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => copy(t.transactionReference)} className="rounded-[var(--ds-radius-small)] py-3 text-xs font-semibold focus:bg-[#ffd428] focus:text-[#242a37] cursor-pointer">
                                                                    <Copy className="size-5 mr-3" />{" "}{tr("Copy reference")}</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <p className="text-xs text-slate-500">{tr("Page {page} of {totalPages} · {totalItems} transactions", { page, totalPages, totalItems: totalItems.toLocaleString() })}</p>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" disabled={page <= 1 || listQuery.isFetching} onClick={() => setPage(page - 1)}>
                                            <ChevronLeft className="size-4 mr-1" />{" "}{tr("Previous")}</Button>
                                        <Button variant="outline" size="sm" disabled={page >= totalPages || listQuery.isFetching} onClick={() => setPage(page + 1)}>{tr("Next")}{" "}<ChevronRight className="size-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* ── Transaction sheet ── */}
            <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
                <SheetContent side="right" className="[&>button]:hidden flex h-full w-full flex-col overflow-hidden border-l p-0 outline-none sm:max-w-[600px] bg-white dark:bg-[#0f1117]">
                    {selected && (
                        <>
                            <SheetTitle className="sr-only">{tr("Transaction {transactionReference}", { transactionReference: selected.transactionReference })}</SheetTitle>
                            <SheetDescription className="sr-only">{tr("Details of this float top-up.")}</SheetDescription>
                            <div className="shrink-0 bg-[#242a37] p-5 pt-6 sm:p-8 sm:pt-10 text-white">
                                <div className="mb-6 sm:mb-8 flex items-start justify-between gap-3">
                                    <div className="flex size-14 items-center justify-center rounded-[var(--ds-radius-small)] bg-[#ffd428]">
                                        <Wallet className="size-7 text-[#242a37]" />
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                                        <Button onClick={() => copy(selected.transactionReference)}
                                            className="h-9 gap-2 rounded-[var(--ds-radius-small)] border-none bg-[#ffd428] px-4 text-xs font-semibold text-[#242a37] hover:bg-[#ffdb4d]">
                                            <Copy className="size-4" />{" "}{tr("Copy reference")}</Button>
                                        <Button variant="ghost" onClick={() => setSelected(null)} aria-label={tr("Close")}
                                            className="flex size-9 items-center justify-center rounded-full bg-white/10 p-0 text-white hover:bg-white/20 hover:text-white">
                                            <XIcon className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-end justify-between gap-4">
                                    <div className="min-w-0">
                                        <h2 className="text-2xl font-bold leading-none tabular-nums">{TZS(selected.amount)}</h2>
                                        <p className="mt-2 truncate text-xs font-semibold text-white/50">{tr("Transaction ID: #")}{String(selected.id).padStart(4, "0")} <span className="text-white/20">•</span> {providerName(selected)}
                                        </p>
                                    </div>
                                    <StatusLozenge status={selected.status} />
                                </div>
                            </div>
                            <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto bg-[#f1f3f6] p-4 sm:p-8 dark:bg-[#0a0c10]">
                                <SheetSection title={tr("Payment")}>
                                    <DetailList rows={[
                                        { label: tr("Reference"), value: selected.transactionReference || "—", mono: true },
                                        { label: tr("Amount"), value: TZS(selected.amount) },
                                        { label: tr("Status"), value: <StatusLozenge status={selected.status} /> },
                                        { label: tr("Provider"), value: providerName(selected) },
                                        { label: tr("Paid from"), value: selected.phoneNumber || "—", mono: true },
                                        { label: tr("Provider message"), value: selected.providerResponse || "—" },
                                    ]} />
                                </SheetSection>
                                <SheetSection title={tr("Agent and float")}>
                                    <DetailList rows={[
                                        { label: tr("Agent"), value: selected.user?.fullName || selected.user?.username || "—" },
                                        { label: tr("Username"), value: selected.user?.username ? `@${selected.user.username}` : "—", mono: true },
                                        { label: tr("Agent phone"), value: selected.user?.phoneNumber || "—", mono: true },
                                        { label: tr("Company"), value: (selected as any).user?.company?.name || "—" },
                                        { label: tr("Float account"), value: selected.floatAccountNumber || "—", mono: true },
                                        { label: tr("Float balance now"), value: balanceQuery.isLoading ? tr("Loading…") : balanceNow != null ? TZS(balanceNow) : "—" },
                                    ]} />
                                </SheetSection>
                                <SheetSection title={tr("Timeline")}>
                                    <DetailList rows={[
                                        { label: tr("Started"), value: format(new Date(selected.createdAt), "d MMM yyyy, HH:mm:ss") },
                                        { label: tr("Last update"), value: format(new Date(selected.updatedAt), "d MMM yyyy, HH:mm:ss") },
                                    ]} />
                                </SheetSection>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    )
}
