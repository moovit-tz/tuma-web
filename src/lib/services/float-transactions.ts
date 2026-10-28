import { apiRequest } from "@/lib/constants"

// Types based on the API response
export interface FloatTransaction {
    id: number
    uuid: string
    floatId: number | null
    phoneNumber: string
    floatAccountNumber: string
    providerId: number
    amount: string
    userId: number
    transactionReference: string
    status: "PAID" | "PENDING" | "FAILED"
    providerResponse: string | null
    createdAt: string
    updatedAt: string
    float: any | null
    user: {
        id: number
        username: string
        fullName: string
        phoneNumber: string
    }
}

export interface PaymentProvider {
    id: number
    name: string
    code: string
    description: string
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export interface FloatTransactionsResponse {
    summary: {
        totalTransactions: number
        totalAmount: number
        todaysTransactions: number
        averageAmount: number
    }
    transactions: FloatTransaction[]
    pagination: {
        currentPage: number
        totalPages: number
        totalItems: number
        itemsPerPage: number
        hasNextPage: boolean
        hasPreviousPage: boolean
        nextPage: number | null
        previousPage: number | null
    }
}

export interface TransactionStats {
    totalTransactions: number
    totalAmount: number
    totalFees: number
    paidCount: number
    pendingCount: number
    failedCount: number
    averageAmount: number
    todayTransactions: number
    todayAmount: number
    totalPaidAmount: number
    totalPendingAmount: number
    totalFailedAmount: number
}

export interface TrendDataPoint {
    date: string
    displayDate: string
    transactionCount: number
    amount: number
    completedTransactions: number
    failedTransactions: number
    pendingTransactions: number
}

export interface TrendResponse {
    success: boolean
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly'
    dateRange: {
        start: string
        end: string
    }
    summary: {
        totalPeriods: number
        totalTransactions: number
        totalAmount: number
        averageTransactionsPerPeriod: number
        averageAmountPerPeriod: number
    }
    trends: TrendDataPoint[]
    filters: {
        provider: string | null
        startDate: string | null
        endDate: string | null
    }
}

export interface OverviewStats {
    summary: {
        totalTransactions: number
        totalAmount: number
        todaysTransactions: number
        averageAmount: number
    }
    statusBreakdown: {
        paidCount: number
        pendingCount: number
        failedCount: number
        totalPaidAmount: number
        totalPendingAmount: number
        totalFailedAmount: number
    }
    trendData: TrendDataPoint[]
}

/**
 * Get float transactions with filters
 */
export async function getFloatTransactions(params: {
    page?: number
    limit?: number
    search?: string
    status?: string
    providerId?: number
    userId?: number
    dateFrom?: string
    dateTo?: string
    transactionId?: string
} = {}): Promise<FloatTransactionsResponse> {
    console.log("[Float] Fetching transactions with params:", params)

    const queryParams = new URLSearchParams()

    if (params.page) queryParams.append("page", params.page.toString())
    if (params.limit) queryParams.append("limit", params.limit.toString())
    if (params.search) queryParams.append("search", params.search)
    if (params.status && params.status !== "all") queryParams.append("status", params.status)
    if (params.providerId) queryParams.append("providerId", params.providerId.toString())
    if (params.userId) queryParams.append("userId", params.userId.toString())
    if (params.dateFrom) queryParams.append("dateFrom", params.dateFrom)
    if (params.dateTo) queryParams.append("dateTo", params.dateTo)
    if (params.transactionId) queryParams.append("transactionId", params.transactionId)

    const endpoint = `/api/float/transactions${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Transactions fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching float transactions:", error)
        throw error
    }
}

/**
 * Get transaction trends data
 */
export async function getFloatTransactionsTrends(
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' = 'daily',
    options?: {
        limit?: number
        provider?: string
        startDate?: string
        endDate?: string
    }
): Promise<TrendResponse> {
    console.log("[Float] Fetching trends with period:", period, "options:", options)

    const queryParams = new URLSearchParams({
        period: period
    })

    if (options?.limit) queryParams.append('limit', options.limit.toString())
    if (options?.provider) queryParams.append('provider', options.provider)
    if (options?.startDate) queryParams.append('startDate', options.startDate)
    if (options?.endDate) queryParams.append('endDate', options.endDate)

    const endpoint = `/api/float/transactions/trends${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Trends fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching trends data:", error)
        throw error
    }
}

/**
 * Search transactions using the dedicated search API
 */
export async function searchFloatTransactions(params: {
    q?: string
    status?: string
    provider?: string
    phoneNumber?: string
    minAmount?: number
    maxAmount?: number
    startDate?: string
    endDate?: string
    sortBy?: 'amount' | 'createdAt' | 'status'
    sortOrder?: 'asc' | 'desc'
    limit?: number
    page?: number
} = {}): Promise<FloatTransactionsResponse> {
    console.log("[Float] Searching transactions with params:", params)

    const queryParams = new URLSearchParams()

    if (params.q) queryParams.append('q', params.q)
    if (params.status && params.status !== 'all') queryParams.append('status', params.status.toUpperCase())
    if (params.provider && params.provider !== 'all') queryParams.append('provider', params.provider)
    if (params.phoneNumber) queryParams.append('phoneNumber', params.phoneNumber)
    if (params.minAmount !== undefined) queryParams.append('minAmount', params.minAmount.toString())
    if (params.maxAmount !== undefined) queryParams.append('maxAmount', params.maxAmount.toString())
    if (params.startDate) queryParams.append('startDate', params.startDate)
    if (params.endDate) queryParams.append('endDate', params.endDate)
    if (params.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.page) queryParams.append('page', params.page.toString())

    const endpoint = `/api/float/transactions/search${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Transactions searched successfully")
        return result
    } catch (error) {
        console.error("❌ Error searching transactions:", error)
        throw error
    }
}

/**
 * Get payment providers
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
 * Get admin payment status data (for analytics)
 */
export async function getAdminPaymentStatus(params: {
    page?: number
    limit?: number
    dateFrom?: string
    dateTo?: string
} = {}): Promise<any> {
    console.log("[Float] Fetching admin payment status with params:", params)

    const queryParams = new URLSearchParams()

    if (params.page) queryParams.append("page", params.page.toString())
    if (params.limit) queryParams.append("limit", params.limit.toString())
    if (params.dateFrom) queryParams.append("dateFrom", params.dateFrom)
    if (params.dateTo) queryParams.append("dateTo", params.dateTo)

    const endpoint = `/api/float/admin/payment-status${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

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
 * Calculate transaction statistics from transaction data
 */
export function calculateTransactionStats(transactions: FloatTransaction[]): TransactionStats {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    let totalAmount = 0
    let paidCount = 0
    let pendingCount = 0
    let failedCount = 0
    let todayTransactions = 0
    let todayAmount = 0
    let totalPaidAmount = 0
    let totalPendingAmount = 0
    let totalFailedAmount = 0

    transactions.forEach(transaction => {
        const amount = Number(transaction.amount) || 0
        totalAmount += amount

        // Count by status
        switch (transaction.status) {
            case "PAID":
                paidCount++
                totalPaidAmount += amount
                break
            case "PENDING":
                pendingCount++
                totalPendingAmount += amount
                break
            case "FAILED":
                failedCount++
                totalFailedAmount += amount
                break
        }

        // Today's transactions
        const transactionDate = new Date(transaction.createdAt)
        if (transactionDate >= today) {
            todayTransactions++
            todayAmount += amount
        }
    })

    const averageAmount = transactions.length > 0 ? totalAmount / transactions.length : 0
    const totalFees = totalPaidAmount * 0.02 // 2% fee assumption

    return {
        totalTransactions: transactions.length,
        totalAmount,
        totalFees,
        paidCount,
        pendingCount,
        failedCount,
        averageAmount,
        todayTransactions,
        todayAmount,
        totalPaidAmount,
        totalPendingAmount,
        totalFailedAmount,
    }
}

/**
 * Format currency in Tanzanian Shilling
 */
export function formatTZS(amount: number): string {
    return new Intl.NumberFormat("en-TZ", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

/**
 * Get provider name by ID
 */
// Tigo Pesa is now branded "Mixx by Yas"; show the current name wherever providers appear
export function providerDisplayName(name?: string | null): string {
    if (!name) return ""
    return /^\s*tigo(\s*-?\s*pesa)?\s*$/i.test(name) ? "Mixx by Yas" : name
}

export function getProviderName(providerId: number, providers: PaymentProvider[]): string {
    const provider = providers.find(p => p.id === providerId)
    return providerDisplayName(provider?.name) || `Provider ${providerId}`
}

/**
 * Format status for display
 */
export function formatStatus(status: string): string {
    switch (status) {
        case "PAID":
            return "Paid"
        case "PENDING":
            return "Pending"
        case "FAILED":
            return "Failed"
        default:
            return status
    }
}

/**
 * Get status color classes
 */
export function getStatusColor(status: string): string {
    switch (status) {
        case "PAID":
            return "bg-green-100 text-green-800 border-green-200"
        case "PENDING":
            return "bg-yellow-100 text-yellow-800 border-yellow-200"
        case "FAILED":
            return "bg-red-100 text-red-800 border-red-200"
        default:
            return "bg-gray-100 text-gray-800 border-gray-200"
    }
}