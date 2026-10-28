"use client"

import { useEffect, useMemo, useState } from "react"
import { X as XIcon, Mail, Bug, BookOpen } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { Search01Icon, Package01Icon, UserGroupIcon, Wallet01Icon, OfficeIcon, MapsLocation01Icon, Shield01Icon, HandCoinsIcon } from "@hugeicons/core-free-icons"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useTitle } from "@/context/TitleContext"
import { cn } from "@/lib/utils"
import { useTr } from "@/lib/i18n/portal"

/*
 * Help centre: answers about this portal's real features and a way to
 * reach support by email. (No ticket system exists in the backend, so the
 * page doesn't pretend to have one.)
 */

const SUPPORT_EMAIL = "support@mysafari.co.tz"

const TOPICS: { id: string; title: string; icon: any; items: { q: string; a: string }[] }[] = [
    {
        id: "parcels",
        title: "Parcels",
        icon: Package01Icon,
        items: [
            { q: "How do I find a parcel?", a: "Use Track Parcel in the top bar and enter the parcel number, or search on the Parcels page by parcel number, sender or recipient. Click a parcel to open its details, history and receipt." },
            { q: "Can a parcel be cancelled?", a: "Yes, until it has been delivered. Open the parcel, choose the Cancel parcel tab, give a reason and confirm. Cancelled parcels can be restored from the Parcels list with Reverse Cancellation." },
            { q: "How do I give a customer their receipt?", a: "Open the parcel and go to the Receipt tab. Download PDF saves an A4 receipt; Print prints only the receipt." },
        ],
    },
    {
        id: "agents",
        title: "Agents",
        icon: UserGroupIcon,
        items: [
            { q: "An agent forgot their password — what do I do?", a: "Open the agent and choose Reset password (Admin and Operations accounts only). The agent gets a temporary 6-digit password by SMS; it is also shown in the agent's Info tab for 24 hours, or until they set their own." },
            { q: "Why does an agent show 0 parcels?", a: "The count is parcels the agent has booked. New agents, or agents who only receive and hand over parcels, can show 0 until they book one." },
            { q: "Where do I see which office an agent works at?", a: "In the agent's profile under Booking office. An agent can be assigned to more than one office." },
        ],
    },
    {
        id: "float",
        title: "Float and transactions",
        icon: Wallet01Icon,
        items: [
            { q: "What is float?", a: "Float is the prepaid balance an agent uses to book parcels. Agents top it up through mobile money; each top-up appears on the Transactions page." },
            { q: "What do Paid, Pending and Failed mean?", a: "Paid: the provider confirmed the money and the float was topped up. Pending: still waiting for the provider. Failed: the payment didn't go through and the float wasn't changed." },
            { q: "Why can a period show “Pick a shorter period”?", a: "For very long periods there are too many top-ups to add up quickly. The counts still show; choose a shorter period to see amounts, the daily chart and rankings." },
        ],
    },
    {
        id: "beneficiaries",
        title: "Beneficiaries",
        icon: HandCoinsIcon,
        items: [
            { q: "What is a beneficiary?", a: "Someone who receives an automatic, regular deduction from an agent's float — for example a daily or monthly payment." },
            { q: "Why isn't a beneficiary receiving deductions?", a: "It must be assigned to an agent (from the agent's Beneficiaries tab) and be Active. Paused beneficiaries receive nothing until they're resumed." },
        ],
    },
    {
        id: "companies",
        title: "Companies and owners",
        icon: OfficeIcon,
        items: [
            { q: "Why can't I delete a company?", a: "A company that still has agents or vehicles can't be deleted. Remove or move them first, or deactivate the company instead." },
            { q: "How do I reset a bus owner's password?", a: "On the Owners page, open the owner and choose Reset password. They receive a temporary password by SMS." },
        ],
    },
    {
        id: "locations",
        title: "Locations",
        icon: MapsLocation01Icon,
        items: [
            { q: "Why does a region need a code?", a: "Each region is identified by a short, unique code (for example DSM). The portal won't let you reuse a code that another region already has." },
            { q: "Can I move a region to another country?", a: "Not from the portal — a region's country can't be changed once it's created." },
        ],
    },
    {
        id: "account",
        title: "Your account",
        icon: Shield01Icon,
        items: [
            { q: "How do I change my password?", a: "Open your profile (your name, top right), go to Security, enter your current password and the new one twice." },
            { q: "Why was I signed out?", a: "Sessions end after a while for security, or when your password is reset. Sign in again to continue." },
        ],
    },
]

