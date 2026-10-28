import { apiRequest } from "@/lib/constants"

export interface GetRegionsParams {
    page?: number
    per_page?: number
    search?: string
}

export interface CreateRegionData {
    name: string
    countryId: number
    code?: string
    latitude?: number
    longitude?: number
}

export interface UpdateRegionData {
    name?: string
    countryId?: number
    code?: string
    latitude?: number
    longitude?: number
}

/**
 * Get all regions with optional filters
 */
export async function getRegions(params: GetRegionsParams = {}) {
    console.log("[Regions] Fetching regions with params:", params)

    const queryParams = new URLSearchParams()

    // Add include parameter for relationships
    const enhancedParams = {
        ...params,
        include: "country,districts,districts.bookingOffices",
    }

    Object.entries(enhancedParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            queryParams.append(key, value.toString())
        }
    })

    const endpoint = `/api/location/regions${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Regions fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching regions:", error)
        throw error
    }
}

/**
 * Get a single region by ID
 */
export async function getRegion(id: number) {
    console.log("[Regions] Fetching region:", id)

    try {
        const result = await apiRequest(`/api/location/region/${id}`)
        console.log("✅ Region fetched successfully")
        return result
    } catch (error) {
        console.error(`❌ Error fetching region ${id}:`, error)
        throw error
    }
}

/**
 * Create a new region
 */
export async function createRegion(data: CreateRegionData) {
    console.log("[Regions] Creating region with data:", data)

    try {
        const result = await apiRequest("/api/location/region", {
            method: "POST",
            body: JSON.stringify(data),
        })
        // POST /location/region is a bulk upsert that replies 200 with
        // { success: false, failedOperations } when nothing was saved
        if (result?.success === false || result?.failedOperations?.length) {
            throw new Error(result?.failedOperations?.[0]?.error || result?.message || "The region wasn't saved.")
        }

        console.log("✅ Region created successfully")
        return result
    } catch (error) {
        console.error("❌ Error creating region:", error)
        throw error
    }
}

/**
 * Update a region
 */
export async function updateRegion(id: number, data: UpdateRegionData) {
    console.log("[Regions] Updating region:", id, "with data:", data)

    try {
        const result = await apiRequest(`/api/location/region/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        })

        console.log("✅ Region updated successfully")
        return result
    } catch (error) {
        console.error(`❌ Error updating region ${id}:`, error)
        throw error
    }
}

/**
 * Delete a region.
 * Note: there is no delete endpoint for regions in the backend today —
 * this call is expected to fail. Kept only so existing callers don't
 * break at build time; the delete UI itself has been removed.
 */
export async function deleteRegion(id: number) {
    console.log("[Regions] Deleting region:", id)

    try {
        const result = await apiRequest(`/api/location/region/${id}`, {
            method: "DELETE",
        })

        console.log("✅ Region deleted successfully")
        return result
    } catch (error) {
        console.error(`❌ Error deleting region ${id}:`, error)
        throw error
    }
}