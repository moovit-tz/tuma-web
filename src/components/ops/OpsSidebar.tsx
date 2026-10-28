"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useParams } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    DashboardBrowsingIcon,
    OfficeIcon,
    UserCircleIcon,
    BusIcon,
    Package01Icon,
    Location01Icon,
    CreditCardIcon,
    MoneyReceive01Icon,
    Logout01Icon,
    ArrowLeft01Icon,
    ArrowRight01Icon,
    HelpCircleIcon,
    ArrowDown01Icon,
    Task01Icon,
} from "@hugeicons/core-free-icons"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useIsMobile } from "@/hooks/use-mobile"
import { logout, getCurrentUser } from "@/lib/auth"
import { roleLabel, userRoleCode } from "@/lib/role-label"
import { SidebarLogo } from "@/components/shell/sidebar-logo"
import { AdsTooltip, AdsTooltipProvider } from "@/components/ui/ads-tooltip"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTitle, routeTitles } from "@/context/TitleContext"
import { Icon } from "@/components/ui/icon"
import { useTr } from "@/lib/i18n/portal"

interface NavItem {
    title: string
    href?: string
    icon: any
    items?: NavItem[]
}

const navItems: NavItem[] = [
    {
        title: "Dashboard",
        href: "/ops/dashboard",
        icon: DashboardBrowsingIcon,
    },
    {
        title: "Companies",
        href: "/ops/companies",
        icon: OfficeIcon,
    },
    {
        title: "Stakeholders",
        icon: UserCircleIcon,
        items: [
            {
                title: "Agents",
                href: "/ops/agents",
                icon: UserCircleIcon,
            },
            {
                title: "Owners",
                href: "/ops/bus-owners",
                icon: UserCircleIcon,
            },
        ],
    },
    {
        title: "Locations",
        icon: Location01Icon,
        items: [
            {
                title: "Countries",
                href: "/ops/locations/countries",
                icon: Location01Icon,
            },
            {
                title: "Regions",
                href: "/ops/locations/regions",
                icon: Location01Icon,
            },
            {
                title: "Districts",
                href: "/ops/locations/districts",
                icon: Location01Icon,
            },
            {
                title: "Booking Offices",
                href: "/ops/locations/booking-offices",
                icon: Location01Icon,
            },
        ],
    },
    {
        title: "Vehicles",
        href: "/ops/vehicles",
        icon: BusIcon,
    },
    {
        title: "Parcels",
        href: "/ops/parcels",
        icon: Package01Icon,
    },
    {
        title: "Finance",
        icon: MoneyReceive01Icon,
        items: [
            {
                title: "Transactions",
                href: "/ops/transactions",
                icon: CreditCardIcon,
            },
            {
                title: "Beneficiaries",
                href: "/ops/beneficiaries",
                icon: MoneyReceive01Icon,
            },
        ],
    },
]

const secondaryItems: NavItem[] = [
    {
        title: "Help & Support",
        href: "/ops/help",
        icon: HelpCircleIcon,
    },
]

interface SidebarProps {
    expanded?: boolean
    onExpandedChange?: (expanded: boolean) => void
    isOpen?: boolean
}

