import { apiRequest } from "@/lib/constants"
import type { Company, CompanyStats } from "@/types/company"

export interface GetCompaniesParams {
    page?: number
    limit?: number
    search?: string
    status?: string
    paginate?: boolean
    all?: boolean
    include_relations?: boolean
}

const EMPTY_PAGINATED_RESPONSE = {
    data: [] as Company[],
    pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        perPage: 10,
    },
    success: false,
}

/**
 * Fetch all companies with full support for filtering and pagination.
 * Always returns { data, pagination, success } — never a bare array.
 */
/**
 * Every company. The list endpoint honours `limit`, so one request at 100
 * per page covers the network today; any further pages load in parallel.
 * (Walking the default 10-per-page list sequentially took ~30s.)
 */
export async function getAllCompanies(): Promise<Company[]> {
    const PAGE_SIZE = 100
    const first: any = await getCompanies({ page: 1, limit: PAGE_SIZE })
    const companies: Company[] = Array.isArray(first?.data) ? first.data : []
    const totalPages = Number(first?.pagination?.totalPages ?? 1) || 1
    if (totalPages > 1) {
        const rest = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, i) => getCompanies({ page: i + 2, limit: PAGE_SIZE })),
        )
        for (const r of rest as any[]) if (Array.isArray(r?.data)) companies.push(...r.data)
    }
    return companies
}

export async function getCompanies(params: GetCompaniesParams = {}) {
    try {
        const queryParams = new URLSearchParams()
        if (params.page) queryParams.append("page", params.page.toString())
        if (params.limit || params.per_page) {
            const limitVal = (params.limit || params.per_page || 10).toString()
            queryParams.append("limit", limitVal)
            queryParams.append("per_page", limitVal)
        }
        const searchTerm = params.search?.trim()
        if (searchTerm) queryParams.append("search", searchTerm)
        if (params.status && params.status !== "all") queryParams.append("status", params.status)
        if (params.paginate !== undefined) queryParams.append("paginate", params.paginate ? "1" : "0")
        if (params.all) queryParams.append("all", "1")
        if (params.include_relations !== false) queryParams.append("include_relations", "true")

        const queryString = queryParams.toString()
        const endpoint = `/api/companies${queryString ? `?${queryString}` : ""}`

        console.log("[Company] Fetching companies via:", endpoint)
        const response = await apiRequest(endpoint)

        // Robust response extraction:
        // Handles { data: [...] }, { companies: [...] }, { data: { companies: [...] } }
        let companies: Company[] = []
        if (Array.isArray(response.data)) {
            companies = response.data
        } else if (response.data && Array.isArray(response.data.companies)) {
            companies = response.data.companies
        } else if (Array.isArray(response.companies)) {
            companies = response.companies
        } else if (Array.isArray(response)) {
            companies = response
        }

        // Resilient mapping of vehicle, agent, parcel and revenue counts
        companies = companies.map((c: any) => ({
            ...c,
            totalVehicles: c.totalVehicles ?? c._count?.vehicles ?? c.vehicles?.length ?? c.vehiclesCount ?? 0,
            totalAgents:
                c.totalAgents ??
                c._count?.agents ??
                c.agents?.length ??
                c.agentsCount ??
                c._count?.companyAgents ??
                0,
            totalParcels:
                c.totalParcels ??
                c._count?.parcels ??
                c.parcels?.length ??
                c.parcelsCount ??
                c._count?.shipments ??
                c.shipmentsCount ??
                0,
            totalRevenue:
                c.totalRevenue ??
                c.revenue ??
                c.total_revenue ??
                0,
        }))

        // Normalise pagination — support both camelCase and snake_case from backend
        const rawPagination =
            response.pagination ||
            response.data?.pagination ||
            response.meta?.pagination ||
            {}

        const totalItems =
            rawPagination.total ??
            rawPagination.totalItems ??
            rawPagination.total_items ??
            response.totalItems ??
            response.total ??
            companies.length

        const perPage = rawPagination.per_page ?? rawPagination.perPage ?? params.limit ?? companies.length

        // Backend pagination shapes vary by endpoint in this API (seen so far:
        // total_pages, totalPages, last_page, lastPage, pages) — check every
        // known name, and if none are present, derive the page count from
        // totalItems/perPage rather than silently defaulting to 1 (which hid
        // pagination controls entirely whenever more than one page existed).
        const totalPages =
            rawPagination.total_pages ??
            rawPagination.totalPages ??
            rawPagination.last_page ??
            rawPagination.lastPage ??
            rawPagination.pages ??
            (perPage > 0 ? Math.max(1, Math.ceil(totalItems / perPage)) : 1)

        const pagination = {
            currentPage:
                rawPagination.current_page ??
                rawPagination.currentPage ??
                params.page ??
                1,
            totalPages,
            totalItems,
            perPage,
        }

        return { data: companies, pagination, success: true }
    } catch (error) {
        console.error("Error fetching companies:", error)
        // Always return a consistent shape so callers can safely access .data
        return { ...EMPTY_PAGINATED_RESPONSE }
    }
}

