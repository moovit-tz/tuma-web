export interface Permission {
    id: number
    name: string
    guard_name: string
    parent: string
    created_at: string
    updated_at: string
    pivot?: {
        role_id: number
        permission_id: number
    }
}

export interface PermissionResponse {
    success?: boolean
    data: Permission[]
    message?: string
    code?: number
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

export interface SinglePermissionResponse {
    success: boolean
    message: string
    code: number
    data: Permission
}

export interface PermissionFilters {
    name?: string
    guard_name?: string
    parent?: string
    paginate?: boolean
    page?: number
    per_page?: number
}
