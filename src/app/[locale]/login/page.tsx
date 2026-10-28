"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { BadgeCheck, MapPinned, Wallet, Smartphone, PackageSearch } from "lucide-react"
import { UserAuthForm } from "@/components/user-auth-form"
import { Logo } from "@/components/logo"
import { LanguageSwitcher } from "@/components/language-switcher"

/*
 * Portal sign-in, in the landing page's look: flat top bar, a light hero
 * with the brand story on the left and the sign-in card on the right.
 * Fits one screen on laptops; stacks on phones.
 */

const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: "easeOut" as const, delay },
})

const POINTS = [
    { icon: MapPinned, key: "hero.trust.tracking" },
    { icon: Wallet, key: "hero.trust.float" },
    { icon: Smartphone, key: "hero.trust.app" },
]

export default function AuthenticationPage() {
    const t = useTranslations()
    const locale = useLocale()
    const [mode, setMode] = useState<"login" | "forgot-password">("login")

    return (
        <div className="relative flex min-h-svh flex-col bg-white text-[#242a37]">
            {/* ── Flat top bar ── */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white">
                <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                    <Link href={`/${locale}`} className="flex shrink-0 items-center" aria-label="MySafari Parcel home">
                        <Logo />
                    </Link>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <Link href={`/${locale}/tracking`}
                            className="hidden items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#242a37] sm:inline-flex">
                            <PackageSearch className="size-4" aria-hidden /> {t("navigation.trackParcel")}
                        </Link>
                        <span aria-hidden className="hidden h-6 w-px bg-slate-200 sm:block" />
                        <LanguageSwitcher />
                    </div>
                </div>
            </header>

            <main className="relative flex flex-1 items-center overflow-hidden">
                {/* Backdrop: soft grid and a gold glow, as on the landing page */}
                <div aria-hidden className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white" />
                    <div
                        className="absolute inset-0 opacity-60"
                        style={{
                            backgroundImage:
                                "linear-gradient(rgba(36,42,55,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(36,42,55,0.06) 1px, transparent 1px)",
                            backgroundSize: "64px 64px",
                            maskImage: "radial-gradient(ellipse 60% 70% at 25% 40%, black, transparent)",
                        }}
                    />
                    <div className="absolute -right-32 top-16 size-[30rem] rounded-full bg-[#FFD428]/20 blur-3xl" />
                </div>

                <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
                    {/* ── Left: brand story ── */}
                    <div className="hidden lg:block">
                        <motion.p {...fadeUp(0)}
                            className="inline-flex items-center gap-2.5 rounded-full border border-[#FFD428]/50 bg-gradient-to-r from-[#FFD428]/10 via-[#FFD428]/25 to-[#FFD428]/10 px-4 py-2 text-sm font-semibold">
                            <BadgeCheck className="size-5 shrink-0 fill-[#242a37] text-[#FFF6D1]" aria-hidden />
                            {t("hero.eyebrow")}
                        </motion.p>
                        <motion.h1 {...fadeUp(0.06)} className="mt-5 text-5xl font-bold leading-[1.08] tracking-tight">
                            {t("auth.portal.welcome")}
                            <br />
                            <span className="bg-gradient-to-r from-[#E8B400] via-[#C99A06] to-[#9A6B00] bg-clip-text text-transparent">MySafari Parcel</span>
                        </motion.h1>
                        <motion.p {...fadeUp(0.12)} className="mt-4 max-w-md text-lg leading-relaxed text-slate-600">
                            {t("hero.description")}
                        </motion.p>

                        <div className="mt-8 flex items-end gap-6">
                            <motion.ul {...fadeUp(0.18)} className="flex-1 space-y-3">
                                {POINTS.map(({ icon: Icon, key }) => (
                                    <li key={key} className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--ds-radius-small)] bg-[#242a37] text-[#FFD428]">
                                            <Icon className="size-4" aria-hidden />
                                        </span>
                                        {t(key)}
                                    </li>
                                ))}
                            </motion.ul>
                            <motion.div {...fadeUp(0.1)} className="relative hidden w-44 shrink-0 xl:block">
                                <div aria-hidden className="absolute inset-x-2 bottom-0 top-10 rounded-[1.75rem] bg-[#FFD428]" />
                                <Image src="/images/hero-courier.webp" alt="" width={900} height={1325} sizes="11rem" className="relative h-auto w-full" priority />
                            </motion.div>
                        </div>
                    </div>

                    {/* ── Right: sign-in card ── */}
                    <motion.div {...fadeUp(0.08)} className="mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end">
                        <div className="overflow-hidden rounded-[var(--ds-radius-large)] border border-slate-200 bg-white shadow-[0_24px_60px_-20px_rgba(36,42,55,0.25)] dark:border-white/10 dark:bg-[#1a1f2b]">
                            <div className="p-6 sm:p-8">
                                {mode === "login" && (
                                    <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#242a37] px-3 py-1 text-[11px] font-semibold text-[#FFD428]">
                                        <span className="size-1.5 rounded-full bg-[#FFD428]" aria-hidden /> {t("auth.portal.badge")}
                                    </p>
                                )}
                                <UserAuthForm onAuthModeChange={(m) => setMode(m)} />
                            </div>
                        </div>
                        <p className="mt-5 text-center text-xs text-slate-500">
                            {t("auth.portal.lookingFor")}{" "}
                            <Link href={`/${locale}/tracking`} className="font-semibold text-[#242a37] underline-offset-4 hover:underline">{t("navigation.trackParcel")}</Link>
                            {" · "}
                            <Link href={`/${locale}/contact`} className="font-semibold text-[#242a37] underline-offset-4 hover:underline">{t("navigation.contact")}</Link>
                        </p>
                    </motion.div>
                </div>
            </main>

            <footer className="relative border-t border-slate-100 bg-white">
                <p className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-slate-400 sm:px-6">© {new Date().getFullYear()} MySafari. {t("auth.portal.rights")}</p>
            </footer>
        </div>
    )
}
