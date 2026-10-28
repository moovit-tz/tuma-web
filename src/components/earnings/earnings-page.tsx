"use client"

import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { format, subDays } from "date-fns"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from "recharts"
import { Icon } from "@/components/ui/icon"
import { MoneyReceive01Icon, Package01Icon, ChartBarLineIcon, CheckListIcon, RefreshIcon, Location01Icon, OfficeIcon } from "@hugeicons/core-free-icons"
import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { ListSkeleton } from "@/components/ui/skeletons"
import { TableBanner } from "@/components/ui/table-banner"
import { cn } from "@/lib/utils"
import { getParcelPriceData, getParcelPriceByRegion, getParcelPriceByOffice, getParcelPriceList, getCompaniesPeriodMetrics } from "@/lib/services/parcel"
import { getCompanies } from "@/lib/services/company"
import { Input } from "@/components/ui/input"
import { ExportMenu } from "@/components/export/export-menu"
import { ListPager, usePaged } from "@/components/ui/list-pager"
import { Building2, Search, X as XIcon } from "lucide-react"
import { useTr } from "@/lib/i18n/portal"

/*
 * Earnings = parcel prices (what customers paid to send parcels), from the
 * backend's own aggregates: GET /parcel/price, /price-region, /price-office
 * and /price-list. Shared by the ops, admin and biz portals; the backend
 * scopes the figures to the signed-in account (an owner sees their company).
 */

const PERIODS = [
    { value: "today", label: "Today" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "all", label: "All Time" },
] as const
type Period = (typeof PERIODS)[number]["value"]

const PAGE_SIZE = 10
const TZS = (n?: number | string | null) => `TZS ${new Intl.NumberFormat("en-TZ").format(Math.round(Number(n) || 0))}`

const STATUS_ROWS = [
    { key: "RECEIVED", label: "Received", color: "#94a3b8" },
    { key: "DISPATCHED", label: "Dispatched", color: "#3b82f6" },
    { key: "OFFLOADED", label: "Offloaded", color: "#8b5cf6" },
    { key: "PICKED_UP", label: "Picked up", color: "#14b8a6" },
    { key: "DELIVERED", label: "Delivered", color: "#ffd428" },
    { key: "CANCELED", label: "Cancelled", color: "#f43f5e" },
]
const STATUS_LOZENGE: Record<string, string> = {
    DELIVERED: "bg-[#ffd428] text-[#242a37]",
    PICKED_UP: "bg-[#ffd428] text-[#242a37]",
    DISPATCHED: "bg-[#242a37] text-white dark:bg-white dark:text-[#242a37]",
    OFFLOADED: "bg-[#242a37] text-white dark:bg-white dark:text-[#242a37]",
    RECEIVED: "bg-[#242a37]/10 text-[#242a37] dark:bg-white/10 dark:text-white",
    CANCELED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
}

function rangeFor(period: Period) {
    if (period === "all") return {}
    const today = new Date()
    const from = period === "today" ? today : subDays(today, period === "7d" ? 6 : 29)
    return { dateFrom: format(from, "yyyy-MM-dd"), dateTo: format(today, "yyyy-MM-dd") }
}

function NavyCard({ label, value, sub, icon }: { label: string; value?: string; sub: string; icon: any }) {
    return (
        <Card className="rounded-[var(--ds-radius-large)] border-none h-full bg-[#242a37] relative overflow-hidden shadow-[var(--ds-shadow-raised)]">
            <div className="absolute right-[-15px] bottom-[-15px] opacity-[0.05] text-[#ffd428] pointer-events-none rotate-12"><Icon icon={icon} size={100} /></div>
            <CardContent className="p-6 relative z-10">
                <div className="size-10 rounded-[var(--ds-radius-small)] flex items-center justify-center bg-white/5 mb-4"><Icon icon={icon} className="size-5 text-[#ffd428]" /></div>
                <p className="text-xs font-semibold text-[#ffd428]/60 mb-1">{label}</p>
                {value === undefined ? <Skeleton className="h-7 w-28 bg-white/10" /> : <h3 className="text-xl font-semibold text-white tabular-nums truncate">{value}</h3>}
                <p className="text-xs font-bold text-white/40 mt-2">{sub}</p>
            </CardContent>
        </Card>
    )
}

