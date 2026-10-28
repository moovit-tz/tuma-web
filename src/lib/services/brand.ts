import type { CreateBrandData, UpdateBrandData } from "@/types/brand"
import { apiRequest } from "@/lib/constants"

interface GetBrandsParams {
    name?: string
    paginate?: boolean
    page?: number
    per_page?: number
}

export async function getBrands(params: GetBrandsParams = {}) {
    try {
        const queryParams = new URLSearchParams()

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                queryParams.append(key, value.toString())
            }
        })

        const endpoint = `/api/vehicle/brands${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
        console.log("Fetching brands from:", endpoint)

        return await apiRequest(endpoint)
    } catch (error) {
        console.error("Error in getBrands:", error)
        throw error
    }
}

export async function getBrand(id: number) {
    try {
        return await apiRequest(`/api/vehicle/brands/${id}`)
    } catch (error) {
        console.error(`Error in getBrand ${id}:`, error)
        throw error
    }
}

export async function createBrand(data: CreateBrandData) {
    try {
        return await apiRequest("/api/vehicle/brands", {
            method: "POST",
            body: JSON.stringify(data),
        })
    } catch (error) {
        console.error("Error in createBrand:", error)
        throw error
    }
}

export async function updateBrand(id: number, data: UpdateBrandData) {
    try {
        return await apiRequest(`/api/vehicle/brands/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        })
    } catch (error) {
        console.error("Error in updateBrand:", error)
        throw error
    }
}

export async function deleteBrand(id: number) {
    try {
        return await apiRequest(`/api/vehicle/brands/${id}`, {
            method: "DELETE",
        })
    } catch (error) {
        console.error("Error in deleteBrand:", error)
        throw error
    }
}
