// Role enum to match the database's "Role" type — used for field/booking agents.
export enum Role {
    SUPER_AGENT = "SUPER_AGENT",
    AGENT = "AGENT",
    TRIP_AGENT = "TRIP_AGENT",
}

// AdminRole enum to match the database's "AdminRole" type — used for system
// admins, operations staff, and company owners (a separate resource from
// the agent Role above, backed by the /admins endpoint).
export enum AdminRole {
    ADMIN = "ADMIN",
    OPS = "OPS",
    OWNER = "OWNER",
}

// Gender enum to match Prisma model
export enum Gender {
    MALE = "MALE",
    FEMALE = "FEMALE",
    OTHER = "OTHER",
}

export interface UserRole {
    id: number
    name: Role
    userId: number
}

export interface FloatSettings {
    id: number
    userId: number
    floatAccountNumber: string
    floatType: string // e.g., "INDIVIDUAL", "POOL_MAIN", "POOL_LINKED"
    configurationType: string // e.g., "FULL_AMOUNT", "COMMISSION_BASED"
    commissionType?: string // "PERCENTAGE" or "AMOUNT"
    commissionPercentage?: number | null
    commissionAmount?: string | null // Changed to string based on payload
    mainPoolId?: number | null
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export interface User {
    id: number
    uuid: string
    username: string
    phoneNumber: string
    email: string | null
    role: string // Single role string
    fullName: string
    companyId: number | null
    regionId: number | null
    bookingOfficeId: number | null
    isFirstLogin: boolean
    createdAt: string
    updatedAt: string
    isActive: boolean
    floatAccountNumber: string | null
    gender: "MALE" | "FEMALE"
    isUsingFloat: boolean
    isDeleted: boolean
    companyName?: string
    // Default float settings from the user object itself
    defaultCommissionAmount: number | null
    defaultCommissionPercentage: number | null
    defaultFloatConfigurationType: "FULL_AMOUNT" | "COMMISSION_BASED" | null
    defaultFloatType: "INDIVIDUAL" | "POOL_MAIN" | "POOL_LINKED" | null
    defaultMainPoolId: number | null
    company?: {
        id: number
        name: string
        phoneNumber: string
        helpDeskPhoneNumber: string
    }
    region?: {
        id: number
        name: string
    }
    bookingOffice?: {
        id: number
        name: string
        regionId: number
    }
    roles?: string[] // Array of roles if needed for display/permissions
    floatSettings?: {
        id: number
        userId: number
        floatAccountNumber: string | null
        floatType: "INDIVIDUAL" | "POOL_MAIN" | "POOL_LINKED" | null
        configurationType: "FULL_AMOUNT" | "COMMISSION_BASED" | null
        commissionPercentage: number | null
        commissionAmount: string | null // Changed to string | null
        mainPoolId: number | null
        createdAt: string
        updatedAt: string
    }
    parcelCounts?: {
        sentParcels: number
        receivedParcels: number
        dispatchedParcels: number
        offloadedParcels: number
        deliveredParcels: number
        canceledParcels: number
    }
}

export interface UserFilters {
    company_id?: number
    role?: Role | string
    is_active?: boolean
    is_using_float?: boolean
    search?: string
    paginate?: boolean
    page?: number
    per_page?: number
}

export interface CreateUserData {
    username: string
    phoneNumber: string
    email?: string
    password?: string
    role?: string | string[] // Allow both single role and array
    roles?: string | string[] // Also allow roles field
    fullName: string
    companyId: number
    regionId?: number
    bookingOfficeId?: number
    isActive?: boolean
    isUsingFloat?: boolean
    gender?: Gender | string
    // Float configuration
    enableFloat?: boolean
    floatType?: string
    configurationType?: string
    commissionType?: string
    commissionPercentage?: number
    commissionAmount?: number
    mainPoolId?: number
}

export interface CreateAgentData {
    fullName: string
    username: string
    phoneNumber: string
    email?: string
    companyId: string | number
    regionId?: string | number
    bookingOfficeId?: string | number
    roles: Role[] | string[] | Role | string // Allow both array and single values
    gender: Gender | string
    // Float configuration
    enableFloat?: boolean
    floatType?: string
    configurationType?: string
    commissionType?: string
    commissionPercentage?: number
    commissionAmount?: number
    mainPoolId?: number
}

export interface UpdateUserData extends Partial<CreateUserData> {
    id?: number
}

export interface UserResponse {
    data: User[]
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

// API Response interfaces
export interface CreateUserResponse {
    success: boolean
    message: string
    user: User
    floatConfiguration?: FloatSettings
    token?: string
}

export interface FloatConfigurationData {
    floatType: string
    configurationType: string
    commissionType?: string
    commissionPercentage?: number
    commissionAmount?: number
    mainPoolId?: number
    isActive: boolean
}
