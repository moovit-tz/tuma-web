import { validateToken, getCurrentUser } from "@/lib/auth"
import { apiRequest } from "@/lib/constants"

// Cache for API responses
const API_CACHE = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

// Interface for unified dashboard data
export interface UnifiedDashboardData {
    // Common fields that might exist in both OPS and BIZ responses
    totalParcels?: number
    totalAgents?: number
    totalCompanies?: number
    totalVehicles?: number
    totalOffices?: number
    deliveredParcels?: number
    receivedParcels?: number
    lostParcels?: number
    complaints?: number

    // BIZ-specific fields
    totalParcelsPrice?: number

    // Additional metadata
    role?: string
    companyName?: string
    userType?: string
}

// Interface for API response structure
interface DashboardApiResponse {
    success?: boolean
    data?: UnifiedDashboardData
    message?: string
    [key: string]: any // Allow additional fields
}

/**
 * Clear the API cache. Pass a key to invalidate a single cached entry
 * (e.g. after a mutation); call with no arguments only for an explicit,
 * user-initiated "refresh everything" action — it clears entries other
 * components may be relying on too, so it should never run on a timer.
 */
export function clearApiCache(key?: string): void {
    if (key) {
        API_CACHE.delete(key)
    } else {
        API_CACHE.clear()
    }
}

/**
 * Determines the appropriate dashboard endpoint based on user role
 */
function getDashboardEndpoint(): string {
    const user = getCurrentUser()
    const userRole = user?.role?.toUpperCase()


    // Route based on role
    switch (userRole) {
        case "ADMIN":
        case "OPS":
        case "OPERATIONS":
            return "/api/dashboard/ops"
        case "OWNER":
        case "BUSINESS":
        case "BIZ":
        case "COMPANY_OWNER":
            return "/api/dashboard/biz"
        default:
            // Fallback to the unified endpoint
            return "/api/dashboard"
    }
}

/**
 * Fetches dashboard data from the unified endpoint based on user role
 */
export async function getUnifiedDashboardData(): Promise<UnifiedDashboardData> {
    try {
        // Check if we have cached data
        const cacheKey = "unified_dashboard_data"
        const cachedData = API_CACHE.get(cacheKey)
        const now = Date.now()

        if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
            return cachedData.data
        }

        const dashboardData = await fetchUnifiedDashboardData()

        // Cache the response
        API_CACHE.set(cacheKey, { data: dashboardData, timestamp: now })

        return dashboardData
    } catch (error) {
        console.error("❌ Error fetching unified dashboard data:", error)

        // Return default values to prevent UI crashes
        return {
            totalParcels: 0,
            totalAgents: 0,
            totalCompanies: 0,
            totalVehicles: 0,
            totalOffices: 0,
            deliveredParcels: 0,
            lostParcels: 0,
            complaints: 0,
            totalParcelsPrice: 0,
            receivedParcels: 0,
        }
    }
}

/**
 * Uncached dashboard fetch that rethrows failures. For callers that manage
 * their own caching and error UI (React Query) — getUnifiedDashboardData's
 * zero fallback would otherwise render as real numbers.
 */
