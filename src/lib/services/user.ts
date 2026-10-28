import { apiRequest } from "@/lib/constants"
import { safeStorage } from "@/lib/safe-storage"
import type {
    CreateUserData,
    CreateAgentData as CreateAgentDataType,
    CreateUserResponse,
    FloatConfigurationData,
} from "@/types/user"
import type { Company } from "@/types/company"
import type { User } from "@/types/user"
import { handleTokenInvalidation, isAuthError } from "@/lib/auth-handler"
import { storeUserData } from "@/lib/auth"

// The backend only accepts phone numbers as bare digits starting with a
// country code (255 for Tanzania, 254 for Kenya) — no leading "+". The UI's
// CountryCodePicker always produces a "+255..." value, which the backend
// rejects outright ("Phone number must start with one of the following
// country codes: 255, 254"). Normalize at the API boundary so every caller
// can keep working with whatever format the form gives it.
function normalizePhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return phoneNumber
    const cleanPhone = phoneNumber.replace(/\D/g, "")

    if ((cleanPhone.startsWith("255") || cleanPhone.startsWith("254")) && cleanPhone.length === 12) {
        return cleanPhone
    }
    if (cleanPhone.startsWith("0") && cleanPhone.length === 10) {
        return "255" + cleanPhone.substring(1)
    }
    if (cleanPhone.length === 9) {
        return "255" + cleanPhone
    }
    return cleanPhone || phoneNumber
}

export interface GetUsersParams {
    company_id?: number
    role?: string
    is_active?: boolean
    is_using_float?: boolean
    search?: string
    paginate?: boolean
    page?: number
    per_page?: number
    limit?: number
    all?: boolean
}

interface UpdateUserPayload {
    first_name?: string
    last_name?: string
    email?: string
    phone_number?: string
    id_number?: string
    type?: string
    company_id?: number
    password?: string
    password_confirmation?: string
    is_active?: boolean
    use_float?: boolean
    otp?: string
    role?: number
    gender?: string
}

// Helper function to extract and normalize company data from various API responses
function extractCompaniesFromResponse(data: any): Company[] {
    let companies = []
    if (Array.isArray(data)) {
        companies = data
    } else if (data.data && Array.isArray(data.data)) {
        companies = data.data
    } else if (data.companies && Array.isArray(data.companies)) {
        companies = data.companies
    } else if (data.success && data.data && Array.isArray(data.data)) {
        companies = data.data
    } else if (data.results && Array.isArray(data.results)) {
        companies = data.results
    } else {
        console.warn(`⚠️ Unexpected companies response structure:`, data)
        return []
    }

    // Validate and normalize company data
    const normalizedCompanies = companies
        .filter((company: any) => company && (company.id || company._id) && company.name)
        .map((company: any) => ({
            id: company.id || company._id,
            name: company.name || company.companyName || company.title,
            ...(company.description && { description: company.description }),
            ...(company.email && { email: company.email }),
            ...(company.phone && { phone: company.phone }),
            ...(company.address && { address: company.address }),
            ...(company.isActive !== undefined && { isActive: company.isActive }),
        }))
    return normalizedCompanies
}

/**
 * Get all companies - Enhanced to fetch all companies using multiple strategies
 */
export async function getCompanies(): Promise<Company[]> {
    console.log("[User] Fetching all companies")

    // Endpoints that might support 'all' or large 'per_page'
    const directAllEndpoints = [
        "/api/companies?all=true",
        "/api/auth/companies?all=true",
        "/api/admin/companies?all=true",
        "/api/companies?per_page=10000",
        "/api/auth/companies?per_page=10000",
        "/api/admin/companies?per_page=10000",
        "/api/companies/all",
    ]

    let lastError: Error | null = null

    // Attempt direct 'all' endpoints first
    for (const endpoint of directAllEndpoints) {
        try {
            console.log(`[User] Trying companies endpoint: ${endpoint}`)
            const result = await apiRequest(endpoint)
            const companies = extractCompaniesFromResponse(result)

            if (companies.length > 0) {
                console.log(`✅ Successfully fetched ${companies.length} companies`)
                return companies
            }
        } catch (error) {
            console.log(`[User] Endpoint ${endpoint} failed:`, error)
            lastError = error as Error
            continue
        }
    }

    // Fallback to paginated fetching if direct 'all' endpoints fail
    console.log("[User] Trying paginated fallback for companies")
    let allCompanies: Company[] = []
    let currentPage = 1
    let hasMorePages = true
    const maxPages = 100
    const perPage = 100

    while (hasMorePages && currentPage <= maxPages) {
        try {
            const paginatedEndpoint = `/api/companies?page=${currentPage}&per_page=${perPage}`
            const result = await apiRequest(paginatedEndpoint)
            const pageCompanies = extractCompaniesFromResponse(result)

            if (pageCompanies.length === 0) {
                hasMorePages = false
                break
            }

            allCompanies = [...allCompanies, ...pageCompanies]
            hasMorePages = pageCompanies.length === perPage
            currentPage++
        } catch (error) {
            console.error(`[User] Failed to fetch companies page ${currentPage}:`, error)
            break
        }
    }

    if (allCompanies.length > 0) {
        console.log(`✅ Pagination complete: Got ${allCompanies.length} total companies`)
        return allCompanies
    }

    // Final fallback: try to get companies from users endpoint
    console.log("[User] Trying to extract companies from users data")
    try {
        const usersResult = await getUsers({ all: true })
        let users = []

        if (Array.isArray(usersResult)) {
            users = usersResult
        } else if (usersResult.data && Array.isArray(usersResult.data)) {
            users = usersResult.data
        } else if (usersResult.users && Array.isArray(usersResult.users)) {
            users = usersResult.users
        }

        const companiesFromUsers = new Map()
        users.forEach((user: any) => {
            if (user.company && user.company.id && user.company.name) {
                companiesFromUsers.set(user.company.id, {
                    id: user.company.id,
                    name: user.company.name,
                })
            } else if (user.companyId && user.companyName) {
                companiesFromUsers.set(user.companyId, {
                    id: user.companyId,
                    name: user.companyName,
                })
            }
        })

        const fallbackCompanies = Array.from(companiesFromUsers.values())

        if (fallbackCompanies.length > 0) {
            console.log(`✅ Fallback: Found ${fallbackCompanies.length} companies from users data`)
            return fallbackCompanies
        }
    } catch (fallbackError) {
        console.error("❌ Fallback method (from users) also failed:", fallbackError)
    }

    // If everything failed, return mock data for development
    console.warn("⚠️ All methods failed, returning mock companies for development")
    const mockCompanies = [
        { id: 1, name: "Default Company" },
        { id: 2, name: "Test Transport Co." },
        { id: 3, name: "Sample Logistics Ltd." },
    ]

    return mockCompanies
}

/**
 * Get all users with optional filtering
 */
export async function getUsers(params: GetUsersParams = {}) {
    console.log("[User] Fetching users with params:", params)

    const queryParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            if (key === "all" && value === true) {
                queryParams.append("all", "true")
            } else if (key === "include_inactive" && value === true) {
                queryParams.append("include_inactive", "true")
            } else if (key === "search" && value) {
                queryParams.append("search", value.toString())
                queryParams.append("q", value.toString())
                queryParams.append("query", value.toString())
            } else if (key === "per_page" || key === "limit") {
                queryParams.append("per_page", value.toString())
                queryParams.append("limit", value.toString())
            } else if (key === "company_id" && value) {
                queryParams.append("company_id", value.toString())
                queryParams.append("companyId", value.toString())
            } else {
                queryParams.append(key, value.toString())
            }
        }
    })

    const endpoint = `/api/auth/users${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Users fetched successfully")
        
        // Normalize response to { data, pagination } — ULTRA ROBUST
        let data = []
        if (Array.isArray(result)) {
            data = result
        } else if (result.data) {
            if (Array.isArray(result.data)) {
                data = result.data
            } else if (Array.isArray(result.data.users)) {
                data = result.data.users
            } else if (Array.isArray(result.data.agents)) {
                data = result.data.agents
            } else if (Array.isArray(result.data.data)) {
                data = result.data.data
            }
        } else if (Array.isArray(result.users)) {
            data = result.users
        } else if (Array.isArray(result.agents)) {
            data = result.agents
        }

        const rawPagination = result.pagination || result.meta?.pagination || result.data?.pagination || result.data?.meta?.pagination || {}
        const pagination = {
            currentPage: rawPagination.current_page || rawPagination.currentPage || params.page || 1,
            totalPages: rawPagination.total_pages || rawPagination.totalPages || 1,
            totalItems: rawPagination.total || rawPagination.totalItems || result.total || result.totalItems || data.length,
            perPage: rawPagination.per_page || rawPagination.perPage || params.per_page || params.limit || data.length,
        }

        return { data, pagination, success: true }
    } catch (error) {
        console.error("❌ Error fetching users:", error)
        return { data: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, perPage: 10 }, success: false }
    }
}

/**
 * Get total agent count for a specific company
 */
export async function getCompanyAgentCount(companyId: number): Promise<number> {
    try {
        const result = await getUsers({ company_id: companyId, role: "AGENT", per_page: 1, paginate: true })
        // Check standard paginated response shape
        return (
            result?.pagination?.totalItems ??
            result?.data?.pagination?.total ??
            result?.total ??
            (Array.isArray(result?.data) ? result.data.length : 0)
        )
    } catch {
        return 0
    }
}

/**
 * Get all admins with optional filtering
 */
export async function getAdmins(params: GetUsersParams = {}) {
    console.log("[User] Fetching admins with params:", params)

    const queryParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            if (key === "all" && value === true) {
                queryParams.append("all", "true")
            } else if (key === "search" && value) {
                queryParams.append("search", value.toString())
                queryParams.append("q", value.toString())
                queryParams.append("query", value.toString())
            } else if (key === "per_page") {
                queryParams.append("per_page", value.toString())
            } else if (key === "limit") {
                queryParams.append("per_page", value.toString())
            } else if (key === "company_id" && value) {
                queryParams.append("company_id", value.toString())
                queryParams.append("companyId", value.toString())
            } else {
                queryParams.append(key, value.toString())
            }
        }
    })

    const endpoint = `/api/auth/admin/users${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Admins fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching admins:", error)
        throw error
    }
}