export async function getCompany(id: number): Promise<Company | null> {
    try {
        const response = await apiRequest(`/api/companies/${id}`)
        return response.data || response.company || response || null
    } catch (error) {
        console.error("Error fetching company details:", error)
        return null
    }
}

// JSON normally; multipart when a new logo file is attached (the API takes it as "logo")
function companyBody(payload: Record<string, any>, logoFile?: File | null): BodyInit {
    if (!logoFile) return JSON.stringify(payload)
    const form = new FormData()
    for (const [key, value] of Object.entries(payload)) {
        if (value === undefined || value === null) continue
        form.append(key, typeof value === "boolean" ? String(value) : value)
    }
    form.append("logo", logoFile)
    return form
}

export async function createCompany(data: any) {
    try {
        // The real endpoint is /companies/register, not the bare /companies
        // path — that one only exists for listing (GET).
        const { logoFile, ...fields } = data ?? {}
        // A picked file travels as the upload, not as an inline data: URL
        if (typeof fields.logoUrl === "string" && fields.logoUrl.startsWith("data:")) delete fields.logoUrl
        const response = await apiRequest("/api/companies/register", {
            method: "POST",
            body: companyBody(fields, logoFile),
        })
        return response
    } catch (error) {
        console.error("Error creating company:", error)
        throw error
    }
}

export async function updateCompany(id: number, data: any) {
    console.log(`[Company] Initiating resilient update for company ${id}:`, data)

    // The API reads these camelCase names (snake_case ones were silently ignored)
    const payload: Record<string, any> = {}
    if (data.name !== undefined) payload.name = data.name
    if (data.tin !== undefined) payload.tin = data.tin
    if (data.address !== undefined) payload.address = data.address
    if (data.phoneNumber !== undefined) payload.phoneNumber = data.phoneNumber
    if (data.email !== undefined) payload.email = data.email || null
    if (data.website !== undefined) payload.website = data.website || null
    // An empty sender ID falls back to the platform default
    if (data.smsSender !== undefined) payload.smsSender = String(data.smsSender).trim() || "MySAFARI"
    if (data.helpDeskPhoneNumber !== undefined) payload.helpDeskPhoneNumber = data.helpDeskPhoneNumber
    // A picked file is a data: URL; the API takes uploads as multipart "logo", not inline
    if (data.logoUrl !== undefined && !String(data.logoUrl).startsWith("data:")) payload.logoUrl = data.logoUrl
    if (data.isActive !== undefined) {
        payload.is_active = data.isActive
        payload.isActive = data.isActive
    }

    const strategies = [
        { endpoint: `/api/companies/${id}`, method: "PUT" as const },
        { endpoint: `/api/auth/companies/${id}`, method: "PUT" as const },
        { endpoint: `/api/admin/companies/${id}`, method: "PUT" as const },
        { endpoint: `/api/companies/${id}`, method: "PATCH" as const },
        { endpoint: `/api/auth/companies/${id}`, method: "PATCH" as const },
        { endpoint: `/api/admin/companies/${id}`, method: "PATCH" as const },
        { endpoint: `/api/company/${id}`, method: "PATCH" as const },
        { endpoint: `/api/auth/company/${id}`, method: "PATCH" as const },
    ]

    let lastError: Error | null = null

    for (const { endpoint, method } of strategies) {
        try {
            console.log(`[Company] Attempting update via ${method} ${endpoint}`)
            const response = await apiRequest(endpoint, {
                method,
                body: companyBody(payload, data.logoFile),
            })
            console.log(`✅ [Company] Successfully updated via ${method} ${endpoint}`)
            return response
        } catch (error: any) {
            console.warn(`[Company] Strategy failed for ${method} ${endpoint}:`, error.message)
            lastError = error
            if (error.message?.includes("422") || error.message?.includes("400")) {
                throw error
            }
        }
    }

    throw lastError || new Error(`Failed to update company ${id} after trying all strategies`)
}

export async function deleteCompany(id: number) {
    // Only DELETE /api/companies/:id exists. The backend refuses (400) while the
    // company still has agents or vehicles; let that message reach the user
    // instead of masking it with fallbacks to endpoints that don't exist.
    return apiRequest(`/api/companies/${id}`, { method: "DELETE" })
}

