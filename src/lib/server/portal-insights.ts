// Server-only: imported by route handlers under src/app/api/portal-insights.
import { createHash } from "crypto"
import { API_BASE_URL } from "@/lib/constants"
import { mapWithConcurrency } from "@/lib/concurrency"

// Server-side aggregation for the overview screens. The backend has no
// per-company totals (and its /companies/:id/reports undercounts), so the
// figures are built from the parcel list — 100 rows per request at 2-5s
// each. In the browser that's capped at ~6 connections and takes minutes;
// here it runs in parallel and the small result is cached per user.

const PAGE_LIMIT = 100
/** Per job; every job also shares the slots below. */
const BACKEND_CONCURRENCY = 4
/**
 * Cap on concurrent backend requests across all jobs on this server. The
 * production backend slows sharply under parallel load (4s -> 20s per page,
 * then errors, seen at ~50 concurrent), so stay gentle.
 */
const MAX_BACKEND_REQUESTS = 4
const REQUEST_TIMEOUT_MS = 30_000
/** Ranges larger than this (parcels) aren't totalled — too slow to be useful. */
export const MAX_PARCELS_PER_RANGE = 30_000

export class BackendError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message)
    }
}

// ── Shared, prioritised request slots ──
// Several jobs often start together (Today, 7 and 30 days, activity). With
// no shared cap they flood the backend and all slow down; with a plain FIFO
// a 3-page "Today" waits behind a 97-page month. Lower number = sooner.

// Kept on globalThis: each API route is bundled separately (and dev reloads
// re-evaluate modules), so module-level state would give every route its own
// cache and its own request cap. One shared instance per server process.
interface InsightsState {
    queue: Array<{ priority: number; seq: number; start: () => void }>
    activeRequests: number
    seq: number
    cache: Map<string, Entry>
}
const state: InsightsState = ((globalThis as any).__portalInsights ??= {
    queue: [],
    activeRequests: 0,
    seq: 0,
    cache: new Map(),
} satisfies InsightsState)

function acquireSlot(priority: number): Promise<void> {
    if (state.activeRequests < MAX_BACKEND_REQUESTS) {
        state.activeRequests++
        return Promise.resolve()
    }
    return new Promise((resolve) => {
        state.queue.push({ priority, seq: state.seq++, start: resolve })
        state.queue.sort((a, b) => a.priority - b.priority || a.seq - b.seq)
    })
}

function releaseSlot() {
    const next = state.queue.shift()
    if (next) next.start()
    else state.activeRequests--
}

async function backendGet(path: string, token: string, priority: number): Promise<any> {
    for (let attempt = 1; ; attempt++) {
        await acquireSlot(priority)
        try {
            return await backendFetch(path, token)
        } catch (error) {
            // Auth failures are final; one retry for timeouts and transient errors.
            const transient = !(error instanceof BackendError) || error.status === 502 || error.status === 504
            if (!transient || attempt >= 2) throw error
        } finally {
            releaseSlot()
        }
    }
}

async function backendFetch(path: string, token: string): Promise<any> {
    try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            cache: "no-store",
        })
        if (response.status === 401 || response.status === 403) {
            throw new BackendError("Unauthorized", response.status)
        }
        if (!response.ok) throw new BackendError(`Backend responded ${response.status}`, 502)
        return await response.json()
    } catch (error) {
        throw error instanceof BackendError ? error : new BackendError("Backend unreachable", 504)
    }
}

/** Short ranges first: they're what a user is usually looking at right now. */
const rangePriority = (from: string, to: string) => {
    const days = (Date.parse(to) - Date.parse(from)) / 86_400_000
    return days <= 2 ? 0 : days <= 8 ? 1 : 2
}

// ── Cache: per token (results depend on the caller's permissions) ──
//
// Stale-while-revalidate: within `freshMs` an entry is served as is; until
// `maxAgeMs` it's still served instantly while one background reload
// refreshes it. Only the very first request for a key waits on the backend.