/**
 * Get user by ID - Enhanced to properly fetch floatSettings
 */
export async function getUser(id: number) {
    console.log("[User] Fetching user:", id)

    try {
        const result = await apiRequest(`/api/auth/users/${id}`)

        // Handle different response structures
        let userData = null

        if (result.user) {
            userData = result.user
        } else if (result.agent) {
            userData = result.agent
        } else if (result.data) {
            userData = result.data
        } else if (result.id) {
            userData = result
        }

        if (!userData) {
            throw new Error("User data not found in response")
        }

        // Ensure floatSettings is properly structured
        if (!userData.floatSettings) {
            userData.floatSettings = {
                floatType: userData.defaultFloatType || null,
                configurationType: userData.defaultFloatConfigurationType || null,
                commissionPercentage: userData.defaultCommissionPercentage || null,
                commissionAmount: userData.defaultCommissionAmount || null,
                mainPoolId: userData.defaultMainPoolId || null,
            }
        }

        console.log("✅ User fetched successfully")
        return userData
    } catch (error) {
        console.error(`❌ Error fetching user ${id}:`, error)
        throw error
    }
}

/**
 * Get users by role - Enhanced function
 */
export async function getUsersByRole(role: string) {
    console.log("[User] Fetching users with role:", role)

    try {
        // Try multiple approaches to get users by role
        const approaches = [
            () => getUsers({ role: role }),
            () => getUsers({ role: role.toUpperCase() }),
            () => getUsers({ role: role.toLowerCase() }),
            () => apiRequest(`/api/auth/users/role/${role}`),
            () => apiRequest(`/api/auth/users?role=${role}`),
            () => apiRequest(`/api/users/by-role/${role}`),
        ]

        for (const approach of approaches) {
            try {
                const result = await approach()

                let users = []
                if (Array.isArray(result)) {
                    users = result
                } else if (result.data && Array.isArray(result.data)) {
                    users = result.data
                } else if (result.users && Array.isArray(result.users)) {
                    users = result.users
                }

                const filteredUsers = users.filter((user: any) => {
                    const userRole = user.role || user.roles?.[0] || user.userRole
                    return userRole && userRole.toLowerCase().includes(role.toLowerCase())
                })

                if (filteredUsers.length > 0) {
                    console.log(`✅ Found ${filteredUsers.length} users with role ${role}`)
                    return filteredUsers
                }
            } catch (error) {
                continue
            }
        }

        // If no specific role endpoint works, get all users and filter
        const allUsers = await getUsers({ all: true })

        let users = []
        if (Array.isArray(allUsers)) {
            users = allUsers
        } else if (allUsers.data && Array.isArray(allUsers.data)) {
            users = allUsers.data
        } else if (allUsers.users && Array.isArray(allUsers.users)) {
            users = allUsers.users
        }

        const roleFilteredUsers = users.filter((user: any) => {
            const userRole = user.role || user.roles?.[0] || user.userRole
            return userRole && userRole.toLowerCase().includes(role.toLowerCase())
        })

        console.log(`✅ Filtered ${roleFilteredUsers.length} users with role ${role}`)
        return roleFilteredUsers
    } catch (error) {
        console.error(`❌ Error fetching users by role ${role}:`, error)
        return []
    }
}

/**
 * Create a new agent with comprehensive configuration
 */
export async function createAgent(data: CreateAgentDataType): Promise<CreateUserResponse> {
    console.log("[User] Creating agent with data:", data)

    // Validate required fields
    if (!data.fullName?.trim()) throw new Error("Full name is required")
    if (!data.phoneNumber?.trim()) throw new Error("Phone number is required")
    if (!data.companyId) throw new Error("Company ID is required")
    if (!data.gender) throw new Error("Gender is required")

    // Handle roles
    let processedRoles: string[]

    if (Array.isArray(data.roles)) {
        processedRoles = data.roles.filter((role) => role && role.trim())
    } else if (typeof data.roles === "string" && data.roles.trim()) {
        processedRoles = [data.roles.trim()]
    } else {
        processedRoles = ["AGENT"]
    }

    const validBackendRoles = ["AGENT", "SUPER_AGENT", "TRIP_AGENT", "agent", "super_agent", "trip_agent"]

    const validatedRoles = processedRoles.map((role) => {
        const upperRole = role.toUpperCase()
        if (validBackendRoles.includes(role) || validBackendRoles.includes(upperRole)) {
            return upperRole
        }
        console.warn(`Unknown role: ${role}, defaulting to AGENT`)
        return "AGENT"
    })

    // Build payload
    const payload: any = {
        fullName: data.fullName.trim(),
        phoneNumber: normalizePhoneNumber(data.phoneNumber.trim()),
        email: data.email?.trim() || undefined,
        companyId: Number(data.companyId),
        roles: validatedRoles,
        gender: data.gender.toUpperCase(),
        enableFloat: data.enableFloat || false,
    }

    if (data.username?.trim()) payload.username = data.username.trim()

    // Handle region assignments
    if (data.userRegions && data.userRegions.length > 0) {
        payload.userRegions = data.userRegions
    } else if (data.regionId) {
        payload.userRegions = [{ regionId: Number(data.regionId), isPrimary: true, isActive: true }]
    }

    // Handle office assignments
    if (data.userOffices && data.userOffices.length > 0) {
        payload.userOffices = data.userOffices
    } else if (data.bookingOfficeId) {
        payload.userOffices = [{ officeId: Number(data.bookingOfficeId), isPrimary: true, isActive: true }]
    }

    // Handle beneficiary assignments
    if (data.beneficiaryIds && data.beneficiaryIds.length > 0) {
        payload.beneficiaryIds = data.beneficiaryIds
    }

    // Handle float configuration
    if (data.enableFloat) {
        payload.floatType = data.floatType || "INDIVIDUAL"
        payload.configurationType = data.configurationType || "FULL_AMOUNT"

        if (data.floatType === "POOL_LINKED" && data.mainPoolId) {
            payload.mainPoolId = Number(data.mainPoolId)
        }

        if (data.configurationType === "COMMISSION_BASED") {
            payload.commissionType = data.commissionType
            if (data.commissionType === "PERCENTAGE" && data.commissionPercentage !== undefined) {
                payload.commissionPercentage = Number(data.commissionPercentage)
            } else if (data.commissionType === "AMOUNT" && data.commissionAmount !== undefined) {
                payload.commissionAmount = Number(data.commissionAmount)
            }
        }
    }

    // Try different endpoints
    const endpoints = [
        "/api/auth/admin/register-user",
        "/api/auth/admin/register-agent",
        "/api/auth/agents/create",
    ]

    let lastError: Error | null = null

    for (const endpoint of endpoints) {
        try {
            const result = await apiRequest(endpoint, {
                method: "POST",
                body: JSON.stringify(payload),
            })
            console.log("✅ Agent created successfully")
            return result
        } catch (error) {
            lastError = error as Error
            continue
        }
    }

    throw lastError || new Error("Failed to create agent")
}

/**
 * Create a new user with comprehensive configuration
 */
