"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { FlashIcon, PackageSearchIcon } from "@hugeicons/core-free-icons"
import { Icon } from "@/components/ui/icon"
import { LanguageSwitcher } from "@/components/language-switcher"
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { TrackParcelModal } from "@/components/modals/track-parcel-modal"
import { CommandSearch } from "@/components/search/command-search"
import { useTr } from "@/lib/i18n/portal"

// Top-bar actions shared by every portal: language, Track Parcel, Quick Actions
export function HeaderActions({ role }: { role: "ADMIN" | "OPS" | "OWNER" }) {
    const tr = useTr()
    const params = useParams()
    const locale = (params?.locale as string) || "en"
    const [trackOpen, setTrackOpen] = useState(false)

    return (
        <>
            <div className="flex items-center gap-2 sm:gap-3 sm:pr-4 sm:border-r border-slate-200 dark:border-white/10 sm:mr-2">
                <CommandSearch />
                <LanguageSwitcher />

                <button
                    onClick={() => setTrackOpen(true)}
                    aria-label={tr("Track parcel")}
                    className="md:hidden flex size-10 items-center justify-center bg-[#ffd428] text-[#242a37] rounded-[var(--ds-radius-small)] cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-[#242a37]"
                >
                    <Icon icon={PackageSearchIcon} className="size-5" />
                </button>
                <button
                    onClick={() => setTrackOpen(true)}
                    className="hidden md:flex items-center gap-2.5 h-10 px-6 bg-[#ffd428] hover:bg-[#ffdb4d] text-[#242a37] rounded-[var(--ds-radius-small)] transition-colors font-semibold text-xs cursor-pointer outline-none shadow-[var(--ds-shadow-raised)] focus-visible:outline-2 focus-visible:outline-[#242a37]"
                >
                    <Icon icon={PackageSearchIcon} className="size-5" />
                    <span>{tr("Track Parcel")}</span>
                </button>

                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <button
                            aria-label={tr("Quick actions")}
                            className="flex items-center gap-2.5 h-10 px-3 sm:px-5 bg-[#242a37] dark:bg-[#ffd428]/10 hover:bg-[#2d3545] dark:hover:bg-[#ffd428]/20 text-white dark:text-[#ffd428] border border-transparent dark:border-[#ffd428]/20 rounded-[var(--ds-radius-small)] transition-colors cursor-pointer outline-none shadow-[var(--ds-shadow-raised)] focus-visible:outline-2 focus-visible:outline-[#ffd428]"
                        >
                            <Icon icon={FlashIcon} className="size-5 fill-current" />
                            <span className="hidden sm:inline font-semibold text-xs leading-none">{tr("Quick Actions")}</span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[min(20rem,calc(100vw-2rem))] rounded-[var(--ds-radius-large)] bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/5 p-0 overflow-hidden mt-2 shadow-[var(--ds-shadow-raised)]" align="end">
                        <div className="bg-[#242a37] p-6 text-white">
                            <div className="flex items-center gap-2">
                                <div className="size-6 rounded-[var(--ds-radius-small)] bg-[#ffd428] flex items-center justify-center">
                                    <Icon icon={FlashIcon} className="size-3.5 text-[#242a37] fill-current" />
                                </div>
                                <DropdownMenuLabel className="p-0 text-lg font-semibold">{tr("Quick actions")}</DropdownMenuLabel>
                            </div>
                            <p className="text-xs text-white/40 font-semibold mt-2 leading-none">{tr("Common tasks")}</p>
                        </div>
                        <div className="p-4 bg-slate-50/50 dark:bg-black/20">
                            <QuickActions userRole={role} locale={locale} />
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <TrackParcelModal isOpen={trackOpen} onClose={() => setTrackOpen(false)} />
        </>
    )
}
