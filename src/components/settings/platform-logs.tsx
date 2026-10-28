"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { RefreshCw, Search, X as XIcon, Copy, Eye, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ScrollText, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { TableBanner } from "@/components/ui/table-banner"
import { SheetSection, DetailList } from "@/components/sheets/sheet-blocks"
import { useToast } from "@/components/ui/use-toast"
import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"
import { getPlatformLogs, getPlatformActivity, type LogEntry, type ActivityEntry } from "@/lib/services/platform"
import { useTr } from "@/lib/i18n/portal"

/*
 * Platform logs — a summary table of server log entries (secrets already
 * hidden by the API) or portal/app activity. Clicking a row opens the
 * entry's full details in a sheet; Up/Down move to the neighbouring entry.
 */

const PAGE_SIZE = 10
const FILE_LABEL: Record<string, string> = { error: "Errors", combined: "Everything", app: "App", auth: "Sign-ins", audit: "Audit" }
const LEVEL_STYLE: Record<string, string> = {
    error: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
    warn: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    info: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
    http: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
    debug: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
}
const SHEET_LEVEL: Record<string, string> = { error: "bg-rose-500 text-white", warn: "bg-amber-400 text-[#242a37]", info: "bg-sky-500 text-white", http: "bg-violet-500 text-white", debug: "bg-white/20 text-white" }

const when = (t: string | null) => {
    if (!t) return "—"
    const d = new Date(t.includes("T") ? t : t.replace(" ", "T"))
    return Number.isNaN(d.getTime()) ? t : format(d, "d MMM, HH:mm:ss")
}

function LevelPill({ level }: { level: string }) {
    return <span className={cn("inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", LEVEL_STYLE[level] ?? LEVEL_STYLE.debug)}>{level}</span>
}

function Pager({ page, totalPages, total, onPage, noun }: { page: number; totalPages: number; total: number; onPage: (p: number) => void; noun: string }) {
    const tr = useTr()
    return (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 dark:border-white/5 sm:flex-row">
            <p className="text-xs text-slate-500">{tr("Page {page} of {totalPages} · {total} {noun}", { page, totalPages, total: total.toLocaleString(), noun })}</p>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="mr-1 size-4" />{" "}{tr("Previous")}</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>{tr("Next")}{" "}<ChevronRight className="ml-1 size-4" /></Button>
            </div>
        </div>
    )
}

