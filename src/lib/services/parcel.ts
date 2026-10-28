import { apiRequest } from "@/lib/constants"
import { backgroundRequest, mapWithConcurrency } from "@/lib/concurrency"
import type { ParcelFilters, ParcelStats } from "@/types/parcel"

export interface Parcel {
    id: number
    uuid: string
    parcelNumber: string
    status: string
    name?: string
    weight?: number
    value?: number
    price?: number
    units?: number
    senderName?: string
    senderPhoneNumber?: string
    recipientName?: string
    recipientPhoneNumber?: string
    createdAt: string
    updatedAt: string
    deliveredDate?: string
    cancellationReason?: string
    isCanceled?: boolean
    description?: string
    travelDate?: string
    pickedUpDate?: string
    pickupPersonName?: string
    pickupPersonPhone?: string
    originId?: number
    destinationId?: number
    originOfficeId?: number
    destinationOfficeId?: number
    vehicleId?: number
    parcelTypeId?: number
    senderId?: number
    receiverId?: number
    dispatcherId?: number
    offloaderId?: number
    delivererId?: number
    cancelerId?: number
    origin?: { id: number; name: string; code: string }
    destination?: { id: number; name: string; code: string }
    originOffice?: { id: number; name: string }
    destinationOffice?: { id: number; name: string }
    vehicle?: {
        id: number
        registrationNumber: string
        brand?: { id: number; name: string }
        model?: { id: number; name: string }
    }
    parcelType?: { id: number; name: string; description?: string }
    sender?: { id: number; username: string; fullName?: string; phoneNumber?: string; company?: { name: string } }
    receiver?: { id: number; username: string; fullName?: string; phoneNumber?: string }
    dispatcher?: { id: number; username: string; fullName?: string }
    offloader?: { id: number; username: string; fullName?: string }
    deliverer?: { id: number; username: string; fullName?: string }
    canceler?: { id: number; username: string; fullName?: string }
    tracking?: Array<{
        id: number
        status: string
        location?: string
        description?: string
        timestamp: string
    }>
}

export interface TrackingResult {
    query: string
    exactMatch: boolean
    multipleMatches: boolean
    count: number
    parcel: {
        id: number
        parcelNumber: string
        status: string
        createdAt: string
        updatedAt: string
        relevanceScore: number
        name: string
        weight: number
        value: number
        price: number
        units: number
        description: string
        parcelType: string
        sender: {
            name: string
            phoneNumber: string
            company: string
        }
        recipient: {
            name: string
            phoneNumber: string
        }
        origin: {
            id: number
            name: string
            code: string
        }
        destination: {
            id: number
            name: string
            code: string
        }
        originOffice: {
            id?: number
            name?: string
        }
        destinationOffice: {
            id: number
            name: string
        }
        vehicle: {
            id: number
            registrationNumber: string
            model: {
                id: number
                uuid: string
                name: string
                createdAt: string
                updatedAt: string
            }
            brand: {
                id: number
                uuid: string
                name: string
                createdAt: string
                updatedAt: string
            }
        }
        dispatcher: {
            id: number
            name: string
            phoneNumber: string
        }
        trackingHistory: Array<{
            status: string
            location: string
            description: string
            timestamp: string
            user: any
        }>
        currentLocation: string
        lastUpdated: string
        estimatedDelivery: string | null
        isDelivered: boolean
        deliveredDate?: string
    }
    searchFields: string[]
}

export interface ParcelType {
    id: number
    name: string
    description?: string
    createdAt: string
    updatedAt: string
}

export interface GetParcelsParams {
    paginate?: boolean
    page?: number
    perPage?: number
    parcelNumber?: string
    status?: string
    dateFrom?: string
    dateTo?: string
    search?: string
    includeOverdue?: boolean
    companyId?: number | string
    originId?: number | string
    destinationId?: number | string
    regionId?: number | string
    districtId?: number | string
    originCountryId?: number | string
    originRegionId?: number | string
    originDistrictId?: number | string
    originOfficeId?: number | string
}

export interface ParcelApiResponse {
    success: boolean
    data: {
        parcels: Parcel[]
        pagination: {
            currentPage: number
            totalPages: number
            totalItems: number
            itemsPerPage: number
        }
        summary: {
            totalParcels: number
            statusDistribution: {
                CANCELED: number
                DISPATCHED: number
                DELIVERED: number
                OFFLOADED: number
                RECEIVED: number
                PICKED_UP: number
            }
            filters: {
                status: string | null
                dateRange: string | null
                companyId: number | null
                originId: number | null
                destinationId: number | null
            }
            sorting: {
                sortBy: string
                sortOrder: string
            }
        }
    }
    message: string
    totalParcels: number
}

export interface ParcelPriceResponse {
    success: boolean
    data: {
        parcels: Parcel[]
        totalEarnings: number
    }
    message: string
}

export interface ParcelPriceByRegionResponse {
    success: boolean
    data: {
        regionPrices: any[]
        totalEarnings: number
    }
    message: string
}

export interface ParcelPriceByOfficeResponse {
    success: boolean
    data: {
        officePrices: any[]
        totalEarnings: number
    }
    message: string
}

export interface ParcelPriceListResponse {
    success: boolean
    data: {
        parcelPrices: any[]
        pagination: {
            currentPage: number
            totalPages: number
            totalItems: number
            itemsPerPage: number
        }
        totalEarnings: number
    }
    message: string
}

/**
 * Track parcel by parcel number
 */
export async function trackParcel(trackingNumber: string): Promise<TrackingResult> {
    console.log("[Parcel] Tracking parcel:", trackingNumber)

    try {
        const result = await apiRequest(`/api/parcel/track/${trackingNumber}`)
        console.log("✅ Parcel tracked successfully")
        return result
    } catch (error) {
        console.error("❌ Error tracking parcel:", error)
        throw error
    }
}