export async function createUser(data: CreateUserData): Promise<CreateUserResponse> {
    console.log("[User] Creating user with data:", data)

    // Enhanced role processing
    let roleValue: string
    if (Array.isArray(data.role)) {
        roleValue = data.role[0] || "AGENT"
    } else if (data.role) {
        roleValue = data.role
    } else if (data.roles) {
        roleValue = Array.isArray(data.roles) ? data.roles[0] : data.roles
    } else {
        roleValue = "AGENT"
    }

    // Validate role enum
    const validRoles = ["SUPER_AGENT", "AGENT", "TRIP_AGENT"]
    if (!roleValue || typeof roleValue !== "string" || !validRoles.includes(roleValue)) {
        throw new Error(`Invalid role: ${roleValue}. Must be one of: ${validRoles.join(", ")}`)
    }

    // Build the payload
    const payload: any = {
        fullName: data.fullName.trim(),
        phoneNumber: normalizePhoneNumber(data.phoneNumber.trim()),
        email: data.email?.trim() || undefined,
        companyId: Number(data.companyId),
        roles: [roleValue],
        gender: data.gender?.toUpperCase() || "MALE",
        enableFloat: data.enableFloat || data.isUsingFloat || false,
    }

    if (data.username?.trim()) payload.username = data.username.trim()

    // Handle region assignments
    if (data.userRegions && data.userRegions.length > 0) {
        payload.userRegions = data.userRegions
    } else if (data.regionId) {
        payload.userRegions = [{ regionId: Number(data.regionId), isPrimary: true, isActive: true }]
    }

    // Handle office assignments
    if (data.userOffices && data.userOffices.length > 0) {
        payload.userOffices = data.userOffices
    } else if (data.bookingOfficeId) {
        payload.userOffices = [{ officeId: Number(data.bookingOfficeId), isPrimary: true, isActive: true }]
    }

    // Handle beneficiary assignments
    if (data.beneficiaryIds && data.beneficiaryIds.length > 0) {
        payload.beneficiaryIds = data.beneficiaryIds
    }

    // Handle float configuration if enabled
    if (data.enableFloat || data.isUsingFloat) {
        payload.floatType = data.floatType || "INDIVIDUAL"
        payload.configurationType = data.configurationType || "FULL_AMOUNT"

        if (data.floatType === "POOL_LINKED" && data.mainPoolId) {
            payload.mainPoolId = Number(data.mainPoolId)
        }

        if (data.configurationType === "COMMISSION_BASED") {
            payload.commissionType = data.commissionType
            if (data.commissionType === "PERCENTAGE" && data.commissionPercentage !== undefined) {
                payload.commissionPercentage = Number(data.commissionPercentage)
            } else if (data.commissionType === "AMOUNT" && data.commissionAmount !== undefined) {
                payload.commissionAmount = Number(data.commissionAmount)
            }
        }
    }

    try {
        const result = await apiRequest("/api/auth/admin/register-user", {
            method: "POST",
            body: JSON.stringify(payload),
        })
        console.log("✅ User created successfully")
        return result
    } catch (error) {
        console.error("❌ Create user failed:", error)
        throw error
    }
}

/**
 * Get all admin-role accounts (ADMIN, OPS, or OWNER — the database's
 * AdminRole enum). Hits the dedicated /admins endpoint, not the generic
 * /users list — this is a separate resource from field/booking agents.
 *
 * Named distinctly from the older `getAdmins` above (which hits a
 * different, unverified `/admin/users` endpoint and is still used by
 * ops/bus-owners) to avoid colliding with an existing export.
 */
export interface GetAdminAccountsParams {
    isActive?: boolean
    sortBy?: string
    sortOrder?: "asc" | "desc"
    page?: number
    limit?: number
}

export async function getAdminAccounts(params: GetAdminAccountsParams = {}): Promise<{ data: User[]; meta?: any }> {
    console.log("[User] Fetching admin accounts:", params)

    const queryParams = new URLSearchParams()
    if (params.isActive !== undefined) queryParams.append("isActive", String(params.isActive))
    queryParams.append("sortBy", params.sortBy || "createdAt")
    queryParams.append("sortOrder", params.sortOrder || "desc")
    if (params.page) queryParams.append("page", String(params.page))
    if (params.limit) queryParams.append("limit", String(params.limit))

    try {
        const result = await apiRequest(`/api/auth/admins?${queryParams.toString()}`)

        if (Array.isArray(result)) {
            return { data: result }
        } else if (result?.data && Array.isArray(result.data)) {
            return { data: result.data, meta: result.meta }
        } else if (result?.admins && Array.isArray(result.admins)) {
            return { data: result.admins, meta: result.meta }
        }

        console.warn("⚠️ Unexpected admins response structure:", result)
        return { data: [] }
    } catch (error) {
        console.error("❌ Error fetching admins:", error)
        throw error
    }
}

/**
 * Create a new admin-role account — ADMIN, OPS, or OWNER (the database's
 * AdminRole enum). All three share the same /admin/register endpoint;
 * only the role (and whether a company is attached) differs. OWNER
 * accounts are expected to carry a companyId; ADMIN and OPS generally don't.
 */
export async function createAdmin(data: {
    fullName: string
    username: string
    email?: string
    phoneNumber: string
    password: string
    role?: "ADMIN" | "OPS" | "OWNER"
    companyId?: string | number
    isFirstLogin?: boolean
}): Promise<any> {
    console.log("[User] Creating admin-role account with data:", { ...data, password: "••••••" })

    const payload: any = {
        fullName: data.fullName.trim(),
        username: data.username.trim(),
        phoneNumber: normalizePhoneNumber(data.phoneNumber.trim()),
        email: data.email?.trim() || undefined,
        password: data.password,
        role: data.role || "ADMIN",
        isFirstLogin: data.isFirstLogin ?? true,
    }
    if (data.companyId !== undefined && data.companyId !== "") {
        payload.companyId = Number(data.companyId)
    }

    try {
        const result = await apiRequest("/api/auth/admin/register", {
            method: "POST",
            body: JSON.stringify(payload),
        })
        console.log("✅ Admin-role account created successfully")
        return result
    } catch (error) {
        console.error("❌ Create admin-role account failed:", error)
        throw error
    }
}

/**
 * Register a new Company Owner (Biz portal account).
 * Thin, backward-compatible wrapper around `createAdmin` with role
 * hardcoded to "OWNER" — kept for existing callers of this name.
 */
export async function registerAdmin(data: {
    fullName: string
    username: string
    email?: string
    phoneNumber: string
    password?: string
    companyId: string | number
    isFirstLogin?: boolean
}): Promise<any> {
    return createAdmin({
        ...data,
        password: data.password || "",
        role: "OWNER",
    })
}

/**
 * Get user profile
 */
export async function getUserProfile() {
    console.log("[User] Fetching current user profile")

    try {
        const userId = safeStorage.getItem("user_id")

        if (!userId) {
            throw new Error("User ID not found. Please log in again.")
        }

        const result = await apiRequest(`/api/auth/users/profile?userId=${userId}`, {
            method: "GET",
        })

        // Handle different response structures
        if (result.success && result.user) {
            console.log("✅ User profile fetched successfully")
            return result
        } else if (result.user) {
            return { success: true, user: result.user }
        } else if (result.data) {
            return { success: true, user: result.data }
        } else if (result.id) {
            return { success: true, user: result }
        } else {
            throw new Error(result.message || "Failed to fetch user profile")
        }
    } catch (error) {
        console.error("❌ Error fetching user profile:", error)
        throw error
    }
}

/**
 * Update user profile
 */
export async function updateUserProfile(profileData: {
    fullName?: string
    username?: string
    email?: string
    phoneNumber?: string
    uuid?: string
}) {
    console.log("[User] Updating user profile:", profileData)

    try {
        const userId = safeStorage.getItem("user_id")

        if (!userId) {
            throw new Error("User ID not found. Please log in again.")
        }

        // Split fullName into first and last name for backend compatibility
        const nameParts = (profileData.fullName || "").trim().split(/\s+/)
        const first_name = nameParts[0] || ""
        const last_name = nameParts.slice(1).join(" ") || ""

        // Use UUID as the primary identifier if available, otherwise fallback to integer ID
        const identifier = profileData.uuid || userId

        const result = await apiRequest(`/api/auth/users/profile?userId=${identifier}`, {
            method: "PUT",
            body: JSON.stringify({
                ...profileData,
                id: Number(userId),
                userId: identifier, // Try sending UUID here if available
                user_id: Number(userId),
                first_name,
                last_name,
                full_name: profileData.fullName,
                phone_number: profileData.phoneNumber
            }),
        })

        if (result.success || result.user) {
            const updatedUser = result.user || result.data || result
            console.log("✅ Profile updated successfully, syncing local state")
            
            // Reflect changes across the system by updating local storage
            if (updatedUser && typeof updatedUser === 'object') {
                storeUserData(updatedUser)
            }
            
            return result
        } else {
            throw new Error(result.message || "Failed to update profile")
        }
    } catch (error) {
        console.error("❌ Error updating profile:", error)
        throw error
    }
}

/**
 * Reset agent password (requires ops privileges)
 */
export async function resetAgentPassword(userId: number) {
    console.log("[User] Resetting agent password for ID:", userId)

    try {
        const result = await apiRequest("/api/auth/users/reset-password", {
            method: "POST",
            body: JSON.stringify({ userId }),
        })

        console.log("✅ Password reset successfully")
        return result
    } catch (error) {
        console.error("❌ Error resetting password:", error)
        throw error
    }
}

