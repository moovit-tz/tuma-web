"use client"

import { useState, useEffect } from "react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logout, getCurrentUser } from "@/lib/auth"
import { roleLabel, userRoleCode } from "@/lib/role-label"
import { ProfileModal } from "@/components/modals/profile-modal"
import { 
    UserCircleIcon, 
    Logout01Icon, 
    OfficeIcon,
    SecurityCheckIcon
} from "@hugeicons/core-free-icons"
import { Icon } from "@/components/ui/icon"
import { useTr } from "@/lib/i18n/portal"


export function UserNav() {
    const tr = useTr()
    const [userName, setUserName] = useState("User")
    const [userEmail, setUserEmail] = useState("")
    const [userRole, setUserRole] = useState("")
    const [userCompany, setUserCompany] = useState("")
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

    useEffect(() => {
        // Get user data from auth service
        const user = getCurrentUser()

        if (user) {
            setUserName(user.fullName || user.username || "User")
            setUserEmail(user.email || "")

            // Fix: Extract the company name from the company object
            const companyName = user.company?.name || user.companyName || ""
            setUserCompany(companyName)

            const role = userRoleCode(user)
            setUserRole(role)
        }

    }, [])

    const role = userRole.toUpperCase()
    const roleText = roleLabel(userRole)
    // Shown under the name in the top bar
    const triggerSubtitle = role === "OWNER" ? userCompany || roleText : roleText
    const initial = userName.charAt(0).toUpperCase()

    return (
        <>
            <div className="flex items-center">
                {/* User Identity Trigger */}
                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <button
                            aria-label={tr("Account menu")}
                            className="flex items-center gap-3 pl-2 pr-1 h-11 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors duration-200 rounded-[var(--ds-radius-small)] cursor-pointer outline-none group"
                        >
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-[#242a37] dark:text-white leading-none mb-1 truncate max-w-[150px]">{userName}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{triggerSubtitle}</p>
                            </div>
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--ds-radius-small)] bg-[#ffd428] font-semibold text-[#242a37]">
                                {initial}
                            </div>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[min(18rem,calc(100vw-2rem))] rounded-[var(--ds-radius-large)] p-1.5 bg-white dark:bg-[#242a37] border-slate-200 dark:border-white/10 mt-2 shadow-[var(--ds-shadow-overlay)]" align="end" forceMount>
                        <DropdownMenuLabel className="p-3 font-normal">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--ds-radius-small)] bg-[#ffd428] text-base font-semibold text-[#242a37]">
                                    {initial}
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-[#242a37] dark:text-white">{userName}</p>
                                    {userEmail && <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={userEmail}>{userEmail}</p>}
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-white/5 dark:text-slate-300">
                                    <Icon icon={SecurityCheckIcon} size={14} className="text-[#C99A06] dark:text-[#ffd428]" />
                                    {roleText}
                                </span>
                                {role === "OWNER" && userCompany && (
                                    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-white/5 dark:text-slate-300">
                                        <Icon icon={OfficeIcon} size={14} className="shrink-0 text-slate-500" />
                                        <span className="truncate">{userCompany}</span>
                                    </span>
                                )}
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-white/5" />
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)} className="h-10 cursor-pointer gap-3 rounded-[var(--ds-radius-small)] px-3 text-sm font-medium text-[#242a37] focus:bg-slate-100 dark:text-white dark:focus:bg-white/5">
                                <Icon icon={UserCircleIcon} size={18} className="text-slate-500 dark:text-slate-400" />{tr("My profile")}</DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-white/5" />
                        <DropdownMenuItem onClick={() => logout()} className="h-10 cursor-pointer gap-3 rounded-[var(--ds-radius-small)] px-3 text-sm font-medium text-rose-600 focus:bg-rose-50 focus:text-rose-700 dark:text-rose-400 dark:focus:bg-rose-500/10 dark:focus:text-rose-300">
                            <Icon icon={Logout01Icon} size={18} className="text-current" />{tr("Sign out")}</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Profile Modal */}
            {isProfileModalOpen && <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />}
        </>
    )
}