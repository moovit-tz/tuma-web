"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { ArrowLeft01Icon, ArrowRight01Icon, ArrowDown01Icon, Logout01Icon } from "@hugeicons/core-free-icons"
import { Icon } from "@/components/ui/icon"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useIsMobile } from "@/hooks/use-mobile"
import { logout } from "@/lib/auth"
import { roleLabel, userRoleCode } from "@/lib/role-label"
import { safeStorage } from "@/lib/safe-storage"
import { useTitle, routeTitles } from "@/context/TitleContext"
import { SidebarLogo } from "@/components/shell/sidebar-logo"
import { useTr } from "@/lib/i18n/portal"

export interface PortalNavItem {
    title: string
    href?: string
    icon: any
    items?: PortalNavItem[]
}

interface PortalSidebarProps {
    navItems: PortalNavItem[]
    secondaryItems?: PortalNavItem[]
    /** Text after "MySafari" in the wordmark, e.g. "ADMIN", "OPS", "OWNER" */
    brandSuffix: string
    primaryLabel?: string
    secondaryLabel?: string
    fallbackTitle?: string
    // Shell-provided props
    expanded?: boolean
    onExpandedChange?: (expanded: boolean) => void
    isMobile?: boolean
    onClose?: () => void
}

/** Renders either a hugeicons data array or a lucide-style component. */
function NavIcon({ icon, className }: { icon: any; className?: string }) {
    if (!icon) return null
    if (Array.isArray(icon)) return <Icon icon={icon} size={20} className={className} />
    const Comp = icon
    return <Comp className={cn("h-5 w-5", className)} />
}