/**
 * Reset a bus owner's password. Owners live in the admin table, so they use
 * their own endpoint (ADMIN and OPS only; returns temporaryPassword).
 */
export async function resetOwnerPassword(adminId: number) {
    return apiRequest(`/api/auth/admins/${adminId}/reset-password`, { method: "POST" })
}

/**
 * Staff accounts (admin table: admins, OPS, owners). Never use the /users/*
 * endpoints for these — they act on the agents table, i.e. on whichever agent
 * shares the id. ADMIN only.
 */
export async function updateStaffAccount(
    adminId: number,
    data: { fullName?: string; username?: string; phoneNumber?: string; email?: string; companyId?: number | null },
) {
    return apiRequest(`/api/auth/admins/${adminId}`, { method: "PUT", body: JSON.stringify(data) })
}

// Refused for your own account and for the last active admin
export async function deleteStaffAccount(adminId: number) {
    return apiRequest(`/api/auth/admins/${adminId}`, { method: "DELETE" })
}

export async function setStaffAccountStatus(adminId: number, isActive: boolean) {
    return apiRequest(`/api/auth/admins/${adminId}/status`, { method: "POST", body: JSON.stringify({ isActive }) })
}

/**
 * Change user password
 */
export async function changeUserPassword(passwordData: { currentPassword: string; newPassword: string }) {
    console.log("[User] Changing user password")

    try {
        const result = await apiRequest("/api/auth/users/change-password", {
            method: "POST",
            body: JSON.stringify(passwordData),
        })

        if (result.success) {
            console.log("✅ Password changed successfully")
            return result
        } else {
            throw new Error(result.message || "Failed to change password")
        }
    } catch (error) {
        console.error("❌ Error changing password:", error)
        throw error
    }
}

/**
 * Update user with support for regions, offices, and beneficiaries
 */
export async function updateUser(id: number, data: any) {
    console.log("[User] Updating user:", id, data)

    const payload: any = {}

    if (data.fullName !== undefined) payload.fullName = data.fullName?.trim()
    if (data.username !== undefined) payload.username = data.username?.trim()
    if (data.email !== undefined) payload.email = data.email?.trim() || null
    if (data.phoneNumber !== undefined) {
        payload.phoneNumber = normalizePhoneNumber(data.phoneNumber?.trim() || "")
    }
    if (data.companyId !== undefined) payload.companyId = Number(data.companyId)
    if (data.role !== undefined) payload.role = data.role
    if (data.gender !== undefined) payload.gender = data.gender?.toUpperCase()
    if (data.isActive !== undefined) payload.isActive = Boolean(data.isActive)

    if (data.userRegions !== undefined) payload.userRegions = data.userRegions
    if (data.userOffices !== undefined) payload.userOffices = data.userOffices
    if (data.beneficiaryIds !== undefined) payload.beneficiaryIds = data.beneficiaryIds

    if (data.enableFloat !== undefined || data.isUsingFloat !== undefined) {
        payload.isUsingFloat = Boolean(data.enableFloat ?? data.isUsingFloat)
    }

    const endpoints = [`/api/auth/users/${id}`, `/api/auth/admin/users/${id}`, `/api/users/${id}`]

    let lastError: Error | null = null

    for (const endpoint of endpoints) {
        try {
            const result = await apiRequest(endpoint, {
                method: "PUT",
                body: JSON.stringify(payload),
            })
            console.log("✅ User updated successfully")
            return result
        } catch (error) {
            lastError = error as Error
            continue
        }
    }

    throw lastError || new Error(`Failed to update user ${id}`)
}

/**
 * Update user float configuration
 */
export async function updateUserFloatConfig(id: number, config: any) {
    console.log("[User] Updating float config for user:", id, config)

    const payload: any = {}

    if (config.enableFloat !== undefined) {
        payload.isUsingFloat = Boolean(config.enableFloat)
    }

    if (config.floatAccountNumber !== undefined) {
        payload.floatAccountNumber = config.floatAccountNumber
    }

    if (config.floatType && ["INDIVIDUAL", "POOL_MAIN", "POOL_LINKED"].includes(config.floatType)) {
        payload.floatType = config.floatType
    }

    if (
        config.configurationType &&
        ["FULL_AMOUNT", "COMMISSION_BASED"].includes(config.configurationType)
    ) {
        payload.configurationType = config.configurationType
    }

    if (config.configurationType === "COMMISSION_BASED") {
        if (
            config.commissionType === "PERCENTAGE" &&
            config.commissionPercentage !== null &&
            config.commissionPercentage !== undefined
        ) {
            payload.commissionPercentage = Number(config.commissionPercentage)
        } else if (
            config.commissionType === "AMOUNT" &&
            config.commissionAmount !== null &&
            config.commissionAmount !== undefined
        ) {
            payload.commissionAmount = Number(config.commissionAmount)
        }
    }

    if (
        config.floatType === "POOL_LINKED" &&
        config.mainPoolId !== null &&
        config.mainPoolId !== undefined
    ) {
        payload.mainPoolId = Number(config.mainPoolId)
    }

    const endpoint = `/api/float/user-configuration/${id}`

    try {
        const result = await apiRequest(endpoint, {
            method: "PATCH",
            body: JSON.stringify(payload),
        })
        console.log("✅ Float config updated successfully")
        return result
    } catch (error) {
        console.error("❌ Float config update failed:", error)
        throw new Error(
            `Failed to update float config. Error: ${(error as Error).message}. ` +
            `Please check if the user ID ${id} exists and you have permission to update float configuration.`
        )
    }
}

/**
 * Combined update function that handles both user and float data
 */
export async function updateUserWithFloat(id: number, data: any) {
    console.log("[User] Updating user with float config:", id, data)

    const payload: any = {}

    if (data.fullName !== undefined) payload.fullName = data.fullName?.trim()
    if (data.username !== undefined) payload.username = data.username?.trim()
    if (data.email !== undefined) payload.email = data.email?.trim() || null
    if (data.phoneNumber !== undefined)
        payload.phoneNumber = normalizePhoneNumber(data.phoneNumber?.trim() || "")
    if (data.companyId !== undefined) payload.companyId = Number(data.companyId)
    if (data.role !== undefined) payload.role = data.role
    if (data.gender !== undefined) payload.gender = data.gender?.toUpperCase()
    if (data.isActive !== undefined) payload.isActive = Boolean(data.isActive)

    if (data.enableFloat !== undefined || data.isUsingFloat !== undefined) {
        payload.isUsingFloat = Boolean(data.enableFloat ?? data.isUsingFloat)
    }

    if (data.floatAccountNumber !== undefined) {
        payload.floatAccountNumber = data.floatAccountNumber
    }

    if (data.floatType && ["INDIVIDUAL", "POOL_MAIN", "POOL_LINKED"].includes(data.floatType)) {
        payload.floatType = data.floatType
    }

    if (
        data.configurationType &&
        ["FULL_AMOUNT", "COMMISSION_BASED"].includes(data.configurationType)
    ) {
        payload.configurationType = data.configurationType
    }

    if (data.configurationType === "COMMISSION_BASED") {
        if (
            data.commissionType === "PERCENTAGE" &&
            data.commissionPercentage !== null &&
            data.commissionPercentage !== undefined
        ) {
            payload.commissionPercentage = Number(data.commissionPercentage)
        } else if (
            data.commissionType === "AMOUNT" &&
            data.commissionAmount !== null &&
            data.commissionAmount !== undefined
        ) {
            payload.commissionAmount = Number(data.commissionAmount)
        }
    }

    if (
        data.floatType === "POOL_LINKED" &&
        data.mainPoolId !== null &&
        data.mainPoolId !== undefined
    ) {
        payload.mainPoolId = Number(data.mainPoolId)
    }

    const endpoint = `/api/float/user-configuration/${id}`

    try {
        const result = await apiRequest(endpoint, {
            method: "PATCH",
            body: JSON.stringify(payload),
        })
        console.log("✅ Combined update successful")
        return result
    } catch (error) {
        console.error("❌ Combined update failed:", error)
        throw new Error(
            `Failed to update user with float config. Error: ${(error as Error).message}. ` +
            `Please check if the user ID ${id} exists and you have permission to update.`
        )
    }
}

/**
 * Delete a user
 */
export async function deleteUser(id: number) {
    console.log("[User] Permanently deleting user:", id)

    try {
        const result = await apiRequest("/api/auth/users/permanent", {
            method: "DELETE",
            body: JSON.stringify({ userId: id }),
        })
        console.log("✅ User deleted successfully")
        return result
    } catch (error) {
        console.error(`❌ Error deleting user ${id}:`, error)
        throw error
    }
}

/**
 * Activate a user
 */
