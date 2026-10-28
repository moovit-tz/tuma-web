"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { ChevronRight, Headset, Mail, MessageSquareText, PackageSearch, Phone, X } from "lucide-react"
import { useTr } from "@/lib/i18n/portal"

/*
 * Floating support: a yellow button that opens a small card in the app's
 * design (navy header, navy icon tiles with yellow icons).
 */
export function FloatingSupport() {
    const tr = useTr()
    const locale = useLocale()
    const reduceMotion = useReducedMotion()
    const [isOpen, setIsOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)

    const items = [
        { icon: Phone, label: tr("Call us"), detail: "+255 736 969 594", href: "tel:+255736969594" },
        { icon: Mail, label: tr("Email us"), detail: "support@mysafari.co.tz", href: "mailto:support@mysafari.co.tz" },
        { icon: MessageSquareText, label: tr("Send a message"), detail: "We'll get back to you", href: `/${locale}/contact` },
        { icon: PackageSearch, label: tr("Track a parcel"), detail: "Use your tracking number", href: `/${locale}/tracking` },
    ]

    // Close on Escape or a click outside
    useEffect(() => {
        if (!isOpen) return
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false)
        const onClick = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setIsOpen(false)
        }
        document.addEventListener("keydown", onKey)
        document.addEventListener("mousedown", onClick)
        return () => {
            document.removeEventListener("keydown", onKey)
            document.removeEventListener("mousedown", onClick)
        }
    }, [isOpen])

    return (
        <div ref={rootRef} className="fixed bottom-5 right-5 z-50 sm:bottom-6 sm:right-6">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        id="support-panel"
                        role="dialog"
                        aria-label={tr("Contact support")}
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
                        transition={{ duration: 0.18, ease: "easeOut" as const }}
                        style={{ transformOrigin: "bottom right" }}
                        className="absolute bottom-full right-0 mb-3 w-[min(20rem,calc(100vw-2.5rem))] overflow-hidden rounded-[var(--ds-radius-large)] border border-slate-200 bg-white shadow-[var(--ds-shadow-raised)]"
                    >
                        <div className="relative overflow-hidden bg-[#242a37] px-5 py-5 text-white">
                            <div aria-hidden className="absolute -right-6 -top-6 size-24 rounded-full bg-[#FFD428]/10" />
                            <div className="relative flex items-center gap-3">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--ds-radius-small)] bg-[#FFD428] text-[#242a37]">
                                    <Headset className="size-5" aria-hidden />
                                </span>
                                <div>
                                    <p className="text-base font-semibold leading-tight">{tr("Need a hand?")}</p>
                                    <p className="mt-0.5 text-xs text-white/60">{tr("Talk to the MySafari team")}</p>
                                </div>
                            </div>
                        </div>
                        <ul className="p-2">
                            {items.map((item) => (
                                <li key={item.label}>
                                    <Link
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className="group flex items-center gap-3 rounded-[var(--ds-radius-small)] px-3 py-3 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#242a37]"
                                    >
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--ds-radius-small)] bg-[#242a37] text-[#FFD428]">
                                            <item.icon className="size-[18px]" aria-hidden />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-semibold text-[#242a37]">{item.label}</span>
                                            <span className="block truncate text-xs text-slate-500">{item.detail}</span>
                                        </span>
                                        <ChevronRight className="size-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#242a37]" aria-hidden />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                type="button"
                onClick={() => setIsOpen((o) => !o)}
                aria-expanded={isOpen}
                aria-controls="support-panel"
                aria-label={isOpen ? tr("Close support") : tr("Contact support")}
                className="relative flex size-14 items-center justify-center rounded-full bg-[#FFD428] text-[#242a37] shadow-[var(--ds-shadow-raised)] ring-4 ring-white transition-transform hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#242a37]"
            >
                <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                        key={isOpen ? "close" : "open"}
                        initial={reduceMotion ? { opacity: 0 } : { rotate: -90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={reduceMotion ? { opacity: 0 } : { rotate: 90, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        {isOpen ? <X className="size-6" aria-hidden /> : <Headset className="size-6" aria-hidden />}
                    </motion.span>
                </AnimatePresence>
            </button>
        </div>
    )
}
