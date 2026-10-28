"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { canUsePortal, homeFor, staffRole, type Portal } from "@/lib/portal-access"

// Sends staff to their own portal when they open another one (e.g. an owner
// opening /admin). The API enforces access too; this keeps the UI honest.
export function PortalGuard({ portal, children }: { portal: Portal; children: ReactNode }) {
    const router = useRouter()
    const params = useParams()
    const locale = (params?.locale as string) || "en"
    const [allowed, setAllowed] = useState<boolean | null>(null)

    useEffect(() => {
        const user = getCurrentUser()
        if (!user) return setAllowed(true) // AuthGuard handles signed-out users
        const role = staffRole(user)
        if (canUsePortal(role, portal)) return setAllowed(true)
        setAllowed(false)
        router.replace(homeFor(role, locale))
    }, [portal, locale, router])

    if (allowed === false) return null
    return <>{children}</>
}
