// Float Types
export interface Float {
    id: number
    uuid: string
    agentId: number
    companyId: number
    amount: number
    type: string // 'main' | 'commission' | 'expense'
    status: string // 'active' | 'suspended' | 'closed'
    configuration: string // 'percentage' | 'fixed'
    commissionPercentage?: number
    commissionAmount?: number
    balance: number
    lastTransactionDate?: string
    createdAt: string
    updatedAt: string
    agent?: {
        id: number
        fullName: string
        phoneNumber: string
    }
    company?: {
        id: number
        name: string
    }
    transactions?: FloatTransaction[]
}

export interface FloatTransaction {
    id: number
    uuid: string
    floatId: number
    type: string // 'credit' | 'debit'
    category: string // 'deposit' | 'withdrawal' | 'commission' | 'expense' | 'transfer'
    amount: number
    balance: number
    description?: string
    reference?: string
    parcelId?: number
    createdBy: number
    createdAt: string
    updatedAt: string
    float?: {
        id: number
        agent?: {
            id: number
            fullName: string
        }
    }
    parcel?: {
        id: number
        trackingNumber: string
    }
    createdByUser?: {
        id: number
        fullName: string
    }
}

export interface FloatFilters {
    agent_id?: number
    company_id?: number
    type?: string
    status?: string
    configuration?: string
    paginate?: boolean
    page?: number
    per_page?: number
}

export interface FloatTransactionFilters {
    float_id?: number
    agent_id?: number
    company_id?: number
    type?: string
    category?: string
    date_from?: string
    date_to?: string
    paginate?: boolean
    page?: number
    per_page?: number
}

export interface CreateFloatData {
    agentId: number
    companyId: number
    amount: number
    type: string
    status: string
    configuration: string
    commissionPercentage?: number
    commissionAmount?: number
}

export interface UpdateFloatData extends Partial<CreateFloatData> {}

export interface CreateFloatTransactionData {
    floatId: number
    type: string
    category: string
    amount: number
    description?: string
    reference?: string
    parcelId?: number
}

export interface FloatResponse {
    data: Float[]
    meta?: {
        current_page: number
        from: number
        last_page: number
        path: string
        per_page: number
        to: number
        total: number
    }
}

export interface FloatTransactionResponse {
    data: FloatTransaction[]
    meta?: {
        current_page: number
        from: number
        last_page: number
        path: string
        per_page: number
        to: number
        total: number
    }
}

// Financial Reports
export interface FinancialSummary {
    totalFloats: number
    totalBalance: number
    totalTransactions: number
    totalCommissions: number
    totalExpenses: number
    activeFloats: number
    suspendedFloats: number
}

export interface FloatStatement {
    floatId: number
    agentName: string
    openingBalance: number
    totalCredits: number
    totalDebits: number
    closingBalance: number
    transactions: FloatTransaction[]
}

export interface CommissionReport {
    agentId: number
    agentName: string
    totalParcels: number
    totalRevenue: number
    totalCommission: number
    commissionPercentage: number
    period: string
}
