"use client"

import React from "react"
import { hasRole } from "@/lib/auth"

interface RoleGuardProps {
    role?: string
    anyRoles?: string[]
    children: React.ReactNode
    fallback?: React.ReactNode
}

/**
 * A component that conditionally renders its children based on user roles
 *
 * @param role - A single role to check
 * @param anyRoles - Check if user has any of these roles
 * @param children - Content to show if user has the role
 * @param fallback - Optional content to show if user doesn't have the role
 */
export function RoleGuard({ role, anyRoles, children, fallback = null }: RoleGuardProps) {
    // Only run on client side
    const [hasAccess, setHasAccess] = React.useState(false)

    React.useEffect(() => {
        // Check roles based on which prop was provided
        if (role) {
            setHasAccess(hasRole(role))
        } else if (anyRoles && anyRoles.length > 0) {
            setHasAccess(anyRoles.some((r) => hasRole(r)))
        } else {
            // If no role check is specified, allow access
            setHasAccess(true)
        }
    }, [role, anyRoles])

    // During SSR, we can't check roles, so we render nothing
    if (typeof window === "undefined") {
        return null
    }

    return hasAccess ? <>{children}</> : <>{fallback}</>
}
