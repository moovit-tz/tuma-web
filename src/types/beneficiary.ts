// Beneficiary types
export interface Beneficiary {
    id: number
    name: string
    deduction_amount: string
    deduction_frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
    start_date: string
    end_date: string
    description: string
    status: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED"
    is_active: boolean
    total_deducted: string
    deduction_count: number
    last_deduction_date: string | null
    next_deduction_date: string | null
    failed_deductions: number
    user_id: number | null
    metadata: Record<string, any>
    created_at: string
    updated_at: string
    User?: {
        id: number
        fullName: string
        phoneNumber: string
        floatAccountNumber?: string
    } | null
    beneficiary_transactions?: BeneficiaryTransaction[]
}

export interface BeneficiaryTransaction {
    id: number
    beneficiary_id: number
    amount: string
    status: string
    transaction_reference: string
    provider_response: any
    error_message: string | null
    scheduled_date: string
    processed_date: string
    metadata: Record<string, any>
    created_at: string
    updated_at: string
}

export interface BeneficiaryStats {
    total: number
    active: number
    paused: number
    completed: number
    assigned: number
    unassigned: number
    totalDeducted: number
    totalDeductionCount: number
    monthlyCommitment: number
}

export interface CreateBeneficiaryData {
    name: string
    deductionAmount: number
    deductionFrequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
    startDate: string
    endDate: string
    description: string
}

export interface UpdateBeneficiaryData extends CreateBeneficiaryData {}

export interface BeneficiaryListParams {
    status?: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED"
    frequency?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
    search?: string
    page?: number
    limit?: number
}

export interface BeneficiaryResponse {
    success: boolean
    message?: string
    data: Beneficiary
}

export interface BeneficiaryListResponse {
    success: boolean
    data: Beneficiary[]
    pagination: {
        total: number
        page: number
        limit: number
        pages: number
    }
}

export interface BeneficiaryStatsResponse {
    success: boolean
    data: BeneficiaryStats
}
