"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNowStrict } from "date-fns"
import { AlertTriangle, Clock, Copy, Phone, RefreshCw, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ListSkeleton } from "@/components/ui/skeletons"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { useTr } from "@/lib/i18n/portal"
import { searchFloatTransactions, type FloatTransaction } from "@/lib/services/float-transactions"

const STUCK_MINUTES = 30
const TZS = (n: number | string) => `TZS ${Math.round(Number(n) || 0).toLocaleString()}`
const unwrap = (r: any): FloatTransaction[] => (Array.isArray(r?.transactions) ? r.transactions : r?.data?.transactions ?? [])

/*
 * Top-ups ops should follow up: pending ones (oldest first, flagged once
 * they've waited over 30 minutes) and failed ones with the provider's message.
 * Each row gives what's needed to sort it out: the agent's phone, the
 * reference to quote to the provider, and the full details.
 */
export function NeedsAttention({
    range,
    providerName,
    onOpen,
}: {
    range: { from: string; to: string } | null
    providerName: (t: FloatTransaction) => string
    onOpen: (t: FloatTransaction) => void
}) {
    const tr = useTr()
    const { toast } = useToast()
    const [view, setView] = useState<"pending" | "failed">("pending")
    const dates = range ? { startDate: range.from, endDate: range.to } : {}

    const pendingQuery = useQuery({
        queryKey: ["float-attention", "PENDING", range],
        queryFn: async () => unwrap(await searchFloatTransactions({ status: "PENDING", sortBy: "createdAt", sortOrder: "asc", limit: 100, page: 1, ...dates })),
        staleTime: 30_000,
        refetchInterval: 60_000,
    })
    const failedQuery = useQuery({
        queryKey: ["float-attention", "FAILED", range],
        queryFn: async () => unwrap(await searchFloatTransactions({ status: "FAILED", sortBy: "createdAt", sortOrder: "desc", limit: 100, page: 1, ...dates })),
        staleTime: 30_000,
        refetchInterval: 60_000,
    })

    const pending = pendingQuery.data ?? []
    const failed = failedQuery.data ?? []
    const stuck = useMemo(() => pending.filter((t) => Date.now() - new Date(t.createdAt).getTime() > STUCK_MINUTES * 60_000), [pending])
    const query = view === "pending" ? pendingQuery : failedQuery
    const rows = view === "pending" ? pending : failed
    const atRisk = (view === "pending" ? pending : failed).reduce((acc, t) => acc + (Number(t.amount) || 0), 0)

    const copy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            toast({ title: tr("Copied"), description: text })
        } catch {
            toast({ variant: "destructive", title: tr("Copy failed"), description: tr("Select the text and copy it manually.") })
        }
    }

    return (
        <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SummaryTile icon={Clock} label={tr("Pending")} value={pendingQuery.data ? pending.length.toLocaleString() : undefined} sub={tr("Waiting for the provider")} />
                <SummaryTile icon={AlertTriangle} tone={stuck.length ? "warn" : undefined} label={tr("Stuck pending")} value={pendingQuery.data ? stuck.length.toLocaleString() : undefined} sub={tr("Waiting over 30 minutes")} />
                <SummaryTile icon={XCircle} tone={failed.length ? "danger" : undefined} label={tr("Failed")} value={failedQuery.data ? failed.length.toLocaleString() : undefined} sub={tr("Check the provider message")} />
            </div>

            <div className="overflow-hidden rounded-[var(--ds-radius-large)] border border-slate-100 bg-white shadow-[var(--ds-shadow-raised)] dark:border-white/5 dark:bg-[#1a1f2b]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/5">
                    <div className="inline-flex rounded-[var(--ds-radius-small)] bg-slate-100 p-1 dark:bg-black/20" role="tablist" aria-label={tr("Needs attention")}>
                        {(["pending", "failed"] as const).map((v) => (
                            <button
                                key={v}
                                role="tab"
                                aria-selected={view === v}
                                onClick={() => setView(v)}
                                className={cn("flex h-9 items-center gap-2 rounded-[var(--ds-radius-small)] px-4 text-sm font-medium transition-colors cursor-pointer",
                                    view === v ? "bg-white text-[#242a37] shadow-sm dark:bg-[#242a37] dark:text-white" : "text-slate-500 hover:text-[#242a37] dark:hover:text-white")}
                            >
                                {v === "pending" ? tr("Pending") : tr("Failed")}
                                <span className="rounded-full bg-slate-200/70 px-2 text-xs tabular-nums dark:bg-white/10">{(v === "pending" ? pending : failed).length}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                        {rows.length > 0 && <span>{tr("{amount} in total", { amount: TZS(atRisk) })}</span>}
                        <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => query.refetch()} disabled={query.isFetching}>
                            <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} /> {tr("Refresh")}
                        </Button>
                    </div>
                </div>

                {query.isPending ? (
                    <ListSkeleton rows={6} />
                ) : query.isError ? (
                    <div className="px-6 py-14 text-center">
                        <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Couldn't load transactions")}</p>
                        <Button variant="outline" className="mt-4" onClick={() => query.refetch()}>{tr("Try again")}</Button>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="px-6 py-14 text-center">
                        <p className="text-sm font-semibold text-[#242a37] dark:text-white">{view === "pending" ? tr("Nothing waiting") : tr("No failed top-ups")}</p>
                        <p className="mt-1 text-sm text-slate-500">{tr("Everything in this period went through.")}</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-white/5">
                        {rows.map((t) => {
                            const minutes = (Date.now() - new Date(t.createdAt).getTime()) / 60_000
                            const isStuck = view === "pending" && minutes > STUCK_MINUTES
                            const agentPhone = t.user?.phoneNumber
                            return (
                                <li key={t.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                                    <button type="button" onClick={() => onOpen(t)} className="group min-w-0 flex-1 text-left cursor-pointer">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="truncate text-sm font-semibold text-[#242a37] group-hover:underline underline-offset-4 dark:text-white">{t.user?.fullName || t.user?.username || tr("Unknown")}</p>
                                            {isStuck && <Badge className="h-5 border-none bg-amber-100 px-2 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">{tr("Stuck")}</Badge>}
                                        </div>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {TZS(t.amount)} · {providerName(t)} · {tr("from {phone}", { phone: t.phoneNumber || "—" })} · <span className={cn(isStuck && "font-semibold text-amber-700 dark:text-amber-300")}>{formatDistanceToNowStrict(new Date(t.createdAt), { addSuffix: true })}</span>
                                        </p>
                                        {view === "failed" && t.providerResponse && (
                                            <p className="mt-1 line-clamp-2 text-xs text-rose-600 dark:text-rose-400">{t.providerResponse}</p>
                                        )}
                                    </button>
                                    <div className="flex shrink-0 items-center gap-2">
                                        {t.transactionReference && (
                                            <Button variant="outline" size="sm" className="h-9 gap-1.5 font-mono text-xs" onClick={() => copy(t.transactionReference)} aria-label={tr("Copy reference")}>
                                                <Copy className="size-3.5" /> {t.transactionReference}
                                            </Button>
                                        )}
                                        {agentPhone && (
                                            <Button variant="outline" size="sm" className="h-9 gap-1.5" asChild>
                                                <a href={`tel:${agentPhone}`} aria-label={tr("Call {name}", { name: t.user?.fullName || agentPhone })}><Phone className="size-3.5" /> {tr("Call agent")}</a>
                                            </Button>
                                        )}
                                        <Button size="sm" className="h-9 bg-[#242a37] text-white hover:bg-[#2d3545]" onClick={() => onOpen(t)}>{tr("Details")}</Button>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                )}
                {rows.length >= 100 && <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-white/5">{tr("Showing the first 100. Pick a shorter period to see the rest.")}</p>}
            </div>
        </div>
    )
}

function SummaryTile({ icon: IconCmp, label, value, sub, tone }: { icon: any; label: string; value?: string; sub: string; tone?: "warn" | "danger" }) {
    return (
        <div className="rounded-[var(--ds-radius-large)] bg-[#242a37] p-5 shadow-[var(--ds-shadow-raised)]">
            <div className="flex items-center gap-3">
                <span className={cn("flex size-9 items-center justify-center rounded-[var(--ds-radius-small)] bg-white/5",
                    tone === "warn" ? "text-amber-300" : tone === "danger" ? "text-rose-300" : "text-[#ffd428]")}>
                    <IconCmp className="size-4" />
                </span>
                <p className="text-xs font-semibold text-[#ffd428]/60">{label}</p>
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums text-white">{value ?? "…"}</p>
            <p className="mt-1 text-xs text-white/40">{sub}</p>
        </div>
    )
}