function ListCard({ title, description, icon, children, className }: { title: string; description: string; icon: any; children: React.ReactNode; className?: string }) {
    return (
        <Card className={cn(className, "rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden")}>
            <CardHeader className="py-8 px-6 bg-[#242a37] text-white border-none">
                <CardTitle className="text-xl font-semibold text-white flex items-center gap-3"><Icon icon={icon} className="text-[#ffd428]" size={24} />{title}</CardTitle>
                <CardDescription className="text-xs font-bold text-white/40 mt-1">{description}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">{children}</CardContent>
        </Card>
    )
}

function RankList({ rows, unit, empty }: { rows: { id: string | number; name: string; detail?: string; amount: number; parcels: number }[]; unit: string; empty: string }) {
    if (rows.length === 0) return <p className="p-6 text-sm text-slate-400">{empty}</p>
    return (
        <div className="divide-y divide-slate-50 dark:divide-white/5">
            {rows.map((row, i) => (
                <div key={row.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className={cn("size-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold",
                            i === 0 ? "bg-[#ffd428] text-[#242a37]" : "bg-slate-100 dark:bg-white/5 text-slate-400")}>{i + 1}</div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{row.name}</p>
                            <p className="text-xs font-bold text-slate-400 mt-1 truncate">{row.detail ? `${row.detail} · ` : ""}{row.parcels.toLocaleString()} {unit}</p>
                        </div>
                    </div>
                    <p className="shrink-0 text-[13px] font-semibold tabular-nums text-[#242a37] dark:text-white">{TZS(row.amount)}</p>
                </div>
            ))}
        </div>
    )
}

// Ops and admin see every company; an owner's earnings are their own company only
export function EarningsPage({ byCompany = false }: { byCompany?: boolean }) {
    const tr = useTr()
    const queryClient = useQueryClient()
    const [period, setPeriod] = useState<Period>("30d")
    const [activeTab, setActiveTab] = useState("overview")
    const [page, setPage] = useState(1)
    const range = useMemo(() => rangeFor(period), [period])
    const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? "Last 30 Days"

    const priceQuery = useQuery({ queryKey: ["earnings-price", range], queryFn: () => getParcelPriceData(range), staleTime: 60_000 })
    const regionQuery = useQuery({ queryKey: ["earnings-region", range], queryFn: () => getParcelPriceByRegion(range), staleTime: 5 * 60_000 })
    const officeQuery = useQuery({ queryKey: ["earnings-office", range], queryFn: () => getParcelPriceByOffice(range), staleTime: 5 * 60_000 })
    const listQuery = useQuery({
        queryKey: ["earnings-list", range, page],
        queryFn: () => getParcelPriceList({ ...range, page, perPage: PAGE_SIZE }),
        staleTime: 60_000,
        placeholderData: (prev) => prev,
    })

    const earnings: any = (priceQuery.data as any)?.data
    const regions: any[] = (regionQuery.data as any)?.data?.regions?.[0]?.data ?? []
    const offices: any[] = (officeQuery.data as any)?.data?.offices?.[0]?.data ?? []
    const rows: any[] = (listQuery.data as any)?.data?.transactions ?? []
    const pagination: any = (listQuery.data as any)?.data?.pagination
    const summary: any = (listQuery.data as any)?.data?.summary
    const totalPages = Number(pagination?.totalPages) || 1

    // Actual revenue: cancelled parcels earn nothing, so they're taken out of the totals
    const gross = Number(earnings?.totalPrice) || 0
    const cancelled = earnings?.statusBreakdown?.CANCELED ?? { totalPrice: 0, count: 0 }
    const cancelledAmount = Number(cancelled.totalPrice) || 0
    const cancelledCount = Number(cancelled.count) || 0
    const total = Math.max(0, gross - cancelledAmount)
    const parcels = Math.max(0, (Number(earnings?.totalParcels) || 0) - cancelledCount)
    const average = parcels > 0 ? total / parcels : 0
    const delivered = earnings?.statusBreakdown?.DELIVERED
    const pct = (n: number) => (total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "—")

    const topRegions = [...regions]
        .sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0))
        .map((r) => ({ id: r.regionId ?? r.regionName, name: r.regionName || "—", amount: Number(r.totalAmount) || 0, parcels: Number(r.parcelCount) || 0 }))
    const topOffices = [...offices]
        .sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0))
        .map((o) => ({ id: o.officeId ?? o.officeName, name: o.officeName || "—", detail: o.regionName, amount: Number(o.totalAmount) || 0, parcels: Number(o.parcelCount) || 0 }))

    // By company: exact totals per company (cancelled parcels left out), from every parcel in the period
    const companyRange = useMemo(() => ("dateFrom" in range ? (range as { dateFrom: string; dateTo: string }) : { dateFrom: "2020-01-01", dateTo: format(new Date(), "yyyy-MM-dd") }), [range])
    const companyMetricsQuery = useQuery({
        queryKey: ["earnings-companies", companyRange],
        queryFn: ({ signal }) => getCompaniesPeriodMetrics(companyRange, { signal }),
        enabled: byCompany && activeTab === "companies",
        staleTime: 2 * 60_000,
        retry: false,
    })
    const companyNamesQuery = useQuery({
        queryKey: ["earnings-company-names"],
        queryFn: async () => ((await getCompanies({ all: true, limit: 1000 } as any)) as any)?.data ?? [],
        enabled: byCompany,
        staleTime: 10 * 60_000,
    })
    const [companySearch, setCompanySearch] = useState("")
    const companyRows = useMemo(() => {
        const names = new Map<number, string>(((companyNamesQuery.data ?? []) as any[]).map((c) => [Number(c.id), c.name]))
        const q = companySearch.trim().toLowerCase()
        return Object.entries(companyMetricsQuery.data ?? {})
            .map(([id, m]) => ({ id: Number(id), name: names.get(Number(id)) ?? `Company #${id}`, revenue: m.totalRevenue, parcels: m.totalParcels, cancelled: m.cancelledParcels ?? 0, cancelledRevenue: m.cancelledRevenue ?? 0 }))
            .filter((c) => c.revenue > 0 || c.parcels > 0 || c.cancelled > 0)
            .filter((c) => !q || c.name.toLowerCase().includes(q))
            .sort((a, b) => b.revenue - a.revenue)
    }, [companyMetricsQuery.data, companyNamesQuery.data, companySearch])
    const companyTotal = companyRows.reduce((sum, c) => sum + c.revenue, 0)
    const companyPage = usePaged(companyRows, `${companySearch}|${period}`)
    const tooBig = (companyMetricsQuery.error as any)?.message?.includes("limit") || (companyMetricsQuery.error as any)?.message?.includes("413")

    const refresh = () => queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("earnings-") })
    const loadingFigures = priceQuery.isPending

    return (
        <div className="space-y-10 animate-in fade-in duration-300">
            {/* ── Top bar ── */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-6 justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-[#242a37] dark:text-white">{tr("Earnings")}</h2>
                    <p className="text-xs font-bold text-slate-400 mt-1">{tr("What customers paid to send parcels · {periodLabel}", { periodLabel })}</p>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex p-1.5 bg-slate-100 dark:bg-black/20 rounded-[var(--ds-radius-small)] w-fit max-w-full overflow-x-auto">
                        {PERIODS.map((option) => (
                            <button key={option.value} onClick={() => { setPeriod(option.value); setPage(1) }}
                                className={cn("h-9 px-4 rounded-[var(--ds-radius-small)] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                                    period === option.value ? "bg-white dark:bg-[#242a37] shadow-[var(--ds-shadow-raised)] text-[#ffd428]" : "text-slate-400")}>
                                {option.label}
                            </button>
                        ))}
                    </div>
                    <Button variant="ghost" size="icon" onClick={refresh} aria-label={tr("Refresh earnings")}
                        className="h-10 w-10 text-slate-400 hover:text-[#ffd428] rounded-[var(--ds-radius-small)]">
                        <Icon icon={RefreshIcon} size={20} className={cn((priceQuery.isFetching || listQuery.isFetching) && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {priceQuery.isError && (
                <p className="text-sm font-semibold text-rose-500">{tr("Couldn't load earnings.")}{" "}<button onClick={() => priceQuery.refetch()} className="underline cursor-pointer">{tr("Retry")}</button>
                </p>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <TabsList className="portal-sticky-tabs bg-slate-100 dark:bg-black/20 p-1.5 rounded-[var(--ds-radius-small)] w-full items-stretch h-auto">
                    <TabsTrigger value="overview" className="flex-1 h-11 text-xs font-semibold cursor-pointer"><BarChart3 className="size-4 mr-2" />{" "}{tr("Overview")}</TabsTrigger>
                    <TabsTrigger value="earnings" className="flex-1 h-11 text-xs font-semibold gap-3 cursor-pointer">
                        <div className="flex items-center gap-2"><Icon icon={MoneyReceive01Icon} size={16} />{" "}{tr("All Earnings")}</div>
                        <Badge className="bg-[#ffd428] text-[#242a37] border-none text-xs font-semibold h-6 min-w-10 flex items-center justify-center rounded-[var(--ds-radius-small)]">
                            {(Number(pagination?.totalItems) || parcels).toLocaleString()}
                        </Badge>
                    </TabsTrigger>
                    {byCompany && (
                        <TabsTrigger value="companies" className="flex-1 h-11 text-xs font-semibold gap-2 cursor-pointer">
                            <Building2 className="size-4" />{tr("By company")}
                            {companyMetricsQuery.data && (
                                <Badge className="bg-[#ffd428] text-[#242a37] border-none text-xs font-semibold h-6 min-w-8 justify-center rounded-[var(--ds-radius-small)]">{companyRows.length.toLocaleString()}</Badge>
                            )}
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* ════════ BY COMPANY ════════ */}
                {byCompany && (
                    <TabsContent value="companies" className="space-y-4 focus:outline-none">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="relative flex-1 min-w-0">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
                                <Input value={companySearch} onChange={(e) => setCompanySearch(e.target.value)} placeholder={tr("Search companies")} aria-label={tr("Search companies")}
                                    className="h-10 w-full pl-10 pr-9 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm shadow-none" />
                                {companySearch && (
                                    <button type="button" aria-label={tr("Clear search")} onClick={() => setCompanySearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-rose-500"><XIcon className="size-4" /></button>
                                )}
                            </div>
                            <ExportMenu className="shrink-0" filename="earnings-by-company" title={tr("Earnings by company")}
                                subtitle={`${periodLabel} · ${tr("cancelled parcels left out")}`}
                                rows={companyRows}
                                columns={[
                                    [tr("Company"), (c) => c.name],
                                    [tr("Parcels"), (c) => c.parcels],
                                    [tr("Average price (TZS)"), (c) => (c.parcels ? Math.round(c.revenue / c.parcels) : 0)],
                                    [tr("Cancelled"), (c) => c.cancelled],
                                    [tr("Revenue (TZS)"), (c) => Math.round(c.revenue)],
                                ]}
                                summary={(rows) => [
                                    [tr("Revenue"), TZS(rows.reduce((sum, c) => sum + c.revenue, 0))],
                                    [tr("Parcels"), rows.reduce((sum, c) => sum + c.parcels, 0).toLocaleString()],
                                    [tr("Cancelled"), rows.reduce((sum, c) => sum + c.cancelled, 0).toLocaleString()],
                                    [tr("Companies"), rows.length.toLocaleString()],
                                ]} />
                        </div>
                        <div className="bg-white dark:bg-[#1a1f2b] rounded-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)] border border-slate-100 dark:border-white/5 overflow-hidden">
                            <TableBanner title={tr("Earnings by company")} description={tr("What each company's parcels earned · {periodLabel} · cancelled parcels left out", { periodLabel })} icon="earnings" />
                            {companyMetricsQuery.isPending ? <ListSkeleton rows={8} /> : companyMetricsQuery.isError ? (
                                <div className="px-6 py-16 text-center">
                                    <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tooBig ? tr("Too many parcels to add up") : tr("Couldn't load earnings")}</p>
                                    <p className="mt-1 text-sm text-slate-500">{tooBig ? tr("Pick a shorter period.") : tr("Please try again.")}</p>
                                    {!tooBig && <Button variant="outline" className="mt-4" onClick={() => companyMetricsQuery.refetch()}>{tr("Try again")}</Button>}
                                </div>
                            ) : companyRows.length === 0 ? (
                                <p className="px-6 py-16 text-center text-sm text-slate-500">{companySearch ? tr("No company matches") : tr("No earnings {periodLabel}.", { periodLabel: periodLabel.toLowerCase() })}</p>
                            ) : (
                                <div className="bg-slate-50/50 dark:bg-black/10">
                                    <Table className="min-w-[760px]">
                                        <TableHeader>
                                            <TableRow className="bg-[#242a37] border-b border-transparent hover:bg-[#242a37]">
                                                <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs w-12">#</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Company")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Parcels")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Average price")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Cancelled")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Share")}</TableHead>
                                                <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Revenue")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {companyPage.pageRows.map((c) => {
                                                const share = companyTotal > 0 ? (c.revenue / companyTotal) * 100 : 0
                                                return (
                                                    <TableRow key={c.id} className="hover:bg-white dark:hover:bg-white/[0.04] transition-colors border-b border-slate-200/60 dark:border-white/5">
                                                        <TableCell className="px-6 py-4 text-xs font-semibold text-slate-400 tabular-nums">{companyRows.indexOf(c) + 1}</TableCell>
                                                        <TableCell className="py-4 font-semibold text-sm text-slate-900 dark:text-white">{c.name}</TableCell>
                                                        <TableCell className="py-4 text-right text-sm tabular-nums">{c.parcels.toLocaleString()}</TableCell>
                                                        <TableCell className="py-4 text-right text-sm tabular-nums">{TZS(c.parcels ? c.revenue / c.parcels : 0)}</TableCell>
                                                        <TableCell className="py-4 text-right text-sm tabular-nums">
                                                            {c.cancelled ? <span className="text-rose-600 dark:text-rose-400" title={TZS(c.cancelledRevenue)}>{c.cancelled.toLocaleString()}</span> : <span className="text-slate-400">0</span>}
                                                        </TableCell>
                                                        <TableCell className="py-4 text-right">
                                                            <div className="ml-auto flex w-28 items-center justify-end gap-2">
                                                                <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-white/10" aria-hidden><div className="h-full rounded-full bg-[#ffd428]" style={{ width: `${Math.min(100, share)}%` }} /></div>
                                                                <span className="w-10 text-xs tabular-nums text-slate-500">{share.toFixed(1)}%</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-right text-sm font-semibold tabular-nums text-[#242a37] dark:text-white">{TZS(c.revenue)}</TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                    <ListPager page={companyPage.page} totalPages={companyPage.totalPages} total={companyPage.total} onPage={companyPage.setPage} />
                                </div>
                            )}
                        </div>
                    </TabsContent>
                )}

                {/* ════════ OVERVIEW ════════ */}
                <TabsContent value="overview" className="space-y-10 focus:outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <NavyCard label={tr("Revenue")} value={loadingFigures ? undefined : TZS(total)}
                            sub={cancelledCount ? tr("Excludes {n} cancelled ({amount}) · {periodLabel}", { n: cancelledCount.toLocaleString(), amount: TZS(cancelledAmount), periodLabel }) : tr("Parcel prices · {periodLabel}", { periodLabel })} icon={MoneyReceive01Icon} />
                        <NavyCard label={tr("Parcels")} value={loadingFigures ? undefined : parcels.toLocaleString()} sub={cancelledCount ? tr("Booked, not counting {n} cancelled", { n: cancelledCount.toLocaleString() }) : tr("Booked in the period")} icon={Package01Icon} />
                        <NavyCard label={tr("Average price")} value={loadingFigures ? undefined : TZS(average)} sub={tr("Per parcel, cancelled left out")} icon={ChartBarLineIcon} />
                        <NavyCard label={tr("From delivered parcels")} value={loadingFigures ? undefined : TZS(delivered?.totalPrice)} sub={tr("{pct} of revenue", { pct: pct(Number(delivered?.totalPrice) || 0) })} icon={CheckListIcon} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <ListCard title={tr("By status")} description={tr("Where the period's revenue sits · {periodLabel}", { periodLabel })} icon={CheckListIcon}>
                            <div className="p-6 space-y-5">
                                {loadingFigures ? <ListSkeleton rows={6} className="-mx-5 -my-4" /> : gross === 0 ? (
                                    <p className="text-sm text-slate-400">{tr("No earnings {periodLabel}.", { periodLabel: periodLabel.toLowerCase() })}</p>
                                ) : STATUS_ROWS.map((row) => {
                                    const v = earnings?.statusBreakdown?.[row.key] ?? { totalPrice: 0, count: 0 }
                                    const share = gross > 0 ? (Number(v.totalPrice) / gross) * 100 : 0
                                    return (
                                        <div key={row.key}>
                                            <div className="mb-2 flex items-center justify-between gap-3">
                                                <span className="flex items-center gap-2 text-sm font-semibold text-[#242a37] dark:text-white">
                                                    <span className="size-2.5 rounded-full" style={{ backgroundColor: row.color }} />{tr(row.label)}
                                                    {row.key === "CANCELED" && <span className="text-xs font-normal text-slate-400">{tr("not earned")}</span>}
                                                </span>
                                                <span className="text-sm font-semibold tabular-nums text-[#242a37] dark:text-white">
                                                    {TZS(v.totalPrice)}<span className="ml-2 text-xs font-normal text-slate-400">{Number(v.count || 0).toLocaleString()}</span>
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                                                <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: row.color }} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </ListCard>

                        <ListCard title={tr("Revenue by region")} description={tr("Where parcels were sent from · {periodLabel}", { periodLabel })} icon={Location01Icon} className="lg:col-span-2">
                            <div className="p-6 h-[340px]">
                                {regionQuery.isPending ? <Skeleton className="h-full w-full" /> : topRegions.length === 0 ? (
                                    <p className="text-sm text-slate-400">{tr("No earnings {periodLabel}.", { periodLabel: periodLabel.toLowerCase() })}</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={topRegions.slice(0, 10)} layout="vertical" margin={{ left: 8, right: 16 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148,163,184,0.15)" />
                                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }}
                                                tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                                            <YAxis type="category" dataKey="name" width={110} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                                            <RechartsTooltip cursor={{ fill: "transparent" }} formatter={(v: any) => [TZS(v), "Revenue"]} />
                                            <Bar dataKey="amount" fill="#ffd428" radius={[0, 8, 8, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </ListCard>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <ListCard title={tr("Top regions")} description={tr("Most revenue · {periodLabel}", { periodLabel })} icon={Location01Icon}>
                            {regionQuery.isPending ? <ListSkeleton rows={5} avatar /> : <RankList rows={topRegions.slice(0, 5)} unit="parcels" empty={`No earnings ${periodLabel.toLowerCase()}.`} />}
                        </ListCard>
                        <ListCard title={tr("Top booking offices")} description={tr("Most revenue · {periodLabel}", { periodLabel })} icon={OfficeIcon}>
                            {officeQuery.isPending ? <ListSkeleton rows={5} avatar /> : <RankList rows={topOffices.slice(0, 5)} unit="parcels" empty={`No earnings ${periodLabel.toLowerCase()}.`} />}
                        </ListCard>
                    </div>
                </TabsContent>

                {/* ════════ ALL EARNINGS ════════ */}
                <TabsContent value="earnings" className="space-y-8">
                    <div className="bg-white dark:bg-[#1a1f2b] rounded-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)] border border-slate-100 dark:border-white/5 overflow-hidden">
                        <TableBanner
                            title={tr("All Earnings")}
                            description={summary
                                ? tr("{periodLabel} · average {TZS} · lowest {TZS2} · highest {TZS3}", { periodLabel, TZS: TZS(summary.averagePrice), TZS2: TZS(summary.minPrice), TZS3: TZS(summary.maxPrice) })
                                : tr("Price of every parcel · {periodLabel}", { periodLabel })}
                            icon="earnings"
                        />
                        {listQuery.isPending ? <ListSkeleton rows={8} /> : listQuery.isError ? (
                            <div className="px-6 py-16 text-center">
                                <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Couldn't load earnings")}</p>
                                <Button variant="outline" className="mt-4" onClick={() => listQuery.refetch()}>{tr("Try again")}</Button>
                            </div>
                        ) : rows.length === 0 ? (
                            <div className="px-6 py-16 text-center">
                                <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("No earnings {periodLabel}", { periodLabel: periodLabel.toLowerCase() })}</p>
                                <p className="mt-1 text-sm text-slate-500">{tr("Try a longer period.")}</p>
                            </div>
                        ) : (
                            <div className="bg-slate-50/50 dark:bg-black/10">
                                <div className="overflow-x-auto">
                                    <Table className="min-w-[900px]">
                                        <TableHeader>
                                            <TableRow className="bg-[#242a37] border-b border-transparent hover:bg-[#242a37]">
                                                <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs">{tr("Parcel")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Route")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Booked at")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Price")}</TableHead>
                                                <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs text-center">{tr("Status")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rows.map((t) => (
                                                <TableRow key={t.id} className="hover:bg-white dark:hover:bg-white/[0.04] transition-colors border-b border-slate-200/60 dark:border-white/5">
                                                    <TableCell className="px-6 py-4">
                                                        <p className="font-mono font-semibold text-sm text-slate-900 dark:text-white">{t.parcelNumber}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge variant="outline" className="bg-[#ffd428]/10 text-[#ffd428] border-none text-[11px] font-semibold h-5 px-2 rounded-md">{tr("ID: {padStart}", { padStart: String(t.id).padStart(3, "0") })}</Badge>
                                                            <p className="text-xs text-slate-400 font-bold">{t.createdAt ? format(new Date(t.createdAt), "d MMM yyyy, HH:mm") : "—"}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t.origin?.name || "—"}</p>
                                                        <p className="mt-1 text-xs text-slate-400">→ {t.destination?.name || "—"}</p>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t.originOffice?.name || "—"}</p>
                                                        <p className="mt-1 text-xs text-slate-400">{tr("to")}{" "}{t.destinationOffice?.name || "—"}</p>
                                                    </TableCell>
                                                    <TableCell className="py-4"><p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{TZS(t.price)}</p></TableCell>
                                                    <TableCell className="px-6 py-4 text-center">
                                                        <Badge className={cn("h-7 rounded-[var(--ds-radius-small)] px-3 text-xs font-semibold border-none", STATUS_LOZENGE[t.status] ?? "bg-slate-100 text-slate-700")}>
                                                            {String(t.status || "").replace(/_/g, " ")}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <p className="text-xs text-slate-500">{tr("Page")}{" "}{page}{" "}{tr("of")}{" "}{totalPages}{summary ? tr(" · {TZS} in total", { TZS: TZS(summary.totalAmount) }) : ""}
                                    </p>
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
        </div>
    )
}
