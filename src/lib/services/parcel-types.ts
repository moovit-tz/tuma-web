import { apiRequest } from "@/lib/constants"

export interface PortalParcelType {
    id: number
    name: string
    description?: string | null
    parcelCount: number
    createdAt: string
    updatedAt: string
}

// Every parcel type with its parcel count (portal-only endpoint)
export async function getPortalParcelTypes(): Promise<PortalParcelType[]> {
    const res = await apiRequest("/api/parcel/types/all")
    return Array.isArray(res?.data) ? res.data : []
}

export async function createParcelType(data: { name: string; description?: string }) {
    return apiRequest("/api/parcel/types", { method: "POST", body: JSON.stringify(data) })
}

export async function editParcelType(id: number, data: { name: string; description?: string }) {
    return apiRequest(`/api/parcel/types/${id}`, { method: "PUT", body: JSON.stringify(data) })
}

// Refused by the API while any parcel still uses the type
export async function deleteParcelType(id: number) {
    return apiRequest(`/api/parcel/types/${id}`, { method: "DELETE" })
}
