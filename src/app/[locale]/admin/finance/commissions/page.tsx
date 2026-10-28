"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { endOfDay, format, startOfDay, startOfYear, subDays } from "date-fns"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from "recharts"
import { X as XIcon, ChevronLeft, ChevronRight, BarChart3, Building2, Users } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { Search01Icon, RefreshIcon, Coins01Icon, Package01Icon, UserGroupIcon, ChartBarLineIcon, OfficeIcon, FilterIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ListSkeleton } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import { TableBanner } from "@/components/ui/table-banner"
import { NavyCard } from "@/components/ui/navy-card"
import { ExportMenu } from "@/components/export/export-menu"
import { useTitle } from "@/context/TitleContext"
import { useDebounce } from "@/hooks/use-debounce"
import { useAccess } from "@/hooks/use-access"
import { cn } from "@/lib/utils"
import { getCommissionSummary, type CommissionSummary } from "@/lib/services/commission"
import { useTr } from "@/lib/i18n/portal"

const PERIODS = [
    { value: "today", label: "Today" },
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "year", label: "This year" },
] as const
type Period = (typeof PERIODS)[number]["value"]
type AgentRow = CommissionSummary["byAgent"][number]
type CompanyRow = CommissionSummary["byCompany"][number]

const PAGE_SIZE = 10
const TZS = (n?: number | null) => `TZS ${new Intl.NumberFormat("en-TZ").format(Math.round(Math.abs(Number(n) || 0)))}`
const NO_COMPANY = "none"
const companyKey = (id: number | null | undefined) => (id == null ? NO_COMPANY : String(id))

function rangeFor(period: Period) {
    const now = new Date()
    const from = period === "today" ? now : period === "year" ? startOfYear(now) : subDays(now, period === "7d" ? 6 : period === "30d" ? 29 : 89)
    return { startDate: startOfDay(from).toISOString(), endDate: endOfDay(now).toISOString() }
}

// Share bar + percentage
function ShareBar({ value }: { value: number }) {
    return (
        <div className="ml-auto flex w-28 items-center justify-end gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-white/10" aria-hidden>
                <div className="h-full rounded-full bg-[#ffd428]" style={{ width: `${Math.min(100, Math.abs(value))}%` }} />
            </div>
            <span className="w-10 text-xs tabular-nums text-slate-500">{Math.abs(value).toFixed(1)}%</span>
        </div>
    )
}

