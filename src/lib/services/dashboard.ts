import {
    format,
    subDays,
    subMonths,
    subYears,
    eachWeekOfInterval,
    eachMonthOfInterval,
    eachQuarterOfInterval,
    eachYearOfInterval,
    addDays,
    parseISO,
    isValid,
} from "date-fns"
import type {
    DashboardResponse,
    TimeFrame,
    ChartData,
    RevenueChartData,
    BookingDistribution,
    ExportFormat,
    PaginationParams,
} from "@/types/dashboard"
import { apiRequest } from "@/lib/constants"
import { validateToken } from "@/lib/auth"

export interface Company {
    id: number
    name: string
}

export interface DashboardStats {
    period: {
        start_date: string
        end_date: string
    }
    metrics: {
        total_revenue: string
        total_bookings: number
        total_active_vehicles: number
        average_fare: string
        revenue_per_vehicle: string
        bookings_per_day: string
    }
}

export interface DashboardData {
    totalParcels: number
    totalAgents: number
    totalCompanies: number
    totalVehicles: number
    totalOffices: number
    deliveredParcels: number
    lostParcels: number
    complaints: number
}

// Cache for API responses
const API_CACHE = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

/**
 * Fetches recent parcels from the API
 */
export async function getRecentParcels(
    page = 1,
    limit = 10,
): Promise<{
    success: boolean
    data: any[]
    total?: number
    error?: string
}> {
    try {
        const cacheKey = `recent_parcels_${page}_${limit}`
        const cachedData = API_CACHE.get(cacheKey)
        const now = Date.now()

        if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
            console.log("Using cached recent parcels data")
            return cachedData.data
        }

        let result
        try {
            // Try the recent-transactions endpoint first
            result = await apiRequest(`/api/parcel/recent-transactions?page=${page}&limit=${limit}`, { silent: true })
        } catch (error) {
            // Fallback to regular parcels endpoint
            console.warn("Recent transactions endpoint failed, falling back to regular endpoint")
            result = await apiRequest(`/api/parcel?page=${page}&limit=${limit}&sort=createdAt&order=desc`, { silent: true })
        }

        let parcels: any[] = []
        let total = 0

        if (Array.isArray(result)) {
            parcels = result
            total = result.length
        } else if (result && typeof result === "object") {
            if ("data" in result) {
                parcels = Array.isArray(result.data) ? result.data : []
                total = result.total || parcels.length
            }
        }

        const response = {
            success: true,
            data: parcels,
            total,
        }

        API_CACHE.set(cacheKey, { data: response, timestamp: now })
        return response
    } catch (error) {
        console.error("Error fetching recent parcels:", error)
        return {
            success: false,
            data: [],
            error: error instanceof Error ? error.message : "Unknown error",
        }
    }
}

/**
 * Fetches all dashboard data needed for the admin dashboard
 */
