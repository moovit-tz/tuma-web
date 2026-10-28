import { apiRequest } from "@/lib/constants"
import type { CreateModelData, UpdateModelData } from "@/types/model"

export interface GetModelsParams {
    name?: string
    paginate?: boolean
    page?: number
    per_page?: number
}

export interface Model {
    id: number
    name: string
    description?: string
    brand_id?: number
    brand?: {
        id: number
        name: string
    }
    created_at: string
    updated_at: string
}

/**
 * Get all vehicle models with optional filters
 */
export async function getModels(params: GetModelsParams = {}): Promise<Model[]> {
    console.log("[Model] Fetching models with params:", params)

    const queryParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString())
        }
    })

    const endpoint = `/api/vehicle/models${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Models fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching models:", error)
        throw error
    }
}

/**
 * Get a single vehicle model by ID
 */
export async function getModel(id: number): Promise<Model> {
    console.log("[Model] Fetching model:", id)

    try {
        const result = await apiRequest(`/api/vehicle/models/${id}`)
        console.log("✅ Model fetched successfully")
        return result
    } catch (error) {
        console.error(`❌ Error fetching model ${id}:`, error)
        throw error
    }
}

/**
 * Create a new vehicle model
 */
export async function createModel(data: CreateModelData): Promise<Model> {
    console.log("[Model] Creating model with data:", data)

    try {
        const result = await apiRequest("/api/vehicle/models", {
            method: "POST",
            body: JSON.stringify(data),
        })
        console.log("✅ Model created successfully")
        return result
    } catch (error) {
        console.error("❌ Error creating model:", error)
        throw error
    }
}

/**
 * Update a vehicle model
 */
export async function updateModel(id: number, data: UpdateModelData): Promise<Model> {
    console.log("[Model] Updating model:", id, data)

    try {
        const result = await apiRequest(`/api/vehicle/models/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        })
        console.log("✅ Model updated successfully")
        return result
    } catch (error) {
        console.error(`❌ Error updating model ${id}:`, error)
        throw error
    }
}

/**
 * Delete a vehicle model
 */
export async function deleteModel(id: number) {
    console.log("[Model] Deleting model:", id)

    try {
        const result = await apiRequest(`/api/vehicle/models/${id}`, {
            method: "DELETE",
        })
        console.log("✅ Model deleted successfully")
        return result
    } catch (error) {
        console.error(`❌ Error deleting model ${id}:`, error)
        throw error
    }
}