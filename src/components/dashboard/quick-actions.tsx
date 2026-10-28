"use client"
import { Icon } from "@/components/ui/icon"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"
import { motion } from "framer-motion"
import { 
    UserCircleIcon, 
    OfficeIcon, 
    BusIcon, 
    Note01Icon, 
    Location01Icon,
    Chart01Icon,
    Settings01Icon
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { useTr } from "@/lib/i18n/portal"

interface QuickActionsProps {
    userRole: 'ADMIN' | 'OPS' | 'OWNER' | 'CUSTOMER' | 'BUSINESS' | 'AGENT'
    locale?: string
}

export function QuickActions({ userRole, locale = 'en' }: QuickActionsProps) {
    const tr = useTr()
    const router = useRouter()
    const isMobile = useIsMobile()

    // Define role-specific actions
    const getRoleActions = () => {
        const baseUrl = `/${locale}`

        switch (userRole) {
            case 'ADMIN':
                return [
                    { title: tr("Staff Accounts"), icon: UserCircleIcon, onClick: () => router.push(`${baseUrl}/admin/users/admins`), description: tr("Admins, operations and owners") },
                    { title: tr("Companies"), icon: OfficeIcon, onClick: () => router.push(`${baseUrl}/admin/companies`), description: tr("Bus companies and their owners") },
                    { title: tr("Locations"), icon: Location01Icon, onClick: () => router.push(`${baseUrl}/admin/locations/regions`), description: tr("Regions, districts and offices") },
                    { title: tr("Settings"), icon: Settings01Icon, onClick: () => router.push(`${baseUrl}/admin/settings`), description: tr("Roles & permissions") },
                ]

            case 'OPS':
                return [
                    { title: tr("Agents"), icon: UserCircleIcon, onClick: () => router.push(`${baseUrl}/ops/agents`), description: tr("Add and manage agents") },
                    { title: tr("Companies"), icon: OfficeIcon, onClick: () => router.push(`${baseUrl}/ops/companies`), description: tr("Bus companies and owners") },
                    { title: tr("Vehicles"), icon: BusIcon, onClick: () => router.push(`${baseUrl}/ops/vehicles`), description: tr("Fleet across companies") },
                ]

            case 'OWNER':
                return [
                    { title: tr("Parcels"), icon: Note01Icon, onClick: () => router.push(`${baseUrl}/biz/parcels`), description: tr("Your company's parcels") },
                    { title: tr("Agents"), icon: UserCircleIcon, onClick: () => router.push(`${baseUrl}/biz/agents`), description: tr("Your company's agents") },
                    { title: tr("Vehicles"), icon: BusIcon, onClick: () => router.push(`${baseUrl}/biz/vehicles`), description: tr("Your fleet") },
                    { title: tr("Earnings"), icon: Chart01Icon, onClick: () => router.push(`${baseUrl}/biz/earnings`), description: tr("What your parcels earned") },
                ]

            default:
                return []
        }
    }

    const actions = getRoleActions()

    if (actions.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500">
                <p className="text-sm font-medium">{tr("No actions available for your role.")}</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-2">
            {actions.map((action, index) => (
                <motion.button
                    key={action.title}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    onClick={action.onClick}
                    className={cn(
                        "group w-full flex items-center gap-4 p-3 rounded-[var(--ds-radius-small)] border border-transparent transition-all outline-none cursor-pointer",
                        "bg-slate-50 dark:bg-white/[0.03] hover:bg-[#ffd428]/10 dark:hover:bg-[#ffd428]/10 hover:border-[#ffd428]/30"
                    )}
                >
                    <div className="size-10 rounded-[var(--ds-radius-small)] bg-white dark:bg-[#242a37] border border-slate-200 dark:border-white/5 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:text-[#242a37] dark:group-hover:text-[#ffd428] group-hover:border-[#ffd428]/40 transition-colors shadow-[var(--ds-shadow-raised)]">
                        <Icon icon={action.icon} size={18} className="transition-transform" />
                    </div>
                    
                    <div className="flex-1 text-left">
                        <div className="font-bold text-xs text-[#242a37] dark:text-white group-hover:text-[#242a37] transition-colors">{action.title}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-400 transition-colors font-semibold mt-0.5">{action.description}</div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="size-5 rounded-full bg-[#ffd428] flex items-center justify-center">
                            <Icon icon={Settings01Icon} size={10} className="text-[#242a37]" />
                        </div>
                    </div>
                </motion.button>
            ))}
        </div>
    )
}