import type { Permission } from "./permission"

export interface Role {
    id: number
    name: string
    guard_name: string
    created_at: string
    updated_at: string
    permissions?: Permission[]
}

export interface RoleFilters {
    name?: string
    paginate?: boolean
    page?: number
    per_page?: number
}

export interface CreateRoleData {
    name: string
    guard_name?: string
}

export interface UpdateRoleData {
    name?: string
    guard_name?: string
}

export interface AssignPermissionsData {
    permissions: number[]
}

export interface RoleResponse {
    success?: boolean
    message?: string
    code?: number
    data: Role[]
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

export interface SingleRoleResponse {
    success: boolean
    message: string
    code: number
    data: Role
}