interface Entry {
    loadedAt: number
    value: Promise<unknown>
    refreshing?: boolean
}

const cache = state.cache

function cached<T>(key: string, freshMs: number, maxAgeMs: number, load: () => Promise<T>): Promise<T> {
    const now = Date.now()
    const hit = cache.get(key)
    if (hit && now - hit.loadedAt < maxAgeMs) {
        if (now - hit.loadedAt >= freshMs && !hit.refreshing) {
            hit.refreshing = true
            load()
                .then((value) => cache.set(key, { loadedAt: Date.now(), value: Promise.resolve(value) }))
                .catch(() => { hit.refreshing = false })
        }
        return hit.value as Promise<T>
    }
    const value = load()
    cache.set(key, { loadedAt: now, value })
    // Never keep a failure.
    value.catch(() => {
        if (cache.get(key)?.value === value) cache.delete(key)
    })
    if (cache.size > 500) {
        for (const [k, v] of cache) if (now - v.loadedAt >= maxAgeMs) cache.delete(k)
    }
    return value
}

const tokenKey = (token: string) => createHash("sha256").update(token).digest("hex").slice(0, 32)

// Backend parcel filters take DD-MM-YYYY.
const toBackendDate = (iso: string) => {
    const [y, m, d] = iso.split("-")
    return `${d}-${m}-${y}`
}

export interface PeriodMetrics {
    /** Parcels booked, not counting cancelled ones */
    totalParcels: number
    /** Sum of parcel prices, not counting cancelled parcels (what was actually earned) */
    totalRevenue: number
    cancelledParcels: number
    cancelledRevenue: number
    lastActivityDate: string | null
}

/**
 * Exact volume, revenue (sum of parcel prices) and newest parcel for
 * [from, to], grouped two ways from one read of the parcels:
 * - companies: by the booking agent's company (sender.company.id)
 * - agents: by the booking agent (senderId). The backend records the
 *   booking agent as both sender and receiver, and its own per-agent
 *   "receivedParcels" counts exactly these.
 */
export function getPeriodMetrics(token: string, from: string, to: string) {
    const includesToday = to >= new Date().toISOString().slice(0, 10)
    return cached(
        `period-net:${tokenKey(token)}:${from}:${to}`,
        // Ranges that include today keep changing; past ranges don't.
        includesToday ? 2 * 60_000 : 6 * 60 * 60_000,
        includesToday ? 30 * 60_000 : 24 * 60 * 60_000,
        async () => {
            const range = `startDate=${toBackendDate(from)}&endDate=${toBackendDate(to)}`
            const priority = rangePriority(from, to)
            const pagePath = (page: number) => `/api/parcel?page=${page}&limit=${PAGE_LIMIT}&${range}`

            const first = await backendGet(pagePath(1), token, priority)
            const totalItems = Number(first?.data?.summary?.totalParcels ?? first?.data?.pagination?.totalItems ?? 0) || 0
            if (totalItems > MAX_PARCELS_PER_RANGE) {
                throw new BackendError(`Range has ${totalItems} parcels; limit is ${MAX_PARCELS_PER_RANGE}`, 413)
            }
            const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_LIMIT))
            const rest = await mapWithConcurrency(
                Array.from({ length: totalPages - 1 }, (_, i) => i + 2),
                BACKEND_CONCURRENCY,
                (page) => backendGet(pagePath(page), token, priority),
            )

            const companies: Record<number, PeriodMetrics> = {}
            const agents: Record<number, PeriodMetrics> = {}
            const add = (map: Record<number, PeriodMetrics>, id: number, p: any) => {
                const entry = (map[id] ??= { totalParcels: 0, totalRevenue: 0, cancelledParcels: 0, cancelledRevenue: 0, lastActivityDate: null })
                // Cancelled parcels earn nothing; they're counted apart so totals aren't inflated
                if (String(p.status).toUpperCase() === "CANCELED") {
                    entry.cancelledParcels += 1
                    entry.cancelledRevenue += Number(p.price) || 0
                } else {
                    entry.totalParcels += 1
                    entry.totalRevenue += Number(p.price) || 0
                }
                if (p.createdAt && (!entry.lastActivityDate || p.createdAt > entry.lastActivityDate)) {
                    entry.lastActivityDate = p.createdAt
                }
            }
            let counted = 0
            for (const body of [first, ...rest]) {
                for (const p of body?.data?.parcels || []) {
                    const companyId = p?.sender?.company?.id
                    if (companyId != null) {
                        counted++
                        add(companies, companyId, p)
                    }
                    const agentId = p?.senderId ?? p?.sender?.id
                    if (agentId != null) add(agents, agentId, p)
                }
            }
            return { from, to, totalParcels: totalItems, counted, companies, agents, generatedAt: new Date().toISOString() }
        },
    )
}

