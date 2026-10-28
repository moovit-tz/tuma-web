import { isAuthError, handleTokenInvalidation } from "./auth-handler"

// Where API calls go.
// Browser: always the portal's own origin. Next.js forwards /api/* to the
// backend (next.config.ts) and serves the portal's own /api/portal-insights
// routes itself, on any domain, with no cross-origin requests.
// Server (route handlers, SSR): straight to the backend.
export const getApiBaseUrl = () => {
    if (typeof window === "undefined") {
        return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "https://parcel.mysafari.co.tz"
    }
    return window.location.origin
}

export const API_BASE_URL = getApiBaseUrl()

// Get auth token from cookies
export const getAuthToken = () => {
    if (typeof window !== "undefined") {
        const cookies = document.cookie.split(";")
        const tokenCookie = cookies.find((cookie) => cookie.trim().startsWith("token="))
        return tokenCookie ? tokenCookie.split("=")[1] : null
    }
    return null
}

// Request/response tracing. Off in production builds: logging every response
// body (some are thousands of parcels) costs time and keeps the payloads
// alive in memory whenever devtools are open.
const DEBUG_API = process.env.NODE_ENV !== "production"

// Helper function to build API requests
export const apiRequest = async (endpoint: string, options: RequestInit & { silent?: boolean } = {}) => {
    const { silent, ...fetchOptions } = options
    const url = new URL(endpoint, API_BASE_URL)

    const token = getAuthToken()
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers as Record<string, string> || {}),
    }
    // File uploads: the browser sets the multipart boundary itself
    if (typeof FormData !== "undefined" && fetchOptions.body instanceof FormData) delete headers["Content-Type"]

    if (token) {
        headers.Authorization = `Bearer ${token}`
    }

    if (DEBUG_API) console.log("[API] Making request to:", url.toString())

    const response = await fetch(url.toString(), {
        ...fetchOptions,
        headers,
    })

    if (DEBUG_API) console.log("[API] Response status:", response.status)

    if (isAuthError(response)) {
        // Unauthorized/forbidden — the session is invalid. Don't let callers
        // silently swallow this into an empty/zero fallback and keep the
        // portal up; clear auth state and send the user straight to login.
        handleTokenInvalidation(`Unauthorized response from ${endpoint} (${response.status})`)
        throw new Error("Unauthorized — redirecting to login")
    }

    if (!response.ok) {
        let errorData: any = {}
        try {
            const contentType = response.headers.get("content-type")
            if (contentType && contentType.includes("application/json")) {
                errorData = await response.json()
            } else {
                const text = await response.text()
                errorData = { message: text || `Error status: ${response.status}` }
            }
        } catch (e) {
            errorData = { message: `Request failed with status ${response.status}` }
        }

        if (!silent) {
            console.error(`[API] Error response from ${endpoint}:`, errorData)
        }
        throw new Error(errorData.message || errorData.error || `API request failed with status ${response.status}`)
    }

    let result
    try {
        result = await response.json()
    } catch (e) {
        console.error(`[API] Failed to parse success response from ${endpoint}:`, e)
        throw new Error("Invalid JSON response from server")
    }

    if (DEBUG_API) console.log(`[API] Success response from ${endpoint}:`, result)
    return result
}