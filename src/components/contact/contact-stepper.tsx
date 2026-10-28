"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowLeft, ArrowRight, Building2, Bus, Check, Pencil, Route, Send, Store, Truck, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTr } from "@/lib/i18n/portal"

/*
 * Three-step enquiry: who you are → your details → your message.
 * There's no contact endpoint in the API, so the last step opens the
 * visitor's email app with everything filled in.
 */

const SUPPORT_EMAIL = "support@mysafari.co.tz"

const CUSTOMER_TYPES = [
    { value: "Bus operator", icon: Bus, hint: "Add parcels to your routes" },
    { value: "Courier service", icon: Truck, hint: "Track every delivery" },
    { value: "Logistics provider", icon: Route, hint: "Run parcel operations" },
    { value: "Business", icon: Store, hint: "Send parcels with ease" },
    { value: "Sender or recipient", icon: UserRound, hint: "Ask about a parcel" },
]

const STEPS = ["About you", "Your details", "Your message"] as const

const MESSAGE_HINTS: Record<string, string> = {
    "Bus operator": "For example: we run 12 buses between Dar es Salaam and Arusha and want to add parcel delivery.",
    "Courier service": "For example: we deliver around 200 parcels a day and want live tracking for customers.",
    "Logistics provider": "For example: we manage several offices and want agents and earnings in one place.",
    Business: "For example: we send parcels upcountry every week and want to track them.",
    "Sender or recipient": "For example: my parcel ABC123 hasn't arrived yet.",
}

const field =
    "h-11 w-full rounded-[var(--ds-radius-small)] border border-slate-200 bg-white px-3.5 text-sm text-[#242a37] placeholder-slate-400 transition-colors focus:border-[#242a37]/40 focus:outline-none focus:ring-2 focus:ring-[#FFD428]/40 aria-[invalid=true]:border-rose-400"
const labelCls = "mb-1.5 block text-xs font-semibold text-slate-600"

