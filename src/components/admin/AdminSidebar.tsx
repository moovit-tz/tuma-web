"use client"

import {
    Building2,
    CircleHelp,
    LayoutDashboard,
    Package,
    Users,
    Bus,
    MapPin,
    Banknote,
    HandCoins,
    FileText,
    Settings,
    Boxes,
    ReceiptText,
    Plug,
    Construction,
    ScrollText,
} from "lucide-react"
import { PortalSidebar, type PortalNavItem } from "@/components/shell/portal-sidebar"

const navItems: PortalNavItem[] = [
    { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { title: "Companies", href: "/admin/companies", icon: Building2 },
    {
        title: "User Management",
        icon: Users,
        items: [
            { title: "Admins & Staff", href: "/admin/users/admins", icon: Users },
            { title: "Owners", href: "/admin/users/owners", icon: Users },
            { title: "Agents", href: "/admin/users/agents", icon: Users },
        ],
    },
    {
        title: "Vehicles Management",
        icon: Bus,
        items: [
            { title: "Brands", href: "/admin/vehicles/brands", icon: Bus },
            { title: "Fleet Types", href: "/admin/vehicles/fleet-types", icon: Bus },
            { title: "Vehicle Models", href: "/admin/vehicles/models", icon: Bus },
            { title: "Seat Layouts", href: "/admin/vehicles/seat-layouts", icon: Bus },
            { title: "Vehicles", href: "/admin/vehicles/vehicles", icon: Bus },
        ],
    },
    {
        title: "Locations Management",
        icon: MapPin,
        items: [
            { title: "Countries", href: "/admin/locations/countries", icon: MapPin },
            { title: "Regions", href: "/admin/locations/regions", icon: MapPin },
            { title: "Districts", href: "/admin/locations/districts", icon: MapPin },
            { title: "Booking Offices", href: "/admin/locations/booking-offices", icon: MapPin },
        ],
    },
    {
        title: "Parcels",
        icon: Package,
        items: [
            { title: "All Parcels", href: "/admin/parcels", icon: Package },
            { title: "Parcel Types", href: "/admin/parcels/parcel-types", icon: Boxes },
        ],
    },
    { title: "Beneficiaries", href: "/admin/beneficiaries", icon: HandCoins },
    {
        title: "Finance",
        icon: Banknote,
        items: [
            { title: "Earnings", href: "/admin/finance/earnings", icon: Banknote },
            { title: "Transactions", href: "/admin/finance/transactions", icon: Banknote },
            { title: "Commissions", href: "/admin/finance/commissions", icon: HandCoins },
            { title: "Invoices", href: "/admin/finance/invoices", icon: ReceiptText },
        ],
    },
]

const secondaryItems: PortalNavItem[] = [
    { title: "Integrations", href: "/admin/integrations", icon: Plug },
    { title: "Maintenance", href: "/admin/maintenance", icon: Construction },
    { title: "Platform Logs", href: "/admin/logs", icon: ScrollText },
    { title: "Settings", href: "/admin/settings", icon: Settings },
    { title: "Help & Support", href: "/admin/help", icon: CircleHelp },
]

interface AdminSidebarProps {
    onClose?: () => void
    isMobile?: boolean
    expanded?: boolean
    onExpandedChange?: (expanded: boolean) => void
}

export function AdminSidebar({ onClose, isMobile, expanded, onExpandedChange }: AdminSidebarProps) {
    return (
        <PortalSidebar
            navItems={navItems}
            secondaryItems={secondaryItems}
            brandSuffix="ADMIN"
            primaryLabel="Management"
            secondaryLabel="System"
            fallbackTitle="Dashboard"
            expanded={expanded}
            onExpandedChange={onExpandedChange}
            isMobile={isMobile}
            onClose={onClose}
        />
    )
}