export function PortalSidebar({
    navItems,
    secondaryItems = [],
    brandSuffix,
    primaryLabel = "Menu",
    secondaryLabel = "System",
    fallbackTitle = "Dashboard",
    expanded: externalExpanded,
    onExpandedChange,
    isMobile: forceMobile,
    onClose,
}: PortalSidebarProps) {
    const tr = useTr()
    const detectedMobile = useIsMobile()
    const isMobile = forceMobile ?? detectedMobile
    const pathname = usePathname()
    const params = useParams()
    const locale = (params?.locale as string) || "en"

    const [mounted, setMounted] = React.useState(false)
    const [user, setUser] = React.useState<any>(null)
    const [openMenu, setOpenMenu] = React.useState<string | null>(null)
    const { setTitle } = useTitle()

    const expanded = externalExpanded ?? true
    const isCollapsed = !expanded && !isMobile

    React.useEffect(() => setMounted(true), [])

    React.useEffect(() => {
        try {
            const stored = safeStorage.getItem("user")
            if (stored) setUser(JSON.parse(stored))
        } catch {
            /* ignore */
        }
    }, [])

    const allHrefs = React.useMemo(
        () => [...navItems, ...(secondaryItems ?? [])].flatMap((i: PortalNavItem) => [i.href, ...(i.items ?? []).map((c) => c.href)]).filter(Boolean) as string[],
        [navItems, secondaryItems],
    )

    const isPathActive = React.useCallback(
        (href: string) => {
            if (!href || href === "#") return false
            const localized = `/${locale}${href}`
            if (pathname === localized) return true
            if (!pathname.startsWith(`${localized}/`)) return false
            // A parent link isn't active when a more specific menu link matches
            // (e.g. All Parcels vs Parcel Types)
            return !allHrefs.some((h) => h !== href && h.startsWith(`${href}/`) && (pathname === `/${locale}${h}` || pathname.startsWith(`/${locale}${h}/`)))
        },
        [pathname, locale, allHrefs],
    )

    React.useEffect(() => {
        const currentPath = pathname.replace(`/${locale}`, "") || "/"
        setTitle(routeTitles[currentPath] || fallbackTitle)
        navItems.forEach((item) => {
            if (item.items?.some((sub) => isPathActive(sub.href || ""))) setOpenMenu(item.title)
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, locale])

    const localizedHref = (href: string) => `/${locale}${href}`
    const toggleMenu = (title: string) => setOpenMenu((prev) => (prev === title ? null : title))
    const displayName = user?.fullName || user?.name || user?.username || "Signed in"
    const handleLogout = async () => {
        await logout()
        window.location.href = "/"
    }

    const renderNavItem = (item: PortalNavItem) => {
        if (!mounted) return null
        const isActive = isPathActive(item.href || "")
        const isParentActive = item.items?.some((sub) => isPathActive(sub.href || ""))
        const isMenuOpen = openMenu === item.title

        if (item.items) {
            return (
                <li key={item.title}>
                    <Collapsible open={isMenuOpen && !isCollapsed} onOpenChange={() => toggleMenu(item.title)}>
                        <CollapsibleTrigger asChild>
                            <button
                                className={cn(
                                    "group flex w-full items-center gap-4 border-l-4 px-6 py-4 outline-none transition-all duration-300",
                                    isParentActive
                                        ? "border-[#ffd428] bg-[#ffd428]/10 text-white"
                                        : "border-transparent text-slate-400 hover:bg-white/5 hover:text-white",
                                )}
                            >
                                <NavIcon icon={item.icon} className={isCollapsed ? "mx-auto" : ""} />
                                {!isCollapsed && (
                                    <>
                                        <span className="flex-1 text-left text-sm font-semibold">
                                            {item.title}
                                        </span>
                                        <Icon
                                            icon={ArrowDown01Icon}
                                            size={14}
                                            className={cn("transition-transform duration-300", isMenuOpen && "rotate-180")}
                                        />
                                    </>
                                )}
                            </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-1 bg-black/5">
                            {item.items.map((subItem) => {
                                const isSubActive = isPathActive(subItem.href || "")
                                return (
                                    <Link
                                        key={subItem.title}
                                        href={localizedHref(subItem.href || "#")}
                                        onClick={() => isMobile && onClose?.()}
                                        className={cn(
                                            "flex items-center gap-4 border-l-4 py-3.5 pl-16 pr-6 outline-none transition-all duration-300",
                                            isSubActive
                                                ? "border-[#ffd428] bg-[#ffd428]/5 font-semibold text-[#ffd428]"
                                                : "border-transparent text-slate-500 hover:bg-white/5 hover:text-white",
                                        )}
                                    >
                                        <span className="text-xs leading-none">
                                            {subItem.title}
                                        </span>
                                    </Link>
                                )
                            })}
                        </CollapsibleContent>
                    </Collapsible>
                </li>
            )
        }

        return (
            <li key={item.title}>
                <Link
                    href={localizedHref(item.href || "#")}
                    onClick={() => isMobile && onClose?.()}
                    className={cn(
                        "flex items-center gap-4 border-l-4 px-6 py-4 outline-none transition-all duration-300",
                        isActive
                            ? "border-[#ffd428] bg-[#ffd428]/20 text-white"
                            : "border-transparent text-slate-400 hover:bg-white/5 hover:text-white",
                    )}
                >
                    <NavIcon icon={item.icon} className={isCollapsed ? "mx-auto" : ""} />
                    {!isCollapsed && (
                        <span className="text-sm font-semibold">{item.title}</span>
                    )}
                </Link>
            </li>
        )
    }

    if (!mounted) return null

    return (
        <div className="flex h-full w-full flex-col bg-[#242a37] border-r border-slate-800 shadow-[var(--ds-shadow-raised)]">
            {/* Header */}
            <div className={cn("flex h-20 items-center border-b border-white/5", isCollapsed ? "justify-center px-2" : "justify-between p-6")}>
                {!isCollapsed && <SidebarLogo portal={brandSuffix} />}
                {isMobile ? (
                    onClose && (
                        <button
                            onClick={onClose}
                            className="rounded-[var(--ds-radius-small)] p-2 text-slate-400 outline-none transition-colors hover:bg-white/10 hover:text-white"
                        >
                            <Icon icon={ArrowLeft01Icon} size={20} />
                        </button>
                    )
                ) : (
                    <button
                        onClick={() => onExpandedChange?.(!expanded)}
                        aria-label={isCollapsed ? tr("Expand sidebar") : tr("Collapse sidebar")}
                        className={cn(
                            "rounded-[var(--ds-radius-small)] p-2 text-slate-400 outline-none transition-colors hover:bg-white/10 hover:text-white",
                            isCollapsed ? "flex w-full justify-center" : "",
                        )}
                    >
                        {isCollapsed ? <SidebarLogo collapsed /> : <Icon icon={ArrowLeft01Icon} size={20} />}
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav className="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden py-4">
                <TooltipProvider delayDuration={0}>
                    <p
                        className={cn(
                            "mb-4 px-8 text-xs font-semibold text-slate-500",
                            isCollapsed ? "hidden" : "block",
                        )}
                    >
                        {primaryLabel}
                    </p>
                    <ul className="flex flex-col">{navItems.map(renderNavItem)}</ul>

                    {secondaryItems.length > 0 && (
                        <div className="mt-8 border-t border-white/5 pt-8">
                            <p
                                className={cn(
                                    "mb-4 px-8 text-xs font-semibold text-slate-500",
                                    isCollapsed ? "hidden" : "block",
                                )}
                            >
                                {secondaryLabel}
                            </p>
                            <ul className="flex flex-col">{secondaryItems.map(renderNavItem)}</ul>
                        </div>
                    )}
                </TooltipProvider>
            </nav>

            {/* Footer: signed-in user + sign out */}
            <div className="border-t border-white/5 bg-black/10 p-3">
                <div className={cn("flex items-center gap-3", isCollapsed && "flex-col justify-center")}>
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--ds-radius-small)] bg-[#ffd428] text-sm font-semibold text-[#242a37]" aria-hidden>
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                    {!isCollapsed && (
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                            <p className="truncate text-xs text-slate-400">{roleLabel(userRoleCode(user) || brandSuffix)}</p>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        title={tr("Sign out")}
                        aria-label={tr("Sign out")}
                        className="rounded-[var(--ds-radius-small)] p-2 text-slate-400 outline-none transition-colors hover:bg-rose-500/15 hover:text-rose-300 focus-visible:outline-2 focus-visible:outline-[#ffd428]"
                    >
                        <Icon icon={Logout01Icon} size={18} />
                    </button>
                </div>
            </div>
        </div>
    )
}
