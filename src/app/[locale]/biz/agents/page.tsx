"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "next/navigation"
import { X as XIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { Search01Icon, RefreshIcon, UserGroupIcon, CheckListIcon, Package01Icon, ChampionIcon, FilterIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ListSkeleton } from "@/components/ui/skeletons"
import { TableBanner } from "@/components/ui/table-banner"
import { NavyCard } from "@/components/ui/navy-card"
import { AgentViewModal } from "@/components/modals/agent-view-modal"
import { useTitle } from "@/context/TitleContext"
import { useDebounce } from "@/hooks/use-debounce"
import { getCurrentUser } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { getAllAgentsWithCounts } from "@/lib/services/user"
import { getAgentsPeriodMetrics, overviewRange, type OverviewPeriod } from "@/lib/services/parcel"
import type { User } from "@/types/user"
import { useSearchLanding } from "@/hooks/use-search-landing"
import { useTr } from "@/lib/i18n/portal"

/*
 * Agents — business (owner) portal. Only the owner's own company: who their
 * agents are, who is booking parcels and who has gone quiet. Owners view
 * agents; adding and editing them is done by MySafari operations.
 */

const PERIODS: { value: OverviewPeriod; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "all", label: "All Time" },
]
const PAGE_SIZE = 10
const ROLE_LABEL: Record<string, string> = { SUPER_AGENT: "Super agent", AGENT: "Agent", TRIP_AGENT: "Trip agent" }
const TZS = (n?: number | null) => `TZS ${new Intl.NumberFormat("en-TZ").format(Math.round(Number(n) || 0))}`

const roleOf = (a: any): string => {
    const r = Array.isArray(a.roles) ? a.roles[0] : a.role
    return String(typeof r === "string" ? r : r?.name ?? "").toUpperCase()
}

function RankCard({ title, description, icon, children }: { title: string; description: string; icon: any; children: React.ReactNode }) {
    return (
        <Card className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden">
            <CardHeader className="py-8 px-6 bg-[#242a37] text-white border-none">
                <CardTitle className="text-xl font-semibold text-white flex items-center gap-3"><Icon icon={icon} className="text-[#ffd428]" size={24} />{title}</CardTitle>
                <CardDescription className="text-xs font-bold text-white/40 mt-1">{description}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">{children}</CardContent>
        </Card>
    )
}

