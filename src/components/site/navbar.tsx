"use client"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Menu, X } from "lucide-react"
import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"

import { Logo } from "@/components/logo"
import { LanguageSwitcher } from "@/components/language-switcher"

/*
 * Flat site navbar: a full-width white bar with a bottom border, logo on the
 * left, links and the sign-in button on the right.
 */
interface SiteNavbarProps {
    // Kept for existing callers; every public page now uses the light bar
    variant?: "default" | "transparent"
}

export function SiteNavbar(_props: SiteNavbarProps) {
    const t = useTranslations()
    const locale = useLocale()
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)
    useEffect(() => setIsOpen(false), [pathname])

    const navigationItems: [string, string][] = [
        ["/tracking", t("navigation.trackParcel") || "Track Parcel"],
        ["/contact", t("navigation.contact") || "Contact"],
    ]
    const href = (path: string) => `/${locale}${path}`
    const isActivePath = (path: string) => {
        // Strip the locale prefix (e.g. /en, /sw) before comparing
        const current = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/"
        return current === path || current.startsWith(`${path}/`)
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white">
            <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
                <Link href={href("")} className="flex flex-shrink-0 items-center" aria-label="MySafari Parcel home">
                    <Logo />
                </Link>

                {/* Desktop */}
                <div className="hidden items-center gap-8 lg:flex">
                    <nav aria-label="Main" className="flex items-center gap-8">
                        {navigationItems.map(([path, label]) => {
                            const active = isActivePath(path)
                            return (
                                <Link
                                    key={path}
                                    href={href(path)}
                                    aria-current={active ? "page" : undefined}
                                    className={`relative py-7 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#242a37] ${
                                        active ? "text-[#242a37]" : "text-slate-600 hover:text-[#242a37]"
                                    }`}
                                >
                                    {label}
                                    {active && <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-[#FFD428]" />}
                                </Link>
                            )
                        })}
                    </nav>
                    <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
                        <LanguageSwitcher />
                        <Link
                            href={href("/login")}
                            className="inline-flex h-11 items-center rounded-[var(--ds-radius-small)] bg-[#242a37] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1a1f2a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD428]"
                        >
                            {t("navigation.login") || "Login"}
                        </Link>
                    </div>
                </div>

                {/* Mobile toggle */}
                <button
                    type="button"
                    className="flex size-11 items-center justify-center rounded-[var(--ds-radius-small)] text-[#242a37] hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#242a37] lg:hidden"
                    onClick={() => setIsOpen((o) => !o)}
                    aria-expanded={isOpen}
                    aria-controls="site-mobile-menu"
                    aria-label={isOpen ? "Close menu" : "Open menu"}
                >
                    {isOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {/* Mobile menu: drops down flush under the bar */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        id="site-mobile-menu"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="overflow-hidden border-t border-slate-200 bg-white lg:hidden"
                    >
                        <nav aria-label="Main" className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
                            {navigationItems.map(([path, label]) => {
                                const active = isActivePath(path)
                                return (
                                    <Link
                                        key={path}
                                        href={href(path)}
                                        aria-current={active ? "page" : undefined}
                                        className={`flex min-h-[52px] items-center border-b border-slate-100 text-base font-semibold ${active ? "text-[#242a37]" : "text-slate-600"}`}
                                    >
                                        {active && <span aria-hidden className="mr-3 h-5 w-0.5 bg-[#FFD428]" />}
                                        {label}
                                    </Link>
                                )
                            })}
                            <div className="flex items-center gap-3 py-4">
                                <LanguageSwitcher />
                                <Link
                                    href={href("/login")}
                                    className="flex h-12 flex-1 items-center justify-center rounded-[var(--ds-radius-small)] bg-[#242a37] text-sm font-semibold text-white hover:bg-[#1a1f2a]"
                                >
                                    {t("navigation.login") || "Login"}
                                </Link>
                            </div>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    )
}
