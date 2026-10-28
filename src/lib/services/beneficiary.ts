import { apiRequest } from "@/lib/constants"

// The backend's date-filtered/dated endpoints consistently expect DD-MM-YYYY
// (confirmed against the API collection), not ISO — convert at the boundary.
function toBackendDate(dateString: string): string {
    const date = new Date(dateString)
    const day = String(date.getUTCDate()).padStart(2, "0")
    const month = String(date.getUTCMonth() + 1).padStart(2, "0")
    const year = date.getUTCFullYear()
    return `${day}-${month}-${year}`
}

export interface Beneficiary {
    id: number
    name: string
    description?: string
    deduction_amount: number | string
    deduction_frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
    start_date: string
    end_date?: string
    status: string
    is_active: boolean
    total_deducted?: string
    deduction_count?: number
    last_deduction_date?: string
    next_deduction_date?: string
    failed_deductions?: number
    user_id?: number
    metadata?: any
    created_at: string
    updated_at: string
    overdue_count?: number
    User?: {
        id: number
        fullName: string
        phoneNumber: string
        floatAccountNumber?: string
    }
    beneficiary_transactions?: any[]
}

export interface CreateBeneficiaryData {
    name: string
    description?: string
    deductionAmount: number
    deductionFrequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
    startDate: string
    endDate?: string
}

export interface GetBeneficiariesParams {
    status?: string
    frequency?: string
    search?: string
    page?: number
    limit?: number
    all?: boolean
}

/**
 * Create a new beneficiary
 */
export async function createBeneficiary(data: CreateBeneficiaryData): Promise<Beneficiary> {
    console.log("[Beneficiary] Creating beneficiary with data:", data)

    // The backend expects camelCase fields and DD-MM-YYYY dates — the
    // previous snake_case/ISO payload never matched what it accepts.
    const payload = {
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        deductionAmount: Number(data.deductionAmount),
        deductionFrequency: data.deductionFrequency,
        startDate: toBackendDate(data.startDate),
        endDate: data.endDate ? toBackendDate(data.endDate) : undefined,
    }

    console.log("[Beneficiary] Formatted payload:", payload)

    if (payload.endDate) {
        const start = new Date(data.startDate)
        const end = new Date(data.endDate!)

        if (end <= start) {
            throw new Error("End date must be after start date")
        }
    }

    try {
        const result = await apiRequest("/api/beneficiary", {
            method: "POST",
            body: JSON.stringify(payload),
        })

        console.log("✅ Beneficiary created successfully")
        return result
    } catch (error) {
        console.error("❌ Error creating beneficiary:", error)
        throw error
    }
}

/**
 * Get all beneficiaries (admin endpoint)
 */
export async function getBeneficiaries(params: GetBeneficiariesParams = {}) {
    console.log("[Beneficiary] Fetching beneficiaries with params:", params)

    const queryParams = new URLSearchParams()

    if (params.status) queryParams.append("status", params.status)
    if (params.frequency) queryParams.append("frequency", params.frequency)
    if (params.search) queryParams.append("search", params.search)
    if (params.page) queryParams.append("page", params.page.toString())
    if (params.limit) queryParams.append("limit", params.limit.toString())
    if (params.all) queryParams.append("all", "true")

    // The list-everything endpoint is /admin/all, not the bare resource path
    // (which is reserved for single-beneficiary lookup by ID).
    const endpoint = `/api/beneficiary/admin/all${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Beneficiaries fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching beneficiaries:", error)
        throw error
    }
}

/**
 * Get a single beneficiary by ID
 */
export async function getBeneficiary(id: number): Promise<Beneficiary> {
    console.log("[Beneficiary] Fetching beneficiary:", id)

    try {
        const result = await apiRequest(`/api/beneficiary/${id}`)
        console.log("✅ Beneficiary fetched successfully")
        return result
    } catch (error) {
        console.error(`❌ Error fetching beneficiary ${id}:`, error)
        throw error
    }
}

/**
 * Update a beneficiary
 */
export async function updateBeneficiary(
    id: number,
    data: Partial<CreateBeneficiaryData>
): Promise<Beneficiary> {
    console.log("[Beneficiary] Updating beneficiary:", id, data)

    // Same camelCase/DD-MM-YYYY contract as createBeneficiary.
    const payload: any = {}

    if (data.name) payload.name = data.name.trim()
    if (data.description !== undefined) payload.description = data.description?.trim() || undefined
    if (data.deductionAmount) payload.deductionAmount = Number(data.deductionAmount)
    if (data.deductionFrequency) payload.deductionFrequency = data.deductionFrequency
    if (data.startDate) payload.startDate = toBackendDate(data.startDate)
    if (data.endDate) payload.endDate = toBackendDate(data.endDate)

    console.log("[Beneficiary] Formatted update payload:", payload)

    if (data.startDate && data.endDate) {
        const start = new Date(data.startDate)
        const end = new Date(data.endDate)

        if (end <= start) {
            throw new Error("End date must be after start date")
        }
    }

    try {
        const result = await apiRequest(`/api/beneficiary/${id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
        })

        console.log("✅ Beneficiary updated successfully")
        return result
    } catch (error) {
        console.error(`❌ Error updating beneficiary ${id}:`, error)
        throw error
    }
}

