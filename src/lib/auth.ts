import type { User } from "@/types/user"
import { safeStorage } from "./safe-storage"

export interface LoginCredentials {
    phoneNumber: string
    password: string
}

export interface AuthResponse {
    success?: boolean
    message: string
    token: string
    admin?: User
    user?: User
    [key: string]: any
}

// Generate a unique device identifier
const generateDeviceId = (): string => {
    // Create a combination of browser info, screen size, and random values
    const browserInfo = navigator.userAgent
    const screenInfo = `${window.screen.width}x${window.screen.height}`
    const randomPart = Math.random().toString(36).substring(2, 15)
    const timestamp = Date.now().toString(36)

    // Combine and hash using simple string operations (for demonstration)
    const combinedInfo = `${browserInfo}_${screenInfo}_${randomPart}_${timestamp}`

    // Create a simple hash (for demonstration only - consider more robust hashing in production)
    let hash = 0
    for (let i = 0; i < combinedInfo.length; i++) {
        const char = combinedInfo.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash = hash & hash // Convert to 32bit integer
    }

    // Return a hexadecimal string version of the hash + random part for uniqueness
    return Math.abs(hash).toString(16) + randomPart
}

// Device session management
const getDeviceId = (): string => {
    if (typeof window === "undefined") return ""

    let deviceId = safeStorage.getItem("device_id")
    if (!deviceId) {
        deviceId = generateDeviceId()
        safeStorage.setItem("device_id", deviceId)
    }
    return deviceId
}

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

// Helper function to get localized login URL
const getLoginUrl = (): string => {
    const locale = getCurrentLocale()
    return `/${locale}/login`
}

// Helper function to get localized admin dashboard URL
const getAdminDashboardUrl = (): string => {
    const locale = getCurrentLocale()
    return `/${locale}/admin/dashboard`
}

// Helper function to set cookies with better defaults
const setCookie = (name: string, value: string, days = 30) => {
    if (typeof window === "undefined") return
    const expires = new Date()
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}

// Helper function to get cookies with better parsing
const getCookie = (name: string): string | null => {
    if (typeof window === "undefined") return null

    try {
        const nameEQ = name + "="
        const ca = document.cookie.split(";")
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i]
            while (c.charAt(0) === " ") c = c.substring(1, c.length)
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
        }
    } catch (error) {
        console.error("Error reading cookie:", error)
    }
    return null
}

// Store user data in localStorage (including roles and permissions)
export const storeUserData = (user: User) => {
    if (typeof window === "undefined") return
    try {
        // Store basic user info
        safeStorage.setItem("user_id", String(user.id))
        safeStorage.setItem("user_name", user.fullName || user.username || "")
        safeStorage.setItem("user_email", user.email || "")
        // Use user.role instead of user.type as it doesn't exist on User type
        safeStorage.setItem("user_type", user.role || "admin")

        // Store the full user object
        safeStorage.setItem("user", JSON.stringify(user))

        // Store roles and permissions
        if (user.roles && user.roles.length > 0) {
            // Store role names - extract the name from role objects
            const roleNames = Array.isArray(user.roles)
                ? user.roles.map((role: any) => (typeof role === "string" ? role : role.name))
                : []
            safeStorage.setItem("user_roles", JSON.stringify(roleNames))

            console.log("Stored user roles:", roleNames)

            // Store all permissions from all roles
            const allPermissions = new Set<string>()
            if (Array.isArray(user.roles)) {
                user.roles.forEach((role: any) => {
                    if (typeof role !== "string" && role.permissions) {
                        role.permissions.forEach((permission: any) => {
                            allPermissions.add(permission.name)
                        })
                    }
                })
            }
            safeStorage.setItem("user_permissions", JSON.stringify(Array.from(allPermissions)))
        }

        // Store auth timestamp for validation
        safeStorage.setItem("auth_timestamp", Date.now().toString())
    } catch (error) {
        console.error("Error storing user data:", error)
    }
}

// Clear user data from localStorage
const clearUserData = () => {
    if (typeof window === "undefined") return
    safeStorage.removeItem("user_id")
    safeStorage.removeItem("user_name")
    safeStorage.removeItem("user_email")
    safeStorage.removeItem("user_type")
    safeStorage.removeItem("user_roles")
    safeStorage.removeItem("user_permissions")
    safeStorage.removeItem("user")
    safeStorage.removeItem("token")
    safeStorage.removeItem("auth_timestamp")
    // Don't remove device_id as it should persist across logins
}

