"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, usePathname, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { Search, Package, Users, Building2, Bus, MapPin, Shield, Map as MapIcon, CornerDownLeft, Loader2, Sparkles } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { useDebounce } from "@/hooks/use-debounce"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { getParcel } from "@/lib/services/parcel"
import { ParcelViewSheet } from "@/components/parcel/parcel-view-sheet"
import { smartSearch, type SearchGroup, type SearchItem, type SearchType } from "@/lib/services/search"
import { useTr } from "@/lib/i18n/portal"

/*
 * Portal-wide search (Ctrl/⌘+K). The API understands the query — tracking
 * and phone numbers, statuses, periods, places, typos — and returns grouped
 * results. Parcels open in the parcel sheet; everything else opens its page
 * with the search filled in.
 */

const ICONS: Record<SearchType, any> = { parcels: Package, agents: Users, companies: Building2, vehicles: Bus, offices: MapPin, staff: Shield, regions: MapIcon }
const STATUS_LABEL: Record<string, string> = { RECEIVED: "Received", DISPATCHED: "Dispatched", OFFLOADED: "Offloaded", DELIVERED: "Delivered", PICKED_UP: "Picked up", CANCELED: "Cancelled" }
const EXAMPLES = ["ABC123", "delivered from Arusha last week", "0712 345 678", "agents named john", "cancelled today"]

// Where each kind of result lives in each portal
const ROUTES: Record<string, Partial<Record<SearchType, string>>> = {
    ops: { agents: "/ops/agents", companies: "/ops/companies", vehicles: "/ops/vehicles", offices: "/ops/locations/booking-offices", regions: "/ops/locations/regions", staff: "/ops/bus-owners", parcels: "/ops/parcels" },
    admin: { agents: "/admin/users/agents", companies: "/admin/companies", vehicles: "/admin/vehicles/vehicles", offices: "/admin/locations/booking-offices", regions: "/admin/locations/regions", staff: "/admin/users/admins", parcels: "/admin/parcels" },
    biz: { agents: "/biz/agents", vehicles: "/biz/vehicles", parcels: "/biz/parcels" },
}