export async function getCompanyStats(): Promise<CompanyStats> {
    try {
        const response = await apiRequest("/api/companies/stats", { silent: true })
        const stats = response.data || response.stats || response || {}

        return {
            // Counts — map every plausible backend key
            totalCompanies: stats.totalCompanies ?? stats.total_companies ?? stats.total ?? 0,
            activeCompanies: stats.activeCompanies ?? stats.active_companies ?? stats.active ?? 0,
            inactiveCompanies: stats.inactiveCompanies ?? stats.inactive_companies ?? stats.inactive ?? 0,

            // Parcels / revenue
            totalParcels: stats.totalParcels ?? stats.total_parcels ?? 0,
            totalRevenue: stats.totalRevenue ?? stats.total_revenue ?? stats.totalParcelPrice ?? 0,
            totalParcelPrice: stats.totalParcelPrice ?? stats.total_parcel_price ?? stats.totalRevenue ?? 0,

            // Fleet / agents
            totalVehicles: stats.totalVehicles ?? stats.total_vehicles ?? stats.activeFleet ?? 0,
            totalAgents: stats.totalAgents ?? stats.total_agents ?? stats.activeAgents ?? 0,
            activeVehicles: stats.activeVehicles ?? stats.active_vehicles ?? stats.activeFleet ?? stats.totalVehicles ?? 0,
            activeAgents: stats.activeAgents ?? stats.active_agents ?? stats.totalAgents ?? 0,
        }
    } catch (error) {
        // Silently fail — admins may not have a directly associated company node
        console.warn("[Company] getCompanyStats failed silently:", error)
        return {
            totalCompanies: 0,
            activeCompanies: 0,
            inactiveCompanies: 0,
            totalParcels: 0,
            totalRevenue: 0,
            totalParcelPrice: 0,
            totalVehicles: 0,
            totalAgents: 0,
            activeVehicles: 0,
            activeAgents: 0,
        }
    }
}

/**
 * Fetch strictly scoped vehicles for a company.
 */
export async function getCompanyVehicles(id: number) {
    try {
        console.log("Fetching company vehicles via dedicated endpoint:", id)
        const initialResponse = await apiRequest(`/api/companies/${id}/vehicles?page=1&limit=250`)
        let allVehicles = initialResponse.vehicles || initialResponse.data || []

        const pagination =
            initialResponse.pagination ||
            initialResponse.data?.pagination ||
            initialResponse.meta?.pagination

        if (pagination && pagination.totalPages > 1) {
            const pagePromises = []
            for (let page = 2; page <= pagination.totalPages; page++) {
                pagePromises.push(apiRequest(`/api/companies/${id}/vehicles?page=${page}&limit=250`))
            }
            const responses = await Promise.all(pagePromises)
            responses.forEach((response) => {
                allVehicles = [...allVehicles, ...(response.vehicles || response.data || [])]
            })
        }

        return allVehicles
    } catch (error) {
        console.error("Error fetching company vehicles:", error)
        return []
    }
}

/**
 * Fetch strictly scoped agents for a company.
 */
export async function getCompanyAllAgents(id: number) {
    try {
        console.log("Fetching company agents via dedicated endpoint:", id)
        const initialResponse = await apiRequest(`/api/companies/${id}/all-agents?page=1&limit=250`)
        let allAgents = initialResponse.agents || initialResponse.data || []

        const pagination =
            initialResponse.pagination ||
            initialResponse.data?.pagination ||
            initialResponse.meta?.pagination

        if (pagination && pagination.totalPages > 1) {
            const pagePromises = []
            for (let page = 2; page <= pagination.totalPages; page++) {
                pagePromises.push(apiRequest(`/api/companies/${id}/all-agents?page=${page}&limit=250`))
            }
            const responses = await Promise.all(pagePromises)
            responses.forEach((response) => {
                allAgents = [...allAgents, ...(response.agents || response.data || [])]
            })
        }

        return allAgents
    } catch (error) {
        console.error("Error fetching company agents:", error)
        return []
    }
}

/**
 * Lightweight helper to get total agent count via company service
 */
export async function getCompanyAgentCount(id: number): Promise<number> {
    try {
        const response = await apiRequest(`/api/companies/${id}/all-agents?page=1&limit=1`)
        return (
            response.pagination?.totalItems ??
            response.data?.pagination?.total ??
            response.total ??
            (Array.isArray(response.agents) ? response.agents.length : (Array.isArray(response.data) ? response.data.length : 0))
        )
    } catch {
        return 0
    }
}

/**
 * Fetch strictly scoped parcels for a company.
 */
export async function getCompanyParcels(
    id: number,
    search?: string,
    page: number = 1,
    limit: number = 20,
) {
    try {
        console.log(`Fetching company reports via dedicated endpoint (page: ${page}):`, id)

        let url = `/api/parcel?companyId=${id}&page=${page}&limit=${limit}&sort=createdAt&order=desc`
        if (search) url += `&searchTerm=${encodeURIComponent(search)}`

        const response = await apiRequest(url)
        const reports = response.data?.parcels || response.parcels || response.data || []
        const pagination =
            response.data?.pagination ||
            response.pagination ||
            response.meta?.pagination ||
            { totalPages: 1 }

        const mappedReports = reports.map((report: any) => ({
            ...report,
            trackingNumber: report.trackingNumber || `REP-${report.id}`,
            senderName: report.sender?.username || report.sender?.fullName || "---",
            receiverName: report.receiver?.username || report.receiver?.fullName || "---",
        }))

        return { parcels: mappedReports, pagination }
    } catch (error) {
        console.error("Error fetching company parcels:", error)
        return { parcels: [], pagination: { totalPages: 1 } }
    }
}

export const getCompanyWithStats = async (id: number) => getCompany(id)