export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    // Get device ID for this device
    const deviceId = getDeviceId()

    const response = await fetch(`/api/auth/admin/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Device-ID": deviceId, // Pass device ID in headers
        },
        body: JSON.stringify({
            phoneNumber: credentials.phoneNumber,
            password: credentials.password,
            device_id: deviceId, // Also include in body
        }),
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Login failed" }))

        // Handle specific case where user has too many active devices
        if (response.status === 403 && errorData.code === "MAX_DEVICES_REACHED") {
            throw new Error(
                "You are already logged in on two devices. Please log out from one device before logging in again.",
            )
        }

        throw new Error(errorData.message || "Login failed")
    }

    const data = await response.json()
    console.log("Raw login response:", data)

    // Handle the actual API response format
    if (data.token) {
        const token = data.token
        const user = data.admin || data.user

        if (token && user) {
            // Determine the primary role to store in cookie
            let primaryRole = "admin"
            if (Array.isArray(user.roles) && user.roles.length > 0) {
                const firstRole = user.roles[0] as any
                primaryRole = typeof firstRole === "string" ? firstRole : firstRole.name
            } else if (user.role) {
                primaryRole = user.role
            }

            console.log("Storing primary role in cookie:", primaryRole)

            // Set cookies with longer expiration
            setCookie("token", token, 30) // 30 days
            setCookie("user_role", primaryRole, 30)
            setCookie("user_phone", user.phoneNumber || user.phone_number || "", 30)

            // Store user data including roles and permissions
            storeUserData(user)

            // Store the device ID if returned by server (fallback to local one if not)
            const serverDeviceId = data.device_id || deviceId
            safeStorage.setItem("device_id", serverDeviceId)

            console.log("Login successful, data stored")
        }
    }

    return data
}

export const logout = async () => {
    const deviceId = getDeviceId()
    const token = getToken()

    console.log("Logging out user...")

    // Send logout request to server to invalidate this device session
    if (token) {
        try {
            await fetch("/api/auth/admin/logout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "X-Device-ID": deviceId,
                },
                body: JSON.stringify({ device_id: deviceId }),
            })
        } catch (error) {
            console.error("Error during server logout:", error)
            // Continue with local logout even if server logout fails
        }
    }

    // Clear cookies
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "user_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "user_phone=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"

    // Clear localStorage data
    clearUserData()

    console.log("Logout complete, redirecting to localized login page")

    // Redirect to localized login page
    const loginUrl = getLoginUrl()
    window.location.href = loginUrl
}

export const getToken = (): string | null => {
    // Try cookie first, then localStorage as fallback
    const cookieToken = getCookie("token")
    if (cookieToken) return cookieToken

    // Fallback to localStorage
    return safeStorage.getItem("token")

    return null
}

export const getUserRole = (): string | null => {
    return getCookie("user_role")
}

// Get all roles assigned to the user
export const getUserRoles = (): string[] => {
    try {
        const rolesJson = safeStorage.getItem("user_roles")
        if (rolesJson) {
            return JSON.parse(rolesJson)
        }
    } catch (error) {
        console.error("Error parsing user roles:", error)
    }
    return []
}

// Get all permissions assigned to the user
export const getUserPermissions = (): string[] => {
    try {
        const permissionsJson = safeStorage.getItem("user_permissions")
        if (permissionsJson) {
            return JSON.parse(permissionsJson)
        }
    } catch (error) {
        console.error("Error parsing user permissions:", error)
    }
    return []
}

// Check if user has a specific role
export const hasRole = (roleName: string): boolean => {
    const roles = getUserRoles()
    return roles.includes(roleName)
}

// Check if user has a specific permission
export const hasPermission = (permissionName: string): boolean => {
    const permissions = getUserPermissions()
    return permissions.includes(permissionName)
}

// Check if user has any of the specified permissions
export const hasAnyPermission = (permissionNames: string[]): boolean => {
    const permissions = getUserPermissions()
    return permissionNames.some((permission) => permissions.includes(permission))
}

// Check if user has all of the specified permissions
export const hasAllPermissions = (permissionNames: string[]): boolean => {
    const permissions = getUserPermissions()
    return permissionNames.every((permission) => permissions.includes(permission))
}

// Improved token validation with better error handling
export const validateToken = async (): Promise<boolean> => {
    const token = getToken()
    if (!token) {
        console.log("No token found for validation")
        return false
    }

    try {
        // Use a lightweight endpoint for validation
        const response = await fetch("/api/proxy/user/profile", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "X-Device-ID": getDeviceId(),
                "Content-Type": "application/json",
            },
        })

        const isValid = response.status === 200
        console.log(`Token validation result: ${isValid ? "valid" : "invalid"}`)

        return isValid
    } catch (error) {
        console.log("Token validation failed due to network error:", error)
        // Return true to avoid logout on network issues - only logout on actual 401/403 responses
        return true
    }
}

// Force logout when token is invalid
const forceLogout = () => {
    console.log("🚨 FORCE LOGOUT: Token is invalid")

    // Clear all auth data immediately
    clearUserData()
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "user_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "user_phone=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"

    // Trigger auth state update event
    window.dispatchEvent(new CustomEvent("auth-logout"))

    // Immediate redirect to localized login page
    const loginUrl = getLoginUrl()
    window.location.href = loginUrl
}

let validationInterval: NodeJS.Timeout | null = null
let isValidating = false

// Much more conservative token validation
export const setupTokenValidation = () => {
    if (validationInterval) {
        console.log("Token validation already running")
        return
    }

    console.log("🔐 Setting up token validation...")

    // Only validate after a significant delay to allow page to fully load
    setTimeout(async () => {
        const token = getToken()
        const user = getCurrentUser()

        if (token && user) {
            console.log("🔄 Initial token validation (after page load)...")

            // Check if auth is recent (within last hour)
            const authTimestamp = safeStorage.getItem("auth_timestamp")
            const isRecentAuth = authTimestamp && Date.now() - Number.parseInt(authTimestamp) < 14400000 // 4 hours (14400000 ms)

            if (isRecentAuth) {
                console.log("Recent auth detected, skipping validation")
                return
            }

            if (!isValidating) {
                isValidating = true
                const isValid = await validateToken()
                isValidating = false

                if (!isValid) {
                    console.log("🚨 Initial validation failed, forcing logout")
                    forceLogout()
                }
            }
        }
    }, 30000) // 5 seconds delay after page load

    // Much longer intervals - every 5 minutes
    validationInterval = setInterval(async () => {
        const token = getToken()
        const user = getCurrentUser()

        if (token && user && !isValidating) {
            console.log("🔄 Periodic token validation (every 5 minutes)...")

            isValidating = true
            const isValid = await validateToken()
            isValidating = false

            if (!isValid) {
                console.log("🚨 Periodic validation failed, forcing logout")
                forceLogout()
            }
        } else if (!token || !user) {
            console.log("No token or user found, stopping validation")
            stopTokenValidation()
        }
    }, 1800000) // Check every 5 minutes

    return () => {
        if (validationInterval) {
            clearInterval(validationInterval)
            validationInterval = null
        }
    }
}

// Stop token validation
export const stopTokenValidation = () => {
    if (validationInterval) {
        clearInterval(validationInterval)
        validationInterval = null
        isValidating = false
        console.log("🛑 Token validation stopped")
    }
}

// Get the current user data with better error handling
export const getCurrentUser = (): User | null => {
    if (typeof window === "undefined") return null
    try {
        const userJson = safeStorage.getItem("user")
        if (userJson) {
            const user = JSON.parse(userJson)
            return user
        }
    } catch (error) {
        console.error("Error parsing user data:", error)
        // Clear corrupted data
        safeStorage.removeItem("user")
    }
    return null
}

export const getUserPhone = (): string | null => {
    return getCookie("user_phone")
}

// Check if user is authenticated with better validation
export const isAuthenticated = (): boolean => {
    const token = getToken()
    const user = getCurrentUser()
    const hasValidData = !!(token && user && user.id)

    console.log("Auth check:", { hasToken: !!token, hasUser: !!user, hasValidData })

    return hasValidData
}

// Export the helper functions for use in components
export { getCurrentLocale, getLoginUrl, getAdminDashboardUrl }
