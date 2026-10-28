"use client"

import { useEffect } from "react"
import { useAuth } from "@/providers/AuthProvider"
import { useRouter } from "next/navigation"

export function AuthListener() {
    const { logout } = useAuth()
    const router = useRouter()

    useEffect(() => {
        // Listen for unauthorized events
        const handleUnauthorized = () => {
            console.log("Unauthorized access detected, logging out...")
            logout()
        }

        // Add event listener
        window.addEventListener("auth:unauthorized", handleUnauthorized)

        // Cleanup
        return () => {
            window.removeEventListener("auth:unauthorized", handleUnauthorized)
        }
    }, [logout, router])

    return null
}
