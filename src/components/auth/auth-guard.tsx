"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { getToken, getCurrentUser, getCurrentLocale } from "@/lib/auth"
import { Skeleton } from "@/components/ui/skeleton"
import { AdminPageLoader } from "@/components/admin/admin-page-loader"

function DashboardSkeleton() {
    return (
        <div className="flex min-h-screen w-full bg-background">
            {/* Sidebar */}
            <div className="hidden w-64 flex-shrink-0 border-r p-4 lg:block">
                <Skeleton className="h-8 w-32" />
                <div className="mt-8 space-y-2">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <Skeleton key={i} className="h-9 w-full" />
                    ))}
                </div>
            </div>

            {/* Main */}
            <div className="flex flex-1 flex-col">
                {/* Top bar */}
                <div className="flex h-16 items-center justify-between border-b px-4 lg:px-6">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-9 w-9 rounded-full" />
                </div>

                {/* Content: the same shape as the portal pages */}
                <div className="flex-1 p-4 md:p-6">
                    <AdminPageLoader showCharts showTable={false} />
                </div>
            </div>
        </div>
    )
}

interface AuthGuardProps {
    children: React.ReactNode
    requireAuth?: boolean
}

export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [isValidating, setIsValidating] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    useEffect(() => {
        const checkAuth = () => {
            try {
                const token = getToken()
                const user = getCurrentUser()

                if (!token || !user) {
                    setIsAuthenticated(false)
                    if (requireAuth) {
                        const locale = getCurrentLocale()
                        router.push(`/${locale}/login`)
                        return
                    }
                } else {
                    setIsAuthenticated(true)
                }
            } catch (error) {
                console.error("AuthGuard: Auth check error:", error)
                setIsAuthenticated(false)
                if (requireAuth) {
                    const locale = getCurrentLocale()
                    router.push(`/${locale}/login`)
                }
            } finally {
                setIsValidating(false)
            }
        }

        checkAuth()
    }, [pathname, router, requireAuth])

    // Show a skeleton of the dashboard while validating
    if (isValidating) {
        return <DashboardSkeleton />
    }

    // If auth is required but user is not authenticated, don't render children
    if (requireAuth && !isAuthenticated) {
        return null
    }

    return <>{children}</>
}