export async function getDashboardData(): Promise<DashboardData> {
    try {
        const cacheKey = "dashboard_data"
        const cachedData = API_CACHE.get(cacheKey)
        const now = Date.now()

        if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
            console.log("Using cached dashboard data")
            return cachedData.data
        }

        console.log("Fetching fresh dashboard data...")

        let totalParcels = 0
        let deliveredParcels = 0
        let lostParcels = 0
        let totalAgents = 0
        let totalCompanies = 0
        let totalVehicles = 0
        let totalOffices = 0
        let complaints = 0

        // Fetch parcels data
        console.log("Fetching parcels data...")
        try {
            let parcelsResult = await apiRequest("/api/parcel?limit=1000", { silent: true })

            let allParcels: any[] = []

            if (Array.isArray(parcelsResult)) {
                allParcels = parcelsResult
                console.log(`Found ${allParcels.length} parcels in array format`)
            } else if (parcelsResult && typeof parcelsResult === "object") {
                if (Array.isArray(parcelsResult.data)) {
                    allParcels = parcelsResult.data
                    console.log(`Found ${allParcels.length} parcels in data.data format`)
                } else if (parcelsResult.total) {
                    totalParcels = parcelsResult.total
                    console.log(`Using total from API: ${totalParcels} parcels`)
                }
            }

            if (allParcels.length > 0) {
                totalParcels = allParcels.length
                deliveredParcels = allParcels.filter((parcel: any) => parcel.status === "DELIVERED").length

                lostParcels = allParcels.filter((parcel: any) => {
                    if (parcel.status === "DISPATCHED" || parcel.status === "OFFLOADED") {
                        if (!parcel.updatedAt) return false
                        try {
                            const updatedAt = parseISO(parcel.updatedAt)
                            const fiveDaysAgo = subDays(new Date(), 5)
                            return updatedAt < fiveDaysAgo
                        } catch (e) {
                            console.error("Error parsing date:", e)
                            return false
                        }
                    }
                    return false
                }).length

                console.log(`Calculated: ${totalParcels} total, ${deliveredParcels} delivered, ${lostParcels} lost`)
            }
        } catch (error) {
            console.warn("Failed to fetch parcels data:", error)
        }

        // Fetch agents data
        console.log("Fetching agents data...")
        try {
            const agentsResult = await apiRequest("/api/auth/users?roles=AGENT&limit=1000", { silent: true })
            if (Array.isArray(agentsResult)) {
                totalAgents = agentsResult.length
            } else if (agentsResult && typeof agentsResult === "object") {
                if (Array.isArray(agentsResult.data)) {
                    totalAgents = agentsResult.data.length
                } else if (agentsResult.total) {
                    totalAgents = agentsResult.total
                }
            }
            console.log(`Found ${totalAgents} agents`)
        } catch (error) {
            console.warn("Failed to fetch agents data:", error)
        }

        // Fetch companies data
        console.log("Fetching companies data...")
        try {
            const companiesResult = await apiRequest("/api/companies?limit=1000", { silent: true })
            if (Array.isArray(companiesResult)) {
                totalCompanies = companiesResult.length
            } else if (companiesResult && typeof companiesResult === "object") {
                if (Array.isArray(companiesResult.data)) {
                    totalCompanies = companiesResult.data.length
                } else if (companiesResult.total) {
                    totalCompanies = companiesResult.total
                }
            }
            console.log(`Found ${totalCompanies} companies`)
        } catch (error) {
            console.warn("Failed to fetch companies data:", error)
        }

        // Fetch vehicles data
        console.log("Fetching vehicles data...")
        try {
            const vehiclesResult = await apiRequest("/api/vehicle/vehicles?limit=1000", { silent: true })
            if (Array.isArray(vehiclesResult)) {
                totalVehicles = vehiclesResult.length
            } else if (vehiclesResult && typeof vehiclesResult === "object") {
                if (Array.isArray(vehiclesResult.data)) {
                    totalVehicles = vehiclesResult.data.length
                } else if (vehiclesResult.total) {
                    totalVehicles = vehiclesResult.total
                }
            }
            console.log(`Found ${totalVehicles} vehicles`)
        } catch (error) {
            console.warn("Failed to fetch vehicles data:", error)
        }

        // Fetch offices data
        console.log("Fetching offices data...")
        try {
            const officesResult = await apiRequest("/api/location/booking-offices?limit=1000", { silent: true })
            if (Array.isArray(officesResult)) {
                totalOffices = officesResult.length
            } else if (officesResult && typeof officesResult === "object") {
                if (Array.isArray(officesResult.data)) {
                    totalOffices = officesResult.data.length
                } else if (officesResult.total) {
                    totalOffices = officesResult.total
                }
            }
            console.log(`Found ${totalOffices} offices`)
        } catch (error) {
            console.warn("Failed to fetch offices data:", error)
        }

        // Fetch complaints data
        console.log("Fetching complaints data...")
        try {
            const complaintsResult = await apiRequest("/api/complaints?limit=1000", { silent: true })
            if (Array.isArray(complaintsResult)) {
                complaints = complaintsResult.length
            } else if (complaintsResult && typeof complaintsResult === "object") {
                if (Array.isArray(complaintsResult.data)) {
                    complaints = complaintsResult.data.length
                } else if (complaintsResult.total) {
                    complaints = complaintsResult.total
                }
            }
            console.log(`Found ${complaints} complaints`)
        } catch (error) {
            console.warn("Failed to fetch complaints data:", error)
        }

        const dashboardData: DashboardData = {
            totalParcels,
            totalAgents,
            totalCompanies,
            totalVehicles,
            totalOffices,
            deliveredParcels,
            lostParcels,
            complaints,
        }

        console.log("Final dashboard data:", dashboardData)

        API_CACHE.set(cacheKey, { data: dashboardData, timestamp: now })
        return dashboardData
    } catch (error) {
        console.error("Error fetching dashboard data:", error)
        return {
            totalParcels: 0,
            totalAgents: 0,
            totalCompanies: 0,
            totalVehicles: 0,
            totalOffices: 0,
            deliveredParcels: 0,
            lostParcels: 0,
            complaints: 0,
        }
    }
}

