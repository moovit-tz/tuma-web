"use client"

import React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CountryCodePicker } from "@/components/ui/country-code-picker"
import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import { safeStorage } from "@/lib/safe-storage"
import {
    Eye,
    EyeOff,
    UserPlus,
    KeyRound,
    LogIn,
} from "lucide-react"
import { getAdminDashboardUrl } from "@/lib/auth"
import { staffRole } from "@/lib/portal-access"

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
    onAuthModeChange?: (mode: AuthMode, userType?: UserType | null) => void
}

type AuthMode = "login" | "forgot-password"
type UserType = "customer" | "business" | "transporter" | "driver" | "agent"

// Helper function to get current locale from URL
const getCurrentLocale = (): string => {
    if (typeof window === "undefined") return "en"

    const pathname = window.location.pathname
    const segments = pathname.split("/").filter(Boolean)

    if (segments.length > 0 && (segments[0] === "en" || segments[0] === "sw")) {
        return segments[0]
    }

    return "en"
}

// Role-specific redirect URLs
const getRoleBasedRedirectUrl = (userRoles: string[]): string => {
    const locale = getCurrentLocale()

    // Check roles in priority order: ADMIN > OPS > OWNER
    if (userRoles.includes('ADMIN')) {
        return `/${locale}/admin/dashboard`
    } else if (userRoles.includes('OPS')) {
        return `/${locale}/ops/dashboard`
    } else if (userRoles.includes('OWNER')) {
        return `/${locale}/biz/dashboard`
    } else if (userRoles.includes('CUSTOMER')) {
        return `/${locale}/customer/dashboard`
    } else if (userRoles.includes('TRANSPORTER')) {
        return `/${locale}/trans/dashboard`
    } else if (userRoles.includes('BUSINESS')) {
        return `/${locale}/corp/dashboard`
    }

    // Default fallback to admin dashboard
    return `/${locale}/admin/dashboard`
}