// Every date-filtered endpoint documented in the backend's API collection
// (parcel reports, agent reports, country/region/district/office reports, etc.)
// takes startDate/endDate as DD-MM-YYYY, not ISO — convert at the boundary so
// every caller can keep passing ordinary yyyy-MM-dd strings.
function toBackendDate(value: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
    if (!match) return value
    const [, year, month, day] = match
    return `${day}-${month}-${year}`
}

/**
 * Get all parcels with filters
 */
export async function getParcels(
    params: GetParcelsParams = {},
    options: { throwOnError?: boolean; signal?: AbortSignal } = {},
): Promise<ParcelApiResponse> {
    console.log("[Parcel] Fetching parcels with params:", params)

    const queryParams = new URLSearchParams()

    if (params.page) queryParams.append("page", params.page.toString())
    if (params.perPage) queryParams.append("limit", params.perPage.toString())
    if (params.parcelNumber) queryParams.append("parcelNumber", params.parcelNumber)
    if (params.status) queryParams.append("status", params.status)
    if (params.dateFrom) queryParams.append("startDate", toBackendDate(params.dateFrom))
    if (params.dateTo) queryParams.append("endDate", toBackendDate(params.dateTo))
    if (params.search) queryParams.append("search", params.search)
    if (params.companyId) queryParams.append("companyId", params.companyId.toString())
    if (params.originId) queryParams.append("originId", params.originId.toString())
    if (params.destinationId) queryParams.append("destinationId", params.destinationId.toString())
    if (params.regionId) queryParams.append("regionId", params.regionId.toString())
    if (params.districtId) queryParams.append("districtId", params.districtId.toString())
    if (params.originCountryId) queryParams.append("originCountryId", params.originCountryId.toString())
    if (params.originRegionId) queryParams.append("originRegionId", params.originRegionId.toString())
    if (params.originDistrictId) queryParams.append("originDistrictId", params.originDistrictId.toString())
    if (params.originOfficeId) queryParams.append("originOfficeId", params.originOfficeId.toString())

    const endpoint = `/api/parcel${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const result = await apiRequest(endpoint, { silent: true, signal: options.signal })
        console.log("✅ Parcels fetched successfully")
        return result
    } catch (error) {
        // Callers that render their own error state (e.g. the dashboards)
        // need the failure — the zero fallback is indistinguishable from
        // a genuinely empty period.
        if (options.throwOnError) throw error
        console.warn("⚠️ [Parcel] Analytical fetch failed, providing safe fallback:", error)
        return {
            success: true,
            data: {
                parcels: [],
                pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: params.perPage || 20 },
                summary: { totalParcels: 0, statusDistribution: { CANCELED: 0, DISPATCHED: 0, DELIVERED: 0, OFFLOADED: 0, RECEIVED: 0, PICKED_UP: 0 }, filters: { status: null, dateRange: null, companyId: null, originId: null, destinationId: null }, sorting: { sortBy: "createdAt", sortOrder: "desc" } }
            },
            message: "Fallback data used",
            totalParcels: 0
        }
    }
}

/**
 * Get total parcel count for a specific company (lightweight — single page, reads summary only)
 */
import { getCompanyParcels } from "./company"

// --- COMPANY INTELLIGENCE MODULE ---

/**
 * Get total metrics for a specific company (Native Industrial Traversal)
 * This bypasses server-side summaries to manually audit every single parcel 
 * across ALL pages until the registry is exhausted.
 */
export async function getCompanyMetrics(
    companyId: number,
    dateFrom?: string,
    dateTo?: string,
): Promise<{ count: number; totalRevenue: number }> {
    try {
        // GET /parcel/company-report is admin-only (Postman pins it to
        // {{admin_token}}, and the live backend 403s "Unauthorized access to
        // company parcel reports" for an Ops-role token) — unusable here.
        // GET /companies/:companyId/reports is the company-scoped report
        // endpoint documented against the regular {{token}}, so it's the one
        // Ops (and Biz/Owner) sessions can actually call. Note: unlike the
        // parcel module's DD-MM-YYYY convention, this endpoint's own Postman
        // example uses plain ISO dates (yyyy-MM-dd) — don't run it through
        // toBackendDate.
        const startDate = dateFrom || "2000-01-01"
        const endDate = dateTo || new Date().toISOString().slice(0, 10)
        const url = `/api/companies/${companyId}/reports?startDate=${startDate}&endDate=${endDate}`
        const response = await apiRequest(url, { silent: true })
        // Real shape (confirmed live): { reports: [...], summary: { totalParcels,
        // deliveredParcels, inTransitParcels, canceledParcels, totalRevenue } }
        // — the numbers live under `summary`, not at the top level or under `data`.
        const report = response?.data?.summary || response?.summary || response?.data || response || {}

        const count = Number(
            report.totalParcels ?? report.totalCount ?? report.count ??
            report.parcelCount ?? report.total ?? 0
        )
        const totalRevenue = Number(
            report.totalRevenue ?? report.totalEarnings ?? report.revenue ??
            report.totalValue ?? report.totalAmount ?? 0
        )

        return { count: isNaN(count) ? 0 : count, totalRevenue: isNaN(totalRevenue) ? 0 : totalRevenue }
    } catch (error) {
        console.warn(`[Company Metrics] Unavailable for company ${companyId}:`, error)
        return { count: 0, totalRevenue: 0 }
    }
}

/**
 * Get comprehensive intelligence stats for a specific company
 */
export async function getCompanyIntelligence(companyId: number, dateFrom?: string, dateTo?: string) {
    try {
        const metrics = await getCompanyMetrics(companyId, dateFrom, dateTo)

        // Note: there's no documented per-company "latest activity" probe —
        // the base parcel list endpoint doesn't support a companyId filter,
        // so a second call here would silently return the latest parcel
        // system-wide, not this company's. Leave lastActivityDate unset;
        // callers already fall back to the company's createdAt in that case.
        return {
            totalParcels: metrics.count,
            totalEarnings: metrics.totalRevenue,
            totalRevenue: metrics.totalRevenue,
            lastActivityDate: null,
            latestParcel: null
        }
    } catch (error) {
        console.warn(`[Company Intelligence] Unavailable for ${companyId}:`, error)
        return {
            totalParcels: 0,
            totalEarnings: 0,
            totalRevenue: 0,
            lastActivityDate: null,
            latestParcel: null
        }
    }
}

// ─── Company overview metrics ───
//
// GET /companies/:id/reports undercounts badly (live: a company with 142
// parcels today and 40k overall reported 2 parcels ever), so the overview
// is built from the parcel list instead, which is what the rest of the
// portal shows. The list honours ?companyId=, returns newest first, and
// caps pages at 100 rows.

const PARCEL_PAGE_LIMIT = 100
// Page reads the user is waiting on (getParcelStats totals). Background bulk
// lookups go through backgroundRequest, so the two never starve each other.
const PERIOD_PAGE_CONCURRENCY = 3
// The proxied backend occasionally stalls a request without ever answering;
// without a deadline that one request would leave the overview loading forever.
const METRICS_REQUEST_TIMEOUT_MS = 30_000

/** `signal` that also aborts after `ms`. */
function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal {
    const timeout = AbortSignal.timeout(ms)
    if (!signal) return timeout
    // AbortSignal.any is Chrome 116+ / Safari 17.4+; older browsers keep
    // cancellation and lose only the deadline.
    return typeof AbortSignal.any === "function" ? AbortSignal.any([signal, timeout]) : signal
}

export interface CompanyActivity {
    /** All-time parcel count */
    totalParcels: number
    /** createdAt of the company's newest parcel; null if it has none */
    lastActivityDate: string | null
}

export interface CompanyPeriodMetrics {
    /** Parcels booked, not counting cancelled ones */
    totalParcels: number
    /** Sum of parcel prices, not counting cancelled parcels */
    totalRevenue: number
    cancelledParcels?: number
    cancelledRevenue?: number
    lastActivityDate: string | null
}

export type OverviewPeriod = "today" | "7d" | "30d" | "all"

/**
 * yyyy-MM-dd range for an overview period, in local time. "Last N days"
 * includes today; the end bound is tomorrow because the backend treats a
 * bare date as that day's midnight.
 */
export function overviewRange(period: OverviewPeriod, now = new Date()) {
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    const day = (offset: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
    const dateTo = iso(day(1))
    if (period === "today") return { dateFrom: iso(day(0)), dateTo }
    if (period === "7d") return { dateFrom: iso(day(-6)), dateTo }
    if (period === "30d") return { dateFrom: iso(day(-29)), dateTo }
    return { dateFrom: "2000-01-01", dateTo }
}

// Both are aggregated server-side by /api/portal-insights (src/lib/server/
// portal-insights.ts): the browser's ~6 connections per host made the
// page-by-page walk take minutes, and the result is small and cacheable.

/** All-time volume and last activity per company. */
export async function getCompaniesActivity(
    companyIds: number[],
    signal?: AbortSignal,
): Promise<Record<number, CompanyActivity>> {
    if (companyIds.length === 0) return {}
    const response = await apiRequest(`/api/portal-insights/company-activity?ids=${companyIds.join(",")}`, {
        silent: true,
        signal: withTimeout(signal, 120_000),
    })
    return response?.companies ?? {}
}

/**
 * Exact per-company volume and revenue for a date range (yyyy-MM-dd).
 * Rejects when the range is too large to total (HTTP 413).
 */
export async function getCompaniesPeriodMetrics(
    range: { dateFrom: string; dateTo: string },
    options: { signal?: AbortSignal } = {},
): Promise<Record<number, CompanyPeriodMetrics>> {
    const response = await apiRequest(
        `/api/portal-insights/company-period?from=${range.dateFrom}&to=${range.dateTo}`,
        { silent: true, signal: withTimeout(options.signal, 180_000) },
    )
    return response?.companies ?? {}
}

/** Per booking agent: volume, revenue and newest parcel for a date range. */
export async function getAgentsPeriodMetrics(
    range: { dateFrom: string; dateTo: string },
    options: { signal?: AbortSignal } = {},
): Promise<Record<number, CompanyPeriodMetrics>> {
    const response = await apiRequest(
        `/api/portal-insights/agent-period?from=${range.dateFrom}&to=${range.dateTo}`,
        { silent: true, signal: withTimeout(options.signal, 180_000) },
    )
    return response?.agents ?? {}
}

/**
 * Get total metrics for a specific country (Native Industrial Traversal)
 * This manually audits every single parcel across ALL pages for a specific country.
 */
export async function getCountryMetrics(countryId: number): Promise<{ count: number; totalRevenue: number }> {
    try {
        let totalCount = 0
        let totalRevenue = 0
        let currentPage = 1
        const limit = 100 
        let hasMore = true

        while (hasMore) {
            try {
                // Scoping by originCountryId to match territorial origin policies
                const url = `/api/parcel?originCountryId=${countryId}&page=${currentPage}&limit=${limit}&sort=createdAt&order=desc`
                const response = await apiRequest(url, { silent: true })
                
                const items = response?.data?.parcels || response?.parcels || response?.data || []
                
                if (!Array.isArray(items) || items.length === 0) {
                    hasMore = false
                    break
                }

                totalCount += items.length
                items.forEach((p: any) => {
                    const val = Number(p.value || p.price || p.totalValue || p.amount || 0)
                    totalRevenue += val
                })

                const pag = response?.data?.pagination || response?.pagination || {}
                const totalPages = Number(pag.totalPages || pag.pages || 0)
                
                if (items.length < limit || (totalPages > 0 && currentPage >= totalPages)) {
                    hasMore = false
                } else {
                    currentPage++
                }
                
                if (currentPage > 500) break
            } catch (err) {
                hasMore = false
                break
            }
        }

        return { count: totalCount, totalRevenue }
    } catch (error) {
        console.error(`[Country Intelligence] Trace failed for country ${countryId}:`, error)
        return { count: 0, totalRevenue: 0 }
    }
}

/**
 * Get comprehensive intelligence stats for a specific country
 */
export async function getCountryIntelligence(countryId: number) {
    try {
        const metrics = await getCountryMetrics(countryId)

        // Probe for latest activity
        const url = `/api/parcel?originCountryId=${countryId}&page=1&limit=1&sort=createdAt&order=desc`
        const response = await apiRequest(url)
        const items = response?.data?.parcels || response?.parcels || response?.data || []
        const latestParcel = items[0]

        return {
            totalParcels: metrics.count,
            totalEarnings: metrics.totalRevenue,
            totalRevenue: metrics.totalRevenue,
            lastActivityDate: latestParcel?.createdAt || latestParcel?.updatedAt || null,
            latestParcel: latestParcel || null
        }
    } catch (error) {
        console.error(`[Country Intelligence] Critical failure for ${countryId}:`, error)
        return {
            totalParcels: 0,
            totalEarnings: 0,
            totalRevenue: 0,
            lastActivityDate: null,
            latestParcel: null
        }
    }
}

// Helpers for specific dashboard slots
export const getCompanyParcelCount = async (id: number) => (await getCompanyMetrics(id)).count
export const getCompanyRevenue = async (id: number) => (await getCompanyMetrics(id)).totalRevenue


/**
 * Get single parcel by ID
 */
export async function getParcel(id: number): Promise<Parcel> {
    console.log("[Parcel] Fetching parcel:", id)

    try {
        const result = await apiRequest(`/api/parcel/${id}`)
        console.log("✅ Parcel fetched successfully")
        return result
    } catch (error) {
        console.error(`❌ Error fetching parcel ${id}:`, error)
        throw error
    }
}

/**
 * Get total metrics for a specific agent (Native Industrial Traversal)
 * This manually audits every single parcel across ALL pages for a specific agent.
 */
/**
 * Get total metrics for a specific agent (Native Industrial Traversal)
 */
export async function getAgentMetrics(agentId: number, signal?: AbortSignal): Promise<{ 
    totalCount: number; 
    receivedCount: number; 
    deliveredCount: number; 
    totalRevenue: number;
    latestParcel: any
}> {
    try {
        let totalCount = 0
        let receivedCount = 0
        let deliveredCount = 0
        let totalRevenue = 0
        let latestParcel: any = null
        let currentPage = 1
        const limit = 100 
        let hasMore = true

        while (hasMore) {
            // Stop walking pages once nobody is waiting for the result
            // (query cancelled / page left).
            if (signal?.aborted) break
            try {
                const url = `/api/auth/agents/parcels/${agentId}?page=${currentPage}&limit=${limit}`
                const response = await apiRequest(url, { silent: true, signal })
                
                const items = response?.parcels || response?.data?.parcels || response?.data || []
                
                if (!Array.isArray(items) || items.length === 0) {
                    hasMore = false
                    break
                }
                if (currentPage === 1) latestParcel = items[0]

                totalCount += items.length
                items.forEach((p: any) => {
                    const val = Number(p.value || p.price || p.totalValue || p.amount || 0)
                    totalRevenue += val

                    // Map statuses to categories
                    const status = String(p.status || "").toUpperCase()
                    if (["DELIVERED", "COMPLETED", "PICKED_UP"].includes(status)) {
                        deliveredCount++
                    } else {
                        receivedCount++
                    }
                })

                const pag = response?.pagination || response?.data?.pagination || {}
                const totalPages = Number(pag.totalPages || pag.total_pages || 0)
                
                if (items.length < limit || (totalPages > 0 && currentPage >= totalPages)) {
                    hasMore = false
                } else {
                    currentPage++
                }
                
                if (currentPage > 500) break
            } catch (err) {
                hasMore = false
                break
            }
        }

        return { totalCount, receivedCount, deliveredCount, totalRevenue, latestParcel }
    } catch (error) {
        console.error(`[Agent Intelligence] Trace failed for agent ${agentId}:`, error)
        return { totalCount: 0, receivedCount: 0, deliveredCount: 0, totalRevenue: 0, latestParcel: null }
    }
}

/**
 * Get comprehensive intelligence stats for a specific agent
 */
export async function getAgentIntelligence(agentId: number, signal?: AbortSignal) {
    try {
        const metrics = await getAgentMetrics(agentId, signal)
        // Page 1 of the traversal is newest-first, so its first parcel is the
        // last activity — no separate probe request needed.
        const latestParcel = metrics.latestParcel

        return {
            totalParcels: metrics.totalCount,
            receivedParcels: metrics.receivedCount,
            deliveredParcels: metrics.deliveredCount,
            totalEarnings: metrics.totalRevenue,
            lastActivityDate: latestParcel?.createdAt || latestParcel?.updatedAt || null
        }
    } catch {
        return { totalParcels: 0, receivedParcels: 0, deliveredParcels: 0, totalEarnings: 0, lastActivityDate: null }
    }
}

// Each agent's metrics walk every page of their parcels, so loading them
// for all agents at once floods the browser's per-host connection pool
// (stalling every other tab on the app) and makes the backend drop
// connections. Run a few agents at a time instead.
const AGENT_INTELLIGENCE_CONCURRENCY = 4

/**
 * Intelligence for many agents, keyed by agent id, with bounded concurrency.
 * Pass the React Query signal so leaving the page stops the remaining work.
 */
export async function getAgentsIntelligenceMap(agentIds: number[], signal?: AbortSignal) {
    const results = await mapWithConcurrency(agentIds, AGENT_INTELLIGENCE_CONCURRENCY, (id) => backgroundRequest(() => getAgentIntelligence(id, signal)), signal)
    const map: Record<number, any> = {}
    agentIds.forEach((id, i) => {
        if (results[i]) map[id] = results[i]
    })
    return map
}

/**
 * Get parcel statistics
 */
export async function getParcelStats(params?: {
    dateFrom?: string
    dateTo?: string
    regionId?: number
    officeId?: number
    /**
     * Sum value/price/weight across the parcels in the range. The backend
     * summary has no money totals, so this reads the parcels themselves,
     * newest first, at 100 per request — skip it when only counts are needed.
     */
    includeTotals?: boolean
    /**
     * Most pages (of 100) to read for the totals. When the range has more,
     * the sums cover only the newest parcels and `totalsComplete` is false;
     * averages are still valid for that sample. Default 1 (one request).
     */
    maxTotalsPages?: number
    /** Rethrow request failures instead of resolving to all-zero stats. */
    throwOnError?: boolean
}): Promise<ParcelStats> {
    const includeTotals = params?.includeTotals ?? true
    const throwOnError = params?.throwOnError ?? false

    try {
        // Get the first page to access summary data
        const response = await getParcels(
            {
                page: 1,
                perPage: 1,
                dateFrom: params?.dateFrom,
                dateTo: params?.dateTo,
            },
            { throwOnError },
        )

        if (response.success && response.data.summary) {
            const summary = response.data.summary
            const statusDist = summary.statusDistribution || {}

            // The API caps a page at 100 rows whatever `limit` asks for, so
            // totals mean reading page by page — up to maxTotalsPages.
            const pagesInRange = includeTotals ? Math.ceil(summary.totalParcels / PARCEL_PAGE_LIMIT) : 0
            const pagesToRead = Math.min(pagesInRange, Math.max(1, params?.maxTotalsPages ?? 1))
            const pages = await mapWithConcurrency(
                Array.from({ length: pagesToRead }, (_, i) => i + 1),
                PERIOD_PAGE_CONCURRENCY,
                async (page) => {
                    const res = await getParcels(
                        { page, perPage: PARCEL_PAGE_LIMIT, dateFrom: params?.dateFrom, dateTo: params?.dateTo },
                        { throwOnError: true, signal: AbortSignal.timeout(METRICS_REQUEST_TIMEOUT_MS) },
                    )
                    return res?.data?.parcels || []
                },
            )
            const allParcels = pages.flat()
            const totalValue = allParcels.reduce((sum, p) => sum + (p.value || 0), 0)
            const totalPrice = allParcels.reduce((sum, p) => sum + (p.price || 0), 0)
            const totalWeight = allParcels.reduce((sum, p) => sum + (p.weight || 0), 0)
            const sampleSize = allParcels.length

            const stats = {
                total: summary.totalParcels,
                received: statusDist.RECEIVED || 0,
                dispatched: statusDist.DISPATCHED || 0,
                offloaded: statusDist.OFFLOADED || 0,
                lost: statusDist.CANCELED || 0,
                delivered: statusDist.DELIVERED || 0,
                pickedUp: statusDist.PICKED_UP || 0,
                totalValue,
                totalPrice,
                totalWeight,
                averageValue: sampleSize > 0 ? totalValue / sampleSize : 0,
                averageWeight: sampleSize > 0 ? totalWeight / sampleSize : 0,
                totalsComplete: !includeTotals || pagesToRead >= pagesInRange,
                totalsSampleSize: sampleSize,
                pendingDeliveries: (statusDist.RECEIVED || 0) + (statusDist.DISPATCHED || 0) + (statusDist.OFFLOADED || 0),
                overdueCount: 0,
                lostPercentage: summary.totalParcels > 0 ? ((statusDist.CANCELED || 0) / summary.totalParcels) * 100 : 0,
            }

            return stats
        }

        if (throwOnError) throw new Error(response.message || "Parcel summary unavailable")

        // Fallback to empty stats
        return {
            total: 0,
            received: 0,
            dispatched: 0,
            offloaded: 0,
            lost: 0,
            delivered: 0,
            pickedUp: 0,
            totalValue: 0,
            totalWeight: 0,
            pendingDeliveries: 0,
            overdueCount: 0,
            lostPercentage: 0,
        }
    } catch (error) {
        if (throwOnError) throw error
        console.error("❌ Error calculating parcel stats:", error)
        return {
            total: 0,
            received: 0,
            dispatched: 0,
            offloaded: 0,
            lost: 0,
            delivered: 0,
            pickedUp: 0,
            totalValue: 0,
            totalWeight: 0,
            pendingDeliveries: 0,
            overdueCount: 0,
            lostPercentage: 0,
        }
    }
}

/**
 * Get parcel history
 */
export async function getParcelHistory(parcelId: number) {
    console.log("[Parcel] Fetching history for parcel:", parcelId)

    try {
        const result = await apiRequest(`/api/parcel/history/${parcelId}`)
        console.log("✅ Parcel history fetched successfully")
        return result
    } catch (error) {
        console.error(`❌ Error fetching parcel history ${parcelId}:`, error)
        throw error
    }
}

/**
 * Search parcels
 */
export async function searchParcels(searchTerm: string): Promise<Parcel[]> {
    console.log("[Parcel] Searching parcels:", searchTerm)

    try {
        const result = await apiRequest(`/api/parcel/search?searchTerm=${encodeURIComponent(searchTerm)}`)
        console.log("✅ Parcels searched successfully")
        return result
    } catch (error) {
        console.error("❌ Error searching parcels:", error)
        throw error
    }
}

/**
 * Get all parcel types
 */
export async function getParcelTypes(): Promise<ParcelType[]> {
    console.log("[Parcel] Fetching parcel types")

    try {
        const result = await apiRequest("/api/parcel/types")
        console.log("✅ Parcel types fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching parcel types:", error)
        throw error
    }
}

/**
 * Add a new parcel type
 */
export async function addParcelType(data: { name: string; description?: string }): Promise<ParcelType> {
    console.log("[Parcel] Adding parcel type:", data)

    try {
        const result = await apiRequest("/api/parcel/types", {
            method: "POST",
            body: JSON.stringify(data),
        })
        console.log("✅ Parcel type added successfully")
        return result
    } catch (error) {
        console.error("❌ Error adding parcel type:", error)
        throw error
    }
}

/**
 * Update a parcel type
 */
export async function updateParcelType(
    id: number,
    data: { name: string; description?: string }
): Promise<ParcelType> {
    console.log("[Parcel] Updating parcel type:", id, data)

    try {
        const result = await apiRequest(`/api/parcel/types/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        })
        console.log("✅ Parcel type updated successfully")
        return result
    } catch (error) {
        console.error(`❌ Error updating parcel type ${id}:`, error)
        throw error
    }
}

