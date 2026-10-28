import { apiRequest } from "@/lib/constants"

/* Payment providers (mobile money etc. used for float top-ups) */

export interface PaymentProvider {
    id: number
    name: string
    code: string
    description?: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export async function getPaymentProviders(): Promise<PaymentProvider[]> {
    const res = await apiRequest("/api/float/payment-providers")
    return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []
}

export async function savePaymentProvider(
    id: number | null,
    data: { name: string; code: string; description?: string; isActive: boolean },
) {
    return apiRequest(id ? `/api/float/payment-providers/${id}` : "/api/float/payment-providers", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(data),
    })
}

// Refused by the API while transactions use the provider
export async function deletePaymentProvider(id: number) {
    return apiRequest(`/api/float/payment-providers/${id}`, { method: "DELETE" })
}

/* App versions (what the mobile apps check to prompt an update) */

export interface AppVersion {
    id: number
    appType: string
    appVersion: string
    appVersionCode: number
    mustUpdate: boolean
    createdAt: string
    updatedAt: string
}

export async function getAppVersions(): Promise<AppVersion[]> {
    const res = await apiRequest("/api/version?limit=100&sortBy=appVersionCode&sortOrder=desc")
    return Array.isArray(res?.data) ? res.data : []
}

export async function saveAppVersion(
    id: number | null,
    data: { appType: string; appVersion: string; appVersionCode: number; mustUpdate: boolean },
) {
    return apiRequest(id ? `/api/version/${id}` : "/api/version", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(data),
    })
}

export async function deleteAppVersion(id: number) {
    return apiRequest(`/api/version/${id}`, { method: "DELETE" })
}