export async function activateUser(id: number) {
    console.log("[User] Activating user:", id)

    try {
        const result = await apiRequest("/api/auth/users/activate", {
            method: "POST",
            body: JSON.stringify({ userId: id }),
        })
        console.log("✅ User activated successfully")
        return result
    } catch (error) {
        console.error(`❌ Error activating user ${id}:`, error)
        throw error
    }
}

/**
 * Deactivate a user
 */
export async function deactivateUser(id: number) {
    console.log("[User] Deactivating user:", id)

    try {
        const result = await apiRequest("/api/auth/users/deactivate", {
            method: "POST",
            body: JSON.stringify({ userId: id }),
        })
        console.log("✅ User deactivated successfully")
        return result
    } catch (error) {
        console.error(`❌ Error deactivating user ${id}:`, error)
        throw error
    }
}

/**
 * Reset user password
 */
export async function resetUserPassword(id: number) {
    console.log("[User] Resetting password for user:", id)

    try {
        const result = await apiRequest("/api/auth/users/reset-password", {
            method: "POST",
            body: JSON.stringify({ userId: id }),
        })
        console.log("✅ Password reset successfully")
        return result
    } catch (error) {
        console.error(`❌ Error resetting password for user ${id}:`, error)
        throw error
    }
}

/**
 * Get user's parcel operations
 */
export async function getUserParcelOperations(
    id: number,
    params: {
        page?: number
        per_page?: number
        date_from?: string
        date_to?: string
        status?: string
    } = {}
) {
    console.log("[User] Fetching parcel operations for user:", id, params)

    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            queryParams.append(key, value.toString())
        }
    })

    const endpoint = `/api/auth/users/${id}/parcel-operations${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Parcel operations fetched successfully")
        return result
    } catch (error) {
        console.error(`❌ Error fetching parcel operations for user ${id}:`, error)
        throw error
    }
}

/**
 * Get user's float transactions
 */
export async function getUserFloatTransactions(
    id: number,
    params: {
        page?: number
        per_page?: number
        date_from?: string
        date_to?: string
        transaction_type?: string
    } = {}
) {
    console.log("[User] Fetching float transactions for user:", id, params)

    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            queryParams.append(key, value.toString())
        }
    })

    const endpoint = `/api/auth/users/${id}/float-transactions${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Float transactions fetched successfully")
        return result
    } catch (error) {
        console.error(`❌ Error fetching float transactions for user ${id}:`, error)
        throw error
    }
}

/**
 * Add float to user account
 */
export async function addUserFloat(
    id: number,
    data: {
        amount: number
        description?: string
        reference?: string
    }
) {
    console.log("[User] Adding float to user:", id, data)

    try {
        const result = await apiRequest(`/api/auth/users/${id}/float/add`, {
            method: "POST",
            body: JSON.stringify(data),
        })
        console.log("✅ Float added successfully")
        return result
    } catch (error) {
        console.error(`❌ Error adding float to user ${id}:`, error)
        throw error
    }
}

/**
 * Deduct float from user account
 */
export async function deductUserFloat(
    id: number,
    data: {
        amount: number
        description?: string
        reference?: string
    }
) {
    console.log("[User] Deducting float from user:", id, data)

    try {
        const result = await apiRequest(`/api/auth/users/${id}/float/deduct`, {
            method: "POST",
            body: JSON.stringify(data),
        })
        console.log("✅ Float deducted successfully")
        return result
    } catch (error) {
        console.error(`❌ Error deducting float from user ${id}:`, error)
        throw error
    }
}

/**
 * Generate user report
 */
export async function generateUserReport(
    id: number,
    reportType: string,
    params: {
        date_from?: string
        date_to?: string
        format?: "pdf" | "excel" | "csv"
    } = {}
) {
    console.log("[User] Generating report for user:", id, reportType, params)

    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            queryParams.append(key, value.toString())
        }
    })

    const endpoint = `/api/auth/users/${id}/reports/${reportType}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ User report generated successfully")
        return result
    } catch (error) {
        console.error(`❌ Error generating report for user ${id}:`, error)
        throw error
    }
}

/**
 * Search agents using the specific API endpoint
 */
export async function searchAgentsAPI(query: string, params: any = {}) {
    console.log("[User] Searching agents with query:", query)

    if (!query || !query.trim()) {
        console.warn("⚠️ Search query is empty")
        return { data: [], total: 0 }
    }

    try {
        const queryParams = new URLSearchParams()
        queryParams.append("query", query.trim())

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "" && key !== "query") {
                queryParams.append(key, value.toString())
            }
        })

        const endpoint = `/api/auth/agents/search?${queryParams.toString()}`

        const result = await apiRequest(endpoint)

        let agents = []
        let total = 0

        if (Array.isArray(result)) {
            agents = result
            total = result.length
        } else if (result.data && Array.isArray(result.data)) {
            agents = result.data
            total = result.total || result.count || result.data.length
        } else if (result.agents && Array.isArray(result.agents)) {
            agents = result.agents
            total = result.total || result.count || result.agents.length
        } else if (result.users && Array.isArray(result.users)) {
            agents = result.users
            total = result.total || result.count || result.users.length
        } else if (result.results && Array.isArray(result.results)) {
            agents = result.results
            total = result.total || result.count || result.results.length
        }

        console.log(`✅ Found ${agents.length} agents using API endpoint`)

        return {
            data: agents,
            agents: agents,
            total: total,
            success: true,
            ...result,
        }
    } catch (error) {
        console.error("❌ API search failed:", error)
        throw error
    }
}

/**
 * Search agents (legacy - keeping for backwards compatibility)
 */
export async function searchAgents(query: string, params: any = {}) {
    console.log("[User] Searching agents (legacy) with query:", query, params)

    // First try the new specific API endpoint
    try {
        const result = await searchAgentsAPI(query, params)
        if (result && result.data && result.data.length > 0) {
            console.log("✅ Success with new API endpoint")
            return result
        }
    } catch (error) {
        console.log("⚠️ New API endpoint failed, falling back to legacy search:", error)
    }

    try {
        const queryParams = new URLSearchParams()
        queryParams.append("query", query.trim())
        queryParams.append("q", query.trim())
        queryParams.append("search", query.trim())

        Object.entries(params).forEach(([key, value]) => {
            if (
                value !== undefined &&
                value !== null &&
                value !== "" &&
                key !== "search" &&
                key !== "is_active" &&
                key !== "status"
            ) {
                queryParams.append(key, value.toString())
            }
        })

        const endpoints = [
            `/api/auth/agents/search?${queryParams.toString()}`,
            `/api/auth/users/search?${queryParams.toString()}`,
            `/api/agents/search?${queryParams.toString()}`,
            `/api/users/search?${queryParams.toString()}`,
        ]

        let lastError: Error | null = null

        for (const endpoint of endpoints) {
            try {
                const result = await apiRequest(endpoint)

                let agents = []
                if (Array.isArray(result)) {
                    agents = result
                } else if (result.data && Array.isArray(result.data)) {
                    agents = result.data
                } else if (result.users && Array.isArray(result.users)) {
                    agents = result.users
                } else if (result.agents && Array.isArray(result.agents)) {
                    agents = result.agents
                } else if (result.results && Array.isArray(result.results)) {
                    agents = result.results
                }

                if (agents.length > 0 || result.success !== false) {
                    console.log(`✅ Search successful with ${agents.length} results`)
                    return {
                        ...result,
                        data: agents,
                        agents: agents,
                        total: result.total || result.count || agents.length,
                    }
                }
            } catch (error) {
                lastError = error as Error
                continue
            }
        }

        // Fallback to regular getUsers with search
        console.log("[User] Falling back to getUsers with search parameters")
        try {
            const { is_active, status, ...filteredParams } = params
            const fallbackResult = await getUsers({
                search: query,
                ...filteredParams,
            })
            return fallbackResult
        } catch (fallbackError) {
            throw lastError || fallbackError
        }
    } catch (error) {
        console.error("❌ Search agents failed:", error)
        throw error
    }
}

/**
 * Get beneficiaries assigned to a specific user
 */
export async function getUserBeneficiaries(
    userId: number,
    params: {
        page?: number
        limit?: number
        status?: string
    } = {}
) {
    console.log("[User] Fetching beneficiaries for user:", userId, params)

    try {
        const queryParams = new URLSearchParams()

        if (params.page) queryParams.append("page", params.page.toString())
        if (params.limit) queryParams.append("limit", params.limit.toString())
        if (params.status) queryParams.append("status", params.status)

        const endpoints = [
            `/api/auth/agents/profile/${userId}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`,
            `/api/beneficiaries/user/${userId}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`,
        ]

        let lastError: Error | null = null

        for (const endpoint of endpoints) {
            try {
                const result = await apiRequest(endpoint)

                // Handle agent profile response structure
                if (result.agent && result.beneficiaries) {
                    const beneficiaries = result.beneficiaries.list || []
                    const statistics = result.beneficiaries.statistics || null
                    const summary = result.beneficiaries.summary || null
                    const transactions = result.beneficiaries.transactions || null

                    console.log(`✅ Found ${beneficiaries.length} beneficiaries for user ${userId}`)

                    return {
                        success: true,
                        data: beneficiaries,
                        beneficiaries: beneficiaries,
                        list: beneficiaries,
                        statistics: statistics,
                        summary: summary,
                        transactions: transactions,
                        total: beneficiaries.length,
                    }
                }

                // Handle direct beneficiary endpoint response
                if (result.beneficiaries) {
                    const beneficiaries = result.beneficiaries.list || []
                    const statistics = result.beneficiaries.statistics
                    const summary = result.beneficiaries.summary
                    const transactions = result.beneficiaries.transactions

                    console.log(`✅ Found ${beneficiaries.length} beneficiaries for user ${userId}`)

                    return {
                        success: true,
                        data: beneficiaries,
                        beneficiaries: beneficiaries,
                        list: beneficiaries,
                        statistics: statistics,
                        summary: summary,
                        transactions: transactions,
                        total: beneficiaries.length,
                    }
                } else if (result.list && Array.isArray(result.list)) {
                    const beneficiaries = result.list

                    return {
                        success: true,
                        data: beneficiaries,
                        beneficiaries: beneficiaries,
                        list: beneficiaries,
                        statistics: result.statistics,
                        summary: result.summary,
                        transactions: result.transactions,
                        total: beneficiaries.length,
                    }
                } else if (Array.isArray(result.data)) {
                    return {
                        success: true,
                        data: result.data,
                        beneficiaries: result.data,
                        list: result.data,
                        statistics: result.statistics,
                        summary: result.summary,
                        total: result.data.length,
                    }
                } else if (Array.isArray(result)) {
                    return {
                        success: true,
                        data: result,
                        beneficiaries: result,
                        list: result,
                        total: result.length,
                    }
                }
            } catch (error) {
                lastError = error as Error
                continue
            }
        }

        // If all endpoints fail, return empty but successful result
        console.warn(`⚠️ No beneficiaries found for user ${userId}`)
        return {
            success: true,
            data: [],
            beneficiaries: [],
            list: [],
            statistics: null,
            summary: null,
            transactions: null,
            total: 0,
        }
    } catch (error) {
        console.error(`❌ Error fetching beneficiaries for user ${userId}:`, error)
        throw error
    }
}

/**
 * Get beneficiary transactions for a specific beneficiary
 */
export async function getBeneficiaryTransactions(
    beneficiaryId: number,
    params: {
        page?: number
        limit?: number
        status?: string
    } = {}
) {
    console.log("[User] Fetching transactions for beneficiary:", beneficiaryId, params)

    try {
        const queryParams = new URLSearchParams()

        if (params.page) queryParams.append("page", params.page.toString())
        if (params.limit) queryParams.append("limit", params.limit.toString())
        if (params.status) queryParams.append("status", params.status)

        const endpoint = `/api/beneficiaries/${beneficiaryId}/transactions${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

        const result = await apiRequest(endpoint)
        console.log("✅ Beneficiary transactions fetched successfully")
        return result
    } catch (error) {
        console.error("❌ Error fetching beneficiary transactions:", error)
        throw error
    }
}

