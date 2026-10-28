"use client"

import { usePermissions } from "@/hooks/use-permissions"
import type { ReactNode } from "react"

interface PermissionGuardProps {
    permissions?: string | string[]
    roles?: string | string[]
    children: ReactNode
    fallback?: ReactNode
}

export function PermissionGuard({ permissions, roles, children, fallback = null }: PermissionGuardProps) {
    const { hasPermission, hasRole } = usePermissions()

    // If no permissions or roles are specified, render children
    if (!permissions && !roles) {
        return <>{children}</>
    }

    // Check permissions if specified
    const hasRequiredPermission = permissions ? hasPermission(permissions) : true

    // Check roles if specified
    const hasRequiredRole = roles ? hasRole(roles) : true

    // If user has either the required permissions or roles, render children
    if (hasRequiredPermission || hasRequiredRole) {
        return <>{children}</>
    }

    // Otherwise, render fallback
    return <>{fallback}</>
}