/**
 * Handles parcel cancellation or reversal
 */
export async function handleParcelCancellation(
    parcelId: string,
    cancel: boolean,
): Promise<{
    success: boolean
    message?: string
    error?: string
}> {
    try {
        const action = cancel ? "cancel" : "reverse-cancellation"
        const result = await apiRequest(`/api/parcel/${parcelId}/${action}`, {
            method: "POST",
        })

        return {
            success: true,
            message: `Parcel ${cancel ? "cancelled" : "cancellation reversed"} successfully`,
        }
    } catch (error) {
        console.error(`Error ${cancel ? "cancelling" : "reversing cancellation of"} parcel:`, error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        }
    }
}

/**
 * Fetches dashboard statistics with caching
 */
export async function getDashboardStats(
    companyId?: string,
    startDate?: string,
    endDate?: string,
): Promise<DashboardResponse> {
    try {
        const queryParams = new URLSearchParams()

        if (companyId && companyId !== "all") {
            queryParams.append("company_id", companyId)
        }

        if (startDate) {
            queryParams.append("start_date", startDate)
        }

        if (endDate) {
            queryParams.append("end_date", endDate)
        }

        const endpoint = `/api/reports${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

        const cacheKey = endpoint
        const cachedData = API_CACHE.get(cacheKey)
        const now = Date.now()

        if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
            console.log("Using cached dashboard stats")
            return cachedData.data
        }

        const data = await apiRequest(endpoint)

        API_CACHE.set(cacheKey, { data, timestamp: now })
        return data
    } catch (error) {
        console.error("Error fetching dashboard stats:", error)
        throw error
    }
}

/**
 * Fetches companies data with caching
 */
export async function getCompanies() {
    try {
        const endpoint = "/api/companies"

        const cacheKey = endpoint
        const cachedData = API_CACHE.get(cacheKey)
        const now = Date.now()

        if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
            console.log("Using cached companies data")
            return cachedData.data
        }

        const data = await apiRequest(endpoint)

        API_CACHE.set(cacheKey, { data, timestamp: now })
        return data
    } catch (error) {
        console.error("Error fetching companies:", error)
        throw error
    }
}

/**
 * Fetches revenue data for charts
 */
export async function getRevenueData(
    startDate: string,
    endDate: string,
    companyId?: string,
    timeFrame: TimeFrame = "daily",
): Promise<{ success: boolean; data: RevenueChartData[]; message?: string }> {
    try {
        const queryParams = new URLSearchParams()

        queryParams.append("start_date", startDate)
        queryParams.append("end_date", endDate)
        queryParams.append("time_frame", timeFrame)

        if (companyId && companyId !== "all") {
            queryParams.append("company_id", companyId)
        }

        const endpoint = `/api/reports/revenue?${queryParams.toString()}`

        const cacheKey = endpoint
        const cachedData = API_CACHE.get(cacheKey)
        const now = Date.now()

        if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
            console.log("Using cached revenue data")
            return cachedData.data
        }

        const data = await apiRequest(endpoint)

        API_CACHE.set(cacheKey, { data, timestamp: now })
        return data
    } catch (error) {
        console.error("Error fetching revenue data:", error)
        return {
            success: false,
            data: [],
            message: error instanceof Error ? error.message : "An unknown error occurred",
        }
    }
}

/**
 * Fetches bookings distribution data
 */
export async function getBookingsDistribution(): Promise<{
    success: boolean
    data: {
        status: BookingDistribution[]
        routes: BookingDistribution[]
    } | null
    message?: string
}> {
    try {
        const cacheKey = "/api/reports/bookings-distribution"
        const cachedData = API_CACHE.get(cacheKey)
        const now = Date.now()

        if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
            console.log("Using cached bookings distribution data")
            return cachedData.data
        }

        try {
            // Fetch bookings by status
            const statusData = await apiRequest("/api/reports/bookings-by-status")

            // Fetch routes
            const routesData = await apiRequest("/api/routes")

            // Fetch bookings by route
            const routeBookingsData = await apiRequest("/api/reports/bookings-by-route")

            // Process the data
            const statusDistribution = statusData.data.map((item: any) => ({
                label: item.status,
                count: item.count,
            }))

            // Create a map of route IDs to route names
            const routeMap = new Map()
            if (routesData.success && Array.isArray(routesData.data)) {
                routesData.data.forEach((route: any) => {
                    routeMap.set(route.id, route.name)
                })
            }

            // Map route bookings data to distribution format
            const routeDistribution = routeBookingsData.data.map((item: any) => ({
                label: routeMap.get(item.route_id) || `Route ${item.route_id}`,
                count: item.count,
            }))

            // Sort by count in descending order and limit to top 5 routes
            const topRoutes = [...routeDistribution].sort((a, b) => b.count - a.count).slice(0, 5)

            // Calculate total for "Other" category
            const topRouteIds = new Set(topRoutes.map((r) => r.label))
            const otherRoutesCount = routeDistribution
                .filter((r) => !topRouteIds.has(r.label))
                .reduce((sum, route) => sum + route.count, 0)

            // Add "Other" category if there are more than 5 routes
            if (routeDistribution.length > 5 && otherRoutesCount > 0) {
                topRoutes.push({
                    label: "Other Routes",
                    count: otherRoutesCount,
                })
            }

            const result = {
                success: true,
                data: {
                    status: statusDistribution,
                    routes: topRoutes,
                },
            }

            API_CACHE.set(cacheKey, { data: result, timestamp: now })
            return result
        } catch (error) {
            console.error("Error fetching distribution data:", error)
            return {
                success: false,
                data: null,
                message: "The booking distribution data could not be loaded. Please try again later.",
            }
        }
    } catch (error) {
        console.error("Error in getBookingsDistribution:", error)
        return {
            success: false,
            data: null,
            message: "An unexpected error occurred while loading distribution data.",
        }
    }
}

/**
 * Fetches revenue distribution data
 */
export async function getRevenueDistribution(
    startDate?: string,
    endDate?: string,
    companyId?: string,
): Promise<{
    success: boolean
    data: {
        revenue: BookingDistribution[]
        vehicles: BookingDistribution[]
    } | null
    message?: string
}> {
    try {
        const queryParams = new URLSearchParams()

        if (companyId && companyId !== "all") {
            queryParams.append("company_id", companyId)
        }

        if (startDate) {
            queryParams.append("start_date", startDate)
        }

        if (endDate) {
            queryParams.append("end_date", endDate)
        }

        const endpoint = `/api/reports${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

        const cacheKey = endpoint + "_distribution"
        const cachedData = API_CACHE.get(cacheKey)
        const now = Date.now()

        if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
            console.log("Using cached revenue distribution data")
            return cachedData.data
        }

        const statsData = await apiRequest(endpoint)

        if (!statsData.success || !statsData.data) {
            return {
                success: false,
                data: null,
                message: statsData.message || "No revenue data available",
            }
        }

        // Get company-specific data if available
        let companiesData: any[] = []

        if (!companyId || companyId === "all") {
            try {
                const companiesResult = await apiRequest("/api/reports/revenue-by-company")
                if (companiesResult.success && Array.isArray(companiesResult.data)) {
                    companiesData = companiesResult.data
                }
            } catch (error) {
                console.warn("Could not fetch company revenue breakdown:", error)
            }
        }

        // Create revenue distribution data
        let revenueDistribution: BookingDistribution[] = []

        if (companiesData.length > 0) {
            revenueDistribution = companiesData
                .map((company) => ({
                    label: company.name || `Company ${company.id}`,
                    count: Number.parseFloat(company.revenue || "0"),
                }))
                .sort((a, b) => b.count - a.count)

            if (revenueDistribution.length > 5) {
                const topCompanies = revenueDistribution.slice(0, 5)
                const otherRevenue = revenueDistribution.slice(5).reduce((sum, company) => sum + company.count, 0)

                revenueDistribution = [...topCompanies, { label: "Other Companies", count: otherRevenue }]
            }
        } else {
            const actualRevenue = Number.parseFloat(statsData.data.metrics.total_revenue || "0")
            const targetRevenue = actualRevenue * 1.2

            revenueDistribution = [
                { label: "Actual Revenue", count: actualRevenue },
                { label: "Target Revenue", count: targetRevenue },
            ]
        }

        // Create vehicle distribution data
        const vehicleDistribution: BookingDistribution[] = [
            {
                label: "Active Vehicles",
                count: statsData.data.metrics.total_active_vehicles || 0,
            },
        ]

        // Try to get inactive vehicles count if available
        try {
            const vehiclesData = await apiRequest("/api/vehicle/vehicles")
            if (vehiclesData.success && vehiclesData.data) {
                if (vehiclesData.data.total_inactive_vehicles) {
                    vehicleDistribution.push({
                        label: "Inactive Vehicles",
                        count: vehiclesData.data.total_inactive_vehicles,
                    })
                }

                if (vehiclesData.data.vehicles_by_type && Array.isArray(vehiclesData.data.vehicles_by_type)) {
                    vehiclesData.data.vehicles_by_type.forEach((item: any) => {
                        vehicleDistribution.push({
                            label: item.type || "Unknown Type",
                            count: item.count || 0,
                        })
                    })
                }
            }
        } catch (error) {
            console.warn("Could not fetch vehicle statistics:", error)
        }

        const result = {
            success: true,
            data: {
                revenue: revenueDistribution,
                vehicles: vehicleDistribution,
            },
        }

        API_CACHE.set(cacheKey, { data: result, timestamp: now })
        return result
    } catch (error) {
        console.error("Error fetching revenue distribution:", error)
        return {
            success: false,
            data: null,
            message: "Failed to load revenue distribution data.",
        }
    }
}