/**
 * Cancel a parcel
 */
export async function cancelParcel(parcelId: number, reason: string) {
    console.log("[Parcel] Canceling parcel:", parcelId, "Reason:", reason)

    try {
        const result = await apiRequest("/api/parcel/cancel", {
            method: "POST",
            body: JSON.stringify({ parcelId, cancellationReason: reason }),
        })
        console.log("✅ Parcel canceled successfully")
        return result
    } catch (error) {
        console.error(`❌ Error canceling parcel ${parcelId}:`, error)
        throw error
    }
}

/**
 * Reverse parcel cancellation
 */
export async function reverseCancellation(parcelId: number) {
    console.log("[Parcel] Reversing cancellation for parcel:", parcelId)

    try {
        const result = await apiRequest("/api/parcel/reverse-cancellation", {
            method: "POST",
            body: JSON.stringify({ parcelId }),
        })
        console.log("✅ Parcel cancellation reversed successfully")
        return result
    } catch (error) {
        console.error(`❌ Error reversing cancellation for parcel ${parcelId}:`, error)
        throw error
    }
}

/**
 * Get parcel manifest for a vehicle
 */
export async function getParcelManifest(vehicleId: number) {
    console.log("[Parcel] Fetching manifest for vehicle:", vehicleId)

    try {
        const result = await apiRequest(`/api/parcel/manifest?vehicleId=${vehicleId}`)
        console.log("✅ Parcel manifest fetched successfully")
        return result
    } catch (error) {
        console.error(`❌ Error fetching manifest for vehicle ${vehicleId}:`, error)
        throw error
    }
}

