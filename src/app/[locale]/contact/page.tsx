"use client"

import { motion } from "framer-motion"
import { ArrowUpRight, BadgeCheck, Mail, MapPin, Phone } from "lucide-react"

import { SiteNavbar } from "@/components/site/navbar"
import { ContactStepper } from "@/components/contact/contact-stepper"

/*
 * Contact page — one screen: what happens next on the left, the
 * three-step enquiry form on the right.
 */

const SUPPORT_EMAIL = "support@mysafari.co.tz"
const SUPPORT_PHONE = "+255 736 969 594"

const STEPS = [
    { title: "We get in touch", text: "Our team calls or emails you to understand how you move parcels." },
    { title: "We set you up", text: "Your booking offices, agents and vehicles go onto MySafari." },
    { title: "You start delivering", text: "Book, track and get paid from the portal and the agent app." },
]

const ADDRESS = "5 Hubert Kariuki, Dar es Salaam"

const CONTACTS = [
    { icon: Phone, label: "Call us", value: SUPPORT_PHONE, href: "tel:+255736969594", action: "Call" },
    { icon: Mail, label: "Email us", value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}`, action: "Email" },
    {
        icon: MapPin,
        label: "Visit us",
        value: ADDRESS,
        href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`,
        action: "Directions",
        external: true,
    },
]

export default function ContactPage() {
    return (
        <div className="relative flex min-h-svh flex-col bg-white text-[#242a37]">
            <SiteNavbar />

            <main className="relative flex flex-1 items-center overflow-hidden">
                {/* Backdrop: soft grid and a gold glow */}
                <div aria-hidden className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white" />
                    <div
                        className="absolute inset-0 opacity-60"
                        style={{
                            backgroundImage:
                                "linear-gradient(rgba(36,42,55,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(36,42,55,0.06) 1px, transparent 1px)",
                            backgroundSize: "64px 64px",
                            maskImage: "radial-gradient(ellipse 60% 70% at 20% 40%, black, transparent)",
                        }}
                    />
                    <div className="absolute -right-32 top-10 size-[28rem] rounded-full bg-[#FFD428]/20 blur-3xl" />
                </div>

                <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:items-stretch lg:gap-14 lg:py-6">
                    {/* ── Left ── */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col gap-8 lg:justify-between">
                        {/* Heading block */}
                        <div>
                        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-[#FFD428]/50 bg-gradient-to-r from-[#FFD428]/10 via-[#FFD428]/25 to-[#FFD428]/10 px-4 py-1.5 text-sm font-semibold">
                            <BadgeCheck className="size-4 fill-[#242a37] text-[#FFF6D1]" aria-hidden />
                            Contact us
                        </p>
                        <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
                            Let&apos;s move your
                            <br />
                            <span className="bg-gradient-to-r from-[#E8B400] via-[#C99A06] to-[#9A6B00] bg-clip-text text-transparent">parcels forward</span>
                        </h1>
                        <p className="mt-3 max-w-md text-base text-slate-600">Tell us about your business and we&apos;ll show you how MySafari Parcel fits.</p>
                        </div>

                        {/* What happens next */}
                        <ol className="relative space-y-4" aria-label="What happens next">
                            <span aria-hidden className="absolute bottom-4 left-[17px] top-4 w-px bg-gradient-to-b from-[#FFD428] to-slate-200" />
                            {STEPS.map((s, i) => (
                                <li key={s.title} className="relative flex gap-4">
                                    <span className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#242a37] text-sm font-bold text-[#FFD428] ring-4 ring-white">
                                        {i + 1}
                                    </span>
                                    <div className="pt-1">
                                        <p className="text-sm font-bold">{s.title}</p>
                                        <p className="mt-0.5 text-sm text-slate-600">{s.text}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>

                        {/* Direct contacts: one card, a row per channel, nothing truncated */}
                        <ul className="divide-y divide-slate-100 overflow-hidden rounded-[var(--ds-radius-large)] border border-slate-200 bg-white/90 shadow-[var(--ds-shadow-raised)] backdrop-blur">
                            {CONTACTS.map((c) => (
                                <li key={c.label}>
                                    <a
                                        href={c.href}
                                        {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                                        className="group flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#242a37]"
                                    >
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--ds-radius-small)] bg-[#242a37] text-[#FFD428]">
                                            <c.icon className="size-[18px]" aria-hidden />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-xs font-semibold text-slate-500">{c.label}</span>
                                            <span className="block text-sm font-semibold text-[#242a37]">{c.value}</span>
                                        </span>
                                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FFD428]/25 px-3 py-1 text-xs font-semibold text-[#242a37] transition-colors group-hover:bg-[#FFD428]">
                                            {c.action}
                                            <ArrowUpRight className="size-3.5" aria-hidden />
                                        </span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* ── Right: enquiry stepper ── */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }} className="flex flex-col">
                        <ContactStepper />
                    </motion.div>
                </div>
            </main>
        </div>
    )
}