/**
 * Exports dashboard data to the specified format
 */
export async function exportDashboardData(
    format: ExportFormat,
    startDate: string,
    endDate: string,
    companyId?: string,
): Promise<Blob | null> {
    try {
        const queryParams = new URLSearchParams()

        queryParams.append("start_date", startDate)
        queryParams.append("end_date", endDate)
        queryParams.append("format", format)

        if (companyId && companyId !== "all") {
            queryParams.append("company_id", companyId)
        }

        const endpoint = `/api/reports/export?${queryParams.toString()}`

        // Note: For blob responses, we need to use fetch directly
        const response = await fetch(endpoint, {
            headers: {
                "Content-Type": "application/json",
            },
        })

        if (!response.ok) {
            throw new Error(`Failed to export dashboard data: ${response.status}`)
        }

        return await response.blob()
    } catch (error) {
        console.error("Error exporting dashboard data:", error)
        return null
    }
}

/**
 * Generates time frame data for charts
 */
export function generateTimeFrameData(
    timeFrame: TimeFrame,
    startDate: Date,
    endDate: Date,
): { labels: string[]; intervals: Date[] } {
    let intervals: Date[] = []

    switch (timeFrame) {
        case "daily":
            intervals = Array.from(
                { length: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 },
                (_, i) => addDays(startDate, i),
            )
            return {
                labels: intervals.map((date) => format(date, "MMM dd")),
                intervals,
            }
        case "weekly":
            intervals = eachWeekOfInterval({ start: startDate, end: endDate })
            return {
                labels: intervals.map((date) => `Week ${format(date, "w")}`),
                intervals,
            }
        case "monthly":
            intervals = eachMonthOfInterval({ start: startDate, end: endDate })
            return {
                labels: intervals.map((date) => format(date, "MMM yyyy")),
                intervals,
            }
        case "quarterly":
            intervals = eachQuarterOfInterval({ start: startDate, end: endDate })
            return {
                labels: intervals.map((date) => `Q${Math.ceil((date.getMonth() + 1) / 3)} ${format(date, "yyyy")}`),
                intervals,
            }
        case "yearly":
            intervals = eachYearOfInterval({ start: startDate, end: endDate })
            return {
                labels: intervals.map((date) => format(date, "yyyy")),
                intervals,
            }
        default:
            return { labels: [], intervals: [] }
    }
}

