"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, X } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useLocale, useTranslations } from "next-intl"

const INTERVAL_MS = 5000
const DISMISS_KEY = "landing-banner-dismissed"

/*
 * Announcement bar: label pill | rotating message + link | close.
 * Rotates one message per customer type and pauses while hovered or focused.
 */
export function TopBanner() {
    const t = useTranslations("hero.banner")
    const locale = useLocale()
    const reduceMotion = useReducedMotion()
    const raw = t.raw("items") as unknown
    const items = (Array.isArray(raw) ? raw : Object.values((raw as object) ?? {})) as { label: string; text: string }[]
    const [index, setIndex] = useState(0)
    const [paused, setPaused] = useState(false)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        try {
            if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true)
        } catch {
            /* storage unavailable: just show it */
        }
    }, [])

    useEffect(() => {
        if (paused || dismissed || items.length < 2) return
        const id = window.setInterval(() => setIndex((i) => (i + 1) % items.length), reduceMotion ? INTERVAL_MS * 2 : INTERVAL_MS)
        return () => window.clearInterval(id)
    }, [paused, dismissed, items.length, reduceMotion])

    const dismiss = () => {
        setDismissed(true)
        try {
            sessionStorage.setItem(DISMISS_KEY, "1")
        } catch {
            /* ignore */
        }
    }

    const item = items[index] ?? items[0]
    if (!item || dismissed) return null

    const fade = {
        initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 },
        transition: { duration: 0.35, ease: "easeOut" as const },
    }

    return (
        <div
            role="region"
            aria-label="Announcement"
            className="bg-gradient-to-r from-[#1a1f2a] via-[#242a37] to-[#3a4560] text-white"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
        >
            <div className="mx-auto flex min-h-14 max-w-6xl items-center gap-4 px-4 py-2 sm:px-6">
                {/* Label pill */}
                <div className="hidden shrink-0 sm:block">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.span key={`label-${index}`} {...fade} className="block rounded-full bg-black/25 px-5 py-2 text-sm font-semibold text-[#FFD428] ring-1 ring-white/10">
                            {item.label}
                        </motion.span>
                    </AnimatePresence>
                </div>
                <span aria-hidden className="hidden h-8 w-px shrink-0 bg-white/15 sm:block" />

                {/* Message */}
                <div className="min-w-0 flex-1 text-center">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.p key={`text-${index}`} {...fade} className="text-sm leading-6 text-white/90 sm:text-[15px]">
                            <span className="font-semibold text-[#FFD428] sm:hidden">{item.label}: </span>
                            {item.text}{" "}
                            <Link
                                href={`/${locale}/contact`}
                                className="ml-1 inline-flex items-center gap-1 whitespace-nowrap font-semibold text-white underline underline-offset-4 hover:text-[#FFD428] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD428]"
                            >
                                {t("cta")}
                                <ArrowUpRight className="size-4" aria-hidden />
                            </Link>
                        </motion.p>
                    </AnimatePresence>
                </div>

                {/* Close */}
                <span aria-hidden className="hidden h-8 w-px shrink-0 bg-white/15 sm:block" />
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Dismiss announcement"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#FFD428]"
                >
                    <X className="size-5" aria-hidden />
                </button>
            </div>
        </div>
    )
}
