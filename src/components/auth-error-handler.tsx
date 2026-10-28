"use client"

import { useEffect } from "react"
import { setupGlobalAuthErrorHandling, handleReactQueryAuthError } from "@/lib/auth-handler"
import { useQueryClient } from "@tanstack/react-query"

/**
 * AuthErrorHandler Component
 * 
 * This component should be included once at the app level to set up global
 * authentication error handling and React Query integration.
 */
export function AuthErrorHandler() {
  const queryClient = useQueryClient()

  useEffect(() => {
    // Setup global auth error handling
    setupGlobalAuthErrorHandling()

    // Setup React Query global error handler for auth errors
    queryClient.getQueryCache().config.onError = (error) => {
      console.log("React Query error:", error)
      handleReactQueryAuthError(error)
    }

    queryClient.getMutationCache().config.onError = (error) => {
      console.log("React Query mutation error:", error)
      handleReactQueryAuthError(error)
    }

    console.log("✅ Global authentication error handling initialized")

    // Cleanup function
    return () => {
      // Reset React Query error handlers
      queryClient.getQueryCache().config.onError = undefined
      queryClient.getMutationCache().config.onError = undefined
    }
  }, [queryClient])

  // This component doesn't render anything
  return null
}