/**
 * Get all agents across all pages for overview
 */
/**
 * Fetch ALL agents for overview/analytics with high-fidelity traversal.
 * Bypasses single-page limits by manually crawling the registry.
 */
/**
 * Fetch ALL agents for overview/analytics with high-fidelity traversal.
 * Standardized to use robust API helpers and multi-layer fallback strategy.
 */
/**
 * Every agent with backend parcel counts, in one request. The search
 * endpoint honours `limit` (all 273 agents in ~7s) and its
 * parcelCounts.receivedParcels matches /auth/agents/parcels/:id exactly —
 * so per-agent page walks aren't needed for all-time volume.
 * Note sentParcels == receivedParcels (the booking agent is recorded as
 * both), so totalParcels double-counts; use receivedParcels.
 */
export async function getAllAgentsWithCounts(): Promise<User[]> {
    const response = await apiRequest("/api/auth/agents/search?page=1&limit=1000", { silent: true })
    const agents = response?.agents ?? response?.data?.agents ?? response?.data ?? []
    return Array.isArray(agents) ? agents : []
}

export async function getAllAgents(): Promise<User[]> {
    console.log("[User] Initiating global agent synchronization...")

    try {
        // First approach: Use standardized getUsers helper with comprehensive flags
        const result = await getUsers({ 
            role: "AGENT", 
            all: true, 
            include_inactive: true,
            per_page: 500 
        })

        let agents: User[] = []
        if (Array.isArray(result)) {
            agents = result
        } else if (result.data && Array.isArray(result.data)) {
            agents = result.data
        } else if (result.users && Array.isArray(result.users)) {
            agents = result.users
        }

        if (agents.length > 0) {
            console.log(`✅ Synchronization successful via primary channel: ${agents.length} agents archived`)
            return agents
        }

        // Second approach: High-fidelity manual traversal if primary fetch is restricted
        console.log("[User] Primary fetch returned no data. Initiating multi-page traversal...")
        let allAgents: User[] = []
        let currentPage = 1
        let hasMore = true
        const maxPages = 20

        while (hasMore && currentPage <= maxPages) {
            // Simplified endpoint to avoid rejection
            const endpoint = `/api/auth/users?role=AGENT&page=${currentPage}&limit=50`
            try {
                const res = await apiRequest(endpoint)
                let pageData: User[] = []
                
                if (Array.isArray(res)) pageData = res
                else if (res.data && Array.isArray(res.data)) pageData = res.data
                else if (res.users && Array.isArray(res.users)) pageData = res.users
                else if (res.agents && Array.isArray(res.agents)) pageData = res.agents

                if (pageData.length === 0) {
                    hasMore = false
                } else {
                    allAgents = [...allAgents, ...pageData]
                    if (pageData.length < 50) hasMore = false
                    else currentPage++
                }
            } catch (traversalError) {
                console.error(`[User] Traversal failed at page ${currentPage}:`, traversalError)
                hasMore = false
            }
        }

        if (allAgents.length > 0) {
            console.log(`✅ Synchronization successful via traversal: ${allAgents.length} agents archived`)
            return allAgents
        }

        // Final Fallback: try to get agents from generic users list
        console.log("[User] Attempting final fallback from general user pool...")
        const generalUsers = await apiRequest("/api/auth/users?all=true")
        const filtered = (Array.isArray(generalUsers) ? generalUsers : generalUsers.data || generalUsers.users || [])
            .filter((u: any) => String(u.role).toUpperCase().includes("AGENT"))

        console.log(`✅ Fallback complete: ${filtered.length} agents found`)
        return filtered
    } catch (error) {
        console.error("❌ Global agent synchronization failed:", error)
        // Return empty array instead of throwing to prevent crashing the Overview UI
        return []
    }
}

/**
 * Get agent profile with detailed information including floatSettings
 */
export async function getAgentProfile(agentId: number) {
    console.log("[User] Fetching agent profile:", agentId)

    try {
        const endpoint = `/api/auth/agents/profile/${agentId}`
        const result = await apiRequest(endpoint)

        // Handle different response structures
        let agentData = null
        if (result.agent) {
            agentData = result.agent
        } else if (result.user) {
            agentData = result.user
        } else if (result.data) {
            agentData = result.data
        } else if (result.id) {
            agentData = result
        }

        if (agentData) {
            // Ensure floatSettings is properly included
            if (!agentData.floatSettings && agentData.isUsingFloat) {
                agentData.floatSettings = {
                    floatType: agentData.defaultFloatType || "INDIVIDUAL",
                    configurationType: agentData.defaultFloatConfigurationType || "FULL_AMOUNT",
                    commissionPercentage: agentData.defaultCommissionPercentage || null,
                    commissionAmount: agentData.defaultCommissionAmount || null,
                    mainPoolId: agentData.defaultMainPoolId || null,
                }
            }

            console.log("✅ Agent profile fetched successfully")
            return result
        }

        throw new Error("Agent data not found in response")
    } catch (error) {
        console.error("❌ Error fetching agent profile:", error)
        throw error
    }
}

/**
 * Get agent float transactions with pagination
 */