/**
 * Get origin and destination information
 */
export async function getOriginDestinationInfo() {
    console.log("[Parcel] Fetching origin-destination info")

    try {
        const result = await apiRequest("/api/parcel/origin-destination-info")
        console.log("✅ Origin-destination info fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching origin-destination info:", error)
        throw error
    }
}

/**
 * Get office information
 */
export async function getOfficeInfo() {
    console.log("[Parcel] Fetching office info")

    try {
        const result = await apiRequest("/api/parcel/office-info")
        console.log("✅ Office info fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching office info:", error)
        throw error
    }
}

/**
 * Get drop-off information
 */
export async function getDropOffInfo() {
    console.log("[Parcel] Fetching drop-off info")

    try {
        const result = await apiRequest("/api/parcel/drop-off-info")
        console.log("✅ Drop-off info fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching drop-off info:", error)
        throw error
    }
}

/**
 * Get cancellations with optional date filters
 */
export async function getCancellations(params?: { startDate?: string; endDate?: string }) {
    console.log("[Parcel] Fetching cancellations with params:", params)

    const queryParams = new URLSearchParams()
    if (params?.startDate) queryParams.append("startDate", toBackendDate(params.startDate))
    if (params?.endDate) queryParams.append("endDate", toBackendDate(params.endDate))

    const endpoint = `/api/parcel/cancellations${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Cancellations fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching cancellations:", error)
        throw error
    }
}

/**
 * Get parcel price data
 */
export async function getParcelPriceData(params?: {
    dateFrom?: string
    dateTo?: string
}): Promise<ParcelPriceResponse> {
    console.log("[Parcel] Fetching price data with params:", params)

    const queryParams = new URLSearchParams()
    if (params?.dateFrom) queryParams.append("startDate", toBackendDate(params.dateFrom))
    if (params?.dateTo) queryParams.append("endDate", toBackendDate(params.dateTo))

    const endpoint = `/api/parcel/price${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Parcel price data fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching parcel price data:", error)
        throw error
    }
}

