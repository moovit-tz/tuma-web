import { apiRequest } from "@/lib/constants"

/*
 * Role permissions enforced by the API (see the backend's
 * src/config/permission-catalog.js). ADMIN always has every permission.
 */

export type PermissionKey =
    | "companies.manage" | "companies.delete" | "owners.reset_password"
    | "agents.manage" | "agents.reset_password" | "agents.delete" | "shifts.manage"
    | "parcels.receive" | "parcels.dispatch" | "parcels.offload" | "parcels.deliver" | "parcels.cancel" | "parcels.reverse_cancellation"
    | "parcel_types.create" | "parcel_types.manage"
    | "vehicles.manage" | "vehicles.delete" | "vehicles.catalog"
    | "locations.manage" | "locations.delete"
    | "beneficiaries.manage" | "finance.commissions" | "invoices.manage"
    | "staff.manage" | "settings.manage"

export interface PermissionDef {
    key: PermissionKey
    group: string
    label: string
    description: string
    appliesTo: ("staff" | "agent")[]
    locked?: boolean
}

export interface RolePermissions {
    role: string
    /** Made in the portal (builds on baseRole); built-in roles are fixed */
    custom?: boolean
    label?: string
    description?: string
    baseRole?: string | null
    /** Accounts that have this custom role */
    assigned?: number
    kind: "staff" | "agent"
    editable: boolean
    permissions: PermissionKey[]
    grantable: PermissionKey[]
    defaults: PermissionKey[]
    customised: boolean
    updatedAt: string | null
}

export async function getMyPermissions(): Promise<{ kind: string; roles: string[]; permissions: PermissionKey[] }> {
    const res = await apiRequest("/api/permissions/me", { silent: true })
    return res?.data
}

export interface BaseRoleOption { role: string; label: string; kind: "staff" | "agent" }

export async function getRolePermissions(): Promise<{ catalog: PermissionDef[]; roles: RolePermissions[]; baseRoles?: BaseRoleOption[] }> {
    const res = await apiRequest("/api/permissions/roles")
    return res?.data
}

export async function updateRolePermissions(role: string, permissions: PermissionKey[], details?: { label?: string; description?: string }): Promise<RolePermissions> {
    const res = await apiRequest(`/api/permissions/roles/${role}`, { method: "PUT", body: JSON.stringify({ permissions, ...details }) })
    return res?.data
}

// Custom roles: build on a built-in role, with their own permissions
export async function createRole(body: { label: string; description?: string; baseRole: string; permissions?: PermissionKey[] }): Promise<RolePermissions> {
    return (await apiRequest("/api/permissions/roles", { method: "POST", body: JSON.stringify(body) }))?.data
}

export async function deleteRole(role: string): Promise<void> {
    await apiRequest(`/api/permissions/roles/${role}`, { method: "DELETE" })
}

export async function resetRolePermissions(role: string): Promise<RolePermissions> {
    const res = await apiRequest(`/api/permissions/roles/${role}/reset`, { method: "POST" })
    return res?.data
}

/* One account's permissions: its role's, plus grants, minus removals */

export interface AccountPermissions {
    kind: "staff" | "agent"
    id: number
    fullName: string
    roles: string[]
    /** Custom role given to this account, if any */
    customRole?: string | null
    customRoleOptions?: { role: string; label: string; baseRole: string }[]
    editable: boolean
    grantable: PermissionKey[]
    rolePermissions: PermissionKey[]
    grants: PermissionKey[]
    revokes: PermissionKey[]
    permissions: PermissionKey[]
}

export async function getAccountPermissions(kind: "staff" | "agent", id: number): Promise<AccountPermissions> {
    return (await apiRequest(`/api/permissions/accounts/${kind}/${id}`))?.data
}

export async function updateAccountPermissions(kind: "staff" | "agent", id: number, body: { grants: PermissionKey[]; revokes: PermissionKey[] }): Promise<AccountPermissions> {
    return (await apiRequest(`/api/permissions/accounts/${kind}/${id}`, { method: "PUT", body: JSON.stringify(body) }))?.data
}

export async function assignAccountRole(kind: "staff" | "agent", id: number, role: string | null): Promise<AccountPermissions> {
    return (await apiRequest(`/api/permissions/accounts/${kind}/${id}/role`, { method: "PUT", body: JSON.stringify({ role }) }))?.data
}