export async function fetchUnifiedDashboardData(): Promise<UnifiedDashboardData> {
    // Get the appropriate endpoint based on role
    const endpoint = getDashboardEndpoint()

    let result
    try {
        // Try the role-specific endpoint first
        result = await apiRequest(endpoint)
    } catch (error) {
        // If role-specific endpoint fails, try the unified endpoint
        if (endpoint !== "/api/dashboard") {
            result = await apiRequest("/api/dashboard")
        } else {
            throw error
        }
    }

    // Process the response data
    let dashboardData: UnifiedDashboardData = {}

    if (result) {

        // Handle the actual API response format: { success, role, stats, timestamp }
        if (result.success && result.stats && typeof result.stats === "object") {
            const stats = result.stats
            const role = result.role

            dashboardData = {
                // Extract fields from stats object
                totalParcels: stats.totalParcels || stats.total_parcels || 0,
                totalAgents: stats.totalAgents || stats.total_agents || 0,
                totalCompanies: stats.totalCompanies || stats.total_companies || 0,
                totalVehicles: stats.totalVehicles || stats.total_vehicles || 0,
                totalOffices: stats.totalOffices || stats.total_offices || 0,
                deliveredParcels: stats.deliveredParcels || stats.delivered_parcels || 0,
                lostParcels: stats.lostParcels || stats.lost_parcels || 0,
                complaints: stats.complaints || 0,

                // BIZ-style fields (may not be present in OPS responses)
                totalParcelsPrice: stats.totalParcelsPrice || stats.total_parcels_price || 0,
                receivedParcels: stats.receivedParcels || stats.received_parcels || 0,

                // Meta information from top-level response
                role: role || result.userType,
                companyName: stats.companyName || stats.company_name || result.companyName,
                userType: role || result.userType,
            }
        } else {
            // Fallback: handle legacy response formats
            const response = result.data || result

            if (response) {
                dashboardData = {
                    // OPS-style fields
                    totalParcels: response.totalParcels || response.total_parcels || response["Total Parcels"] || 0,
                    totalAgents: response.totalAgents || response.total_agents || response["Total Agents"] || 0,
                    totalCompanies: response.totalCompanies || response.total_companies || response["Total Companies"] || 0,
                    totalVehicles: response.totalVehicles || response.total_vehicles || response["Total Vehicles"] || 0,
                    totalOffices: response.totalOffices || response.total_offices || response["Total Offices"] || 0,
                    deliveredParcels: response.deliveredParcels || response.delivered_parcels || response["Delivered Parcels"] || 0,
                    lostParcels: response.lostParcels || response.lost_parcels || response["Lost Parcels"] || 0,
                    complaints: response.complaints || response["Complaints"] || 0,

                    // BIZ-style fields
                    totalParcelsPrice: response.totalParcelsPrice || response.total_parcels_price || response["Total Parcels Price"] || 0,
                    receivedParcels: response.receivedParcels || response.received_parcels || response["Received Parcels"] || 0,

                    // Meta information
                    role: response.role || response.userType,
                    companyName: response.companyName || response.company_name,
                    userType: response.userType || response.user_type,
                }
            }
        }
    }

    return dashboardData
}

/**
 * Fetches recent parcels
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
            return cachedData.data
        }

        const response = await fetchRecentParcels(page, limit)

        // Cache the response
        API_CACHE.set(cacheKey, { data: response, timestamp: now })

        return response
    } catch (error) {
        console.error("❌ Error fetching recent parcels:", error)
        return {
            success: false,
            data: [],
            error: error instanceof Error ? error.message : "Unknown error",
        }
    }
}

/**
 * Uncached recent-parcels fetch that rethrows failures (see
 * fetchUnifiedDashboardData).
 */
export async function fetchRecentParcels(
    page = 1,
    limit = 10,
): Promise<{ success: true; data: any[]; total: number }> {
    let result
    try {
        // Try the recent-transactions endpoint first
        result = await apiRequest(`/api/parcel/recent-transactions?page=${page}&limit=${limit}`)
    } catch (error) {
        // Fallback to regular parcels endpoint
        result = await apiRequest(`/api/parcel?page=${page}&limit=${limit}&sort=createdAt&order=desc`)
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
        } else {
            parcels = []
        }
    }

    return { success: true, data: parcels, total }
}

/**
 * Handle parcel cancellation / restoration
 */
export async function handleParcelCancellation(parcelId: string, cancel: boolean, reason: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
        const result = await apiRequest(`/api/parcel/${parcelId}/cancel`, {
            method: "POST",
            body: JSON.stringify({ cancel, reason }),
        })

        // Clear cache to ensure fresh data on next fetch
        clearApiCache()

        return {
            success: true,
            message: cancel ? "Parcel cancelled successfully" : "Parcel restored successfully"
        }
    } catch (error) {
        console.error("❌ Error processing parcel status change:", error)
        return {
            success: false,
            message: "Operation failed",
            error: error instanceof Error ? error.message : "Unknown error"
        }
    }
}

/**
 * Legacy compatibility function
 */
export async function getDashboardData(): Promise<any> {
    return await getUnifiedDashboardData()
}