/**
 * Delete a beneficiary
 */
export async function deleteBeneficiary(id: number) {
    console.log("[Beneficiary] Deleting beneficiary:", id)

    try {
        const result = await apiRequest(`/api/beneficiary/${id}`, {
            method: "DELETE",
        })

        console.log("✅ Beneficiary deleted successfully")
        return result
    } catch (error) {
        console.error(`❌ Error deleting beneficiary ${id}:`, error)
        throw error
    }
}

/**
 * Toggle beneficiary active status
 */
export async function toggleBeneficiaryStatus(id: number) {
    console.log("[Beneficiary] Toggling status for beneficiary:", id)

    try {
        // Real endpoint is /:id/toggle-status (not /:id/status), and it
        // takes no body — the backend flips the current status itself.
        // Neither existing caller ever passed an isActive value anyway.
        const result = await apiRequest(`/api/beneficiary/${id}/toggle-status`, {
            method: "PATCH",
        })

        console.log("✅ Beneficiary status toggled successfully")
        return result
    } catch (error) {
        console.error(`❌ Error toggling beneficiary ${id} status:`, error)
        throw error
    }
}

/**
 * Assign a beneficiary to a user
 */
export async function assignBeneficiaryToUser(beneficiaryId: number, userId: number) {
    console.log("[Beneficiary] Assigning beneficiary to user:", beneficiaryId, "->", userId)

    try {
        const result = await apiRequest(`/api/beneficiary/${beneficiaryId}/assign`, {
            method: "POST",
            body: JSON.stringify({ userId }),
        })

        console.log("✅ Beneficiary assigned successfully")
        return result
    } catch (error) {
        console.error(`❌ Error assigning beneficiary ${beneficiaryId} to user ${userId}:`, error)
        throw error
    }
}

/**
 * Get beneficiary statistics
 */
export async function getBeneficiaryStats() {
    // GET /beneficiary/stats — counts and totals over every beneficiary.
    // Failures propagate so the page shows an error instead of zeros.
    return apiRequest("/api/beneficiary/stats", { silent: true })
}
/**
 * All beneficiaries (no userId) or one agent's beneficiaries (userId), read
 * page by page (the backend caps pages at 100). Used by the agent's
 * beneficiary-assignment tab; returns { data } like the paged endpoints.
 */
export async function getMyBeneficiaries(params: { userId?: number; paginate?: boolean } = {}) {
    const base = params.userId ? `/api/beneficiary/user/${params.userId}` : "/api/beneficiary/admin/all"
    const rows: any[] = []
    for (let page = 1; page <= 10; page++) {
        const result: any = await apiRequest(`${base}?page=${page}&limit=100`, { silent: true })
        const batch = result?.data ?? result?.beneficiaries ?? []
        rows.push(...(Array.isArray(batch) ? batch : []))
        const pages = Number(result?.pagination?.pages ?? result?.pagination?.totalPages) || 1
        if (page >= pages || !Array.isArray(batch) || batch.length < 100) break
    }
    return { success: true, data: rows }
}