export async function getAgentFloatTransactions(
    userId: number,
    params: {
        page?: number
        limit?: number
        provider?: string
        status?: string
        startDate?: string
        endDate?: string
    } = {}
) {
    console.log("[User] Fetching float transactions for agent:", userId, params)

    const queryParams = new URLSearchParams()

    const page = params.page || 1
    const limit = params.limit || 10

    queryParams.append("page", page.toString())
    queryParams.append("limit", limit.toString())

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "" && key !== "page" && key !== "limit") {
            queryParams.append(key, value.toString())
        }
    })

    const endpoint = `/api/float/transactions/user/${userId}?${queryParams.toString()}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Agent float transactions fetched successfully")
        return result
    } catch (error) {
        console.error(`❌ Error fetching agent float transactions for ${userId}:`, error)
        throw error
    }
}

/**
 * Get agent float balance
 */
export async function getAgentFloatBalance(userId: number) {
    console.log("[User] Fetching float balance for agent:", userId)

    const endpointVariations = [`/api/float/admin/balance?userId=${userId}`]

    for (let i = 0; i < endpointVariations.length; i++) {
        const variation = endpointVariations[i]
        const endpoint = typeof variation === "string" ? variation : variation.endpoint
        const method = typeof variation === "string" ? "GET" : variation.method
        const body = typeof variation === "string" ? undefined : variation.body

        try {
            const requestOptions: any = {
                method: method || "GET",
            }

            if (body) {
                requestOptions.body = JSON.stringify(body)
            }

            const result = await apiRequest(endpoint, requestOptions)
            console.log("✅ Float balance fetched successfully")
            return result
        } catch (error) {
            const errorMessage = (error as Error).message

            if (
                errorMessage.includes("not found") ||
                errorMessage.includes("unauthorized") ||
                errorMessage.includes("forbidden")
            ) {
                continue
            }

            if (i === endpointVariations.length - 1) {
                return {
                    success: false,
                    error: "Float balance endpoint authentication failed",
                    message: `Unable to fetch float balance for user ${userId}. Authentication error: ${errorMessage}`,
                    totalBalance: 0,
                    totalActiveFloats: 0,
                    totalAmountIn: 0,
                    totalAmountOut: 0,
                    floatAccountNumber: "N/A",
                    authError: true,
                    originalError: errorMessage,
                }
            }
        }
    }
}

/**
 * Get agent parcel operations with pagination
 */
export async function getAgentParcelOperations(
    agentId: number,
    params: {
        page?: number
        limit?: number
    } = {}
) {
    console.log("[User] Fetching parcel operations for agent:", agentId, params)

    const queryParams = new URLSearchParams()

    const page = params.page || 1
    const limit = params.limit || 10

    queryParams.append("page", page.toString())
    queryParams.append("limit", limit.toString())

    const endpoint = `/api/auth/agents/parcels/${agentId}?${queryParams.toString()}`

    try {
        const result = await apiRequest(endpoint)
        console.log("✅ Agent parcel operations fetched successfully")
        return result
    } catch (error) {
        console.error(`❌ Error fetching agent parcel operations for ${agentId}:`, error)
        throw error
    }
}

/**
 * Get pool linked user details by ID
 */
export async function getPoolLinkedUserDetails(userId: number) {
    console.log("[User] Fetching pool linked user details:", userId)

    try {
        const endpoint = `/api/auth/users/pool-linked/${userId}`
        const result = await apiRequest(endpoint)

        if (result.user) {
            console.log("✅ Pool linked user details fetched successfully")
            return result.user
        } else if (result.data) {
            return result.data
        } else if (result.id) {
            return result
        } else {
            console.warn("Unexpected pool linked user details response structure")
            return null
        }
    } catch (error) {
        console.error(`❌ Error fetching pool linked user details for ${userId}:`, error)

        // Fallback to regular user details
        try {
            const userResult = await getUser(userId)
            return userResult
        } catch (fallbackError) {
            console.error("Fallback user fetch also failed:", fallbackError)
            return null
        }
    }
}

/**
 * Get pool float status for a user
 */
export async function getPoolFloatStatus(userId: number) {
    console.log("[User] Fetching pool float status for user:", userId)

    const endpoint = `/api/auth/pool-float-status?userId=${userId}`

    try {
        const result = await apiRequest(endpoint)

        if (result && typeof result === "object") {
            const userIdFromFilters = result.filters?.userId
            const isRequestedUser = userIdFromFilters === userId.toString()

            const pools = result.pools || []
            const overallStats = result.overallStatistics || {}

            let isPoolMain = false
            let isPoolLinked = false
            let poolMainId = null
            let linkedUsers = []
            let floatType = "INDIVIDUAL"
            let totalLinkedUsers = 0
            let mainUser = null

            // Check if this user is a pool main
            const userPool = pools.find((pool: any) => pool.mainUserId === userId)
            if (userPool) {
                isPoolMain = true
                floatType = "POOL_MAIN"
                linkedUsers = userPool.linkedUsers || []
                totalLinkedUsers = linkedUsers.length
            }

            // Check if this user is pool linked
            for (const pool of pools) {
                const linkedUser = pool.linkedUsers?.find((user: any) => user.id === userId)
                if (linkedUser) {
                    isPoolLinked = true
                    floatType = "POOL_LINKED"
                    poolMainId = pool.mainUserId
                    try {
                        mainUser = await getPoolMainUserDetails(pool.mainUserId)
                    } catch (error) {
                        console.warn("Could not fetch main user details:", error)
                    }
                    break
                }
            }

            console.log("✅ Pool float status fetched successfully")
            return {
                success: true,
                isPoolMain,
                isPoolLinked,
                poolMainId,
                linkedUsers,
                floatType,
                totalLinkedUsers,
                mainUser,
                pools,
                overallStatistics: overallStats,
                filters: result.filters,
                timestamp: result.filters,
            }
        }

        return result
    } catch (error) {
        console.error("❌ Error fetching pool float status:", error)

        return {
            success: false,
            error: "Pool float status fetch failed",
            message: (error as Error).message || "Unable to fetch pool float status",
            isPoolMain: false,
            isPoolLinked: false,
            poolMainId: null,
            linkedUsers: [],
            floatType: "INDIVIDUAL",
            totalLinkedUsers: 0,
            mainUser: null,
        }
    }
}

/**
 * Get pool status from user profile data as fallback
 */
export async function getPoolStatusFromUserProfile(userId: number) {
    console.log("[User] Getting pool status from user profile:", userId)

    try {
        const userProfile = await getAgentProfile(userId)
        const agent = userProfile?.agent

        if (!agent) {
            throw new Error("Agent profile not found")
        }

        const defaultFloatType = agent.defaultFloatType || agent.floatSettings?.floatType
        const isUsingFloat = agent.isUsingFloat || agent.enableFloat

        let isPoolMain = false
        let isPoolLinked = false
        let poolMainId = null
        let floatType = "INDIVIDUAL"
        let mainUser = null

        if (isUsingFloat && defaultFloatType) {
            if (defaultFloatType === "POOL_MAIN") {
                isPoolMain = true
                floatType = "POOL_MAIN"
            } else if (defaultFloatType === "POOL_LINKED") {
                isPoolLinked = true
                floatType = "POOL_LINKED"
                poolMainId = agent.defaultMainPoolId || agent.floatSettings?.mainPoolId || null

                if (poolMainId) {
                    try {
                        mainUser = await getPoolMainUserDetails(poolMainId)
                    } catch (error) {
                        console.warn("Could not fetch main user details from profile:", error)
                    }
                }
            }
        }

        console.log("✅ Pool status from user profile fetched successfully")
        return {
            success: true,
            isPoolMain,
            isPoolLinked,
            poolMainId,
            floatType,
            linkedUsers: [],
            totalLinkedUsers: 0,
            mainUser,
            source: "user_profile",
            agent,
        }
    } catch (error) {
        console.error("❌ Error getting pool status from user profile:", error)
        return {
            success: false,
            error: "Failed to get pool status from user profile",
            message: (error as Error).message,
            isPoolMain: false,
            isPoolLinked: false,
            poolMainId: null,
            floatType: "INDIVIDUAL",
            totalLinkedUsers: 0,
            mainUser: null,
        }
    }
}

/**
 * Get detailed pool information for a user
 */
export async function getDetailedPoolInfo(userId: number) {
    console.log("[User] Fetching detailed pool info for user:", userId)

    try {
        // First try to get pool status from the API
        const poolStatus = await getPoolFloatStatus(userId)

        let finalPoolStatus = poolStatus

        if (poolStatus.success && !poolStatus.isPoolMain && !poolStatus.isPoolLinked) {
            console.log("[User] No pool relationship found in API, checking user profile")
            const profilePoolStatus = await getPoolStatusFromUserProfile(userId)

            if (profilePoolStatus.success && (profilePoolStatus.isPoolMain || profilePoolStatus.isPoolLinked)) {
                finalPoolStatus = {
                    ...poolStatus,
                    isPoolMain: profilePoolStatus.isPoolMain,
                    isPoolLinked: profilePoolStatus.isPoolLinked,
                    poolMainId: profilePoolStatus.poolMainId,
                    floatType: profilePoolStatus.floatType,
                    mainUser: profilePoolStatus.mainUser,
                    source: "combined",
                    profileData: profilePoolStatus.agent,
                }
            }
        }

        if (!finalPoolStatus.success) {
            return finalPoolStatus
        }

        let additionalData = {}

        // If user is pool main, get their linked users
        if (finalPoolStatus.isPoolMain) {
            try {
                const linkedUsersResult = await getPoolLinkedUsersByMainId(userId)
                additionalData = {
                    linkedUsers: linkedUsersResult.linkedUsers,
                    totalLinkedUsers: linkedUsersResult.totalCount,
                }
            } catch (error) {
                console.warn("Could not fetch linked users:", error)
            }
        }

        // If user is pool linked and we don't have main user details, fetch them
        if (finalPoolStatus.isPoolLinked && finalPoolStatus.poolMainId && !finalPoolStatus.mainUser) {
            try {
                const mainUserResult = await getPoolMainUserDetails(finalPoolStatus.poolMainId)
                additionalData = {
                    ...additionalData,
                    mainUser: mainUserResult,
                }
            } catch (error) {
                console.warn("Could not fetch main user details:", error)
            }
        }

        console.log("✅ Detailed pool info fetched successfully")
        return {
            ...finalPoolStatus,
            ...additionalData,
        }
    } catch (error) {
        console.error("❌ Error fetching detailed pool info:", error)
        return {
            success: false,
            error: "Failed to fetch detailed pool information",
            message: (error as Error).message,
            isPoolMain: false,
            isPoolLinked: false,
            poolMainId: null,
            floatType: "INDIVIDUAL",
            totalLinkedUsers: 0,
            mainUser: null,
        }
    }
}

/**
 * Get pool linked users by main user ID
 */
export async function getPoolLinkedUsersByMainId(mainUserId: number) {
    console.log("[User] Fetching pool linked users for main user:", mainUserId)

    try {
        const allPoolLinkedUsers = await getPoolLinkedUsers()

        const filteredUsers = allPoolLinkedUsers.filter((user: any) => {
            return (
                user.defaultMainPoolId === mainUserId ||
                user.mainPoolId === mainUserId ||
                user.main_pool_id === mainUserId ||
                user.floatSettings?.mainPoolId === mainUserId
            )
        })

        console.log(`✅ Found ${filteredUsers.length} linked users for main user ${mainUserId}`)
        return {
            linkedUsers: filteredUsers,
            totalCount: filteredUsers.length,
        }
    } catch (error) {
        console.error(`❌ Error fetching pool linked users for main ID ${mainUserId}:`, error)
        return {
            linkedUsers: [],
            totalCount: 0,
        }
    }
}


export async function getPoolMainUsers(userId?: number) {
    console.log("[User] Fetching pool main users", { userId })

    try {
        const endpoint = userId ? `/api/auth/users/pool-main?userId=${userId}` : "/api/auth/users/pool-main"

        const result = await apiRequest(endpoint)

        let users = []
        if (Array.isArray(result)) {
            users = result
        } else if (result.data && Array.isArray(result.data)) {
            users = result.data
        } else if (result.users && Array.isArray(result.users)) {
            users = result.users
        } else if (result.success && result.data && Array.isArray(result.data)) {
            users = result.data
        } else if (result.poolMainUsers && Array.isArray(result.poolMainUsers)) {
            users = result.poolMainUsers
        } else {
            console.warn("Unexpected pool main users response structure")
            return []
        }

        console.log(`✅ Found ${users.length} pool main users`)
        return users.map((user: any) => ({
            id: user.id,
            fullName: user.fullName,
            username: user.username,
            phoneNumber: user.phoneNumber,
            email: user.email,
            floatSettings: user.floatSettings,
            defaultFloatType: user.defaultFloatType,
            isUsingFloat: user.isUsingFloat,
        }))
    } catch (error) {
        console.error("❌ Error fetching pool main users:", error)

        // Fallback: Fetch all users and filter
        try {
            const allUsers = await getUsers({ all: true })
            let users = []
            if (Array.isArray(allUsers)) {
                users = allUsers
            } else if (allUsers.data && Array.isArray(allUsers.data)) {
                users = allUsers.data
            } else if (allUsers.users && Array.isArray(allUsers.users)) {
                users = allUsers.users
            }
            const poolMainUsers = users.filter(
                (user: any) =>
                    user.floatSettings?.floatType === "POOL_MAIN" ||
                    user.defaultFloatType === "POOL_MAIN" ||
                    user.isPoolMain
            )
            console.log(`✅ Fallback: Found ${poolMainUsers.length} pool main users`)
            return poolMainUsers.map((user: any) => ({
                id: user.id,
                fullName: user.fullName,
                username: user.username,
                phoneNumber: user.phoneNumber,
                email: user.email,
                floatSettings: user.floatSettings,
                defaultFloatType: user.defaultFloatType,
                isUsingFloat: user.isUsingFloat,
            }))
        } catch (fallbackError) {
            console.error("❌ Fallback fetch failed:", fallbackError)
            return []
        }
    }
}

/**
 * Get pool main user details by ID
 */
export async function getPoolMainUserDetails(userId: number) {
    console.log("[User] Fetching pool main user details:", userId)

    try {
        const endpoint = `/api/auth/users/pool-main/${userId}`
        const result = await apiRequest(endpoint)

        if (result.user) {
            console.log("✅ Pool main user details fetched successfully")
            return result.user
        } else if (result.data) {
            return result.data
        } else if (result.id) {
            return result
        } else {
            console.warn("Unexpected pool main user details response structure")
            return null
        }
    } catch (error) {
        console.error(`❌ Error fetching pool main user details for ${userId}:`, error)

        // Fallback to regular user details
        try {
            const userResult = await getUser(userId)
            return userResult
        } catch (fallbackError) {
            console.error("Fallback user fetch also failed:", fallbackError)
            return null
        }
    }
}

/**
 * Get pool main details
 */
export async function getPoolMainDetails(mainUserId: number) {
    console.log("[User] Fetching pool main details:", mainUserId)

    try {
        const userResult = await getPoolMainUserDetails(mainUserId)
        const linkedUsersResult = await getPoolLinkedUsersByMainId(mainUserId)

        console.log("✅ Pool main details fetched successfully")
        return {
            success: true,
            user: userResult,
            linkedUsers: linkedUsersResult.linkedUsers,
            totalLinkedUsers: linkedUsersResult.totalCount,
        }
    } catch (error) {
        console.error(`❌ Error fetching pool main details for ID ${mainUserId}:`, error)
        throw error
    }
}

/**
 * Get pool linked users
 */
export async function getPoolLinkedUsers() {
    console.log("[User] Fetching pool linked users")

    try {
        const endpoint = "/api/auth/users/pool-linked"
        const result = await apiRequest(endpoint)

        let users = []
        if (Array.isArray(result)) {
            users = result
        } else if (result.data && Array.isArray(result.data)) {
            users = result.data
        } else if (result.users && Array.isArray(result.users)) {
            users = result.users
        } else if (result.success && result.data && Array.isArray(result.data)) {
            users = result.data
        } else if (result.poolLinkedUsers && Array.isArray(result.poolLinkedUsers)) {
            users = result.poolLinkedUsers
        } else {
            console.warn("Unexpected pool linked users response structure")
            return []
        }

        console.log(`✅ Found ${users.length} pool linked users`)
        return users
    } catch (error) {
        console.error("❌ Error fetching pool linked users:", error)
        return []
    }
}

// Export as userService object for backward compatibility
export const userService = {
    getUsers: (queryParams?: string) => {
        if (queryParams) {
            const params = new URLSearchParams(queryParams)

            const paramsObj: GetUsersParams = {}

            params.forEach((value, key) => {
                if (key === "page" || key === "per_page" || key === "limit" || key === "company_id") {
                    paramsObj[key as keyof GetUsersParams] = Number.parseInt(value)
                } else if (key === "is_active" || key === "is_using_float" || key === "paginate" || key === "all") {
                    paramsObj[key as keyof GetUsersParams] = value === "true"
                } else {
                    paramsObj[key as keyof GetUsersParams] = value as any
                }
            })

            return getUsers(paramsObj)
        }
        return getUsers()
    },
    getUser,
    getUsersByRole,
    getUserProfile,
    registerUser: createUser,
    createUser,
    createAgent,
    getAdmins,
    getAdminAccounts,
    createAdmin,
    registerAdmin,
    updateUser,
    deleteUser,
    activateUser,
    deactivateUser,
    resetPassword: (userId: number) => resetUserPassword(userId),
    resetUserPassword,
    updateUserFloatConfig,
    searchAgents,
    getAllAgents,
    getAgentProfile,
    getAgentParcelOperations,
    getAgentFloatTransactions,
    getAgentFloatBalance,
    getPoolMainUsers,
    getPoolMainUserDetails,
    getPoolLinkedUsers,
    getPoolLinkedUserDetails,
    getPoolFloatStatus,
    getPoolStatusFromUserProfile,
    getDetailedPoolInfo,
    getPoolMainDetails,
    getPoolLinkedUsersByMainId,
    getCompanies,
    getUserBeneficiaries,
    getBeneficiaryTransactions,
}