export function UserAuthForm({ className, onAuthModeChange, ...props }: UserAuthFormProps) {
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [showPassword, setShowPassword] = useState<boolean>(false)
    const [countryCode, setCountryCode] = useState<string>("+255")
    const [phoneNumber, setPhoneNumber] = useState<string>("")
    const [authMode, setAuthMode] = useState<AuthMode>("login")

    const { toast } = useToast()
    const router = useRouter()

    // Start loading the dashboards while the user types, so signing in goes
    // straight to a page that's already fetched.
    useEffect(() => {
        const locale = getCurrentLocale()
        for (const portal of ["admin", "ops", "biz"]) router.prefetch(`/${locale}/${portal}/dashboard`)
    }, [router])
    const t = useTranslations()
    const locale = useLocale()

    // Notify parent of auth mode changes
    React.useEffect(() => {
        onAuthModeChange?.(authMode, null)
    }, [authMode, onAuthModeChange])

    // Format phone number based on country code
    const formatPhoneNumber = (value: string, dialCode: string) => {
        const cleaned = value.replace(/\D/g, "")

        if (dialCode === "+255") {
            if (cleaned.length <= 3) {
                return cleaned
            } else if (cleaned.length <= 6) {
                return cleaned.slice(0, 3) + " " + cleaned.slice(3)
            } else {
                return cleaned.slice(0, 3) + " " + cleaned.slice(3, 6) + " " + cleaned.slice(6, 9)
            }
        } else if (dialCode === "+254" || dialCode === "+256") {
            if (cleaned.length <= 3) {
                return cleaned
            } else if (cleaned.length <= 6) {
                return cleaned.slice(0, 3) + " " + cleaned.slice(3)
            } else {
                return cleaned.slice(0, 3) + " " + cleaned.slice(3, 6) + " " + cleaned.slice(6, 9)
            }
        } else if (dialCode === "+1") {
            if (cleaned.length <= 3) {
                return cleaned
            } else if (cleaned.length <= 6) {
                return cleaned.slice(0, 3) + " " + cleaned.slice(3)
            } else {
                return cleaned.slice(0, 3) + " " + cleaned.slice(3, 6) + " " + cleaned.slice(6, 10)
            }
        } else {
            return cleaned
        }
    }

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value, countryCode)
        setPhoneNumber(formatted)
    }

    const getExpectedLength = (dialCode: string) => {
        if (dialCode === "+255" || dialCode === "+254" || dialCode === "+256") {
            return 9
        } else if (dialCode === "+1") {
            return 10
        } else if (dialCode === "+44") {
            return 10
        } else if (dialCode === "+91") {
            return 10
        }
        return 9
    }

    const validatePhoneNumber = (phone: string, dialCode: string) => {
        const cleaned = phone.replace(/\D/g, "")
        const expectedLength = getExpectedLength(dialCode)
        return cleaned.length === expectedLength
    }

    async function onSubmit(event: React.SyntheticEvent) {
        event.preventDefault()
        setIsLoading(true)

        const target = event.target as HTMLFormElement
        const password = target.password.value

        const cleanPhoneNumber = phoneNumber.replace(/\s/g, "")
        const fullPhoneNumber = countryCode.replace("+", "") + cleanPhoneNumber

        if (!validatePhoneNumber(phoneNumber, countryCode)) {
            const expectedLength = getExpectedLength(countryCode)
            toast({
                title: t("auth.login.invalidPhoneNumber"),
                description: `${t("auth.login.pleaseEnterValidPhone")} ${expectedLength} ${t("auth.login.digitsFor")} ${countryCode}`,
                variant: "warning",
            })
            setIsLoading(false)
            return
        }

        try {
            const { login } = await import("@/lib/auth")

            const response = await login({
                phoneNumber: fullPhoneNumber,
                password,
            })

            if (response.success || response.token) {
                const token = response.token
                const user = response.admin || response.user

                if (token && user) {
                    const transformedUser = {
                        id: user.id || user.adminId,
                        name: user.fullName || user.name || user.username,
                        phoneNumber: user.phoneNumber || user.phone_number,
                        email: user.email,
                        roles: user.roles || [],
                        permissions: user.permissions || [],
                        ...user,
                    }

                    safeStorage.setItem("token", token)
                    safeStorage.setItem("user", JSON.stringify(transformedUser))
                    document.cookie = `token=${token}; path=/; max-age=2592000; SameSite=Lax`

                    toast({
                        title: t("auth.login.welcomeBack"),
                        description: `${t("auth.login.successfullyLoggedIn")} ${transformedUser.name}`,
                        variant: "success",
                    })

                    // Role-based redirect logic — never let role parsing block the redirect
                    let redirectUrl = `/${getCurrentLocale()}/admin/dashboard`
                    try {
                        const rawRoles = Array.isArray(transformedUser.roles) ? transformedUser.roles : []
                        const userRoles = rawRoles
                            .map((role: any) =>
                                typeof role === "string" ? role : role?.name || role?.role_name || role?.role || "",
                            )
                            .filter(Boolean)
                            .map((r: string) => r.toUpperCase())

                        // The staff role column decides the portal (same as the API's permission checks)
                        const role = staffRole(transformedUser)
                        redirectUrl = getRoleBasedRedirectUrl(role ? [role] : userRoles)
                    } catch (roleError) {
                        console.error("Role parsing failed, using default redirect:", roleError)
                    }

                    // One client-side navigation (prefetched above). Only if it hasn't
                    // happened after a while fall back to a full page load — doing that
                    // early made the dashboard load twice.
                    router.replace(redirectUrl)
                    setTimeout(() => {
                        if (window.location.pathname.includes("/login")) {
                            window.location.assign(redirectUrl)
                        }
                    }, 8000)
                    // Keep the button in its loading state until the dashboard appears
                    return
                } else {
                    throw new Error("Missing token or user data in response")
                }
            } else {
                throw new Error(response.message || "Login failed")
            }
        } catch (error: any) {
            toast({
                title: t("auth.login.loginFailed"),
                description: error.message || t("auth.login.invalidCredentials"),
                variant: "destructive",
            })
        }
        setIsLoading(false)
    }

    // Login Form
    if (authMode === "login") {
        return (
            <div className={cn("grid gap-6 w-full", className)} {...props}>
                {/* Login Title */}
                <div className="space-y-1.5">
                    <h1 className="text-2xl font-bold tracking-tight text-[#242a37] dark:text-white">{t("auth.login.title")}</h1>
                    <p className="text-sm text-slate-500">{t("auth.login.description")}</p>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid gap-5">
                        <div className="grid gap-2">
                            <Label htmlFor="phone" className="text-xs font-semibold text-slate-600">
                                {t("auth.login.phoneNumber")}
                            </Label>
                            <div className="flex gap-0 overflow-hidden rounded-[var(--ds-radius-small)] border border-slate-200 bg-white transition-colors focus-within:border-[#242a37]/40 focus-within:ring-2 focus-within:ring-[#FFD428]/40 dark:border-white/10 dark:bg-white/5">
                                <div className="flex-shrink-0">
                                    <CountryCodePicker
                                        value={countryCode}
                                        onChange={setCountryCode}
                                        className="h-12 rounded-none border-0 border-r border-slate-200 bg-transparent focus:ring-0 focus:ring-offset-0 dark:border-white/10"
                                    />
                                </div>
                                <Input
                                    id="phone"
                                    placeholder={t("auth.login.phoneNumber")}
                                    type="tel"
                                    autoCapitalize="none"
                                    autoComplete="tel"
                                    autoCorrect="off"
                                    disabled={isLoading}
                                    value={phoneNumber}
                                    onChange={handlePhoneChange}
                                    className="h-12 flex-1 rounded-none border-0 bg-transparent text-[#242a37] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 dark:text-white"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password" className="text-xs font-semibold text-slate-600">
                                {t("auth.login.password")}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    placeholder={t("auth.login.enterPassword")}
                                    type={showPassword ? "text" : "password"}
                                    autoCapitalize="none"
                                    autoComplete="current-password"
                                    autoCorrect="off"
                                    disabled={isLoading}
                                    className="h-12 rounded-[var(--ds-radius-small)] border-slate-200 pr-12 shadow-none focus-visible:border-[#242a37]/40 focus-visible:ring-2 focus-visible:ring-[#FFD428]/40 dark:border-white/10"
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                    aria-label={showPassword ? t("auth.login.hidePassword") : t("auth.login.showPassword")}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <Button disabled={isLoading} className="h-12 w-full cursor-pointer rounded-[var(--ds-radius-small)] bg-[#242a37] font-semibold text-white hover:bg-[#1a1f2a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD428]">
                            {isLoading ? (
                                <>
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    {t("auth.login.signingIn")}
                                </>
                            ) : (
                                t("auth.login.signIn")
                            )}
                        </Button>
                    </div>
                </form>

                <div className="flex flex-col gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => setAuthMode("forgot-password")}
                        disabled={isLoading}
                        className="h-10 w-fit cursor-pointer px-0 text-sm font-semibold text-slate-600 hover:bg-transparent hover:text-[#242a37] hover:underline underline-offset-4 dark:text-slate-300"
                    >
                        <KeyRound className="mr-2 h-4 w-4" />
                        {t("auth.login.forgotPassword")}
                    </Button>

                    {/* Removed signup/create account functionality */}
                    {/* Account creation features will be available in the next update */}
                </div>
            </div>
        )
    }

    // Forgot password: there's no self-service reset. An Admin or Operations
    // user resets it and the person gets a temporary password by SMS.
    if (authMode === "forgot-password") {
        return (
            <div className={cn("grid gap-6 w-full", className)} {...props}>
                <div className="space-y-1.5">
                    <h1 className="text-2xl font-bold tracking-tight text-[#242a37] dark:text-white">{t("auth.forgotPassword.title")}</h1>
                    <p className="text-sm text-slate-500">{t("auth.portal.forgotIntro")}</p>
                </div>
                <ol className="space-y-3">
                    {[t("auth.portal.forgotStep1"), t("auth.portal.forgotStep2"), t("auth.portal.forgotStep3")].map((step, i) => (
                        <li key={step} className="flex gap-3">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#242a37] text-xs font-bold text-[#FFD428]">{i + 1}</span>
                            <span className="pt-0.5 text-sm text-slate-600 dark:text-slate-300">{step}</span>
                        </li>
                    ))}
                </ol>
                <div className="grid gap-3 sm:grid-cols-2">
                    <a href={`/${locale}/contact`}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--ds-radius-small)] bg-[#242a37] text-sm font-semibold text-white hover:bg-[#1a1f2a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD428]">
                        {t("auth.portal.contactSupport")}
                    </a>
                    <Button variant="outline" onClick={() => setAuthMode("login")} className="h-12 rounded-[var(--ds-radius-small)] font-semibold">
                        <LogIn className="mr-2 h-4 w-4" />
                        {t("auth.forgotPassword.rememberPassword")}
                    </Button>
                </div>
            </div>
        )
    }

    return null
}