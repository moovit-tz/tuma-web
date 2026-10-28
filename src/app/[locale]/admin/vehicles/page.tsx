"use client"

import { useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { LoadingSpinner } from "@/components/loading-spinner"
import { PageSkeleton } from "@/components/ui/skeletons"

export default function VehiclesPage() {
    const router = useRouter()
    const params = useParams()
    const locale = params.locale as string

    useEffect(() => {
        // Redirect to vehicles management page
        router.push(`/${locale}/admin/vehicles/vehicles`)
    }, [router, locale])

    return (
        <PageSkeleton />
    )
}
