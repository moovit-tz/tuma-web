import { apiRequest } from "@/lib/constants"
import type {
    CreateFloatData,
    UpdateFloatData,
    CreateFloatTransactionData,
    FloatFilters,
    FloatTransactionFilters,
} from "@/types/transaction"

export interface GetFloatsParams extends FloatFilters {}
export interface GetFloatTransactionsParams extends FloatTransactionFilters {}

export interface Float {
    id: number
    user_id: number
    float_account_number: string
    balance: number
    status: string
    created_at: string
    updated_at: string
}

export interface FloatTransaction {
    id: number
    float_id: number
    amount: number
    type: string
    status: string
    payment_channel?: string
    reference?: string
    description?: string
    created_at: string
    updated_at: string
}

export interface PaymentProvider {
    id: number
    name: string
    code: string
    is_active: boolean
    created_at: string
    updated_at: string
}

/**
 * Get all floats with optional filters
 */
export async function getFloats(params: GetFloatsParams = {}): Promise<Float[]> {
    console.log("[Float] Fetching floats with params:", params)

    const queryParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            queryParams.append(key, value.toString())
        }
    })

    const endpoint = `/api/float${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Floats fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching floats:", error)
        throw error
    }
}

/**
 * Get a single float by ID
 */
export async function getFloat(id: number): Promise<Float> {
    console.log("[Float] Fetching float:", id)

    try {
        const result = await apiRequest(`/api/float/${id}`)
        console.log("✅ Float fetched successfully")
        return result
    } catch (error) {
        console.error(`❌ Error fetching float ${id}:`, error)
        throw error
    }
}

/**
 * Create a new float
 */
export async function createFloat(data: CreateFloatData): Promise<Float> {
    console.log("[Float] Creating float with data:", data)

    try {
        const result = await apiRequest("/api/float", {
            method: "POST",
            body: JSON.stringify(data),
        })
        console.log("✅ Float created successfully")
        return result
    } catch (error) {
        console.error("❌ Error creating float:", error)
        throw error
    }
}

/**
 * Create an agent float
 */
export async function createAgentFloat(data: CreateFloatData): Promise<Float> {
    console.log("[Float] Creating agent float with data:", data)

    try {
        const result = await apiRequest("/api/float/create-float", {
            method: "POST",
            body: JSON.stringify(data),
        })
        console.log("✅ Agent float created successfully")
        return result
    } catch (error) {
        console.error("❌ Error creating agent float:", error)
        throw error
    }
}

/**
 * Update float status
 */
export async function updateFloat(id: number, data: UpdateFloatData): Promise<Float> {
    console.log("[Float] Updating float:", id, data)

    try {
        const result = await apiRequest(`/api/float/${id}/status`, {
            method: "PUT",
            body: JSON.stringify(data),
        })
        console.log("✅ Float updated successfully")
        return result
    } catch (error) {
        console.error(`❌ Error updating float ${id}:`, error)
        throw error
    }
}

/**
 * Check float status for a user
 */
export async function checkFloatStatus(userId: number) {
    console.log("[Float] Checking float status for user:", userId)

    try {
        const result = await apiRequest(`/api/float/balance?userId=${userId}`)
        console.log("✅ Float status checked successfully")
        return result
    } catch (error) {
        console.error(`❌ Error checking float status for user ${userId}:`, error)
        throw error
    }
}

/**
 * Get float balance for a user
 */
export async function getFloatBalance(userId: number) {
    console.log("[Float] Fetching float balance for user:", userId)

    try {
        const result = await apiRequest(`/api/admin/float/balance?userId=${userId}`)
        console.log("✅ Float balance fetched successfully")
        return result
    } catch (error) {
        console.error(`❌ Error fetching float balance for user ${userId}:`, error)
        throw error
    }
}

/**
 * Get company balance
 */
export async function getCompanyBalance() {
    console.log("[Float] Fetching company balance")

    try {
        const result = await apiRequest("/api/float/company-balance")
        console.log("✅ Company balance fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching company balance:", error)
        throw error
    }
}

/**
 * Get current float
 */
export async function getCurrentFloat() {
    console.log("[Float] Fetching current float")

    try {
        const result = await apiRequest("/api/float/current")
        console.log("✅ Current float fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching current float:", error)
        throw error
    }
}

/**
 * Get float history
 */
export async function getFloatHistory() {
    console.log("[Float] Fetching float history")

    try {
        const result = await apiRequest("/api/float/history")
        console.log("✅ Float history fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching float history:", error)
        throw error
    }
}

/**
 * Get float reports
 */
export async function getFloatReports() {
    console.log("[Float] Fetching float reports")

    try {
        const result = await apiRequest("/api/float/reports")
        console.log("✅ Float reports fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching float reports:", error)
        throw error
    }
}

/**
 * Get floats for current user
 */
export async function getUserFloats() {
    console.log("[Float] Fetching floats for current user")

    try {
        const result = await apiRequest("/api/float/user/me")
        console.log("✅ User floats fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching user floats:", error)
        throw error
    }
}

/**
 * Get floats for a specific user by ID
 */
export async function getUserFloatsById(userId: number) {
    console.log("[Float] Fetching floats for user:", userId)

    try {
        const result = await apiRequest(`/api/float/user/${userId}`)
        console.log("✅ User floats fetched successfully")
        return result
    } catch (error) {
        console.error(`❌ Error fetching floats for user ${userId}:`, error)
        throw error
    }
}

/**
 * Get floats for a specific company
 */
export async function getCompanyFloats(companyId: number) {
    console.log("[Float] Fetching floats for company:", companyId)

    try {
        const result = await apiRequest(`/api/float/company/${companyId}`)
        console.log("✅ Company floats fetched successfully")
        return result
    } catch (error) {
        console.error(`❌ Error fetching floats for company ${companyId}:`, error)
        throw error
    }
}

/**
 * Get all float transactions with optional filters
 */
export async function getFloatTransactions(
    params: GetFloatTransactionsParams = {}
): Promise<FloatTransaction[]> {
    console.log("[Float] Fetching float transactions with params:", params)

    const queryParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            // Handle payment channel with case normalization
            if (key === "paymentChannel") {
                queryParams.append(key, value.toString().toUpperCase())
            } else {
                queryParams.append(key, value.toString())
            }
        }
    })

    const endpoint = `/api/float/transactions${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Float transactions fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching float transactions:", error)
        throw error
    }
}

