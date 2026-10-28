"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight, BadgeCheck, Search, Smartphone, Wallet, MapPinned } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import ReactRotatingText from "react-rotating-text"
import { Partners } from "@/components/landing/partners"
import { TRACKING_EXAMPLE, normaliseTrackingNumber, trackingNumberProblem } from "@/lib/tracking-number"

const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" as const, delay },
})

// Facts about the product, not ratings or figures we can't back up
const TRUST = [
    { icon: MapPinned, key: "hero.trust.tracking" },
    { icon: Wallet, key: "hero.trust.float" },
    { icon: Smartphone, key: "hero.trust.app" },
]

export function Hero() {
    const t = useTranslations()
    const locale = useLocale()
    const router = useRouter()
    const [trackingNo, setTrackingNo] = useState("")

    const stakeholderKeys = [
        "hero.stakeholders.transportOperators",
        "hero.stakeholders.courierServices",
        "hero.stakeholders.logisticsProviders",
        "hero.stakeholders.businesses",
    ]

    const [trackingError, setTrackingError] = useState<string | null>(null)
    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        const q = normaliseTrackingNumber(trackingNo)
        const problem = trackingNumberProblem(q)
        setTrackingError(problem)
        if (!problem) router.push(`/${locale}/tracking?tracking_number=${encodeURIComponent(q)}`)
    }

    return (
        <section className="relative flex min-h-[600px] flex-1 flex-col overflow-hidden bg-white">
            {/* Backdrop */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white" />
                <div
                    className="absolute inset-0 opacity-60"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(36,42,55,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(36,42,55,0.06) 1px, transparent 1px)",
                        backgroundSize: "64px 64px",
                        maskImage: "radial-gradient(ellipse 70% 60% at 30% 40%, black, transparent)",
                    }}
                />
            </div>

            <div className="relative mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 pb-6 pt-8 sm:px-6 lg:grid-cols-[1.3fr_0.7fr] lg:gap-6">
                {/* Copy */}
                <div className="text-left">
                    <motion.p
                        {...fadeUp(0)}
                        className="inline-flex items-center gap-2.5 rounded-full border border-[#FFD428]/50 bg-gradient-to-r from-[#FFD428]/10 via-[#FFD428]/25 to-[#FFD428]/10 px-4 py-2 text-sm font-semibold text-[#242a37] sm:px-5 sm:py-2.5 sm:text-base"
                    >
                        <BadgeCheck className="size-5 shrink-0 fill-[#242a37] text-[#FFF6D1]" aria-hidden />
                        {t("hero.eyebrow")}
                    </motion.p>

                    <motion.h1 {...fadeUp(0.06)} className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-[#242a37] sm:text-5xl lg:text-[3.5rem]">
                        {t("hero.headline.line1")}
                        <br />
                        {/* Rotating text: no highlight, no typing cursor. The line keeps
                            its height while the words change so the page doesn't jump. */}
                        <span className="block min-h-[2.16em] sm:min-h-[1.08em] sm:whitespace-nowrap">
                            {t("hero.headline.line2")}{" "}
                            {/* Gold gradient, deep enough at its darker end to read on white */}
                            <span className="bg-gradient-to-r from-[#E8B400] via-[#C99A06] to-[#9A6B00] bg-clip-text text-transparent">
                                <ReactRotatingText items={stakeholderKeys.map((key) => t(key))} interval={3000} cursor={false} />
                            </span>
                        </span>
                    </motion.h1>

                    <motion.p {...fadeUp(0.12)} className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                        {t("hero.description")}
                    </motion.p>

                    <motion.form {...fadeUp(0.18)} onSubmit={submit} className="mt-8 w-full max-w-lg">
                        <label htmlFor="hero-tracking" className="sr-only">Tracking number</label>
                        <div className="flex items-center rounded-[var(--ds-radius-large)] border border-slate-200 bg-white p-2 shadow-[var(--ds-shadow-raised)] transition-colors focus-within:border-[#242a37]/40 focus-within:ring-2 focus-within:ring-[#FFD428]/40">
                            <Search className="ml-3 h-5 w-5 flex-shrink-0 text-slate-400" aria-hidden />
                            <input
                                id="hero-tracking"
                                type="text"
                                placeholder={`Tracking number, e.g. ${TRACKING_EXAMPLE}`}
                                value={trackingNo}
                                onChange={(e) => { setTrackingNo(normaliseTrackingNumber(e.target.value)); if (trackingError) setTrackingError(null) }}
                                maxLength={8}
                                autoComplete="off"
                                spellCheck={false}
                                aria-invalid={!!trackingError}
                                aria-describedby={trackingError ? "hero-tracking-error" : undefined}
                                className="w-full border-0 bg-transparent px-3 py-2.5 text-sm text-[#242a37] placeholder-slate-400 focus:outline-none focus:ring-0"
                            />
                            <button
                                type="submit"
                                className="flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--ds-radius-small)] bg-[#242a37] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a1f2a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD428]"
                            >
                                Track
                                <ArrowRight className="h-4 w-4" aria-hidden />
                            </button>
                        </div>
                        {trackingError && <p id="hero-tracking-error" className="mt-2 px-1 text-xs text-rose-600" role="alert">{trackingError}</p>}
                    </motion.form>

                    <motion.div {...fadeUp(0.24)} className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                        <Link href={`/${locale}/contact`} className="inline-flex items-center gap-1.5 font-semibold text-[#242a37] underline-offset-4 hover:underline">
                            Bring your company on board <ArrowRight className="h-4 w-4" aria-hidden />
                        </Link>
                    </motion.div>

                    <motion.ul {...fadeUp(0.3)} className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
                        {TRUST.map(({ icon: Icon, key }) => (
                            <li key={key} className="flex items-center gap-2.5 text-xs font-semibold text-slate-600">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--ds-radius-small)] bg-[#242a37] text-[#FFD428]">
                                    <Icon className="size-4" aria-hidden />
                                </span>
                                {t(key)}
                            </li>
                        ))}
                    </motion.ul>
                </div>

                {/* Image */}
                <motion.div {...fadeUp(0.1)} className="relative mx-auto hidden w-full max-w-[min(28rem,calc((100svh-18.5rem)*0.68))] lg:block">
                    <div aria-hidden className="absolute inset-x-6 bottom-0 top-16 rounded-[2.5rem] bg-[#FFD428]" />
                    <div aria-hidden className="absolute -right-4 top-24 size-24 rounded-full border-[10px] border-[#242a37]/10" />
                    <Image
                        src="/images/hero-courier.webp"
                        alt="MySafari agent with parcels ready for dispatch"
                        width={900}
                        height={1325}
                        priority
                        sizes="(min-width: 1024px) 28rem, 0px"
                        className="relative z-10 h-auto w-full"
                    />
                </motion.div>
            </div>

            <div className="relative border-t border-slate-100 bg-white py-6">
                <Partners variant="light" />
            </div>
        </section>
    )
}
