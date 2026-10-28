"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { safeStorage } from "@/lib/safe-storage"
import { type ReactNode } from "react"

interface PermissionsContextType {
    permissions: string[]
    roles: string[]
    hasPermission: (permission: string | string[]) => boolean
    hasRole: (role: string | string[]) => boolean
    setUserPermissions: (permissions: string[], roles: string[]) => void
}

const PermissionsContext = createContext<PermissionsContextType>({
    permissions: [],
    roles: [],
    hasPermission: () => false,
    hasRole: () => false,
    setUserPermissions: () => {},
})

export function PermissionsProvider({ children }: { children: ReactNode }) {
    const [permissions, setPermissions] = useState<string[]>([])
    const [roles, setRoles] = useState<string[]>([])

    // Attempt to load permissions from safeStorage on mount
    useEffect(() => {
        const storedPermissions = safeStorage.getItem("user_permissions")
        const storedRoles = safeStorage.getItem("user_roles")

        if (storedPermissions) {
            try {
                setPermissions(JSON.parse(storedPermissions))
            } catch (e) {
                console.error("Error parsing permissions:", e)
            }
        }

        if (storedRoles) {
            try {
                setRoles(JSON.parse(storedRoles))
            } catch (e) {
                console.error("Error parsing roles:", e)
            }
        }
    }, [])

    const hasPermission = (requiredPermission: string | string[]): boolean => {
        if (!permissions.length) return false

        if (Array.isArray(requiredPermission)) {
            // For array input, check if user has ANY of the permissions (OR logic)
            return requiredPermission.some((perm) => permissions.includes(perm))
        }

        // For string input, directly check if permission exists
        return permissions.includes(requiredPermission)
    }

    const hasRole = (requiredRole: string | string[]): boolean => {
        if (!roles.length) return false

        if (Array.isArray(requiredRole)) {
            // For array input, check if user has ANY of the roles (OR logic)
            return requiredRole.some((role) => roles.includes(role))
        }

        // For string input, directly check if role exists
        return roles.includes(requiredRole)
    }

    const setUserPermissions = (newPermissions: string[], newRoles: string[]) => {
        setPermissions(newPermissions)
        setRoles(newRoles)

        // Store in safeStorage for persistence
        if (newPermissions.length > 0) safeStorage.setItem("user_permissions", JSON.stringify(newPermissions))
        if (newRoles.length > 0) safeStorage.setItem("user_roles", JSON.stringify(newRoles))
    }

    return (
        <PermissionsContext.Provider
            value={{
                permissions,
                roles,
                hasPermission,
                hasRole,
                setUserPermissions,
            }}
        >
            {children}
        </PermissionsContext.Provider>
    )
}

export function usePermissions() {
    return useContext(PermissionsContext)
}