/**
 * Get parcel price by region
 */
export async function getParcelPriceByRegion(params?: {
    dateFrom?: string
    dateTo?: string
}): Promise<ParcelPriceByRegionResponse> {
    console.log("[Parcel] Fetching price by region with params:", params)

    const queryParams = new URLSearchParams()
    if (params?.dateFrom) queryParams.append("startDate", toBackendDate(params.dateFrom))
    if (params?.dateTo) queryParams.append("endDate", toBackendDate(params.dateTo))

    const endpoint = `/api/parcel/price-region${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Parcel price by region fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching parcel price by region:", error)
        throw error
    }
}

/**
 * Get parcel price by office
 */
export async function getParcelPriceByOffice(params?: {
    dateFrom?: string
    dateTo?: string
}): Promise<ParcelPriceByOfficeResponse> {
    console.log("[Parcel] Fetching price by office with params:", params)

    const queryParams = new URLSearchParams()
    if (params?.dateFrom) queryParams.append("startDate", toBackendDate(params.dateFrom))
    if (params?.dateTo) queryParams.append("endDate", toBackendDate(params.dateTo))

    const endpoint = `/api/parcel/price-office${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Parcel price by office fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching parcel price by office:", error)
        throw error
    }
}

/**
 * Get parcel price list
 */
