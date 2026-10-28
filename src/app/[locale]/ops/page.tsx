"use client"

import { useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { LoadingSpinner } from "@/components/loading-spinner"
import { PageSkeleton } from "@/components/ui/skeletons"

export default function OpsPage() {
    const router = useRouter()
    const params = useParams()
    const locale = params.locale as string

    useEffect(() => {
        // Redirect to ops dashboard
        router.push(`/${locale}/ops/dashboard`)
    }, [router, locale])

    return (
        <PageSkeleton />
    )
}
