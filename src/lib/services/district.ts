import type { CreateDistrictData, UpdateDistrictData } from "@/types/district"
import { apiRequest } from "@/lib/constants"

interface GetDistrictsParams {
    name?: string
    code?: string
    region_id?: number
    country_id?: number
    paginate?: boolean
    page?: number
    per_page?: number
}

export async function getDistricts(params: GetDistrictsParams = {}) {
    try {
        const queryParams = new URLSearchParams()

        // Add include parameter for relationships
        const enhancedParams = {
            ...params,
            include: "region,bookingOffices,region.country",
        }

        Object.entries(enhancedParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                queryParams.append(key, value.toString())
            }
        })

        const endpoint = `/api/location/districts${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
        return await apiRequest(endpoint)
    } catch (error) {
        console.error("Error in getDistricts:", error)
        throw error
    }
}

export async function getDistrict(id: number) {
    try {
        const queryParams = new URLSearchParams()
        queryParams.append("include", "region,bookingOffices,region.country")

        const endpoint = `/api/location/district/${id}?${queryParams.toString()}`
        return await apiRequest(endpoint)
    } catch (error) {
        console.error(`Error in getDistrict ${id}:`, error)
        throw error
    }
}

// The backend's district endpoints expect `region_id` (snake_case) even
// though every other location resource uses camelCase — translate at the
// boundary so callers can keep using `regionId` consistently.
function toDistrictPayload(data: CreateDistrictData | UpdateDistrictData) {
    const { regionId, ...rest } = data as CreateDistrictData
    return regionId !== undefined ? { ...rest, region_id: regionId } : rest
}

export async function createDistrict(data: CreateDistrictData) {
    try {
        const result = await apiRequest("/api/location/district", {
            method: "POST",
            body: JSON.stringify(toDistrictPayload(data)),
        })
        // POST /location/district is a bulk upsert that replies 200 with
        // { success: false, failedOperations } when nothing was saved
        if (result?.success === false || result?.failedOperations?.length) {
            throw new Error(result?.failedOperations?.[0]?.error || result?.message || "The district wasn't saved.")
        }
        return result
    } catch (error) {
        console.error("Error in createDistrict:", error)
        throw error
    }
}

export async function updateDistrict(id: number, data: UpdateDistrictData) {
    try {
        return await apiRequest(`/api/location/district/${id}`, {
            method: "PUT",
            body: JSON.stringify(toDistrictPayload(data)),
        })
    } catch (error) {
        console.error("Error in updateDistrict:", error)
        throw error
    }
}

/**
 * Delete a district.
 * Note: there is no delete endpoint for districts in the backend today —
 * this call is expected to fail. Kept only so existing callers don't
 * break at build time; the delete UI itself has been removed.
 */
export async function deleteDistrict(id: number) {
    try {
        return await apiRequest(`/api/location/district/${id}`, {
            method: "DELETE",
        })
    } catch (error) {
        console.error("Error in deleteDistrict:", error)
        throw error
    }
}

export async function getDistrictsByRegion(regionId: number) {
    try {
        return await apiRequest(`/api/location/districts/region/${regionId}`)
    } catch (error) {
        console.error("Error in getDistrictsByRegion:", error)
        throw error
    }
}