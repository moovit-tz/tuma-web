import type { CreateBookingOfficeData, UpdateBookingOfficeData } from "@/types/booking-office"
import { apiRequest } from "@/lib/constants"

interface GetBookingOfficesParams {
    name?: string
    code?: string
    district_id?: number
    region_id?: number
    country_id?: number
    is_active?: boolean
    paginate?: boolean
    page?: number
    per_page?: number
}

export async function getBookingOffices(params: GetBookingOfficesParams = {}) {
    try {
        const queryParams = new URLSearchParams()

        // Add include parameter for relationships
        const enhancedParams = {
            ...params,
            include: "district,region,agents,parcels,district.region,district.region.country",
        }

        Object.entries(enhancedParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                queryParams.append(key, value.toString())
            }
        })

        const endpoint = `/api/location/booking-offices${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
        console.log("🚀 Fetching all booking offices from:", endpoint)

        return await apiRequest(endpoint)
    } catch (error) {
        console.error("Error in getBookingOffices:", error)
        throw error
    }
}

export async function getBookingOffice(id: number) {
    try {
        const queryParams = new URLSearchParams()
        queryParams.append("include", "district,region,agents,parcels,district.region,district.region.country")

        const endpoint = `/api/location/booking-offices/${id}?${queryParams.toString()}`
        return await apiRequest(endpoint)
    } catch (error) {
        console.error(`Error in getBookingOffice ${id}:`, error)
        throw error
    }
}

export async function createBookingOffice(data: CreateBookingOfficeData) {
    try {
        return await apiRequest("/api/location/booking-office", {
            method: "POST",
            body: JSON.stringify(data),
        })
    } catch (error) {
        console.error("Error in createBookingOffice:", error)
        throw error
    }
}

export async function updateBookingOffice(id: number, data: UpdateBookingOfficeData) {
    try {
        return await apiRequest(`/api/location/booking-offices/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        })
    } catch (error) {
        console.error("Error in updateBookingOffice:", error)
        throw error
    }
}

/**
 * Delete a booking office.
 * Note: there is no delete endpoint for booking offices in the backend
 * today — this call is expected to fail. Kept only so existing callers
 * don't break at build time; the delete UI itself has been removed.
 */
export async function deleteBookingOffice(id: number) {
    try {
        return await apiRequest(`/api/location/booking-offices/${id}`, {
            method: "DELETE",
        })
    } catch (error) {
        console.error("Error in deleteBookingOffice:", error)
        throw error
    }
}

export async function getBookingOfficesByRegion(regionId: number) {
    try {
        const queryParams = new URLSearchParams()
        queryParams.append("region_id", regionId.toString())

        const endpoint = `/api/location/booking-offices?${queryParams.toString()}`
        console.log("🚀 Fetching booking offices from:", endpoint)
        console.log("🏢 Region ID:", regionId)

        return await apiRequest(endpoint)
    } catch (error) {
        console.error("Error in getBookingOfficesByRegion:", error)
        throw error
    }
}