export function PlatformLogs() {
    const tr = useTr()
    const { toast } = useToast()
    const [view, setView] = useState<"server" | "activity">("server")
    const [file, setFile] = useState("error")
    const [level, setLevel] = useState("all")
    const [kind, setKind] = useState("all")
    const [search, setSearch] = useState("")
    const q = useDebounce(search, 300)
    const [page, setPage] = useState(1)
    const [openIndex, setOpenIndex] = useState<number | null>(null)

    const logsQuery = useQuery({
        queryKey: ["platform-logs", file, level, q],
        queryFn: () => getPlatformLogs({ file, level: level === "all" ? undefined : level, q: q.trim() || undefined, limit: 1000 }),
        enabled: view === "server",
        staleTime: 15_000,
    })
    const activityQuery = useQuery({ queryKey: ["platform-activity"], queryFn: () => getPlatformActivity(500), enabled: view === "activity", staleTime: 30_000 })

    const entries = logsQuery.data?.entries ?? []
    const activity = useMemo(() => {
        const needle = q.trim().toLowerCase()
        return (activityQuery.data ?? []).filter((a) => (kind === "all" || a.kind === kind) && (!needle || [a.who, a.activity, a.details ?? ""].some((v) => v.toLowerCase().includes(needle))))
    }, [activityQuery.data, q, kind])

    const list: (LogEntry | ActivityEntry)[] = view === "server" ? entries : activity
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
    const pageRows = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    useEffect(() => setPage(1), [view, file, level, kind, q])
    useEffect(() => setOpenIndex(null), [view, file, level, kind, q])

    const active = view === "server" ? logsQuery : activityQuery
    const opened = openIndex !== null ? list[openIndex] : null
    const open = (indexOnPage: number) => setOpenIndex((page - 1) * PAGE_SIZE + indexOnPage)
    const step = (delta: number) => {
        if (openIndex === null) return
        const next = Math.min(Math.max(openIndex + delta, 0), list.length - 1)
        setOpenIndex(next)
        setPage(Math.floor(next / PAGE_SIZE) + 1)
    }

    const copy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            toast({ title: tr("Copied") })
        } catch {
            toast({ variant: "destructive", title: tr("Copy failed"), description: tr("Select the text and copy it manually.") })
        }
    }

    const counts = useMemo(() => {
        const c: Record<string, number> = {}
        for (const e of entries) c[e.level] = (c[e.level] ?? 0) + 1
        return c
    }, [entries])

    return (
        <div className="overflow-hidden rounded-[var(--ds-radius-large)] border border-slate-100 bg-white shadow-[var(--ds-shadow-raised)] dark:border-white/5 dark:bg-[#1a1f2b]">
            <TableBanner
                title={view === "server" ? tr("Server Logs") : tr("Activity")}
                description={view === "server" ? tr("Newest first · passwords, tokens and codes are hidden") : tr("Who did what in the portal and the apps, newest first")}
                icon="reports"
                actions={
                    <div role="group" aria-label={tr("Log type")} className="flex rounded-[var(--ds-radius-small)] bg-white/10 p-1">
                        {(["server", "activity"] as const).map((v) => (
                            <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v}
                                className={cn("rounded-[6px] px-4 py-1.5 text-xs font-semibold transition-colors", view === v ? "bg-[#FFD428] text-[#242a37]" : "text-white/70 hover:text-white")}>
                                {v === "server" ? tr("Server logs") : tr("Activity")}
                            </button>
                        ))}
                    </div>
                }
            />

            {/* Filters */}
            <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5 lg:flex-row lg:items-center">
                {view === "server" ? (
                    <>
                        <Select value={file} onValueChange={setFile}>
                            <SelectTrigger aria-label={tr("Log file")} className="h-10 lg:w-40 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{Object.entries(FILE_LABEL).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}</SelectContent>
                        </Select>
                        <div role="group" aria-label={tr("Level")} className="flex flex-wrap gap-1.5">
                            {["all", "error", "warn", "info", "debug"].map((l) => (
                                <button key={l} type="button" onClick={() => setLevel(l)} aria-pressed={level === l}
                                    className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                                        level === l ? "border-[#242a37] bg-[#242a37] text-white dark:border-white dark:bg-white dark:text-[#242a37]" : "border-slate-200 text-slate-600 hover:border-[#242a37]/40 dark:border-white/10 dark:text-slate-300")}>
                                    {l === "all" ? tr("All") : l}
                                    {l !== "all" && level === "all" && counts[l] ? <span className="ml-1.5 tabular-nums opacity-60">{counts[l]}</span> : null}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <div role="group" aria-label={tr("Who")} className="flex flex-wrap gap-1.5">
                        {[["all", "Everyone"], ["staff", "Portal staff"], ["agent", "Agents"]].map(([v, label]) => (
                            <button key={v} type="button" onClick={() => setKind(v)} aria-pressed={kind === v}
                                className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                                    kind === v ? "border-[#242a37] bg-[#242a37] text-white dark:border-white dark:bg-white dark:text-[#242a37]" : "border-slate-200 text-slate-600 hover:border-[#242a37]/40 dark:border-white/10 dark:text-slate-300")}>
                                {label}
                            </button>
                        ))}
                    </div>
                )}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={view === "server" ? tr("Search messages, request IDs…") : tr("Search people or actions")} aria-label={tr("Search logs")} className="h-10 pl-9 pr-9 text-xs" />
                    {search && (
                        <button type="button" aria-label={tr("Clear search")} onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-[#242a37]">
                            <XIcon className="size-4" />
                        </button>
                    )}
                </div>
                <Button variant="outline" size="sm" onClick={() => active.refetch()} disabled={active.isFetching}>
                    <RefreshCw className={cn("mr-1.5 size-4", active.isFetching && "animate-spin")} />{" "}{tr("Refresh")}</Button>
            </div>

            {/* Summary table — same design as All Agents */}
            {active.isError ? (
                <div className="px-6 py-16 text-center">
                    <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Couldn't load the logs")}</p>
                    <p className="mt-1 text-sm text-slate-500">{tr("If this keeps happening, the server may not have the latest update yet.")}</p>
                    <Button variant="outline" className="mt-4" onClick={() => active.refetch()}>{tr("Try again")}</Button>
                </div>
            ) : !active.isPending && list.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-20 opacity-60">
                    <ScrollText className="size-14 text-slate-400" aria-hidden />
                    <div className="text-center">
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">{tr("No Results Found")}</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">{view === "server" ? tr("No log entries match these filters") : tr("No activity matches these filters")}</p>
                        {(search || level !== "all" || kind !== "all") && (
                            <Button variant="ghost" onClick={() => { setSearch(""); setLevel("all"); setKind("all") }}
                                className="mt-5 h-10 rounded-full border border-slate-200 px-6 text-xs font-semibold hover:bg-[#ffd428] hover:text-[#242a37] dark:border-white/10">{tr("Reset Filters")}</Button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-slate-50/50 dark:bg-black/10">
                    <div className="overflow-x-auto">
                        <Table className="min-w-[960px]">
                            <TableHeader>
                                <TableRow className="bg-[#242a37] border-b border-transparent hover:bg-[#242a37]">
                                    {view === "server" ? (
                                        <>
                                            <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs">{tr("Log Entry")}</TableHead>
                                            <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Time")}</TableHead>
                                            <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Request")}</TableHead>
                                            <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-center">{tr("Level")}</TableHead>
                                            <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Actions")}</TableHead>
                                        </>
                                    ) : (
                                        <>
                                            <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs">{tr("Person")}</TableHead>
                                            <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Action")}</TableHead>
                                            <TableHead className="py-4 font-semibold text-[#ffd428] text-xs">{tr("Time")}</TableHead>
                                            <TableHead className="py-4 font-semibold text-[#ffd428] text-xs text-center">{tr("Source")}</TableHead>
                                            <TableHead className="px-6 py-4 font-semibold text-[#ffd428] text-xs text-right">{tr("Actions")}</TableHead>
                                        </>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {active.isPending ? (
                                    [...Array(6)].map((_, i) => (
                                        <TableRow key={`loading-${i}`} className="animate-pulse">
                                            <TableCell className="px-6 py-4"><div className="h-12 w-72 rounded-[var(--ds-radius-large)] bg-slate-50 dark:bg-white/5" /></TableCell>
                                            <TableCell className="py-4"><div className="h-10 w-28 rounded-[var(--ds-radius-small)] bg-slate-50 dark:bg-white/5" /></TableCell>
                                            <TableCell className="py-4"><div className="h-10 w-32 rounded-[var(--ds-radius-small)] bg-slate-50 dark:bg-white/5" /></TableCell>
                                            <TableCell className="py-4"><div className="mx-auto h-7 w-20 rounded-[var(--ds-radius-small)] bg-slate-50 dark:bg-white/5" /></TableCell>
                                            <TableCell className="px-6 py-4"><div className="ml-auto size-10 rounded-[var(--ds-radius-small)] bg-slate-50 dark:bg-white/5" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : pageRows.map((row, i) => {
                                    const absolute = (page - 1) * PAGE_SIZE + i
                                    const rowProps = {
                                        tabIndex: 0,
                                        onClick: () => open(i),
                                        onKeyDown: (e: React.KeyboardEvent) => {
                                            if (e.target !== e.currentTarget) return
                                            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i) }
                                        },
                                        className: cn(
                                            "hover:bg-white dark:hover:bg-white/[0.04] transition-colors border-b border-slate-200/60 dark:border-white/5 cursor-pointer group outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ds-border-focused)]",
                                            openIndex === absolute && "bg-white dark:bg-white/[0.04]",
                                        ),
                                    }
                                    const viewButton = (label: string) => (
                                        <Button variant="ghost" size="icon" aria-label={label} onClick={(e) => { e.stopPropagation(); open(i) }}
                                            className="size-10 rounded-[var(--ds-radius-small)] bg-slate-50 text-slate-400 transition-colors hover:bg-[#ffd428] hover:text-[#242a37] dark:bg-white/5 dark:hover:bg-[#ffd428]">
                                            <Eye className="size-5" />
                                        </Button>
                                    )
                                    const timeCell = (t: string | null) => {
                                        const d = t ? new Date(t.includes("T") ? t : t.replace(" ", "T")) : null
                                        const ok = d && !Number.isNaN(d.getTime())
                                        return (
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="size-1.5 rounded-full bg-[#ffd428]" />
                                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{ok ? format(d!, "d MMM yyyy") : "—"}</p>
                                                </div>
                                                <div className="flex h-[18px] w-fit items-center rounded-[6px] border border-slate-100 bg-slate-50 px-2.5 font-mono text-xs font-semibold text-slate-400 dark:border-white/10 dark:bg-white/5">
                                                    {ok ? format(d!, "HH:mm:ss") : t ?? "—"}
                                                </div>
                                            </div>
                                        )
                                    }

                                    if (view === "server") {
                                        const e = row as LogEntry
                                        return (
                                            <TableRow key={`${e.id}-${absolute}`} {...rowProps} aria-label={tr("Open log entry: {slice}", { slice: e.message.slice(0, 60) })}>
                                                <TableCell className="px-6 py-4 max-w-[460px]">
                                                    <p className="truncate font-mono text-sm font-semibold text-slate-900 transition-colors group-hover:text-[#b58e00] dark:text-white dark:group-hover:text-[#ffd428]">{e.message || tr("(no message)")}</p>
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <Badge variant="outline" className="h-5 rounded-md border-none bg-[#ffd428]/10 px-2 text-[11px] font-semibold text-[#b58e00] dark:text-[#ffd428]">#{String(e.id).padStart(4, "0")}</Badge>
                                                        <p className="truncate text-xs font-bold text-slate-400">{e.service ?? FILE_LABEL[file]}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">{timeCell(e.time)}</TableCell>
                                                <TableCell className="py-4">
                                                    {e.requestId || e.userId ? (
                                                        <div className="space-y-1.5">
                                                            <p className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{e.requestId ?? "—"}</p>
                                                            <p className="text-xs font-semibold text-slate-400">{e.username ?? (e.userId ? tr("User #{userId}", { userId: e.userId }) : tr("No user"))}</p>
                                                        </div>
                                                    ) : <span className="text-xs text-slate-400">—</span>}
                                                </TableCell>
                                                <TableCell className="py-4 text-center">
                                                    <Badge className={cn("h-7 rounded-[var(--ds-radius-small)] border-none px-3 text-xs font-semibold uppercase", LEVEL_STYLE[e.level] ?? LEVEL_STYLE.debug)}>{e.level}</Badge>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-right">{viewButton("View log entry")}</TableCell>
                                            </TableRow>
                                        )
                                    }
                                    const a = row as ActivityEntry
                                    return (
                                        <TableRow key={a.id} {...rowProps} aria-label={tr("Open activity: {who}", { who: a.who })}>
                                            <TableCell className="px-6 py-4">
                                                <p className="truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-[#b58e00] dark:text-white dark:group-hover:text-[#ffd428]">{a.who}</p>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <Badge variant="outline" className="h-5 rounded-md border-none bg-[#ffd428]/10 px-2 text-[11px] font-semibold text-[#b58e00] dark:text-[#ffd428]">{tr("ID: {padStart}", { padStart: String(a.whoId).padStart(3, "0") })}</Badge>
                                                    <p className="truncate text-xs font-bold text-slate-400">{a.kind === "staff" ? (a.role ? a.role.charAt(0) + a.role.slice(1).toLowerCase() : tr("Staff")) : tr("Agent")}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4 max-w-[380px]">
                                                <p className="line-clamp-1 text-sm font-semibold text-slate-700 dark:text-slate-300">{a.activity}</p>
                                                <p className="mt-1 truncate font-mono text-xs text-slate-400">{a.ip ?? tr("No IP recorded")}</p>
                                            </TableCell>
                                            <TableCell className="py-4">{timeCell(a.at)}</TableCell>
                                            <TableCell className="py-4 text-center">
                                                <Badge className={cn("h-7 rounded-[var(--ds-radius-small)] border-none px-3 text-xs font-semibold", a.kind === "staff" ? "bg-[#242a37] text-white dark:bg-white dark:text-[#242a37]" : "bg-[#ffd428] text-[#242a37]")}>
                                                    {a.kind === "staff" ? "PORTAL" : tr("AGENT APP")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-right">{viewButton("View activity")}</TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                    {!active.isPending && <Pager page={page} totalPages={totalPages} total={list.length} onPage={setPage} noun={view === "server" ? "entries" : "events"} />}
                </div>
            )}

            {/* Detail sheet */}
            <Sheet open={!!opened} onOpenChange={(o) => !o && setOpenIndex(null)}>
                <SheetContent side="right" className="[&>button]:hidden flex h-full w-full flex-col overflow-hidden border-l p-0 sm:max-w-[640px] bg-white dark:bg-[#0f1117]">
                    {opened && (
                        <>
                            <SheetTitle className="sr-only">{view === "server" ? tr("Log entry") : tr("Activity")}</SheetTitle>
                            <SheetDescription className="sr-only">{tr("Full details of the selected entry.")}</SheetDescription>
                            <div className="shrink-0 bg-[#242a37] p-5 pt-6 text-white sm:p-8">
                                <div className="mb-6 flex items-start justify-between gap-3">
                                    <span className="flex size-12 items-center justify-center rounded-[var(--ds-radius-small)] bg-[#FFD428] text-[#242a37]">
                                        {view === "server" ? <ScrollText className="size-6" /> : <UserRound className="size-6" />}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" aria-label={tr("Newer entry")} disabled={!openIndex} onClick={() => step(-1)} className="size-9 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white">
                                            <ChevronUp className="size-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" aria-label={tr("Older entry")} disabled={openIndex === list.length - 1} onClick={() => step(1)} className="size-9 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white">
                                            <ChevronDown className="size-4" />
                                        </Button>
                                        <Button variant="ghost" onClick={() => setOpenIndex(null)} aria-label={tr("Close")} className="flex size-9 items-center justify-center rounded-full bg-white/10 p-0 text-white hover:bg-white/20 hover:text-white">
                                            <XIcon className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                                {view === "server" ? (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <span className={cn("rounded px-2 py-0.5 text-xs font-bold uppercase", SHEET_LEVEL[(opened as LogEntry).level] ?? SHEET_LEVEL.debug)}>{(opened as LogEntry).level}</span>
                                            <span className="text-xs font-semibold text-white/50">{when((opened as LogEntry).time)} · {FILE_LABEL[file]}</span>
                                        </div>
                                        <h2 className="mt-3 line-clamp-3 font-mono text-base font-semibold leading-snug">{(opened as LogEntry).message || tr("(no message)")}</h2>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-xs font-semibold text-white/50">{when((opened as ActivityEntry).at)} · {(opened as ActivityEntry).kind === "staff" ? tr("Portal") : tr("Agent app")}</p>
                                        <h2 className="mt-2 text-2xl font-bold leading-tight">{(opened as ActivityEntry).who}</h2>
                                        <p className="mt-1 text-sm text-white/70">{(opened as ActivityEntry).activity}</p>
                                    </>
                                )}
                                <p className="mt-4 text-[11px] text-white/40">{tr("Entry")}{" "}{(openIndex ?? 0) + 1}{" "}{tr("of")}{" "}{list.length.toLocaleString()}{" "}{tr("· use the arrows for newer and older")}</p>
                            </div>

                            <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto bg-[#f1f3f6] p-4 sm:p-8 dark:bg-[#0a0c10]">
                                {view === "server" ? (() => {
                                    const e = opened as LogEntry
                                    return (
                                        <>
                                            <SheetSection title={tr("Message")} action={<Button variant="ghost" size="sm" onClick={() => copy(e.message)}><Copy className="mr-1 size-3.5" />{" "}{tr("Copy")}</Button>}>
                                                <p className="whitespace-pre-wrap break-words px-5 py-4 font-mono text-sm text-[#242a37] dark:text-white">{e.message || tr("(no message)")}</p>
                                            </SheetSection>
                                            <SheetSection title={tr("Context")}>
                                                <DetailList rows={[
                                                    { label: tr("Time"), value: e.time ?? "—", mono: true },
                                                    { label: tr("Level"), value: <LevelPill level={e.level} /> },
                                                    { label: tr("Log"), value: FILE_LABEL[file] },
                                                    { label: tr("Service"), value: e.service ?? "—" },
                                                    { label: tr("Request ID"), value: e.requestId ?? "—", mono: true },
                                                    { label: tr("User"), value: e.username ? `${e.username}${e.userId ? ` (#${e.userId})` : ""}` : e.userId ? `#${e.userId}` : "—" },
                                                ]} />
                                            </SheetSection>
                                            {e.meta && (
                                                <SheetSection title={tr("Details")} action={<Button variant="ghost" size="sm" onClick={() => copy(JSON.stringify(e.meta, null, 2))}><Copy className="mr-1 size-3.5" />{" "}{tr("Copy")}</Button>}>
                                                    <pre className="max-h-80 overflow-auto px-5 py-4 font-mono text-xs text-[#242a37] dark:text-slate-200">{JSON.stringify(e.meta, null, 2)}</pre>
                                                </SheetSection>
                                            )}
                                            <SheetSection title={tr("Raw line")} action={<Button variant="ghost" size="sm" onClick={() => copy(e.raw)}><Copy className="mr-1 size-3.5" />{" "}{tr("Copy")}</Button>}>
                                                <p className="break-all bg-[#242a37] px-5 py-4 font-mono text-xs leading-relaxed text-slate-200">{e.raw}</p>
                                            </SheetSection>
                                            {e.requestId && (
                                                <Button variant="outline" onClick={() => { setSearch(e.requestId!); setLevel("all"); }}>
                                                    <Search className="mr-1.5 size-4" />{" "}{tr("Show everything for this request")}</Button>
                                            )}
                                        </>
                                    )
                                })() : (() => {
                                    const a = opened as ActivityEntry
                                    return (
                                        <>
                                            <SheetSection title={tr("What happened")}>
                                                <p className="whitespace-pre-wrap break-words px-5 py-4 text-sm text-[#242a37] dark:text-white">{a.activity}</p>
                                            </SheetSection>
                                            <SheetSection title={tr("Who and where")}>
                                                <DetailList rows={[
                                                    { label: tr("Name"), value: a.who },
                                                    { label: tr("Account"), value: a.kind === "staff" ? `Portal ${a.role ? a.role.toLowerCase() : "staff"} · #${a.whoId}` : `Agent · #${a.whoId}` },
                                                    { label: tr("Time"), value: a.at ? format(new Date(a.at), "d MMM yyyy, HH:mm:ss") : "—" },
                                                    { label: tr("IP address"), value: a.ip ?? "—", mono: true },
                                                ]} />
                                            </SheetSection>
                                            {a.userAgent && (
                                                <SheetSection title={tr("Device")}>
                                                    <p className="break-words px-5 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">{a.userAgent}</p>
                                                </SheetSection>
                                            )}
                                            {a.details && (
                                                <SheetSection title={tr("Details")} action={<Button variant="ghost" size="sm" onClick={() => copy(a.details!)}><Copy className="mr-1 size-3.5" />{" "}{tr("Copy")}</Button>}>
                                                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words px-5 py-4 font-mono text-xs text-[#242a37] dark:text-slate-200">{(() => {
                                                        try { return JSON.stringify(JSON.parse(a.details), null, 2) } catch { return a.details }
                                                    })()}</pre>
                                                </SheetSection>
                                            )}
                                        </>
                                    )
                                })()}
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    )
}
