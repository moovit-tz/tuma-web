/*
 * Which portal each staff role uses. The Admin table's `role` column is the
 * source of truth (it's what the API checks permissions against).
 */

export type Portal = "admin" | "ops" | "biz"

const PORTALS_BY_ROLE: Record<string, Portal[]> = {
    ADMIN: ["admin", "ops"],
    OPS: ["ops"],
    OWNER: ["biz"],
}

export function staffRole(user: any): string {
    const direct = typeof user?.role === "string" ? user.role : ""
    if (direct) return direct.toUpperCase()
    const first = Array.isArray(user?.roles) ? user.roles[0] : null
    const name = typeof first === "string" ? first : first?.name || ""
    return String(name).toUpperCase()
}

export function canUsePortal(role: string, portal: Portal) {
    return (PORTALS_BY_ROLE[role] ?? []).includes(portal)
}

export function homeFor(role: string, locale: string) {
    const portal = PORTALS_BY_ROLE[role]?.[0]
    return portal ? `/${locale}/${portal}/dashboard` : `/${locale}/login`
}
