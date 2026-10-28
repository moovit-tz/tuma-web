import { apiRequest } from "@/lib/constants"
import type { CreateSeatLayoutData, UpdateSeatLayoutData } from "@/types/seat-layout"

export interface GetSeatLayoutsParams {
    name?: string
    paginate?: boolean
    page?: number
    per_page?: number
}

export interface SeatLayout {
    id: number
    name: string
    description?: string
    total_seats: number
    rows: number
    columns: number
    layout_data?: any
    vehicle_type_id?: number
    created_at: string
    updated_at: string
}

/**
 * Get all seat layouts with optional filters
 */
export async function getSeatLayouts(params: GetSeatLayoutsParams = {}): Promise<SeatLayout[]> {
    console.log("[SeatLayout] Fetching seat layouts with params:", params)

    const queryParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString())
        }
    })

    const endpoint = `/api/vehicle/seat-layouts${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Seat layouts fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching seat layouts:", error)
        throw error
    }
}

/**
 * Get a single seat layout by ID
 */
export async function getSeatLayout(id: number): Promise<SeatLayout> {
    console.log("[SeatLayout] Fetching seat layout:", id)

    try {
        const result = await apiRequest(`/api/vehicle/seat-layouts/${id}`)
        console.log("✅ Seat layout fetched successfully")
        return result
    } catch (error) {
        console.error(`❌ Error fetching seat layout ${id}:`, error)
        throw error
    }
}

/**
 * Create a new seat layout
 */
export async function createSeatLayout(data: CreateSeatLayoutData): Promise<SeatLayout> {
    console.log("[SeatLayout] Creating seat layout with data:", data)

    try {
        const result = await apiRequest("/api/vehicle/seat-layouts", {
            method: "POST",
            body: JSON.stringify(data),
        })
        console.log("✅ Seat layout created successfully")
        return result
    } catch (error) {
        console.error("❌ Error creating seat layout:", error)
        throw error
    }
}

/**
 * Update a seat layout
 */
export async function updateSeatLayout(id: number, data: UpdateSeatLayoutData): Promise<SeatLayout> {
    console.log("[SeatLayout] Updating seat layout:", id, data)

    try {
        const result = await apiRequest(`/api/vehicle/seat-layouts/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        })
        console.log("✅ Seat layout updated successfully")
        return result
    } catch (error) {
        console.error(`❌ Error updating seat layout ${id}:`, error)
        throw error
    }
}

/**
 * Delete a seat layout
 */
export async function deleteSeatLayout(id: number) {
    console.log("[SeatLayout] Deleting seat layout:", id)

    try {
        const result = await apiRequest(`/api/vehicle/seat-layouts/${id}`, {
            method: "DELETE",
        })
        console.log("✅ Seat layout deleted successfully")
        return result
    } catch (error) {
        console.error(`❌ Error deleting seat layout ${id}:`, error)
        throw error
    }
}