export function ContactStepper() {
    const tr = useTr()
    const reduceMotion = useReducedMotion()
    const [step, setStep] = useState(0)
    const [direction, setDirection] = useState(1)
    const [type, setType] = useState<string | null>(null)
    const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", message: "" })
    const [tried, setTried] = useState<Record<number, boolean>>({})
    const [opened, setOpened] = useState(false)
    const bodyRef = useRef<HTMLDivElement>(null)

    const errors = {
        type: !type,
        name: !form.name.trim(),
        phone: form.phone.replace(/\D/g, "").length < 9,
        email: !!form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim()),
        message: !form.message.trim(),
    }
    const stepValid = [!errors.type, !errors.name && !errors.phone && !errors.email, !errors.message]
    const showError = (k: keyof typeof errors, s: number) => !!tried[s] && errors[k]
    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value })

    // Move focus to the first field of the new step (not on first render)
    const mounted = useRef(false)
    useEffect(() => {
        if (!mounted.current) {
            mounted.current = true
            return
        }
        const t = window.setTimeout(() => bodyRef.current?.querySelector<HTMLElement>("input, textarea, button[aria-pressed]")?.focus(), 220)
        return () => window.clearTimeout(t)
    }, [step])

    const go = (to: number) => {
        setDirection(to > step ? 1 : -1)
        setStep(to)
    }
    const next = () => {
        setTried((t) => ({ ...t, [step]: true }))
        if (!stepValid[step]) return
        if (step < STEPS.length - 1) go(step + 1)
        else send()
    }
    const pickType = (value: string) => {
        setType(value)
        setDirection(1)
        window.setTimeout(() => setStep(1), 180)
    }

    const send = () => {
        const company = form.company.trim()
        const lines = [form.message.trim(), "", `Name: ${form.name.trim()}`]
        if (company) lines.push(`Company: ${company}`)
        lines.push(`Phone: ${form.phone.trim()}`)
        if (form.email.trim()) lines.push(`Email: ${form.email.trim()}`)
        lines.push(`I'm a: ${type}`)
        const subject = `MySafari Parcel enquiry: ${type}${company ? `, ${company}` : ""}`
        window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`
        setOpened(true)
    }

    const slide = reduceMotion
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
        : {
            initial: { opacity: 0, x: 24 * direction },
            animate: { opacity: 1, x: 0 },
            exit: { opacity: 0, x: -24 * direction },
        }

    return (
        <div className="relative flex flex-1 flex-col overflow-hidden rounded-[var(--ds-radius-large)] border border-slate-200 bg-white shadow-[0_24px_60px_-20px_rgba(36,42,55,0.25)]">
            {/* Progress */}
            <div className="border-b border-slate-100 px-6 pt-5 pb-4 sm:px-7">
                <ol className="flex items-center gap-2" aria-label={tr("Progress")}>
                    {STEPS.map((label, i) => {
                        const done = i < step
                        const current = i === step
                        const reachable = i <= step || stepValid.slice(0, i).every(Boolean)
                        return (
                            <li key={label} className="flex min-w-0 flex-1 items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => reachable && go(i)}
                                    disabled={!reachable}
                                    aria-current={current ? "step" : undefined}
                                    className="flex min-w-0 items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#242a37] disabled:cursor-not-allowed"
                                >
                                    <span className={cn(
                                        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                                        done ? "bg-[#FFD428] text-[#242a37]" : current ? "bg-[#242a37] text-[#FFD428]" : "bg-slate-100 text-slate-400",
                                    )}>
                                        {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
                                    </span>
                                    <span className={cn("hidden truncate text-xs font-semibold sm:block", current ? "text-[#242a37]" : "text-slate-500")}>{label}</span>
                                </button>
                                {i < STEPS.length - 1 && (
                                    <span aria-hidden className="h-0.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                        <motion.span className="block h-full bg-[#FFD428]" initial={false} animate={{ width: done ? "100%" : "0%" }} transition={{ duration: 0.3 }} />
                                    </span>
                                )}
                            </li>
                        )
                    })}
                </ol>
            </div>

            <form
                noValidate
                className="flex flex-1 flex-col"
                onSubmit={(e) => {
                    e.preventDefault()
                    next()
                }}
            >
                <div ref={bodyRef} className="relative min-h-[23rem] flex-1 px-6 py-5 sm:px-7">
                    <AnimatePresence mode="wait" initial={false} custom={direction}>
                        <motion.div key={step} {...slide} transition={{ duration: 0.2, ease: "easeOut" as const }}>
                            {step === 0 && (
                                <fieldset>
                                    <legend className="text-lg font-bold text-[#242a37]">{tr("Which best describes you?")}</legend>
                                    <p className="mt-1 text-sm text-slate-500">{tr("We'll tailor the conversation to how you move parcels.")}</p>
                                    <div className="mt-4 grid grid-cols-2 gap-2.5">
                                        {CUSTOMER_TYPES.map((c, i) => {
                                            const selected = type === c.value
                                            return (
                                                <button
                                                    key={c.value}
                                                    type="button"
                                                    onClick={() => pickType(c.value)}
                                                    aria-pressed={selected}
                                                    className={cn(
                                                        "group flex items-center gap-3 rounded-[var(--ds-radius-large)] border p-3 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#242a37]",
                                                        i === CUSTOMER_TYPES.length - 1 && "col-span-2",
                                                        selected ? "border-[#242a37] bg-[#242a37] text-white" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-[#242a37]/30 hover:shadow-[var(--ds-shadow-raised)]",
                                                    )}
                                                >
                                                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[var(--ds-radius-small)]", selected ? "bg-[#FFD428] text-[#242a37]" : "bg-[#242a37] text-[#FFD428]")}>
                                                        <c.icon className="size-5" aria-hidden />
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block text-sm font-semibold">{c.value}</span>
                                                        <span className={cn("block truncate text-xs", selected ? "text-white/60" : "text-slate-500")}>{c.hint}</span>
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                    {showError("type", 0) && <p className="mt-3 text-xs text-rose-600" role="alert">{tr("Pick the option that fits you best.")}</p>}
                                </fieldset>
                            )}

                            {step === 1 && (
                                <div>
                                    <p className="text-lg font-bold text-[#242a37]">{tr("How can we reach you?")}</p>
                                    <p className="mt-1 text-sm text-slate-500">{tr("We'll call or email you, nothing else.")}</p>
                                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label htmlFor="c-name" className={labelCls}>{tr("Full name")}</label>
                                            <input id="c-name" autoComplete="name" value={form.name} onChange={set("name")} placeholder={tr("John Doe")} className={field}
                                                aria-invalid={showError("name", 1)} aria-describedby={showError("name", 1) ? "c-name-err" : undefined} />
                                            {showError("name", 1) && <p id="c-name-err" className="mt-1 text-xs text-rose-600">{tr("Enter your name.")}</p>}
                                        </div>
                                        <div>
                                            <label htmlFor="c-company" className={labelCls}>{tr("Company")}{" "}<span className="font-normal text-slate-400">{tr("(optional)")}</span></label>
                                            <input id="c-company" autoComplete="organization" value={form.company} onChange={set("company")} placeholder={tr("Your company")} className={field} />
                                        </div>
                                        <div>
                                            <label htmlFor="c-phone" className={labelCls}>{tr("Phone")}</label>
                                            <input id="c-phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} placeholder={tr("+255 7XX XXX XXX")} className={field}
                                                aria-invalid={showError("phone", 1)} aria-describedby={showError("phone", 1) ? "c-phone-err" : undefined} />
                                            {showError("phone", 1) && <p id="c-phone-err" className="mt-1 text-xs text-rose-600">{tr("Enter a phone number we can call.")}</p>}
                                        </div>
                                        <div>
                                            <label htmlFor="c-email" className={labelCls}>{tr("Email")}{" "}<span className="font-normal text-slate-400">{tr("(optional)")}</span></label>
                                            <input id="c-email" type="email" autoComplete="email" value={form.email} onChange={set("email")} placeholder="you@company.com" className={field}
                                                aria-invalid={showError("email", 1)} aria-describedby={showError("email", 1) ? "c-email-err" : undefined} />
                                            {showError("email", 1) && <p id="c-email-err" className="mt-1 text-xs text-rose-600">{tr("Check the email address.")}</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div>
                                    <p className="text-lg font-bold text-[#242a37]">{tr("How can we help?")}</p>
                                    {/* Summary of the earlier steps */}
                                    <div className="mt-3 flex items-center justify-between gap-3 rounded-[var(--ds-radius-small)] bg-slate-50 px-3.5 py-2.5 text-xs">
                                        <p className="min-w-0 truncate text-slate-600">
                                            <span className="font-semibold text-[#242a37]">{form.name.trim()}</span>
                                            {form.company.trim() && <> · {form.company.trim()}</>} · {type} · {form.phone.trim()}
                                        </p>
                                        <button type="button" onClick={() => go(1)} className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#242a37] hover:underline underline-offset-4">
                                            <Pencil className="size-3" aria-hidden />{" "}{tr("Edit")}</button>
                                    </div>
                                    <label htmlFor="c-message" className={cn(labelCls, "mt-4")}>{tr("Your message")}</label>
                                    <textarea id="c-message" rows={5} value={form.message} onChange={set("message")}
                                        placeholder={(type && MESSAGE_HINTS[type]) || MESSAGE_HINTS["Bus operator"]}
                                        className={cn(field, "h-auto resize-none py-2.5")}
                                        aria-invalid={showError("message", 2)} aria-describedby={showError("message", 2) ? "c-message-err" : "c-message-help"} />
                                    {showError("message", 2) ? (
                                        <p id="c-message-err" className="mt-1 text-xs text-rose-600">{tr("Tell us a little about what you need.")}</p>
                                    ) : (
                                        <p id="c-message-help" className="mt-1 text-xs text-slate-500" aria-live="polite">
                                            {opened ? tr("Your email app should open with the message ready to send.") : tr("Sending opens your email app, addressed to {SUPPORT_EMAIL}.", { SUPPORT_EMAIL })}
                                        </p>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 sm:px-7">
                    {step > 0 ? (
                        <button type="button" onClick={() => go(step - 1)}
                            className="inline-flex h-11 items-center gap-1.5 rounded-[var(--ds-radius-small)] px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-[#242a37] focus-visible:outline-2 focus-visible:outline-[#242a37]">
                            <ArrowLeft className="size-4" aria-hidden />{" "}{tr("Back")}</button>
                    ) : (
                        <span className="text-xs text-slate-500">{tr("Step 1 of {STEPSCount}", { STEPSCount: STEPS.length })}</span>
                    )}
                    <button
                        type="submit"
                        className="inline-flex h-11 items-center gap-2 rounded-[var(--ds-radius-small)] bg-[#242a37] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1a1f2a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD428]"
                    >
                        {step < STEPS.length - 1 ? <>{tr("Continue")}{" "}<ArrowRight className="size-4" aria-hidden /></> : <>{tr("Send message")}{" "}<Send className="size-4" aria-hidden /></>}
                    </button>
                </div>
            </form>
        </div>
    )
}
