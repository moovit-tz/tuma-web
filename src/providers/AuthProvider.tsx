"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { getCurrentUser, getToken, setupTokenValidation, stopTokenValidation } from "@/lib/auth"
import type { User } from "@/types/user"

interface AuthContextType {
    user: User | null
    token: string | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (user: User, token: string) => void
    logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Load auth state from storage on mount
    useEffect(() => {
        const loadAuthState = async () => {
            try {
                console.log("Loading auth state...")

                // Add a small delay to ensure cookies are available
                await new Promise((resolve) => setTimeout(resolve, 100))

                const storedToken = getToken()
                const storedUser = getCurrentUser()

                console.log("Auth state loaded:", {
                    hasToken: !!storedToken,
                    hasUser: !!storedUser,
                    userId: storedUser?.id,
                })

                if (storedToken && storedUser && storedUser.id) {
                    setToken(storedToken)
                    setUser(storedUser)

                    // Setup token validation after successful auth load with delay
                    setTimeout(() => {
                        console.log("Setting up token validation after auth load...")
                        setupTokenValidation()
                    }, 60000) // Changed from 3000 to 60000 (60 seconds)
                } else {
                    console.log("No valid auth data found")
                    setToken(null)
                    setUser(null)
                }
            } catch (error) {
                console.error("Error loading auth state:", error)
                setToken(null)
                setUser(null)
            } finally {
                setIsLoading(false)
            }
        }

        loadAuthState()

        // Listen for auth logout events
        const handleAuthLogout = () => {
            console.log("Auth logout event received")
            setUser(null)
            setToken(null)
            stopTokenValidation()
        }

        // Listen for storage changes (for multi-tab sync)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "user" || e.key === "token") {
                console.log("Auth storage changed, reloading state")
                loadAuthState()
            }
        }

        window.addEventListener("auth-logout", handleAuthLogout)
        window.addEventListener("storage", handleStorageChange)

        return () => {
            window.removeEventListener("auth-logout", handleAuthLogout)
            window.removeEventListener("storage", handleStorageChange)
            stopTokenValidation()
        }
    }, [])

    const login = (userData: User, userToken: string) => {
        console.log("AuthProvider login called with:", {
            hasUserData: !!userData,
            hasToken: !!userToken,
            userId: userData?.id,
        })

        setUser(userData)
        setToken(userToken)

        // Setup token validation after login with delay
        setTimeout(() => {
            console.log("Setting up token validation after login...")
            setupTokenValidation()
        }, 120000) // Changed from 5000 to 120000 (2 minutes)
    }

    const logout = async () => {
        console.log("AuthProvider logout called")
        setUser(null)
        setToken(null)
        stopTokenValidation()

        // Use the auth service logout
        const { logout: authLogout } = await import("@/lib/auth")
        await authLogout()
    }

    const value: AuthContextType = {
        user,
        token,
        isAuthenticated: !!(user && token && user.id),
        isLoading,
        login,
        logout,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