export default function BizAgentsPage() {
    const tr = useTr()
    const { setTitle } = useTitle()
    useEffect(() => setTitle("Agents"), [setTitle])
    const [companyId, setCompanyId] = useState<number | null>(null)
    useEffect(() => setCompanyId(Number((getCurrentUser() as any)?.companyId) || null), [])

    const [period, setPeriod] = useState<OverviewPeriod>("7d")
    // Opened from the portal search with ?search=…
    const searchParams = useSearchParams()
    const [search, setSearch] = useState(searchParams.get("search") ?? "")
    const debounced = useDebounce(search, 250)
    const [status, setStatus] = useState("all")
    const [page, setPage] = useState(1)
    const [viewing, setViewing] = useState<User | null>(null)
    // Opening from search (?search=) goes straight to the list
    const [tab, setTab] = useState(searchParams.get("search") ? "all" : "overview")
    const periodLabel = PERIODS.find((p) => p.value === period)!.label

    const agentsQuery = useQuery({ queryKey: ["biz-agents"], queryFn: getAllAgentsWithCounts, staleTime: 5 * 60_000 })
    const metricsQuery = useQuery({
        queryKey: ["biz-agent-period", period],
        queryFn: ({ signal }) => getAgentsPeriodMetrics(overviewRange(period), { signal }),
        staleTime: 5 * 60_000,
    })

    // The API scopes owners to their company; filter here as well in case it doesn't yet
    const agents = useMemo(() => {
        const list = agentsQuery.data ?? []
        return companyId ? list.filter((a: any) => !a.company?.id || a.company.id === companyId) : list
    }, [agentsQuery.data, companyId])
    const metrics = metricsQuery.data ?? {}
    const parcelsOf = (a: User) => metrics[a.id]?.totalParcels ?? 0
    const revenueOf = (a: User) => metrics[a.id]?.totalRevenue ?? 0

    const active = agents.filter((a) => a.isActive)
    const ranked = useMemo(() => [...active].map((a) => ({ a, n: parcelsOf(a), r: revenueOf(a) })).sort((x, y) => y.n - x.n), [active, metrics]) // eslint-disable-line react-hooks/exhaustive-deps
    const booking = ranked.filter((x) => x.n > 0)
    const quiet = ranked.filter((x) => x.n === 0)
    const parcels = booking.reduce((s, x) => s + x.n, 0)
    const revenue = booking.reduce((s, x) => s + x.r, 0)
    const top = booking[0]
    const metricsLoading = metricsQuery.isPending

    const rows = useMemo(() => {
        const q = debounced.trim().toLowerCase()
        return agents
            .filter((a) => (status === "all" ? true : status === "active" ? a.isActive : !a.isActive))
            .filter((a: any) => !q || [a.fullName, a.username, a.phoneNumber, ...(a.offices ?? []).map((o: any) => o.office?.name ?? o.name)].some((v) => String(v ?? "").toLowerCase().includes(q)))
            .sort((x, y) => parcelsOf(y) - parcelsOf(x) || String(x.fullName).localeCompare(String(y.fullName)))
    }, [agents, debounced, status, metrics]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => setPage(1), [debounced, status, period])
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
    const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const loading = agentsQuery.isPending
    const officeNames = (a: any) => (a.offices ?? []).map((o: any) => o.office?.name ?? o.name).filter(Boolean).join(", ")

    // Opened from the portal search: fill the search and open the result
    useSearchLanding({ setSearch: setSearch, showList: () => setTab("all"), items: rows, ready: true, onOpen: setViewing })

    return (
        <div className="space-y-10 animate-in fade-in duration-300">
            {/* ── Top bar ── */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-[#242a37] dark:text-white">{tr("Your agents")}</h2>
                    <p className="text-xs font-bold text-slate-400 mt-1">{tr("Who's booking parcels for your company · {periodLabel}", { periodLabel })}</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex p-1.5 bg-slate-100 dark:bg-black/20 rounded-[var(--ds-radius-small)] w-fit max-w-full overflow-x-auto">
                        {PERIODS.map((p) => (
                            <button key={p.value} onClick={() => setPeriod(p.value)} aria-pressed={period === p.value}
                                className={cn("h-9 px-4 rounded-[var(--ds-radius-small)] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                                    period === p.value ? "bg-white dark:bg-[#242a37] shadow-[var(--ds-shadow-raised)] text-[#ffd428]" : "text-slate-400")}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <Button variant="ghost" size="icon" aria-label={tr("Refresh agents")} onClick={() => { agentsQuery.refetch(); metricsQuery.refetch() }}
                        className="h-10 w-10 text-slate-400 hover:text-[#ffd428] rounded-[var(--ds-radius-small)]">
                        <Icon icon={RefreshIcon} size={20} className={cn((agentsQuery.isFetching || metricsQuery.isFetching) && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {agentsQuery.isError && (
                <p className="text-sm font-semibold text-rose-500">{tr("Couldn't load your agents.")}{" "}<button onClick={() => agentsQuery.refetch()} className="underline">{tr("Retry")}</button></p>
            )}

            {/* ── Tabs — same as the ops pages ── */}
            <Tabs value={tab} onValueChange={setTab} className="space-y-8">
                <TabsList className="portal-sticky-tabs bg-slate-100 dark:bg-black/20 p-1.5 rounded-[var(--ds-radius-small)] w-full items-stretch h-auto">
                    <TabsTrigger value="overview" className="flex-1 h-11 rounded-[var(--ds-radius-large)] text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-[#242a37] data-[state=active]:shadow-[var(--ds-shadow-raised)] transition-all cursor-pointer">
                        <Icon icon={ChampionIcon} size={18} className="mr-2" />{tr("Overview")}</TabsTrigger>
                    <TabsTrigger value="all" className="flex-1 h-11 rounded-[var(--ds-radius-large)] text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-[#242a37] data-[state=active]:shadow-[var(--ds-shadow-raised)] transition-all cursor-pointer gap-3">
                        <span className="flex items-center gap-2"><Icon icon={UserGroupIcon} size={18} />{" "}{tr("All Agents")}</span>
                        <Badge className="bg-[#ffd428] text-[#242a37] border-none text-xs font-semibold h-6 min-w-10 flex items-center justify-center rounded-[var(--ds-radius-small)]">
                            {agents.length.toLocaleString()}
                        </Badge>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-10 focus:outline-none">
                {/* ── Cards ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <NavyCard label={tr("Your agents")} value={loading ? undefined : agents.length.toLocaleString()} sub={tr("{active} active", { active: active.length.toLocaleString() })} icon={UserGroupIcon} />
                    <NavyCard label={tr("Booking parcels")} value={loading || metricsLoading ? undefined : `${booking.length} / ${active.length}`} sub={tr("Active agents who booked · {periodLabel}", { periodLabel })} icon={CheckListIcon} />
                    <NavyCard label={tr("Parcels booked")} value={loading || metricsLoading ? undefined : parcels.toLocaleString()} sub={`${TZS(revenue)} · ${periodLabel}`} icon={Package01Icon} />
                    <NavyCard label={tr("Top agent")} value={loading || metricsLoading ? undefined : top ? String(top.a.fullName) : "—"} sub={top ? tr("{n} parcels · {periodLabel}", { n: top.n.toLocaleString(), periodLabel }) : tr("No bookings · {periodLabel}", { periodLabel })} icon={ChampionIcon} />
                </div>

                {/* ── Rankings ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <RankCard title={tr("Most parcels")} description={tr("Your agents ranked by parcels booked · {periodLabel}", { periodLabel })} icon={ChampionIcon}>
                        {loading || metricsLoading ? <ListSkeleton rows={5} avatar /> : booking.length === 0 ? (
                            <p className="p-6 text-sm text-slate-400">{tr("No parcels booked {periodLabel}.", { periodLabel: periodLabel.toLowerCase() })}</p>
                        ) : (
                            <div className="divide-y divide-slate-50 dark:divide-white/5">
                                {booking.slice(0, 5).map(({ a, n, r }, i) => (
                                    <button key={a.id} type="button" onClick={() => setViewing(a)}
                                        className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className={cn("size-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold", i === 0 ? "bg-[#ffd428] text-[#242a37]" : "bg-slate-100 dark:bg-white/5 text-slate-400")}>{i + 1}</div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{a.fullName}</p>
                                                <p className="text-xs font-bold text-slate-400 mt-1">{parcels ? tr("{v}% of your parcels", { v: ((n / parcels) * 100).toFixed(1) }) : ""} · {TZS(r)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[13px] font-semibold tabular-nums text-[#242a37] dark:text-white">{n.toLocaleString()}</p>
                                            <p className="text-xs font-semibold text-slate-400">{tr("parcels")}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </RankCard>
                    <RankCard title={tr("No bookings")} description={tr("Active agents who booked nothing · {periodLabel}", { periodLabel })} icon={FilterIcon}>
                        {loading || metricsLoading ? <ListSkeleton rows={5} avatar /> : quiet.length === 0 ? (
                            <p className="p-6 text-sm text-slate-400">{tr("Every active agent booked a parcel {periodLabel}.", { periodLabel: periodLabel.toLowerCase() })}</p>
                        ) : (
                            <div className="divide-y divide-slate-50 dark:divide-white/5">
                                {quiet.slice(0, 5).map(({ a }) => (
                                    <button key={a.id} type="button" onClick={() => setViewing(a)}
                                        className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-[#242a37] dark:text-white truncate">{a.fullName}</p>
                                            <p className="text-xs font-bold text-slate-400 mt-1 truncate">{officeNames(a) || ROLE_LABEL[roleOf(a)] || tr("Agent")}</p>
                                        </div>
                                        <span className="shrink-0 text-xs font-semibold text-slate-400">{a.phoneNumber}</span>
                                    </button>
                                ))}
                                {quiet.length > 5 && <p className="px-6 py-3 text-xs text-slate-400">{tr("and {v} more", { v: (quiet.length - 5).toLocaleString() })}</p>}
                            </div>
                        )}
                    </RankCard>
                </div>
                </TabsContent>

                <TabsContent value="all" className="focus:outline-none">
                {/* ── All agents ── */}
                <div className="bg-white dark:bg-[#1a1f2b] rounded-[var(--ds-radius-large)] shadow-[var(--ds-shadow-raised)] border border-slate-100 dark:border-white/5 overflow-hidden">
                    <TableBanner title={tr("All Agents")} description={tr("Everyone registered under your company · parcels {periodLabel}", { periodLabel: periodLabel.toLowerCase() })} icon="users" actions={
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <div className="relative sm:w-64">
                                <Icon icon={Search01Icon} size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr("Search name, phone or office")} aria-label={tr("Search agents")}
                                    className="h-10 pl-10 pr-9 bg-white/10 border-white/10 text-white placeholder:text-white/40 text-xs" />
                                {search && (
                                    <button type="button" aria-label={tr("Clear search")} onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/50 hover:text-white">
                                        <XIcon className="size-4" />
                                    </button>
                                )}
                            </div>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger aria-label={tr("Status")} className="h-10 sm:w-36 bg-white/10 border-white/10 text-white text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs">{tr("All statuses")}</SelectItem>
                                    <SelectItem value="active" className="text-xs">{tr("Active")}</SelectItem>
                                    <SelectItem value="inactive" className="text-xs">{tr("Inactive")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    } />
                    {loading ? <ListSkeleton rows={8} /> : pageRows.length === 0 ? (
                        <p className="px-6 py-16 text-center text-sm text-slate-500">{agents.length ? tr("No agents match your search.") : tr("No agents registered under your company yet.")}</p>
                    ) : (
                        <div className="bg-slate-50/50 dark:bg-black/10">
                            <div className="overflow-x-auto">
                                <Table className="min-w-[760px]">
                                    <TableHeader>
                                        <TableRow className="bg-[#242a37] border-b border-transparent hover:bg-[#242a37]">
                                            <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs">{tr("Agent")}</TableHead>
                                            <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Role")}</TableHead>
                                            <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Booking office")}</TableHead>
                                            <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Parcels")}</TableHead>
                                            <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Value")}</TableHead>
                                            <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs text-center">{tr("Status")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pageRows.map((a) => (
                                            <TableRow key={a.id} tabIndex={0} onClick={() => setViewing(a)}
                                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setViewing(a) } }}
                                                aria-label={tr("Open {fullName}", { fullName: a.fullName })}
                                                className="hover:bg-white dark:hover:bg-white/[0.04] transition-colors border-b border-slate-200/60 dark:border-white/5 cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ds-border-focused)]">
                                                <TableCell className="px-6 py-4">
                                                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{a.fullName}</p>
                                                    <p className="text-xs text-slate-400 font-bold tabular-nums">{a.phoneNumber || "—"}</p>
                                                </TableCell>
                                                <TableCell className="py-4 text-xs font-semibold text-slate-700 dark:text-slate-300">{ROLE_LABEL[roleOf(a)] ?? (roleOf(a) || "—")}</TableCell>
                                                <TableCell className="py-4 text-xs text-slate-600 dark:text-slate-300 max-w-[220px] truncate">{officeNames(a) || "—"}</TableCell>
                                                <TableCell className="py-4 text-right text-sm font-semibold tabular-nums">{metricsLoading ? "…" : parcelsOf(a).toLocaleString()}</TableCell>
                                                <TableCell className="py-4 text-right text-xs tabular-nums text-slate-600 dark:text-slate-300">{metricsLoading ? "…" : TZS(revenueOf(a))}</TableCell>
                                                <TableCell className="px-6 py-4 text-center">
                                                    <Badge className={cn("h-7 rounded-[var(--ds-radius-small)] px-3 text-xs font-semibold border-none", a.isActive ? "bg-[#ffd428] text-[#242a37]" : "bg-[#242a37] text-white")}>
                                                        {a.isActive ? "ACTIVE" : "INACTIVE"}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <p className="text-xs text-slate-500">{tr("Page {page} of {totalPages} · {rows} agents", { page, totalPages, rows: rows.length.toLocaleString() })}</p>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="size-4 mr-1" />{" "}{tr("Previous")}</Button>
                                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{tr("Next")}{" "}<ChevronRight className="size-4 ml-1" /></Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                </TabsContent>
            </Tabs>

            {/* View only: owners don't edit agents */}
            <AgentViewModal isOpen={!!viewing} onClose={() => setViewing(null)} agent={viewing} />
        </div>
    )
}
