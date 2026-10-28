"use client"

import React from "react"
import { hasPermission, hasAnyPermission, hasAllPermissions } from "@/lib/auth"

interface PermissionGuardProps {
    permission?: string
    anyPermissions?: string[]
    allPermissions?: string[]
    children: React.ReactNode
    fallback?: React.ReactNode
}

/**
 * A component that conditionally renders its children based on user permissions
 *
 * @param permission - A single permission to check
 * @param anyPermissions - Check if user has any of these permissions
 * @param allPermissions - Check if user has all of these permissions
 * @param children - Content to show if user has permission
 * @param fallback - Optional content to show if user doesn't have permission
 */
export function PermissionGuard({
                                    permission,
                                    anyPermissions,
                                    allPermissions,
                                    children,
                                    fallback = null,
                                }: PermissionGuardProps) {
    // Only run on client side
    const [hasAccess, setHasAccess] = React.useState(false)

    React.useEffect(() => {
        // Check permissions based on which prop was provided
        if (permission) {
            setHasAccess(hasPermission(permission))
        } else if (anyPermissions && anyPermissions.length > 0) {
            setHasAccess(hasAnyPermission(anyPermissions))
        } else if (allPermissions && allPermissions.length > 0) {
            setHasAccess(hasAllPermissions(allPermissions))
        } else {
            // If no permission check is specified, allow access
            setHasAccess(true)
        }
    }, [permission, anyPermissions, allPermissions])

    // During SSR, we can't check permissions, so we render nothing
    if (typeof window === "undefined") {
        return null
    }

    return hasAccess ? <>{children}</> : <>{fallback}</>
}
