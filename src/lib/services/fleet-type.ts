import { apiRequest } from "@/lib/constants"
import type { CreateFleetTypeData, UpdateFleetTypeData } from "@/types/fleet-type"

export interface GetFleetTypesParams {
    name?: string
    paginate?: boolean
    page?: number
    per_page?: number
}

export interface FleetType {
    id: number
    name: string
    description?: string
    created_at: string
    updated_at: string
}

/**
 * Get all fleet types with optional filters
 */
export async function getFleetTypes(params: GetFleetTypesParams = {}): Promise<FleetType[]> {
    console.log("[FleetType] Fetching fleet types with params:", params)

    const queryParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString())
        }
    })

    const endpoint = `/api/vehicle/fleet-types${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Fleet types fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching fleet types:", error)
        throw error
    }
}

/**
 * Get a single fleet type by ID
 */
export async function getFleetType(id: number): Promise<FleetType> {
    console.log("[FleetType] Fetching fleet type:", id)

    try {
        const result = await apiRequest(`/api/vehicle/fleet-types/${id}`)
        console.log("✅ Fleet type fetched successfully")
        return result
    } catch (error) {
        console.error(`❌ Error fetching fleet type ${id}:`, error)
        throw error
    }
}

/**
 * Create a new fleet type
 */
export async function createFleetType(data: CreateFleetTypeData): Promise<FleetType> {
    console.log("[FleetType] Creating fleet type with data:", data)

    try {
        const result = await apiRequest("/api/vehicle/fleet-types", {
            method: "POST",
            body: JSON.stringify(data),
        })
        console.log("✅ Fleet type created successfully")
        return result
    } catch (error) {
        console.error("❌ Error creating fleet type:", error)
        throw error
    }
}

/**
 * Update a fleet type
 */
export async function updateFleetType(id: number, data: UpdateFleetTypeData): Promise<FleetType> {
    console.log("[FleetType] Updating fleet type:", id, data)

    try {
        const result = await apiRequest(`/api/vehicle/fleet-types/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        })
        console.log("✅ Fleet type updated successfully")
        return result
    } catch (error) {
        console.error(`❌ Error updating fleet type ${id}:`, error)
        throw error
    }
}

/**
 * Delete a fleet type
 */
export async function deleteFleetType(id: number) {
    console.log("[FleetType] Deleting fleet type:", id)

    try {
        const result = await apiRequest(`/api/vehicle/fleet-types/${id}`, {
            method: "DELETE",
        })
        console.log("✅ Fleet type deleted successfully")
        return result
    } catch (error) {
        console.error(`❌ Error deleting fleet type ${id}:`, error)
        throw error
    }
}