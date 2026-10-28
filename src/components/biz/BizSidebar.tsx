"use client"

import { LayoutDashboard, Users, Package, Bus, Banknote, ReceiptText } from "lucide-react"
import { PortalSidebar, type PortalNavItem } from "@/components/shell/portal-sidebar"

const navItems: PortalNavItem[] = [
    { title: "Dashboard", href: "/biz/dashboard", icon: LayoutDashboard },
    { title: "Agents", href: "/biz/agents", icon: Users },
    { title: "Vehicles", href: "/biz/vehicles", icon: Bus },
    { title: "Parcels", href: "/biz/parcels", icon: Package },
    { title: "Earnings", href: "/biz/earnings", icon: Banknote },
    { title: "Invoices", href: "/biz/invoices", icon: ReceiptText },
]

const secondaryItems: PortalNavItem[] = []

interface BizSidebarProps {
    onClose?: () => void
    isMobile?: boolean
    expanded?: boolean
    onExpandedChange?: (expanded: boolean) => void
}

export function BizSidebar({ onClose, isMobile, expanded, onExpandedChange }: BizSidebarProps) {
    return (
        <PortalSidebar
            navItems={navItems}
            secondaryItems={secondaryItems}
            brandSuffix="OWNER"
            primaryLabel="Menu"
            fallbackTitle="Dashboard"
            expanded={expanded}
            onExpandedChange={onExpandedChange}
            isMobile={isMobile}
            onClose={onClose}
        />
    )
}