export function CommandSearch() {
    const tr = useTr()
    const router = useRouter()
    const { toast } = useToast()
    const pathname = usePathname()
    const params = useParams()
    const locale = (params?.locale as string) || "en"
    const portal = pathname.split("/")[2] ?? "ops"
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const q = useDebounce(query.trim(), 250)
    const [active, setActive] = useState(0)
    const [parcel, setParcel] = useState<any | null>(null)
    const [opening, setOpening] = useState(false)
    const listRef = useRef<HTMLDivElement>(null)

    // Ctrl/⌘+K anywhere opens it
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault()
                setOpen((o) => !o)
            }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [])
    useEffect(() => {
        if (!open) setQuery("")
    }, [open])

    const { data, isFetching, isError } = useQuery({
        queryKey: ["smart-search", q],
        queryFn: ({ signal }) => smartSearch(q, signal),
        enabled: open && q.length >= 2,
        staleTime: 30_000,
        placeholderData: (prev) => prev,
    })
    // Only kinds this portal has a page for (parcels open in place)
    const groups: SearchGroup[] = q.length >= 2 ? (data?.groups ?? []).filter((g) => g.type === "parcels" || !!ROUTES[portal]?.[g.type]) : []
    const flat = useMemo(() => groups.flatMap((g) => g.items.map((item) => ({ group: g, item }))), [groups])
    useEffect(() => setActive(0), [q])

    const go = async (group: SearchGroup, item: SearchItem) => {
        if (group.type === "parcels") {
            setOpening(true)
            try {
                setParcel(await getParcel(item.id))
                setOpen(false)
            } catch {
                toast({ variant: "destructive", title: tr("Couldn't open that parcel"), description: tr("Please try again.") })
            } finally {
                setOpening(false)
            }
            return
        }
        const route = ROUTES[portal]?.[group.type]
        if (!route) return
        setOpen(false)
        // The page fills its search with the name and opens this item's details
        router.push(`/${locale}${route}?search=${encodeURIComponent(item.title)}&open=${encodeURIComponent(String(item.id))}`)
    }
    const seeAll = (group: SearchGroup) => {
        const route = ROUTES[portal]?.[group.type]
        if (!route) return
        setOpen(false)
        router.push(`/${locale}${route}?search=${encodeURIComponent(data?.understood?.text || q)}`)
    }

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (!flat.length) return
        if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % flat.length) }
        if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i - 1 + flat.length) % flat.length) }
        if (e.key === "Enter") { e.preventDefault(); const r = flat[active]; if (r) go(r.group, r.item) }
    }
    useEffect(() => {
        listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" })
    }, [active])

    const u = data?.understood
    const chips = q.length >= 2 && u
        ? [
            u.trackingNumber && `Tracking number ${u.trackingNumber}`,
            u.phone && `Phone …${u.phone.slice(-6)}`,
            u.status && (STATUS_LABEL[u.status] ?? u.status),
            u.period?.label,
            u.origin && `From ${u.origin}`,
            u.destination && `To ${u.destination}`,
            u.place && `In ${u.place}`,
            ...(u.types ?? []).map((t) => t.charAt(0).toUpperCase() + t.slice(1)),
            u.text && `“${u.text}”`,
        ].filter(Boolean) as string[]
        : []
    const fuzzyOnly = flat.length > 0 && flat.every((r) => r.item.fuzzy)
    let index = -1

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={tr("Search")}
                className="flex h-10 items-center gap-2.5 rounded-[var(--ds-radius-small)] border border-slate-200 bg-white px-3 text-sm text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-[#242a37] dark:border-white/10 dark:bg-white/5 lg:w-64"
            >
                <Search className="size-4 shrink-0" aria-hidden />
                <span className="hidden flex-1 text-left lg:inline">{tr("Search…")}</span>
                <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-400 dark:border-white/10 lg:inline">⌘K</kbd>
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="top-[10%] w-full max-w-[calc(100%-2rem)] sm:max-w-3xl translate-y-0 gap-0 overflow-hidden p-0 [&>button]:hidden">
                    <DialogTitle className="sr-only">{tr("Search the portal")}</DialogTitle>
                    <DialogDescription className="sr-only">{tr("Search parcels, agents, companies, vehicles and places. Use the arrow keys and Enter.")}</DialogDescription>

                    <div className="flex items-center gap-3 border-b border-slate-100 px-5 dark:border-white/5">
                        {isFetching || opening ? <Loader2 className="size-6 shrink-0 animate-spin text-slate-400" aria-hidden /> : <Search className="size-6 shrink-0 text-slate-400" aria-hidden />}
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder={tr("Search parcels, agents, companies, places…")}
                            aria-label={tr("Search")}
                            role="combobox"
                            aria-expanded={flat.length > 0}
                            aria-controls="search-results"
                            aria-activedescendant={flat.length ? `search-result-${active}` : undefined}
                            className="h-16 min-w-0 flex-1 bg-transparent text-lg text-[#242a37] outline-none placeholder:text-slate-400 dark:text-white"
                        />
                        <kbd className="shrink-0 rounded border border-slate-200 px-2 py-1 font-mono text-xs font-semibold text-slate-400 dark:border-white/10">Esc</kbd>
                    </div>

                    {chips.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3 dark:border-white/5 dark:bg-white/[0.02]">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500"><Sparkles className="size-4 text-[#C99A06]" aria-hidden />{" "}{tr("Understood")}</span>
                            {chips.map((c) => (
                                <span key={c} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#242a37] ring-1 ring-slate-200 dark:bg-white/10 dark:text-white dark:ring-white/10">{c}</span>
                            ))}
                        </div>
                    )}

                    <div ref={listRef} id="search-results" role="listbox" className="max-h-[65vh] min-h-[14rem] overflow-y-auto p-3">
                        {q.length < 2 ? (
                            <div className="px-3 py-6">
                                <p className="text-sm font-semibold text-slate-400">{tr("Try")}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {EXAMPLES.map((ex) => (
                                        <button key={ex} type="button" onClick={() => setQuery(ex)}
                                            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-[#242a37]/40 hover:text-[#242a37] dark:border-white/10 dark:text-slate-300">
                                            {ex}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : isError ? (
                            <p className="px-3 py-8 text-center text-sm text-slate-500">{tr("Search isn't available right now. The server may not have the latest update yet.")}</p>
                        ) : groups.length === 0 && !isFetching ? (
                            <div className="px-3 py-8 text-center">
                                <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("Nothing found for “{q}”", { q })}</p>
                                <p className="mt-1 text-xs text-slate-500">{tr("Try a tracking number (ABC123), a phone number, or a name.")}</p>
                            </div>
                        ) : (
                            <>
                                {fuzzyOnly && <p className="px-3 pb-1 pt-2 text-xs text-slate-500">{tr("No exact match. Did you mean:")}</p>}
                                {groups.map((g) => {
                                    const Icon = ICONS[g.type] ?? Search
                                    const canSeeAll = g.total > g.items.length && !!ROUTES[portal]?.[g.type]
                                    return (
                                        <div key={g.type} className="mb-1">
                                            <div className="flex items-center justify-between px-3 pb-1 pt-3">
                                                <p className="text-xs font-semibold text-slate-400">{g.label} · {g.total.toLocaleString()}</p>
                                                {canSeeAll && <button type="button" onClick={() => seeAll(g)} className="text-xs font-semibold text-[#242a37] hover:underline underline-offset-4 dark:text-white">{tr("See all")}</button>}
                                            </div>
                                            {g.items.map((item) => {
                                                index += 1
                                                const i = index
                                                const selected = i === active
                                                return (
                                                    <button
                                                        key={`${g.type}-${item.id}`}
                                                        id={`search-result-${i}`}
                                                        data-index={i}
                                                        role="option"
                                                        aria-selected={selected}
                                                        type="button"
                                                        onMouseEnter={() => setActive(i)}
                                                        onClick={() => go(g, item)}
                                                        className={cn("flex w-full items-center gap-4 rounded-[var(--ds-radius-small)] px-3 py-3 text-left transition-colors", selected ? "bg-slate-100 dark:bg-white/5" : "")}
                                                    >
                                                        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[var(--ds-radius-small)]", selected ? "bg-[#FFD428] text-[#242a37]" : "bg-[#242a37] text-[#FFD428]")}>
                                                            <Icon className="size-5" aria-hidden />
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className={cn("block truncate text-base font-semibold text-[#242a37] dark:text-white", g.type === "parcels" && "font-mono")}>
                                                                {item.title}
                                                                {item.fuzzy && <span className="ml-2 text-[10px] font-semibold text-amber-600">{tr("close match")}</span>}
                                                            </span>
                                                            {item.subtitle && <span className="block truncate text-sm text-slate-500">{item.subtitle}</span>}
                                                        </span>
                                                        <span className="shrink-0 text-right">
                                                            {item.status && <span className="block text-xs font-semibold text-slate-500">{STATUS_LABEL[item.status] ?? item.status.charAt(0) + item.status.slice(1).toLowerCase()}</span>}
                                                            {item.at && <span className="block text-xs text-slate-400">{format(new Date(item.at), "d MMM yyyy")}</span>}
                                                        </span>
                                                        {selected && <CornerDownLeft className="size-4 shrink-0 text-slate-400" aria-hidden />}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )
                                })}
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-5 border-t border-slate-100 px-5 py-3 text-xs text-slate-400 dark:border-white/5">
                        <span className="whitespace-nowrap"><kbd className="font-mono">↑↓</kbd>{" "}{tr("to move")}</span>
                        <span className="whitespace-nowrap"><kbd className="font-mono">↵</kbd>{" "}{tr("to open")}</span>
                        <span className="ml-auto hidden truncate sm:block">{tr("Understands tracking & phone numbers, statuses, dates and places")}</span>
                    </div>
                </DialogContent>
            </Dialog>

            <ParcelViewSheet parcel={parcel} onClose={() => setParcel(null)} />
        </>
    )
}