export function HelpPage() {
    const tr = useTr()
    const { setTitle } = useTitle()
    const [search, setSearch] = useState("")
    useEffect(() => setTitle("Help & Support"), [setTitle])

    const q = search.trim().toLowerCase()
    const topics = useMemo(
        () => TOPICS
            .map((t) => ({ ...t, items: t.items.filter((i) => !q || i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)) }))
            .filter((t) => t.items.length > 0),
        [q],
    )
    const reportHref = () => {
        const page = typeof window !== "undefined" ? window.location.href : ""
        const body = `What happened:\n\nWhat I expected:\n\nPage: ${page}\nTime: ${new Date().toLocaleString("en-GB")}\n`
        return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Problem in the MySafari portal")}&body=${encodeURIComponent(body)}`
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-300">
            {/* ── Top bar ── */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-[#242a37] dark:text-white">{tr("Help & Support")}</h2>
                    <p className="text-xs font-bold text-slate-400 mt-1">{tr("Answers to common questions, and how to reach us")}</p>
                </div>
                <div className="relative group w-full lg:w-96">
                    <Icon icon={Search01Icon} size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ffd428] transition-colors" />
                    <Input
                        placeholder={tr("Search help")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-10 pl-10 pr-9 bg-white dark:bg-[#1a1f2b] border-slate-200 dark:border-white/10 rounded-[var(--ds-radius-small)] text-sm font-normal placeholder:text-slate-400 focus:ring-1 focus:ring-[#ffd428]/50 shadow-none w-full"
                    />
                    {search && (
                        <button type="button" aria-label={tr("Clear search")} onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-[#242a37] dark:hover:text-white">
                            <XIcon className="size-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Contact ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                    { title: tr("Email support"), body: "Questions about the portal, accounts or data. We reply by email.", cta: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}`, icon: Mail },
                    { title: tr("Report a problem"), body: "Something broken or wrong? This opens an email with this page's details filled in.", cta: "Report a problem", href: "", icon: Bug },
                ].map((c) => (
                    <Card key={c.title} className="rounded-[var(--ds-radius-large)] border-none bg-[#242a37] relative overflow-hidden shadow-[var(--ds-shadow-raised)]">
                        <div className="absolute right-[-15px] bottom-[-15px] opacity-[0.05] text-[#ffd428] pointer-events-none rotate-12"><c.icon size={100} /></div>
                        <CardContent className="p-6 relative z-10 space-y-4">
                            <div className="size-10 rounded-[var(--ds-radius-small)] flex items-center justify-center bg-white/5"><c.icon className="size-5 text-[#ffd428]" /></div>
                            <div>
                                <p className="text-base font-semibold text-white">{c.title}</p>
                                <p className="mt-1 text-sm text-white/50">{c.body}</p>
                            </div>
                            <a
                                href={c.href || "#"}
                                onClick={(e) => { if (!c.href) { e.preventDefault(); window.location.href = reportHref() } }}
                                className="inline-flex h-10 items-center gap-2 rounded-[var(--ds-radius-large)] bg-[#ffd428] px-6 text-xs font-semibold text-[#242a37] hover:bg-[#ffdb4d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd428]"
                            >
                                <c.icon className="size-4" /> {c.cta}
                            </a>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── FAQ ── */}
            {topics.length === 0 ? (
                <div className="rounded-[var(--ds-radius-large)] bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] px-6 py-16 text-center">
                    <p className="text-sm font-semibold text-[#242a37] dark:text-white">{tr("No answers match “{search}”", { search })}</p>
                    <p className="mt-1 text-sm text-slate-500">{tr("Try other words, or email us at {SUPPORT_EMAIL}.", { SUPPORT_EMAIL })}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {topics.map((topic) => (
                        <Card key={topic.id} className="rounded-[var(--ds-radius-large)] border-none bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] p-0 overflow-hidden">
                            <CardHeader className="py-6 px-6 bg-[#242a37] text-white border-none">
                                <CardTitle className="text-lg font-semibold text-white flex items-center gap-3">
                                    <Icon icon={topic.icon} className="text-[#ffd428]" size={22} />
                                    {topic.title}
                                </CardTitle>
                                <CardDescription className="text-xs font-bold text-white/40">
                                    {topic.items.length}{" "}{tr("question")}{topic.items.length === 1 ? "" : "s"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Accordion type="multiple" defaultValue={q ? topic.items.map((_, i) => `${topic.id}-${i}`) : []}>
                                    {topic.items.map((item, i) => (
                                        <AccordionItem key={i} value={`${topic.id}-${i}`} className={cn("border-slate-100 dark:border-white/5 px-6", i === topic.items.length - 1 && "border-b-0")}>
                                            <AccordionTrigger className="text-left text-sm font-semibold text-[#242a37] dark:text-white hover:no-underline">{item.q}</AccordionTrigger>
                                            <AccordionContent className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.a}</AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <p className="flex items-center gap-2 text-xs text-slate-400">
                <BookOpen className="size-3.5" />{" "}{tr("Can't find what you need? Email")}{" "}{SUPPORT_EMAIL}.
            </p>
        </div>
    )
}
