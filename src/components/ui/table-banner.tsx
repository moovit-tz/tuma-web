import type * as React from "react"
import {
    Banknote,
    Building2,
    Bus,
    Car,
    FileText,
    Globe,
    HandCoins,
    LayoutGrid,
    Map,
    MapPin,
    Package,
    Shield,
    Tags,
    Users,
    Wallet,
    type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

const BANNER_ICONS = {
    parcels: Package,
    transactions: Wallet,
    earnings: Banknote,
    commissions: HandCoins,
    users: Users,
    companies: Building2,
    vehicles: Car,
    fleet: Bus,
    brands: Tags,
    layouts: LayoutGrid,
    countries: Globe,
    regions: Map,
    places: MapPin,
    roles: Shield,
    reports: FileText,
} satisfies Record<string, LucideIcon>

export type TableBannerIcon = keyof typeof BANNER_ICONS

interface TableBannerProps {
    title: React.ReactNode
    description?: React.ReactNode
    /** Shown large and faded on the right */
    icon?: TableBannerIcon
    /** Buttons or filters on the right of the title */
    actions?: React.ReactNode
    className?: string
}

/** Navy title band that sits on top of a table — the "All Companies" design. */
export function TableBanner({ title, description, icon, actions, className }: TableBannerProps) {
    const BannerIcon = icon ? BANNER_ICONS[icon] : null
    return (
        <div className={cn("bg-[#242a37] text-white p-8 relative overflow-hidden", className)}>
            {BannerIcon && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-[0.08] pointer-events-none transform scale-125">
                    <BannerIcon size={140} strokeWidth={1.5} />
                </div>
            )}
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h3 className="text-2xl font-bold leading-none">{title}</h3>
                    {description && <p className="text-white/50 font-medium text-sm">{description}</p>}
                </div>
                {actions}
            </div>
        </div>
    )
}