export interface CompanyActivity {
    totalParcels: number
    lastActivityDate: string | null
}

/**
 * All-time volume and newest parcel per company: one single-row request
 * per company (the summary carries the count, the first row is the newest).
 */
export function getCompaniesActivity(token: string, companyIds: number[]) {
    const ids = [...new Set(companyIds)].sort((a, b) => a - b)
    return cached(`activity:${tokenKey(token)}:${ids.join(",")}`, 5 * 60_000, 60 * 60_000, async () => {
        const results = await mapWithConcurrency(ids, BACKEND_CONCURRENCY, async (id) => {
            try {
                const body = await backendGet(`/api/parcel?page=1&limit=1&companyId=${id}`, token, 1)
                return {
                    totalParcels: Number(body?.data?.summary?.totalParcels ?? body?.data?.pagination?.totalItems ?? 0) || 0,
                    lastActivityDate: body?.data?.parcels?.[0]?.createdAt ?? null,
                } satisfies CompanyActivity
            } catch (error) {
                if (error instanceof BackendError && (error.status === 401 || error.status === 403)) throw error
                return null
            }
        })
        const companies: Record<number, CompanyActivity> = {}
        ids.forEach((id, i) => {
            if (results[i]) companies[id] = results[i] as CompanyActivity
        })
        return { companies, generatedAt: new Date().toISOString() }
    })
}

// ── Float transactions ──────────────────────────────────────────────

/** Most paid transactions read for one range; longer ranges return counts only. */
export const MAX_FLOAT_TRANSACTIONS_PER_RANGE = 20_000

export interface FloatGroup {
    id: number
    name: string
    transactions: number
    amount: number
}

/**
 * Float top-ups for [from, to] (yyyy-MM-dd; omit both for all time):
 * - exact count per status (PAID / PENDING / FAILED), one row-less request each
 * - exact paid amount, and paid amount per day, provider, company and agent,
 *   from reading every PAID transaction in the range (100 per request).
 * The backend's own summary only sums the page it returns, and its trends
 * endpoint counts a "COMPLETED" status that doesn't exist.
 */