/**
 * Formats data for pie charts
 */
export function generatePieChartData(data: Record<string, number>): ChartData[] {
    return Object.entries(data).map(([name, value]) => ({
        name,
        value,
    }))
}

/**
 * Gets the default date range
 */
export function getDefaultDateRange() {
    return {
        from: subMonths(new Date(), 1),
        to: new Date(),
    }
}

/**
 * Returns a list of preset date ranges
 */
export function getPresetDateRanges() {
    const today = new Date()

    return [
        {
            name: "Today",
            from: today,
            to: today,
        },
        {
            name: "Yesterday",
            from: subDays(today, 1),
            to: subDays(today, 1),
        },
        {
            name: "Last 7 days",
            from: subDays(today, 6),
            to: today,
        },
        {
            name: "Last 30 days",
            from: subDays(today, 29),
            to: today,
        },
        {
            name: "Last 90 days",
            from: subDays(today, 89),
            to: today,
        },
        {
            name: "Last 12 months",
            from: subYears(today, 1),
            to: today,
        },
    ]
}

/**
 * Validates a date string
 */
export function isValidDateString(dateString: string): boolean {
    if (!dateString) return false
    const parsedDate = parseISO(dateString)
    return isValid(parsedDate)
}

/**
 * Validates a date range
 */
export function validateDateRange(startDate?: string, endDate?: string): boolean {
    if (!startDate || !endDate) return false

    const start = parseISO(startDate)
    const end = parseISO(endDate)

    if (!isValid(start) || !isValid(end)) return false

    return start <= end
}

/**
 * Helper function to create pagination parameters
 */
export function createPaginationParams(page = 1, limit = 10): PaginationParams {
    return {
        page: Math.max(1, page),
        limit: Math.min(Math.max(1, limit), 100),
    }
}

/**
 * Set up token validation
 */
export const setupTokenValidation = () => {
    validateToken()

    const intervalId = setInterval(
        () => {
            validateToken()
        },
        5 * 60 * 1000,
    )

    return () => {
        clearInterval(intervalId)
    }
}

/**
 * Clears the API cache
 */
export function clearApiCache(): void {
    API_CACHE.clear()
    console.log("API cache cleared")
}