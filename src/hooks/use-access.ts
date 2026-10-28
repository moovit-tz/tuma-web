"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getCurrentUser } from "@/lib/auth"
import { staffRole } from "@/lib/portal-access"
import { getMyPermissions, type PermissionKey } from "@/lib/services/permissions"

const ADMIN_ONLY: PermissionKey[] = ["staff.manage", "settings.manage"]

// Same defaults as the backend (src/config/permission-catalog.js), used while
// the account's own permissions can't be loaded
const DEFAULTS: Record<string, PermissionKey[]> = {
    OPS: [
        "companies.manage", "owners.reset_password",
        "agents.manage", "agents.reset_password",
        "parcels.receive", "parcels.dispatch", "parcels.offload", "parcels.deliver", "parcels.cancel", "parcels.reverse_cancellation",
        "parcel_types.create", "parcel_types.manage",
        "vehicles.manage", "vehicles.catalog",
        "locations.manage",
        "beneficiaries.manage", "finance.commissions",
    ],
    OWNER: ["parcels.cancel"],
}

/*
 * What the signed-in staff account may do. Use it to hide actions the API
 * would refuse — the API still enforces every permission itself.
 *
 *   const { can } = useAccess()
 *   {can("companies.delete") && <DeleteButton />}
 */
export function useAccess() {
    const [role, setRole] = useState<string>("")
    useEffect(() => setRole(staffRole(getCurrentUser())), [])

    const { data, isLoading, isError } = useQuery({
        queryKey: ["permissions", "me"],
        queryFn: getMyPermissions,
        staleTime: 5 * 60_000,
        retry: false,
    })

    const granted = new Set(data?.permissions ?? [])
    const can = (key: PermissionKey) => {
        if (role === "ADMIN") return true
        if (data) return granted.has(key)
        // Couldn't load them (e.g. the API doesn't have permissions yet):
        // fall back to the role's defaults; the API still decides.
        if (DEFAULTS[role]) return DEFAULTS[role].includes(key)
        return !ADMIN_ONLY.includes(key)
    }

    return { can, role, isAdmin: role === "ADMIN", isLoading: isLoading && role !== "ADMIN", unavailable: isError }
}
