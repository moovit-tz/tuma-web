"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import { CreditCard, MessageSquareText, Smartphone, RefreshCw, ArrowUpRight, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { getIntegrationsHealth, type HealthStatus, type IntegrationsPeriod, type Probe } from "@/lib/services/platform"
import { useTr } from "@/lib/i18n/portal"
import { providerDisplayName } from "@/lib/services/float-transactions"

const STATUS: Record<HealthStatus, { label: string; dot: string; pill: string }> = {
    operational: { label: "Operational", dot: "bg-emerald-500", pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
    degraded: { label: "Degraded", dot: "bg-amber-500", pill: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
    down: { label: "Down", dot: "bg-rose-500", pill: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300" },
}
const pct = (r: number | null | undefined) => (r === null || r === undefined ? "—" : `${(r * 100).toFixed(r === 1 ? 0 : 1)}%`)
const ago = (d?: string | null) => (d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : "never")
const TZS = (n: number) => `TZS ${new Intl.NumberFormat("en-TZ").format(Math.round(n))}`

function StatusPill({ status }: { status: HealthStatus }) {
    const s = STATUS[status]
    return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", s.pill)}>
            <span className={cn("size-2 rounded-full", s.dot, status !== "down" && "animate-pulse")} aria-hidden />
            {s.label}
        </span>
    )
}

function ProbeLine({ probe, endpoint }: { probe: Probe; endpoint: string }) {
    const tr = useTr()
    return (
        <p className="text-xs text-white/50">
            {endpoint.replace(/^https?:\/\//, "")} ·{" "}
            {probe.reachable ? <>{tr("responding in {latencyMs} ms", { latencyMs: probe.latencyMs })}</> : <span className="text-rose-300">{tr("not responding ({error})", { error: probe.error })}</span>}
        </p>
    )
}

function Metric({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "bad" | "warn" }) {
    return (
        <div className="rounded-[var(--ds-radius-small)] bg-slate-50 px-4 py-3 dark:bg-white/5">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className={cn("mt-1 text-lg font-bold tabular-nums text-[#242a37] dark:text-white", tone === "bad" && "text-rose-600", tone === "warn" && "text-amber-600")}>{value}</p>
            {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
        </div>
    )
}

function Panel({ icon: Icon, title, status, probeLine, children }: { icon: any; title: string; status?: HealthStatus; probeLine?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="overflow-hidden rounded-[var(--ds-radius-large)] border border-slate-100 bg-white shadow-[var(--ds-shadow-raised)] dark:border-white/5 dark:bg-[#1a1f2b]">
            <div className="flex items-start justify-between gap-3 bg-[#242a37] px-6 py-5 text-white">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--ds-radius-small)] bg-[#FFD428] text-[#242a37]"><Icon className="size-5" aria-hidden /></span>
                    <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold">{title}</h3>
                        {probeLine}
                    </div>
                </div>
                {status && <StatusPill status={status} />}
            </div>
            <div className="p-6">{children}</div>
        </section>
    )
}

const PERIODS: { value: IntegrationsPeriod; label: string; long: string }[] = [
    { value: "1h", label: "Last hour", long: "the last hour" },
    { value: "24h", label: "24 hours", long: "the last 24 hours" },
    { value: "7d", label: "7 days", long: "the last 7 days" },
    { value: "30d", label: "30 days", long: "the last 30 days" },
]

// "▲ 2.1 pts vs previous 24 hours"
function trend(now: number | null, before: number | null, long: string) {
    if (now === null || before === null) return `No earlier figures to compare`
    const diff = (now - before) * 100
    if (Math.abs(diff) < 0.05) return `Same as the ${long.replace("the last", "previous")}`
    return `${diff > 0 ? "▲" : "▼"} ${Math.abs(diff).toFixed(1)} pts vs ${long.replace("the last", "previous")}`
}

const OVERALL: Record<HealthStatus, { title: string; text: string; tone: string; dot: string }> = {
    operational: { title: "All systems operational", text: "Payments and SMS are working normally.", tone: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200", dot: "bg-emerald-500" },
    degraded: { title: "Some services are degraded", text: "One gateway is failing more often than usual.", tone: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200", dot: "bg-amber-500" },
    down: { title: "A service is down", text: "One gateway isn't responding or isn't set up.", tone: "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200", dot: "bg-rose-500" },
}

export function IntegrationsSettings() {
    const tr = useTr()
    const params = useParams()
    const locale = (params?.locale as string) || "en"
    const [period, setPeriod] = useState<IntegrationsPeriod>("24h")
    const periodInfo = PERIODS.find((p) => p.value === period)!
    const { data, isPending, isError, isFetching, refetch, dataUpdatedAt } = useQuery({
        queryKey: ["platform-integrations", period],
        queryFn: () => getIntegrationsHealth(period),
        refetchInterval: 60_000,
        staleTime: 30_000,
        placeholderData: (prev) => prev,
    })
    // Re-render the "checked … ago" text every 15s
    const [, tick] = useState(0)
    useEffect(() => {
        const id = window.setInterval(() => tick((n) => n + 1), 15_000)
        return () => window.clearInterval(id)
    }, [])

    const overall: HealthStatus | null = data
        ? [data.payment.status, data.sms.status].includes("down") ? "down" : [data.payment.status, data.sms.status].includes("degraded") ? "degraded" : "operational"
        : null

    const header = (
        <div className="space-y-6">
            {/* ── Top bar ── */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-6 justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-[#242a37] dark:text-white">{tr("Integrations")}</h2>
                    <p className="text-xs font-bold text-slate-400 mt-1">{tr("Payment and SMS gateways, and the app versions in use · {long}", { long: periodInfo.long })}</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div role="group" aria-label={tr("Time period")} className="flex p-1.5 bg-slate-100 dark:bg-black/20 rounded-[var(--ds-radius-small)] w-fit max-w-full overflow-x-auto">
                        {PERIODS.map((p) => (
                            <button key={p.value} type="button" onClick={() => setPeriod(p.value)} aria-pressed={period === p.value}
                                className={cn("h-9 px-4 rounded-[var(--ds-radius-small)] text-xs font-semibold transition-all whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#242a37]",
                                    period === p.value ? "bg-white dark:bg-[#242a37] shadow-[var(--ds-shadow-raised)] text-[#242a37] dark:text-[#ffd428]" : "text-slate-500 hover:text-[#242a37] dark:hover:text-white")}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <Button variant="ghost" size="icon" aria-label={tr("Check now")} onClick={() => refetch()} disabled={isFetching}
                        className="h-10 w-10 text-slate-400 hover:text-[#ffd428] rounded-[var(--ds-radius-small)]">
                        <RefreshCw className={cn("size-5", isFetching && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* ── Overall status ── */}
            {overall && (
                <div className={cn("flex flex-col gap-3 rounded-[var(--ds-radius-large)] border px-5 py-4 sm:flex-row sm:items-center sm:justify-between", OVERALL[overall].tone)} role="status">
                    <div className="flex items-center gap-3">
                        <span className="relative flex size-3" aria-hidden>
                            {overall !== "down" && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", OVERALL[overall].dot)} />}
                            <span className={cn("relative inline-flex size-3 rounded-full", OVERALL[overall].dot)} />
                        </span>
                        <div>
                            <p className="text-sm font-bold">{OVERALL[overall].title}</p>
                            <p className="text-xs opacity-80">{OVERALL[overall].text}</p>
                        </div>
                    </div>
                    <p className="text-xs opacity-80">
                        {tr("Checked {toISOString} · refreshes every minute", { toISOString: ago(new Date(dataUpdatedAt).toISOString()) })}</p>
                </div>
            )}
        </div>
    )

    if (isPending) {
        return (
            <div className="space-y-6">
                {header}
                <div className="grid gap-6 lg:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-80 rounded-[var(--ds-radius-large)]" />)}</div>
            </div>
        )
    }
    if (isError || !data) {
        return (
            <div className="space-y-6">
                {header}
                <div className="rounded-[var(--ds-radius-large)] bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] px-6 py-16 text-center">
                    <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Couldn't check the integrations")}</p>
                    <p className="mt-1 text-sm text-slate-500">{tr("If this keeps happening, the server may not have the latest update yet.")}</p>
                    <Button variant="outline" className="mt-4" onClick={() => refetch()}>{tr("Try again")}</Button>
                </div>
            </div>
        )
    }

    const { payment, sms, apps } = data
    return (
        <div className={cn("space-y-6 transition-opacity", isFetching && "opacity-80")}>
            {header}

            <div className="grid gap-6 lg:grid-cols-2">
                <Panel icon={CreditCard} title={payment.name} status={payment.status} probeLine={<ProbeLine probe={payment.probe} endpoint={payment.endpoint} />}>
                    <div className="grid grid-cols-2 gap-3">
                        <Metric label={tr("Top-ups")} value={payment.window.total.toLocaleString()} sub={tr("{TZS} paid", { TZS: TZS(payment.window.paidAmount) })} />
                        <Metric label={tr("Success rate")} value={pct(payment.window.successRate)} sub={trend(payment.window.successRate, payment.previousSuccessRate, periodInfo.long)}
                            tone={payment.window.successRate !== null && payment.window.successRate < 0.8 ? "bad" : undefined} />
                        <Metric label={tr("Paid · Pending · Failed")} value={`${payment.window.paid} · ${payment.window.pending} · ${payment.window.failed}`} tone={payment.window.failed ? "warn" : undefined} />
                        <Metric label={tr("Stuck pending")} value={payment.stuckPending.toLocaleString()} sub={tr("Waiting over 30 minutes")} tone={payment.stuckPending ? "warn" : undefined} />
                    </div>
                    <dl className="mt-5 space-y-2 text-sm">
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">{tr("Last successful top-up")}</dt><dd className="font-semibold">{ago(payment.lastPaidAt)}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">{tr("Payment providers")}</dt><dd className="font-semibold">{tr("{active} of {total} on", { active: payment.providers.active, total: payment.providers.total })}</dd></div>
                    </dl>
                    {payment.providers.list.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {payment.providers.list.map((p) => (
                                <span key={p.id} className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", p.isActive ? "border-slate-200 text-[#242a37] dark:border-white/10 dark:text-white" : "border-dashed border-slate-200 text-slate-400")}>
                                    {providerDisplayName(p.name)}{!p.isActive && " (off)"}
                                </span>
                            ))}
                        </div>
                    )}
                </Panel>

                <Panel icon={MessageSquareText} title={sms.name} status={sms.status} probeLine={<ProbeLine probe={sms.probe} endpoint={sms.endpoint} />}>
                    {!sms.configured && (
                        <p className="mb-4 flex items-start gap-2 rounded-[var(--ds-radius-small)] bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
                            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />{" "}{tr("The SMS account details aren't set on the server, so no messages can be sent.")}</p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <Metric label={tr("Messages")} value={sms.window.total.toLocaleString()} sub={tr("{sent} delivered to the gateway", { sent: sms.window.sent.toLocaleString() })} />
                        <Metric label={tr("Success rate")} value={pct(sms.window.successRate)} sub={trend(sms.window.successRate, sms.previousSuccessRate, periodInfo.long)}
                            tone={sms.window.successRate !== null && sms.window.successRate < 0.8 ? "bad" : undefined} />
                        <Metric label={tr("Failed")} value={sms.window.failed.toLocaleString()} tone={sms.window.failed ? "warn" : undefined} />
                        <Metric label={tr("Sender ID")} value={sms.senderId} sub={tr("Companies can have their own")} />
                    </div>
                    <dl className="mt-5 space-y-2 text-sm">
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">{tr("Last message sent")}</dt><dd className="font-semibold">{ago(sms.lastSentAt)}</dd></div>
                    </dl>
                    {sms.recentFailures.length > 0 && (
                        <div className="mt-4">
                            <p className="text-xs font-semibold text-slate-500">{tr("Recent failures · {long}", { long: periodInfo.long })}</p>
                            <ul className="mt-2 divide-y divide-slate-100 rounded-[var(--ds-radius-small)] border border-slate-100 dark:divide-white/5 dark:border-white/5">
                                {sms.recentFailures.map((f) => (
                                    <li key={f.id} className="flex items-start justify-between gap-3 px-3 py-2 text-xs">
                                        <span className="min-w-0"><span className="font-mono font-semibold">{f.phone ?? "—"}</span> <span className="text-slate-500">{f.error ?? tr("Unknown error")}</span></span>
                                        <span className="shrink-0 text-slate-400">{ago(f.at)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </Panel>
            </div>

            <Panel icon={Smartphone} title={tr("Mobile app versions")}>
                {apps.length === 0 ? (
                    <p className="text-sm text-slate-500">{tr("No app versions recorded yet.")}</p>
                ) : (
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {apps.map((a) => (
                            <li key={a.appType} className="rounded-[var(--ds-radius-small)] border border-slate-100 px-4 py-3 dark:border-white/5">
                                <p className="text-xs font-semibold text-slate-500">{a.appType}</p>
                                <p className="mt-1 font-mono text-lg font-bold">{a.appVersion} <span className="text-xs font-normal text-slate-400">({a.appVersionCode})</span></p>
                                <p className="text-[11px] text-slate-400">{tr("Released")}{" "}{ago(a.createdAt)} · {a.mustUpdate ? tr("update required") : tr("update optional")}</p>
                            </li>
                        ))}
                    </ul>
                )}
                <Link href={`/${locale}/admin/settings?tab=apps`} className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#242a37] dark:text-white hover:underline underline-offset-4">{tr("Manage app versions")}{" "}<ArrowUpRight className="size-3.5" aria-hidden />
                </Link>
            </Panel>
        </div>
    )
}
