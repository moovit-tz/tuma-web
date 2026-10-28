import { apiRequest } from "@/lib/constants"

/*
 * Commission = what the platform deducts from an agent's float each time they
 * book (receive) a parcel — FloatTransactionLog rows of type PARCEL_RECEIVED.
 */

export interface CommissionSummary {
    period: { startDate: string; endDate: string; companyId: number | null }
    totals: { amount: number; count: number; agents: number; companies: number }
    byAgent: {
        userId: number
        fullName: string | null
        username: string | null
        phoneNumber: string | null
        company: { id: number; name: string } | null
        amount: number
        count: number
    }[]
    byCompany: { companyId: number | null; name: string; amount: number; count: number; agents: number }[]
    daily: { date: string; amount: number; count: number }[]
}

// Exact totals for a period of at most 366 days
export async function getCommissionSummary(params: { startDate: string; endDate: string; companyId?: number }): Promise<CommissionSummary> {
    const q = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate })
    if (params.companyId) q.set("companyId", String(params.companyId))
    const res = await apiRequest(`/api/commission/summary?${q.toString()}`)
    return res?.data
}
