/**
 * Centralized Authentication Error Handler
 * 
 * This module provides utilities to handle authentication errors across the application,
 * including automatic token cleanup and redirect to login page when tokens are invalid.
 */

import { safeStorage } from "./safe-storage"

// Helper function to get current locale from URL
const getCurrentLocale = (): string => {
  if (typeof window === "undefined") return "en"

  const pathname = window.location.pathname
  const segments = pathname.split("/").filter(Boolean)

  // Check if first segment is a locale (en or sw)
  if (segments.length > 0 && (segments[0] === "en" || segments[0] === "sw")) {
    return segments[0]
  }

  // Default to English if no locale found
  return "en"
}

// Clear all authentication data
const clearAuthData = () => {
  if (typeof window === "undefined") return

  // Clear cookies
  const cookiesToClear = ["token", "user_role", "user_phone"]
  cookiesToClear.forEach(cookieName => {
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  })

  // Clear localStorage
  const localStorageKeys = [
    "user_id",
    "user_name", 
    "user_email",
    "user_type",
    "user_roles",
    "user_permissions",
    "user",
    "token",
    "auth_timestamp"
  ]
  localStorageKeys.forEach(key => safeStorage.removeItem(key))
}

/**
 * Handle token invalidation by clearing auth data and redirecting to login
 * @param reason - Optional reason for the invalidation (for logging)
 */
export const handleTokenInvalidation = (reason = "Token invalid") => {
  console.log(`🚨 Token invalidation: ${reason} - clearing auth data and redirecting to login`)
  
  if (typeof window === "undefined") return
  
  // Clear all authentication data
  clearAuthData()
  
  // Trigger auth state update event for components listening to auth changes
  window.dispatchEvent(new CustomEvent("auth-logout", { detail: { reason } }))
  
  // Get current locale and redirect to login
  const locale = getCurrentLocale()
  const loginUrl = `/${locale}/login`
  
  // Use replace to prevent back navigation to protected pages
  window.location.replace(loginUrl)
}

/**
 * Check if a response indicates the session itself is invalid (not just a
 * request to a resource this role can't access). Only 401 means that — a
 * 403 means the token is valid but this specific action is forbidden for
 * the caller's role, which should surface as a normal error, not force a
 * logout+redirect on every legitimately role-restricted call.
 * @param response - The fetch Response object
 * @returns boolean indicating if it's a session-invalidating auth error
 */
export const isAuthError = (response: Response): boolean => {
  return response.status === 401
}

/**
 * Enhanced fetch wrapper that automatically handles authentication errors
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const response = await fetch(url, options)
  
  if (isAuthError(response)) {
    const endpoint = url.includes("?") ? url.split("?")[0] : url
    handleTokenInvalidation(`Authentication failed for ${endpoint} (${response.status})`)
    throw new Error("Authentication failed - redirecting to login")
  }
  
  return response
}

/**
 * Middleware to handle authentication errors in React Query
 * Can be added to React Query's global error handler
 */
export const handleReactQueryAuthError = (error: any) => {
  // Check if error message indicates authentication failure
  if (error?.message?.includes("Authentication failed") || 
      error?.message?.includes("401") || 
      error?.message?.includes("403")) {
    handleTokenInvalidation("React Query authentication error")
  }
}

/**
 * Setup global error listeners for authentication errors
 * Call this once in your app initialization
 */
export const setupGlobalAuthErrorHandling = () => {
  // Listen for auth-logout events to sync across tabs
  if (typeof window !== "undefined") {
    window.addEventListener("auth-logout", (event: any) => {
      console.log("🚨 Auth logout event received:", event.detail?.reason || "Unknown reason")
    })
    
    // Listen for storage changes to detect logout in other tabs
    window.addEventListener("storage", (event) => {
      if (event.key === "token" && !event.newValue && event.oldValue) {
        console.log("🚨 Token removed in another tab - logging out")
        handleTokenInvalidation("Token removed in another tab")
      }
    })
  }
}

/**
 * Check if current session is valid
 * @returns boolean indicating if user is authenticated
 */
export const isSessionValid = (): boolean => {
  if (typeof window === "undefined") return false
  
  const token = document.cookie.split(";")
    .find(cookie => cookie.trim().startsWith("token="))
    ?.split("=")[1]
    
  const user = safeStorage.getItem("user")
  
  return !!(token && user)
}