/**
 * Create a new float transaction
 */
export async function createFloatTransaction(data: CreateFloatTransactionData): Promise<FloatTransaction> {
    console.log("[Float] Creating float transaction with data:", data)

    try {
        const result = await apiRequest("/api/float/transactions", {
            method: "POST",
            body: JSON.stringify(data),
        })
        console.log("✅ Float transaction created successfully")
        return result
    } catch (error) {
        console.error("❌ Error creating float transaction:", error)
        throw error
    }
}

/**
 * Get transactions for a specific float
 */
export async function getFloatTransactionsByFloat(floatId: number): Promise<FloatTransaction[]> {
    console.log("[Float] Fetching transactions for float:", floatId)

    try {
        const result = await apiRequest(`/api/float/${floatId}/transactions`)
        console.log("✅ Float transactions fetched successfully")
        return result
    } catch (error) {
        console.error(`❌ Error fetching transactions for float ${floatId}:`, error)
        throw error
    }
}

/**
 * Get transactions for current user
 */
export async function getUserTransactions(): Promise<FloatTransaction[]> {
    console.log("[Float] Fetching transactions for current user")

    try {
        const result = await apiRequest("/api/float/transactions/user/me")
        console.log("✅ User transactions fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching user transactions:", error)
        throw error
    }
}

/**
 * Get all payment providers
 */
export async function getPaymentProviders(): Promise<PaymentProvider[]> {
    console.log("[Float] Fetching payment providers")

    try {
        const result = await apiRequest("/api/float/payment-providers")
        console.log("✅ Payment providers fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching payment providers:", error)
        throw error
    }
}

/**
 * Create a new payment provider
 */
export async function createPaymentProvider(data: any): Promise<PaymentProvider> {
    console.log("[Float] Creating payment provider with data:", data)

    try {
        const result = await apiRequest("/api/float/payment-providers", {
            method: "POST",
            body: JSON.stringify(data),
        })
        console.log("✅ Payment provider created successfully")
        return result
    } catch (error) {
        console.error("❌ Error creating payment provider:", error)
        throw error
    }
}

/**
 * Get admin payment status with filters
 */
export async function getAdminPaymentStatus(params: any = {}) {
    console.log("[Float] Fetching admin payment status with params:", params)

    const queryParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            // Handle payment channel with case normalization
            if (key === "paymentChannel") {
                queryParams.append(key, value.toString().toUpperCase())
            } else {
                queryParams.append(key, value.toString())
            }
        }
    })

    const endpoint = `/api/float/transactions${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Admin payment status fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching admin payment status:", error)
        throw error
    }
}

/**
 * Get user float settings
 */
export async function getUserFloatSettings() {
    console.log("[Float] Fetching user float settings")

    try {
        const result = await apiRequest("/api/float-settings")
        console.log("✅ User float settings fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching user float settings:", error)
        throw error
    }
}

/**
 * Update user float settings
 */
export async function updateUserFloatSettings(data: any) {
    console.log("[Float] Updating user float settings with data:", data)

    try {
        const result = await apiRequest("/api/float-settings", {
            method: "PUT",
            body: JSON.stringify(data),
        })
        console.log("✅ User float settings updated successfully")
        return result
    } catch (error) {
        console.error("❌ Error updating user float settings:", error)
        throw error
    }
}

/**
 * Toggle float usage for current user
 */
export async function toggleFloatUsage() {
    console.log("[Float] Toggling float usage for current user")

    try {
        const result = await apiRequest("/api/float-settings/toggle-float", {
            method: "POST",
        })
        console.log("✅ Float usage toggled successfully")
        return result
    } catch (error) {
        console.error("❌ Error toggling float usage:", error)
        throw error
    }
}

/**
 * Toggle float usage for a specific user
 */
export async function toggleUserFloatUsage(userId: number) {
    console.log("[Float] Toggling float usage for user:", userId)

    try {
        const result = await apiRequest(`/api/float-settings/toggle-float/${userId}`, {
            method: "POST",
        })
        console.log("✅ User float usage toggled successfully")
        return result
    } catch (error) {
        console.error(`❌ Error toggling float usage for user ${userId}:`, error)
        throw error
    }
}