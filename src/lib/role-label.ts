// Account role as people read it ("OPS" → "Operations team")
const ROLE_LABEL: Record<string, string> = { OPS: "Operations team", ADMIN: "Administrator", OWNER: "Company owner" }

/** The signed-in user's role code, from roles[] or type */
export function userRoleCode(user: any): string {
    const first = Array.isArray(user?.roles) && user.roles.length > 0 ? user.roles[0] : null
    return String((typeof first === "string" ? first : first?.name) || user?.role || user?.type || "").toUpperCase()
}

export function roleLabel(role: string | null | undefined): string {
    const code = String(role || "").toUpperCase()
    return ROLE_LABEL[code] ?? (role || "User")
}