export function OpsSidebar({ expanded = false, onExpandedChange, isOpen: mobileOpen }: SidebarProps) {
    const tr = useTr()
    const pathname = usePathname()
    const params = useParams()
    const localeString = (params?.locale as string) || "en"
    const isMobile = useIsMobile()
    const [user, setUser] = useState<any>(null)
    const { setTitle } = useTitle()
    const [openMenu, setOpenMenu] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)

    // Handle hydration
    useEffect(() => {
        setMounted(true)
    }, [])

    // expanded=true means NOT collapsed.
    const isCollapsed = !expanded && !isMobile

    useEffect(() => {
        // Show the locally stored session user immediately; /api/auth/me
        // only refines it when that endpoint answers.
        setUser(getCurrentUser())
        const fetchUser = async () => {
            try {
                const response = await fetch("/api/auth/me")
                if (response.ok) {
                    const data = await response.json()
                    setUser(data)
                }
            } catch (error) {
                console.error("Failed to fetch user:", error)
            }
        }
        fetchUser()
    }, [])

    useEffect(() => {
        const currentPath = pathname.replace(`/${localeString}`, "") || "/"
        const pageTitle = routeTitles[currentPath] || "Operations"
        setTitle(pageTitle)

        // Auto-open parent menu if child is active on initial load
        navItems.forEach(item => {
            if (item.items?.some(sub => isPathActive(sub.href || ""))) {
                setOpenMenu(item.title)
            }
        })
    }, [pathname, localeString, setTitle])

    const isPathActive = (href: string) => {
        if (!href || href === "#") return false
        const localizedHref = `/${localeString}${href}`
        return pathname === localizedHref || pathname.startsWith(`${localizedHref}/`)
    }

    const getLocalizedHref = (href: string) => {
        return `/${localeString}${href}`
    }

    const handleLogout = async () => {
        await logout()
        window.location.href = "/"
    }

    const toggleSidebar = () => {
        onExpandedChange?.(!expanded)
    }

    const toggleMenu = (title: string) => {
        setOpenMenu(prev => (prev === title ? null : title))
    }

    // Atlassian side-navigation item: 40px row, small radius, subtle text and
    // icon, neutral hover/press, and a "selected" state with a left indicator.
    // Colours come from the brand-themed tokens (.ds-theme-nav).
    const itemClass = (selected: boolean) =>
        cn(
            "group relative flex min-h-10 w-full items-center gap-3 rounded-[var(--ds-radius-small)] px-3 text-left text-sm font-medium",
            "transition-colors duration-100 cursor-pointer outline-none",
            "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ds-border-focused)]",
            selected
                ? cn(
                      "bg-[var(--ds-background-selected)] text-[var(--ds-text-selected)] hover:bg-[var(--ds-background-selected-hovered)] active:bg-[var(--ds-background-selected-pressed)]",
                      "before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-[var(--ds-border-selected)]",
                  )
                : "text-[var(--ds-text-subtle)] hover:bg-[var(--ds-background-neutral-subtle-hovered)] active:bg-[var(--ds-background-neutral-subtle-pressed)]",
            isCollapsed && "justify-center px-0",
        )

    const itemIcon = (icon: any, selected: boolean) => (
        <Icon
            icon={icon}
            size={20}
            className={cn("shrink-0", selected ? "text-[var(--ds-icon-selected)]" : "text-[var(--ds-icon-subtle)]")}
        />
    )

    // Icon-only button (Atlassian IconButton, subtle appearance)
    const iconButtonClass = cn(
        "flex size-8 shrink-0 items-center justify-center rounded-[var(--ds-radius-small)] text-[var(--ds-icon-subtle)]",
        "transition-colors duration-100 cursor-pointer outline-none",
        "hover:bg-[var(--ds-background-neutral-subtle-hovered)] active:bg-[var(--ds-background-neutral-subtle-pressed)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-border-focused)]",
    )

    const renderNavItem = (item: NavItem) => {
        const isActive = isPathActive(item.href || "")
        const isParentActive = !!item.items?.some(sub => isPathActive(sub.href || ""))
        const isMenuOpen = openMenu === item.title

        if (item.items) {
            // Collapsed: there's no room to expand the group inline, so it
            // opens as a flyout menu beside the rail instead.
            if (isCollapsed) {
                return (
                    <li key={item.title}>
                        <DropdownMenu modal={false}>
                            <AdsTooltip content={item.title} position="right">
                                <DropdownMenuTrigger asChild>
                                    <button aria-label={item.title} className={itemClass(isParentActive)}>
                                        {itemIcon(item.icon, isParentActive)}
                                    </button>
                                </DropdownMenuTrigger>
                            </AdsTooltip>
                            <DropdownMenuContent
                                side="right"
                                align="start"
                                sideOffset={12}
                                className="min-w-[220px] rounded-[var(--ds-radius-large)] border-none bg-[var(--ds-surface-overlay)] p-0 py-1.5 shadow-[var(--ds-shadow-overlay)] [font-family:var(--ds-font-family-body)]"
                            >
                                <DropdownMenuLabel className="px-4 pb-1 pt-2 text-xs font-semibold text-[var(--ds-text-subtlest)]">
                                    {item.title}
                                </DropdownMenuLabel>
                                {item.items.map((subItem) => {
                                    const isSubActive = isPathActive(subItem.href || "")
                                    return (
                                        <DropdownMenuItem key={subItem.title} asChild className="rounded-none p-0 focus:bg-transparent">
                                            <Link
                                                href={getLocalizedHref(subItem.href || "#")}
                                                aria-current={isSubActive ? "page" : undefined}
                                                className={cn(
                                                    "flex min-h-10 items-center border-l-2 px-4 text-sm cursor-pointer outline-none",
                                                    isSubActive
                                                        ? "border-[var(--ds-border-selected)] bg-[var(--ds-background-selected)] text-[var(--ds-text-selected)]"
                                                        : "border-transparent text-[var(--ds-text)] hover:bg-[var(--ds-background-neutral-subtle-hovered)] data-[highlighted]:bg-[var(--ds-background-neutral-subtle-hovered)]",
                                                )}
                                            >
                                                {subItem.title}
                                            </Link>
                                        </DropdownMenuItem>
                                    )
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </li>
                )
            }

            return (
                <li key={item.title}>
                    <Collapsible open={isMenuOpen} onOpenChange={() => toggleMenu(item.title)}>
                        <CollapsibleTrigger asChild>
                            <button aria-expanded={isMenuOpen} className={itemClass(isParentActive && !isMenuOpen)}>
                                {itemIcon(item.icon, isParentActive && !isMenuOpen)}
                                <span className="flex-1 truncate">{item.title}</span>
                                <Icon
                                    icon={ArrowDown01Icon}
                                    size={16}
                                    className={cn(
                                        "shrink-0 text-[var(--ds-icon-subtle)] transition-transform duration-200",
                                        isMenuOpen && "rotate-180",
                                    )}
                                />
                            </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <ul className="mt-0.5 flex flex-col gap-0.5">
                                {item.items.map((subItem) => {
                                    const isSubActive = isPathActive(subItem.href || "")
                                    return (
                                        <li key={subItem.title}>
                                            <Link
                                                href={getLocalizedHref(subItem.href || "#")}
                                                aria-current={isSubActive ? "page" : undefined}
                                                className={cn(itemClass(isSubActive), "pl-11")}
                                            >
                                                <span className="truncate">{subItem.title}</span>
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        </CollapsibleContent>
                    </Collapsible>
                </li>
            )
        }

        return (
            <li key={item.title}>
                <AdsTooltip content={item.title} position="right" disabled={!isCollapsed}>
                    <Link
                        href={getLocalizedHref(item.href || "#")}
                        aria-current={isActive ? "page" : undefined}
                        aria-label={isCollapsed ? item.title : undefined}
                        className={itemClass(isActive)}
                    >
                        {itemIcon(item.icon, isActive)}
                        {!isCollapsed && <span className="truncate">{item.title}</span>}
                    </Link>
                </AdsTooltip>
            </li>
        )
    }

    if (!mounted) return null

    const sectionHeading = (label: string) =>
        isCollapsed ? null : (
            <h2 className="px-3 pb-1 pt-2 text-xs font-semibold text-[var(--ds-text-subtlest)]">{label}</h2>
        )

    const displayName = user?.fullName || user?.username || user?.name || "Signed in"

    return (
        <AdsTooltipProvider>
            <aside
                className={cn(
                    "ds-theme-nav fixed left-0 top-0 z-50 flex h-full flex-col border-r border-[var(--ds-border)] bg-[var(--ds-surface)]",
                    "text-[var(--ds-text)] [font-family:var(--ds-font-family-body)] transition-[width,transform] duration-300 ease-in-out",
                    !isCollapsed ? "w-[280px]" : "w-20",
                    isMobile && !mobileOpen ? "-translate-x-full" : "translate-x-0",
                )}
            >
                {/* Header: product + collapse control */}
                <div
                    className={cn(
                        "flex h-20 shrink-0 items-center border-b border-[var(--ds-border)] px-4",
                        isCollapsed ? "justify-center" : "justify-between",
                    )}
                >
                    {!isCollapsed && <SidebarLogo portal="Ops" />}
                    {onExpandedChange && (
                        <AdsTooltip content={isCollapsed ? tr("Expand sidebar") : tr("Collapse sidebar")} position={isCollapsed ? "right" : "bottom"}>
                            <button
                                onClick={toggleSidebar}
                                aria-label={isCollapsed ? tr("Expand sidebar") : tr("Collapse sidebar")}
                                aria-expanded={!isCollapsed}
                                className={isCollapsed ? "rounded-[6px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd428]" : iconButtonClass}
                            >
                                {isCollapsed ? <SidebarLogo collapsed /> : <Icon icon={ArrowLeft01Icon} size={16} />}
                            </button>
                        </AdsTooltip>
                    )}
                </div>

                {/* Navigation */}
                <nav aria-label={tr("Operations")} className="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
                    {sectionHeading("Operations")}
                    <ul className="flex flex-col gap-0.5">{navItems.map(renderNavItem)}</ul>

                    <div className="mt-3 border-t border-[var(--ds-border)] pt-3">
                        {sectionHeading("System")}
                        <ul className="flex flex-col gap-0.5">{secondaryItems.map(renderNavItem)}</ul>
                    </div>
                </nav>

                {/* Footer: signed-in user + sign out */}
                <div className="shrink-0 border-t border-[var(--ds-border)] p-2">
                    <div className={cn("flex items-center gap-2.5 px-1 py-1", isCollapsed && "flex-col justify-center px-0")}>
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--ds-radius-small)] bg-[#ffd428] text-sm font-semibold text-[#242a37]" aria-hidden>
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                        {!isCollapsed && (
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-[var(--ds-text)]">{displayName}</p>
                                <p className="truncate text-xs text-[var(--ds-text-subtlest)]">{roleLabel(userRoleCode(user) || "OPS")}</p>
                            </div>
                        )}
                        <AdsTooltip content={tr("Sign out")} position={isCollapsed ? "right" : "top"}>
                            <button onClick={handleLogout} aria-label={tr("Sign out")} className={cn(iconButtonClass, "hover:text-rose-600")}>
                                <Icon icon={Logout01Icon} size={16} />
                            </button>
                        </AdsTooltip>
                    </div>
                </div>
            </aside>
        </AdsTooltipProvider>
    )
}
