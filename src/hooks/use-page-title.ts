"use client"

import { useEffect } from "react"
import { useTitle } from "@/context/TitleContext"

/**
 * A hook to set the page title from any component
 * Usage: usePageTitle("My New Title")
 *
 * @param title The title to set
 */
export function usePageTitle(title: string) {
    const { setTitle } = useTitle()

    useEffect(() => {
        setTitle(title)
    }, [title, setTitle])

    return null
}