"use client"

import { useEffect } from "react"
import { useTitle } from "@/context/TitleContext"

interface ClientMetadataUpdaterProps {
    prefix?: string
    suffix?: string
}

/**
 * A component that updates the document title based on the current title in context
 * Can be used in layout files to ensure document title stays in sync
 */
export function ClientMetadataUpdater({ prefix = "Dalatix | ", suffix = "" }: ClientMetadataUpdaterProps) {
    const { title } = useTitle()

    useEffect(() => {
        // Update document title whenever the title in context changes
        document.title = `${prefix}${title}${suffix}`
    }, [title, prefix, suffix])

    // This component doesn't render anything
    return null
}