function Pager({ page, totalPages, label, onPage }: { page: number; totalPages: number; label: string; onPage: (p: number) => void }) {
    const tr = useTr()
    return (
        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500">{label}</p>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="size-4 mr-1" />{tr("Previous")}</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>{tr("Next")}<ChevronRight className="size-4 ml-1" /></Button>
            </div>
        </div>
    )
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
    const tr = useTr()
    return (
        <div className="relative flex-1 min-w-0">
            <Icon icon={Search01Icon} size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
                className="h-10 pl-10 pr-9 w-full bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm shadow-none" />
            {value && (
                <button type="button" aria-label={tr("Clear search")} onClick={() => onChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-rose-500">
                    <XIcon className="size-4" />
                </button>
            )}
        </div>
    )
}

export default function CommissionsPage() {
    const tr = useTr()
    const { setTitle } = useTitle()
    useEffect(() => setTitle("Commissions"), [setTitle])
    const { can, isLoading: accessLoading } = useAccess()
    const [tab, setTab] = useState("overview")
    const [period, setPeriod] = useState<Period>("30d")
    const range = useMemo(() => rangeFor(period), [period])
    const periodLabel = tr(PERIODS.find((p) => p.value === period)!.label)

    // By agent
    const [agentSearch, setAgentSearch] = useState("")
    const [companyFilter, setCompanyFilter] = useState("all")
    const agentQ = useDebounce(agentSearch, 250)
    const [agentPage, setAgentPage] = useState(1)
    // By company
    const [companySearch, setCompanySearch] = useState("")
    const companyQ = useDebounce(companySearch, 250)
    const [companyPage, setCompanyPage] = useState(1)

    const { data, isPending, isError, isFetching, refetch } = useQuery({
        queryKey: ["commission-summary", period],
        queryFn: () => getCommissionSummary(range),
        staleTime: 60_000,
        enabled: can("finance.commissions"),
    })
    const totals = data?.totals
    const loading = isPending && !isError

    const agents = useMemo(() => {
        const q = agentQ.trim().toLowerCase()
        return (data?.byAgent ?? []).filter((a) =>
            (companyFilter === "all" || companyKey(a.company?.id) === companyFilter) &&
            (!q || [a.fullName, a.username, a.phoneNumber, a.company?.name].some((v) => String(v ?? "").toLowerCase().includes(q))))
    }, [data, agentQ, companyFilter])
    const companies = useMemo(() => {
        const q = companyQ.trim().toLowerCase()
        return (data?.byCompany ?? []).filter((c) => !q || c.name.toLowerCase().includes(q))
    }, [data, companyQ])
    useEffect(() => setAgentPage(1), [agentQ, companyFilter, period])
    useEffect(() => setCompanyPage(1), [companyQ, period])

    const agentPages = Math.max(1, Math.ceil(agents.length / PAGE_SIZE))
    const agentRows = agents.slice((agentPage - 1) * PAGE_SIZE, agentPage * PAGE_SIZE)
    const companyPages = Math.max(1, Math.ceil(companies.length / PAGE_SIZE))
    const companyRows = companies.slice((companyPage - 1) * PAGE_SIZE, companyPage * PAGE_SIZE)
    const share = (amount: number) => (totals?.amount ? (amount / totals.amount) * 100 : 0)
    const chart = (data?.daily ?? []).map((d) => ({ ...d, label: format(new Date(`${d.date}T00:00:00`), period === "year" || period === "90d" ? "d MMM" : "EEE d"), value: Math.abs(d.amount) }))
    const selectedCompany = companyFilter === "all" ? null : (data?.byCompany ?? []).find((c) => companyKey(c.companyId) === companyFilter)

    // A company's agents, on the By agent tab
    const openCompany = (c: CompanyRow) => {
        setCompanyFilter(companyKey(c.companyId))
        setAgentSearch("")
        setTab("agents")
    }

    if (!accessLoading && !can("finance.commissions")) {
        return (
            <div className="rounded-[var(--ds-radius-large)] bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] px-6 py-16 text-center">
                <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("You don't have permission to view commissions")}</p>
                <p className="mt-1 text-sm text-slate-500">{tr("Ask an administrator if you need access.")}</p>
            </div>
        )
    }

    const agentColumns: [string, (a: AgentRow) => unknown][] = [
        [tr("Agent"), (a) => a.fullName || `Agent #${a.userId}`],
        [tr("Username"), (a) => a.username ?? ""],
        [tr("Phone"), (a) => a.phoneNumber ?? ""],
        [tr("Company"), (a) => a.company?.name ?? ""],
        [tr("Parcels"), (a) => a.count],
        [tr("Commission (TZS)"), (a) => Math.round(Math.abs(a.amount))],
    ]
    const companyColumns: [string, (c: CompanyRow) => unknown][] = [
        [tr("Company"), (c) => c.name],
        [tr("Agents"), (c) => c.agents],
        [tr("Parcels"), (c) => c.count],
        [tr("Average per parcel (TZS)"), (c) => (c.count ? Math.round(Math.abs(c.amount) / c.count) : 0)],
        [tr("Commission (TZS)"), (c) => Math.round(Math.abs(c.amount))],
    ]
    const reportSubtitle = `${periodLabel} · ${TZS(totals?.amount)} ${tr("in total")}`

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* ── Header ── */}
            <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 justify-between">
                <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-[#242a37] dark:text-white">{tr("Commissions")}</h2>
                    <p className="text-xs font-bold text-slate-400 mt-1">{tr("Deducted from agents' float when they book a parcel · {periodLabel}", { periodLabel })}</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex p-1 bg-slate-100 dark:bg-black/20 rounded-[var(--ds-radius-small)] max-w-full overflow-x-auto">
                        {PERIODS.map((option) => (
                            <button key={option.value} onClick={() => setPeriod(option.value)} aria-pressed={period === option.value}
                                className={cn("h-9 px-4 rounded-[var(--ds-radius-small)] text-sm font-medium transition-all cursor-pointer whitespace-nowrap",
                                    period === option.value ? "bg-white dark:bg-[#242a37] shadow-[var(--ds-shadow-raised)] text-[#242a37] dark:text-[#ffd428]" : "text-slate-500 hover:text-[#242a37] dark:hover:text-white")}>
                                {tr(option.label)}
                            </button>
                        ))}
                    </div>
                    <Button variant="outline" size="icon" onClick={() => refetch()} aria-label={tr("Refresh commissions")}
                        className="size-10 rounded-[var(--ds-radius-small)] border-slate-200 dark:border-white/10 shadow-none">
                        <Icon icon={RefreshIcon} size={18} className={cn("text-slate-500", isFetching && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {isError && (
                <p className="text-sm font-semibold text-rose-500">{tr("Couldn't load commissions. If this keeps happening, the server may not have the latest update yet.")}{" "}
                    <button onClick={() => refetch()} className="underline cursor-pointer">{tr("Retry")}</button>
                </p>
            )}

            {/* ── Totals (every tab) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                <NavyCard label={tr("Commission")} value={loading ? undefined : isError ? "—" : TZS(totals?.amount)} sub={periodLabel} icon={Coins01Icon} />
                <NavyCard label={tr("Parcels")} value={loading ? undefined : isError ? "—" : (totals?.count ?? 0).toLocaleString()} sub={tr("Bookings that earned commission")} icon={Package01Icon} />
                <NavyCard label={tr("Average per parcel")} value={loading ? undefined : isError ? "—" : TZS(totals?.count ? totals.amount / totals.count : 0)} sub={tr("Commission per booking")} icon={ChartBarLineIcon} />
                <NavyCard label={tr("Agents")} value={loading ? undefined : isError ? "—" : (totals?.agents ?? 0).toLocaleString()} sub={tr("From {v} companies", { v: (totals?.companies ?? 0).toLocaleString() })} icon={UserGroupIcon} />
            </div>

            <Tabs value={tab} onValueChange={setTab} className="space-y-6">
                <TabsList className="portal-sticky-tabs bg-slate-100 dark:bg-black/20 p-1.5 rounded-[var(--ds-radius-small)] w-full items-stretch h-auto">
                    <TabsTrigger value="overview" className="flex-1 h-11 text-xs font-semibold gap-2 cursor-pointer"><BarChart3 className="size-4" />{tr("Overview")}</TabsTrigger>
                    <TabsTrigger value="companies" className="flex-1 h-11 text-xs font-semibold gap-2 cursor-pointer">
                        <Building2 className="size-4" />{tr("By company")}
                        <Badge className="bg-[#ffd428] text-[#242a37] border-none text-xs font-semibold h-6 min-w-8 justify-center rounded-[var(--ds-radius-small)]">{(data?.byCompany.length ?? 0).toLocaleString()}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="agents" className="flex-1 h-11 text-xs font-semibold gap-2 cursor-pointer">
                        <Users className="size-4" />{tr("By agent")}
                        <Badge className="bg-[#ffd428] text-[#242a37] border-none text-xs font-semibold h-6 min-w-8 justify-center rounded-[var(--ds-radius-small)]">{(data?.byAgent.length ?? 0).toLocaleString()}</Badge>
                    </TabsTrigger>
                </TabsList>

                {/* ════════ OVERVIEW ════════ */}
                <TabsContent value="overview" className="space-y-8 focus:outline-none">
                    <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden">
                        <CardHeader className="py-6 px-6 bg-[#242a37] text-white border-none">
                            <CardTitle className="text-lg font-semibold text-white flex items-center gap-3"><Icon icon={ChartBarLineIcon} className="text-[#ffd428]" size={22} />{tr("Commission by day")}</CardTitle>
                            <CardDescription className="text-xs font-bold text-white/40 mt-1">{periodLabel}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            {loading ? <Skeleton className="h-[260px] w-full" /> : chart.length === 0 ? (
                                <p className="py-20 text-center text-sm text-slate-400">{tr("No commission {periodLabel}.", { periodLabel: periodLabel.toLowerCase() })}</p>
                            ) : (
                                <div className="h-[260px]" role="img" aria-label={tr("Daily commission, {periodLabel}. Total {TZS}.", { periodLabel, TZS: TZS(totals?.amount) })}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                            <CartesianGrid vertical={false} stroke="currentColor" className="text-slate-100 dark:text-white/5" />
                                            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} minTickGap={16} />
                                            <YAxis tickLine={false} axisLine={false} width={56} tick={{ fontSize: 11, fill: "#94a3b8" }}
                                                tickFormatter={(v) => new Intl.NumberFormat("en", { notation: "compact" }).format(v)} />
                                            <RechartsTooltip cursor={{ fill: "rgba(148,163,184,0.12)" }}
                                                contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", fontSize: 12 }}
                                                formatter={(v: any, _n: any, item: any) => [`${TZS(v)} · ${item?.payload?.count?.toLocaleString()} ${tr("parcels")}`, tr("Commission")]} />
                                            <Bar dataKey="value" fill="#ffd428" radius={[4, 4, 0, 0]} maxBarSize={32} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <TopList
                            title={tr("Top companies")}
                            description={tr("Most commission · {periodLabel}", { periodLabel })}
                            icon={OfficeIcon}
                            loading={loading}
                            empty={tr("No commission {periodLabel}.", { periodLabel: periodLabel.toLowerCase() })}
                            rows={(data?.byCompany ?? []).slice(0, 5).map((c) => ({
                                key: companyKey(c.companyId),
                                title: c.name,
                                sub: tr("{agents} agents · {count} parcels", { agents: c.agents.toLocaleString(), count: c.count.toLocaleString() }),
                                amount: c.amount,
                                onClick: () => openCompany(c),
                            }))}
                            seeAll={() => setTab("companies")}
                        />
                        <TopList
                            title={tr("Top agents")}
                            description={tr("Most commission · {periodLabel}", { periodLabel })}
                            icon={UserGroupIcon}
                            loading={loading}
                            empty={tr("No commission {periodLabel}.", { periodLabel: periodLabel.toLowerCase() })}
                            rows={(data?.byAgent ?? []).slice(0, 5).map((a) => ({
                                key: String(a.userId),
                                title: a.fullName || tr("Agent #{userId}", { userId: a.userId }),
                                sub: [a.company?.name, tr("{count} parcels", { count: a.count.toLocaleString() })].filter(Boolean).join(" · "),
                                amount: a.amount,
                                onClick: () => { setCompanyFilter("all"); setAgentSearch(a.fullName || a.username || ""); setTab("agents") },
                            }))}
                            seeAll={() => { setCompanyFilter("all"); setTab("agents") }}
                        />
                    </div>
                </TabsContent>

                {/* ════════ BY COMPANY ════════ */}
                <TabsContent value="companies" className="space-y-4 focus:outline-none">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <SearchBox value={companySearch} onChange={setCompanySearch} placeholder={tr("Search companies")} />
                        <ExportMenu filename="commissions-by-company" title={tr("Commissions by company")} subtitle={reportSubtitle} rows={companies} columns={companyColumns}
                            summary={(rows) => [[tr("Commission"), TZS(rows.reduce((s, c) => s + Math.abs(c.amount), 0))], [tr("Parcels"), rows.reduce((s, c) => s + c.count, 0).toLocaleString()], [tr("Companies"), rows.length.toLocaleString()]]} />
                    </div>
                    <div className="bg-white dark:bg-[#1a1f2b] rounded-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)] border border-slate-100 dark:border-white/5 overflow-hidden">
                        <TableBanner title={tr("Commission by company")} description={tr("Every company whose agents paid commission · {periodLabel}", { periodLabel })} icon="commissions" />
                        {loading ? <ListSkeleton rows={8} /> : companyRows.length === 0 ? (
                            <p className="px-6 py-16 text-center text-sm text-slate-500">{companySearch ? tr("No company matches") : tr("No commission {periodLabel}.", { periodLabel: periodLabel.toLowerCase() })}</p>
                        ) : (
                            <div className="bg-slate-50/50 dark:bg-black/10">
                                <div className="overflow-x-auto">
                                    <Table className="min-w-[760px]">
                                        <TableHeader>
                                            <TableRow className="bg-[#242a37] border-b border-transparent hover:bg-[#242a37]">
                                                <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs w-12">#</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Company")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Agents")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Parcels")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Average per parcel")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Share")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Commission")}</TableHead>
                                                <TableHead className="px-4 py-4 w-10"><span className="sr-only">{tr("Open")}</span></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {companyRows.map((c) => (
                                                <TableRow key={companyKey(c.companyId)} tabIndex={0} onClick={() => openCompany(c)}
                                                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCompany(c) } }}
                                                    aria-label={tr("Open {name}'s agents", { name: c.name })}
                                                    className="cursor-pointer hover:bg-white dark:hover:bg-white/[0.04] transition-colors border-b border-slate-200/60 dark:border-white/5 focus-visible:outline-2 focus-visible:outline-[#242a37]">
                                                    <TableCell className="px-6 py-4 text-xs font-semibold text-slate-400 tabular-nums">{(data?.byCompany ?? []).indexOf(c) + 1}</TableCell>
                                                    <TableCell className="py-4 font-semibold text-sm text-slate-900 dark:text-white">{c.name}</TableCell>
                                                    <TableCell className="py-4 text-right text-sm tabular-nums">{c.agents.toLocaleString()}</TableCell>
                                                    <TableCell className="py-4 text-right text-sm tabular-nums">{c.count.toLocaleString()}</TableCell>
                                                    <TableCell className="py-4 text-right text-sm tabular-nums">{TZS(c.count ? c.amount / c.count : 0)}</TableCell>
                                                    <TableCell className="py-4 text-right"><ShareBar value={share(c.amount)} /></TableCell>
                                                    <TableCell className="py-4 text-right text-sm font-semibold tabular-nums text-[#242a37] dark:text-white">{TZS(c.amount)}</TableCell>
                                                    <TableCell className="px-4 py-4"><ChevronRight className="size-4 text-slate-300" aria-hidden /></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <Pager page={companyPage} totalPages={companyPages} onPage={setCompanyPage}
                                    label={tr("Page {page} of {totalPages} · {total} {noun}", { page: companyPage, totalPages: companyPages, total: companies.length.toLocaleString(), noun: tr("companies") })} />
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ════════ BY AGENT ════════ */}
                <TabsContent value="agents" className="space-y-4 focus:outline-none">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <SearchBox value={agentSearch} onChange={setAgentSearch} placeholder={tr("Search agents")} />
                        <Select value={companyFilter} onValueChange={setCompanyFilter}>
                            <SelectTrigger title={selectedCompany?.name} className="h-10 w-full sm:w-64 shrink-0 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm shadow-none" aria-label={tr("Company")}>
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <Icon icon={FilterIcon} size={16} className="shrink-0 text-slate-500" />
                                    {/* Long company names end in "…" instead of running under the next button */}
                                    <SelectValue>
                                        <span className="block truncate text-left">{selectedCompany?.name ?? tr("All companies")}</span>
                                    </SelectValue>
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-sm">{tr("All companies")}</SelectItem>
                                {(data?.byCompany ?? []).map((c) => (
                                    <SelectItem key={companyKey(c.companyId)} value={companyKey(c.companyId)} className="text-sm max-w-[22rem]"><span className="truncate">{c.name}</span></SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <ExportMenu className="shrink-0" filename={selectedCompany ? `commissions-${selectedCompany.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : "commissions-by-agent"}
                            title={selectedCompany ? tr("Commissions · {name}", { name: selectedCompany.name }) : tr("Commissions by agent")}
                            subtitle={selectedCompany ? `${periodLabel} · ${TZS(agents.reduce((sum, a) => sum + Math.abs(a.amount), 0))} ${tr("in total")}` : reportSubtitle}
                            rows={agents}
                            // One company's report names it in the title, so no Company column
                            columns={selectedCompany ? agentColumns.filter(([label]) => label !== tr("Company")) : agentColumns}
                            summary={(rows) => [[tr("Commission"), TZS(rows.reduce((s, a) => s + Math.abs(a.amount), 0))], [tr("Parcels"), rows.reduce((s, a) => s + a.count, 0).toLocaleString()], [tr("Agents"), rows.length.toLocaleString()]]} />
                    </div>

                    {selectedCompany && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--ds-radius-large)] border border-slate-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-white/5">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#242a37] dark:text-white">{selectedCompany.name}</p>
                                <p className="text-xs text-slate-500">
                                    {tr("{agents} agents · {count} parcels", { agents: selectedCompany.agents.toLocaleString(), count: selectedCompany.count.toLocaleString() })} · {TZS(selectedCompany.amount)} · {share(selectedCompany.amount).toFixed(1)}%
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setCompanyFilter("all")}><XIcon className="size-4 mr-1" />{tr("All companies")}</Button>
                        </div>
                    )}

                    <div className="bg-white dark:bg-[#1a1f2b] rounded-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)] border border-slate-100 dark:border-white/5 overflow-hidden">
                        <TableBanner title={tr("Commission by agent")} description={tr("Every agent who paid commission · {periodLabel}", { periodLabel })} icon="commissions" />
                        {loading ? <ListSkeleton rows={8} /> : agentRows.length === 0 ? (
                            <p className="px-6 py-16 text-center text-sm text-slate-500">{agentSearch || companyFilter !== "all" ? tr("No agents match your search.") : tr("No commission {periodLabel}.", { periodLabel: periodLabel.toLowerCase() })}</p>
                        ) : (
                            <div className="bg-slate-50/50 dark:bg-black/10">
                                <div className="overflow-x-auto">
                                    <Table className="min-w-[720px]">
                                        <TableHeader>
                                            <TableRow className="bg-[#242a37] border-b border-transparent hover:bg-[#242a37]">
                                                <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs w-12">#</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Agent")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Company")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Parcels")}</TableHead>
                                                <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Share")}</TableHead>
                                                <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Commission")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {agentRows.map((a) => (
                                                <TableRow key={a.userId} className="hover:bg-white dark:hover:bg-white/[0.04] transition-colors border-b border-slate-200/60 dark:border-white/5">
                                                    <TableCell className="px-6 py-4 text-xs font-semibold text-slate-400 tabular-nums">{(data?.byAgent ?? []).indexOf(a) + 1}</TableCell>
                                                    <TableCell className="py-4">
                                                        <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{a.fullName || tr("Agent #{userId}", { userId: a.userId })}</p>
                                                        <p className="text-xs text-slate-400 font-bold truncate">{a.username ? `@${a.username}` : ""}{a.phoneNumber ? ` · ${a.phoneNumber}` : ""}</p>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        {a.company ? (
                                                            <button type="button" onClick={() => setCompanyFilter(companyKey(a.company?.id))} className="text-xs font-semibold text-slate-700 hover:underline underline-offset-4 dark:text-slate-300 cursor-pointer">{a.company.name}</button>
                                                        ) : <span className="text-xs text-slate-400">—</span>}
                                                    </TableCell>
                                                    <TableCell className="py-4 text-right text-sm tabular-nums">{a.count.toLocaleString()}</TableCell>
                                                    <TableCell className="py-4 text-right"><ShareBar value={share(a.amount)} /></TableCell>
                                                    <TableCell className="px-6 py-4 text-right text-sm font-semibold tabular-nums text-[#242a37] dark:text-white">{TZS(a.amount)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <Pager page={agentPage} totalPages={agentPages} onPage={setAgentPage}
                                    label={tr("Page {page} of {totalPages} · {agents} agents", { page: agentPage, totalPages: agentPages, agents: agents.length.toLocaleString() })} />
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

// Ranked top five, with a link to the full list
function TopList({ title, description, icon, loading, empty, rows, seeAll }: {
    title: string
    description: string
    icon: any
    loading: boolean
    empty: string
    rows: { key: string; title: string; sub: string; amount: number; onClick: () => void }[]
    seeAll: () => void
}) {
    const tr = useTr()
    return (
        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden">
            <CardHeader className="py-6 px-6 bg-[#242a37] text-white border-none">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <CardTitle className="text-lg font-semibold text-white flex items-center gap-3"><Icon icon={icon} className="text-[#ffd428]" size={22} />{title}</CardTitle>
                        <CardDescription className="text-xs font-bold text-white/40 mt-1">{description}</CardDescription>
                    </div>
                    {rows.length > 0 && <Button variant="ghost" size="sm" onClick={seeAll} className="shrink-0 text-white hover:bg-white/10 hover:text-white">{tr("See all")}</Button>}
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? <ListSkeleton rows={5} /> : rows.length === 0 ? (
                    <p className="p-6 text-sm text-slate-400">{empty}</p>
                ) : (
                    <div className="divide-y divide-slate-50 dark:divide-white/5">
                        {rows.map((r, i) => (
                            <button key={r.key} type="button" onClick={r.onClick} className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] cursor-pointer">
                                <span className="flex min-w-0 items-center gap-4">
                                    <span className={cn("size-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold", i === 0 ? "bg-[#ffd428] text-[#242a37]" : "bg-slate-100 dark:bg-white/5 text-slate-400")}>{i + 1}</span>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold text-[#242a37] dark:text-white truncate">{r.title}</span>
                                        <span className="block text-xs font-bold text-slate-400 mt-1 truncate">{r.sub}</span>
                                    </span>
                                </span>
                                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[#242a37] dark:text-white">{TZS(r.amount)}</span>
                            </button>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