export async function getParcelPriceList(params?: {
    dateFrom?: string
    dateTo?: string
    page?: number
    perPage?: number
}): Promise<ParcelPriceListResponse> {
    console.log("[Parcel] Fetching price list with params:", params)

    const queryParams = new URLSearchParams()
    if (params?.dateFrom) queryParams.append("startDate", toBackendDate(params.dateFrom))
    if (params?.dateTo) queryParams.append("endDate", toBackendDate(params.dateTo))
    if (params?.page) queryParams.append("page", params.page.toString())
    if (params?.perPage) queryParams.append("limit", params.perPage.toString())

    const endpoint = `/api/parcel/price-list${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Parcel price list fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching parcel price list:", error)
        throw error
    }
}

/**
 * Get recent parcel activities
 */
export async function getRecentParcelActivities(limit = 10) {
    console.log("[Parcel] Fetching recent activities, limit:", limit)

    try {
        const response = await getParcels({ perPage: limit })
        return response.data.parcels || []
    } catch (error) {
        console.error("❌ Error fetching recent activities:", error)
        throw error
    }
}

/**
 * Mark parcel as lost (uses cancelParcel)
 */
export async function markParcelAsLost(parcelId: number, reason?: string) {
    return cancelParcel(parcelId, reason || "Marked as lost")
}

// Placeholder functions for features not yet available
export async function updateParcelStatus(parcelId: number, status: string, data?: any) {
    throw new Error("Update parcel status endpoint not available yet")
}

export async function getOverdueParcels() {
    return []
}

export async function bulkMarkAsLost(parcelIds: number[], reason?: string) {
    throw new Error("Bulk operations not available yet")
}

export async function generateParcelOTP(parcelId: number) {
    throw new Error("OTP generation not available yet")
}

export async function verifyParcelOTP(parcelId: number, otpCode: string) {
    throw new Error("OTP verification not available yet")
}

export async function exportParcels(params: { format: "csv" | "excel" | "pdf"; filters?: ParcelFilters }) {
    throw new Error("Export functionality not available yet")
}

export async function generateParcelReceipt(parcelId: number) {
    throw new Error("Receipt generation not available yet")
}

// --- ADVANCED TEMPORAL ANALYTICS ENGINE (SQL-OPTIMIZED LOGIC) ---

export type AnalyticsPeriod = 'today' | 'last_week' | 'last_month' | 'overall';

export interface TerritoryPerformance {
    id: number;
    name: string;
    period: AnalyticsPeriod;
    parcelCount: number;
    revenue: number;
    marketShare: number;
    rank?: number;
}

export function getParcelPeriod(createdAt: string | Date): AnalyticsPeriod {
    const date = new Date(createdAt);
    const now = new Date();
    
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // SQL-aligned logic: prioritization is sequential
    if (date >= weekAgo) return 'last_week';
    if (date >= monthAgo) return 'last_month';
    return 'overall';
}

/**
 * 2. KPI SNAPSHOT Logic
 */
export function computeKPISnapshot(parcels: any[]): Record<AnalyticsPeriod, number> {
    const counts: Record<AnalyticsPeriod, number> = { today: 0, last_week: 0, last_month: 0, overall: parcels.length };
    parcels.forEach(p => {
        const period = getParcelPeriod(p.createdAt);
        if (period === 'today') counts.today++;
        if (period === 'last_week') counts.last_week++;
        if (period === 'last_month') counts.last_month++;
    });
    return counts;
}

/**
 * 3, 4, 5, 6. TERRITORY ANALYTICS Logic (Unified Engine)
 * This implements the GROUP BY id, name, period logic from SQL
 */
export function computeTerritoryAnalytics(
    parcels: any[], 
    territories: any[], 
    type: 'country' | 'region' | 'district' | 'office',
    direction: 'origin' | 'destination' | 'both' = 'origin'
): TerritoryPerformance[] {
    const periods: AnalyticsPeriod[] = ['today', 'last_week', 'last_month', 'overall'];
    const results: TerritoryPerformance[] = [];
    const map = new Map<string, { count: number, revenue: number }>();

    parcels.forEach(p => {
        const period = getParcelPeriod(p.createdAt);
        const val = Number(p.amount || p.price || p.totalAmount || 0);

        // Identify all affected territories based on direction
        const affectedIds = new Set<number>();

        const getTargetId = (dir: 'origin' | 'destination') => {
            let tid: number | undefined;
            if (type === 'country') {
                tid = dir === 'origin' ? (p.originCountryId || p.origin_country_id) : (p.destinationCountryId || p.destination_country_id);
                
                // Name or Flag Fallback
                if (!tid) {
                    const searchAttr = dir === 'origin' ? (p.origin || p.originName || "") : (p.destination || p.destinationName || "");
                    const name = String(searchAttr).toLowerCase();
                    const matched = territories.find(t => {
                        const tName = String(t.name).toLowerCase();
                        return (tName.length > 2 && name.includes(tName)) || (t.code && name.includes(String(t.code).toLowerCase()));
                    });
                    if (matched) tid = matched.id;
                }
            } else if (type === 'region') {
                tid = dir === 'origin' ? (p.originId || p.originRegionId || p.origin_region_id) : (p.destinationId || p.destinationRegionId || p.destination_region_id);
            } else if (type === 'district') {
                // SQL-aligned District Resolution: Requires digging into office relations if direct ID is missing
                tid = dir === 'origin' ? (p.originDistrictId || p.origin_district_id) : (p.destinationDistrictId || p.destination_district_id);
                if (!tid) {
                    const office = dir === 'origin' ? p.originOffice : p.destinationOffice;
                    tid = office?.districtId || office?.district_id;
                }
            } else if (type === 'office') {
                tid = dir === 'origin' ? (p.originOfficeId || p.origin_office_id) : (p.destinationOfficeId || p.destination_office_id);
            }
            return tid;
        };

        if (direction === 'origin' || direction === 'both') {
            const id = getTargetId('origin');
            if (id) affectedIds.add(id);
        }
        if (direction === 'destination' || direction === 'both') {
            const id = getTargetId('destination');
            if (id) affectedIds.add(id);
        }

        affectedIds.forEach(territoryId => {
            const periodKey = `${territoryId}_${period}`;
            const pData = map.get(periodKey) || { count: 0, revenue: 0 };
            map.set(periodKey, { count: pData.count + 1, revenue: pData.revenue + val });

            const overallKey = `${territoryId}_overall`;
            const oData = map.get(overallKey) || { count: 0, revenue: 0 };
            map.set(overallKey, { count: oData.count + 1, revenue: oData.revenue + val });
        });
    });

    const periodTotals = {
        last_week: parcels.filter(p => getParcelPeriod(p.createdAt) === 'last_week').length,
        last_month: parcels.filter(p => getParcelPeriod(p.createdAt) === 'last_month').length,
        overall: parcels.length
    };

    territories.forEach(t => {
        periods.forEach(period => {
            const data = map.get(`${t.id}_${period}`) || { count: 0, revenue: 0 };
            const totalForPeriod = periodTotals[period];
            results.push({
                id: t.id,
                name: t.name,
                period,
                parcelCount: data.count,
                revenue: data.revenue,
                marketShare: totalForPeriod > 0 ? (data.count * 100) / totalForPeriod : 0
            });
        });
    });

    return results;
}

/**
 * 7. TOP PERFORMERS Logic
 */
export function getTopPerformers(analytics: TerritoryPerformance[], limit = 10): TerritoryPerformance[] {
    const periods: AnalyticsPeriod[] = ['last_week', 'last_month', 'overall'];
    const ranked: TerritoryPerformance[] = [];
    periods.forEach(period => {
        const forPeriod = analytics
            .filter(a => a.period === period)
            .sort((a, b) => b.parcelCount - a.parcelCount)
            .slice(0, limit)
            .map((a, i) => ({ ...a, rank: i + 1 }));
        ranked.push(...forPeriod);
    });
    return ranked;
}
export interface RegionVolume {
    parcels: number
    /** Sum of parcel prices */
    revenue: number
}

/**
 * Parcels sent from / received in each region, counted by the backend in one
 * grouped query (GET /api/parcel/price-region, cached there for 10 minutes).
 * Pass no range for all time.
 */
export async function getRegionVolumes(
    range?: { dateFrom: string; dateTo: string } | null,
    signal?: AbortSignal,
): Promise<{ sent: Record<number, RegionVolume>; received: Record<number, RegionVolume> }> {
    const dmy = (iso: string) => iso.split("-").reverse().join("-")
    const params = new URLSearchParams({ groupBy: "both" })
    if (range) {
        params.set("startDate", dmy(range.dateFrom))
        params.set("endDate", dmy(range.dateTo))
    }
    const response = await apiRequest(`/api/parcel/price-region?${params}`, { silent: true, signal })
    const groups: any[] = response?.data?.regions ?? []
    const toMap = (type: string) => {
        const map: Record<number, RegionVolume> = {}
        for (const row of groups.find((g) => g.groupType === type)?.data ?? []) {
            if (row.regionId == null) continue
            map[Number(row.regionId)] = { parcels: Number(row.parcelCount) || 0, revenue: Number(row.totalAmount) || 0 }
        }
        return map
    }
    return { sent: toMap("origin"), received: toMap("destination") }
}

/**
 * Parcels sent from / received at each booking office, counted by the backend
 * in one grouped query (GET /api/parcel/price-office, cached there for 10
 * minutes). Parcels without an office are not counted. No range = all time.
 */
export async function getOfficeVolumes(
    range?: { dateFrom: string; dateTo: string } | null,
    signal?: AbortSignal,
): Promise<{ sent: Record<number, RegionVolume>; received: Record<number, RegionVolume> }> {
    const dmy = (iso: string) => iso.split("-").reverse().join("-")
    const params = new URLSearchParams({ groupBy: "both" })
    if (range) {
        params.set("startDate", dmy(range.dateFrom))
        params.set("endDate", dmy(range.dateTo))
    }
    const response = await apiRequest(`/api/parcel/price-office?${params}`, { silent: true, signal })
    const groups: any[] = response?.data?.offices ?? []
    const toMap = (type: string) => {
        const map: Record<number, RegionVolume> = {}
        for (const row of groups.find((g) => g.groupType === type)?.data ?? []) {
            if (row.officeId == null) continue
            map[Number(row.officeId)] = { parcels: Number(row.parcelCount) || 0, revenue: Number(row.totalAmount) || 0 }
        }
        return map
    }
    return { sent: toMap("originOffice"), received: toMap("destinationOffice") }
}

/** Add up per-item volumes into their parent (office → district, region → country). */
export function rollUpVolumes(
    volumes: Record<number, RegionVolume> | undefined,
    parentOf: (childId: number) => number | null | undefined,
): Record<number, RegionVolume> {
    const out: Record<number, RegionVolume> = {}
    for (const [id, v] of Object.entries(volumes ?? {})) {
        const parent = parentOf(Number(id))
        if (parent == null) continue
        const entry = (out[parent] ??= { parcels: 0, revenue: 0 })
        entry.parcels += v.parcels
        entry.revenue += v.revenue
    }
    return out
}