export function getFloatPeriod(token: string, from?: string, to?: string) {
    const range = from && to ? `&startDate=${from}&endDate=${to}` : ""
    const includesToday = !to || to >= new Date().toISOString().slice(0, 10)
    return cached(
        `float:${tokenKey(token)}:${from ?? "all"}:${to ?? "all"}`,
        includesToday ? 60_000 : 6 * 60 * 60_000,
        includesToday ? 30 * 60_000 : 24 * 60 * 60_000,
        async () => {
            const priority = from && to ? rangePriority(from, to) : 2
            const count = async (status: string) => {
                const body = await backendGet(`/api/float/transactions/search?status=${status}&page=1&limit=1${range}`, token, priority)
                return Number(body?.summary?.totalTransactions ?? body?.data?.summary?.totalTransactions ?? 0) || 0
            }
            const [paid, pending, failed] = await Promise.all([count("PAID"), count("PENDING"), count("FAILED")])

            const result = {
                from: from ?? null,
                to: to ?? null,
                counts: { paid, pending, failed, total: paid + pending + failed },
                // null when the range has too many paid transactions to add up
                paidAmount: null as number | null,
                byDay: [] as { date: string; transactions: number; amount: number }[],
                byProvider: [] as FloatGroup[],
                byCompany: [] as FloatGroup[],
                byAgent: [] as (FloatGroup & { phoneNumber?: string | null; companyName?: string | null })[],
                generatedAt: new Date().toISOString(),
            }
            if (paid > MAX_FLOAT_TRANSACTIONS_PER_RANGE) return result

            const pagePath = (page: number) => `/api/float/transactions/search?status=PAID&page=${page}&limit=${PAGE_LIMIT}${range}`
            const pages = Math.max(1, Math.ceil(paid / PAGE_LIMIT))
            const bodies = paid === 0 ? [] : await mapWithConcurrency(
                Array.from({ length: pages }, (_, i) => i + 1),
                BACKEND_CONCURRENCY,
                (page) => backendGet(pagePath(page), token, priority),
            )

            const day = new Map<string, { date: string; transactions: number; amount: number }>()
            const provider = new Map<number, FloatGroup>()
            const company = new Map<number, FloatGroup>()
            const agent = new Map<number, FloatGroup & { phoneNumber?: string | null; companyName?: string | null }>()
            const bump = <T extends FloatGroup>(map: Map<number, T>, id: number, init: () => T, amount: number) => {
                const row = map.get(id) ?? init()
                row.transactions += 1
                row.amount += amount
                map.set(id, row)
            }
            let total = 0
            for (const body of bodies) {
                for (const t of body?.transactions ?? body?.data?.transactions ?? []) {
                    const amount = Number(t.amount) || 0
                    total += amount
                    const d = String(t.createdAt ?? "").slice(0, 10)
                    if (d) {
                        const row = day.get(d) ?? { date: d, transactions: 0, amount: 0 }
                        row.transactions += 1
                        row.amount += amount
                        day.set(d, row)
                    }
                    const pid = Number(t.provider?.id ?? t.providerId)
                    if (pid) bump(provider, pid, () => ({ id: pid, name: t.provider?.name || `Provider #${pid}`, transactions: 0, amount: 0 }), amount)
                    const cid = Number(t.user?.company?.id ?? t.user?.companyId)
                    if (cid) bump(company, cid, () => ({ id: cid, name: t.user?.company?.name || `Company #${cid}`, transactions: 0, amount: 0 }), amount)
                    const uid = Number(t.user?.id ?? t.userId)
                    if (uid) bump(agent, uid, () => ({
                        id: uid,
                        name: t.user?.fullName || t.user?.username || `Agent #${uid}`,
                        phoneNumber: t.user?.phoneNumber ?? null,
                        companyName: t.user?.company?.name ?? null,
                        transactions: 0,
                        amount: 0,
                    }), amount)
                }
            }
            const byAmount = <T extends FloatGroup>(m: Map<number, T>) => [...m.values()].sort((a, b) => b.amount - a.amount)
            result.paidAmount = Math.round(total * 100) / 100
            result.byDay = [...day.values()].sort((a, b) => a.date.localeCompare(b.date))
            result.byProvider = byAmount(provider)
            result.byCompany = byAmount(company).slice(0, 20)
            result.byAgent = byAmount(agent).slice(0, 20)
            return result
        },
    )
}

/** Bearer token from the Authorization header or the `token` cookie. */
export function tokenFrom(request: Request & { cookies?: { get(name: string): { value: string } | undefined } }) {
    const header = request.headers.get("authorization")
    if (header?.startsWith("Bearer ")) return header.slice(7)
    return request.cookies?.get("token")?.value ?? null
}
