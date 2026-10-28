"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { safeStorage } from "@/lib/safe-storage"

export function useAuthRedirect() {
    const router = useRouter()
    const pathname = usePathname()
    const [isRedirecting, setIsRedirecting] = useState(false)

    // Function to handle logout
    const handleLogout = () => {
        if (isRedirecting) return // Prevent multiple redirects

        try {
            // Clear authentication data
            safeStorage.removeItem("token")
            safeStorage.removeItem("user")
            safeStorage.removeItem("user_id")
            safeStorage.removeItem("user_name")
            safeStorage.removeItem("user_email")
            safeStorage.removeItem("user_type")
            safeStorage.removeItem("user_roles")
            safeStorage.removeItem("user_permissions")

            // Set cookie expiration to past date to remove it
            document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
            document.cookie = "user_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
            document.cookie = "user_phone=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"

            setIsRedirecting(true)

            // Redirect to landing page instead of login
            router.push("/")
        } catch (error) {
            console.error("Error during logout:", error)
        }
    }

    return { handleLogout }
}
