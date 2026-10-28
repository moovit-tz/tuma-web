"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useParams } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    Package,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    LogOut,
    X,
    Send,
    Gavel,
    CreditCard,
    Settings,
    Search,
    HelpCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useIsMobile } from "@/hooks/use-mobile"
import { logout } from "@/lib/auth"
import { safeStorage } from "@/lib/safe-storage"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTitle, routeTitles } from "@/context/TitleContext"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "next-themes"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ThemeToggle } from "@/components/theme-toggle"
import { Logo } from "@/components/logo"
import { useTr } from "@/lib/i18n/portal"

interface NavItem {
    title: string
    href?: string
    icon: React.ElementType
    items?: NavItem[]
    permission?: string
}

const navItems: NavItem[] = [
    {
        title: "Dashboard",
        href: "/shipping/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "My Cargo",
        href: "/shipping/cargo",
        icon: Package,
    },
    {
        title: "Send Cargo",
        href: "/shipping/send-cargo",
        icon: Send,
    },
    {
        title: "Track Cargo",
        href: "/shipping/track",
        icon: Search,
    },
    {
        title: "Bids",
        href: "/shipping/bids",
        icon: Gavel,
    },
    {
        title: "Billing",
        href: "/shipping/billing",
        icon: CreditCard,
    },
    {
        title: "Settings",
        href: "/shipping/settings",
        icon: Settings,
    },
]

const secondaryItems: NavItem[] = [
    {
        title: "Help & Support",
        href: "/shipping/help",
        icon: HelpCircle,
    },
]

interface ShippingSidebarProps {
    onClose?: () => void
    isMobile?: boolean
}

export function ShippingSidebar({ onClose, isMobile: forceMobile }: ShippingSidebarProps) {
    const tr = useTr()
    const isMobile = useIsMobile()
    const pathname = usePathname()
    const params = useParams()
    const locale = (params?.locale as string) || "en"
    const [expanded, setExpanded] = React.useState(true)
    const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({})
    const [clickedItem, setClickedItem] = React.useState<string | null>(null)
    const [user, setUser] = React.useState<any>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const { setTitle } = useTitle()
    const { theme, setTheme } = useTheme()

    // Initialize user data once
    React.useEffect(() => {
        try {
            const storedUser = safeStorage.getItem("user")
            if (storedUser) {
                setUser(JSON.parse(storedUser))
            }
        } catch (error) {
            console.error("Error loading user data:", error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Generate localized href
    const getLocalizedHref = React.useCallback(
        (href: string) => {
            return `/${locale}${href}`
        },
        [locale],
    )

    // Check if a path is active
    const isPathActive = React.useCallback(
        (href: string) => {
            const localizedHref = getLocalizedHref(href)
            if (pathname === localizedHref) return true
            if (href !== "/shipping/dashboard" && pathname?.startsWith(localizedHref)) return true
            return false
        },
        [pathname, getLocalizedHref],
    )

    // Update title based on current path
    React.useEffect(() => {
        if (pathname && routeTitles[pathname]) {
            setTitle(routeTitles[pathname])
        } else {
            const baseRoute = Object.keys(routeTitles).find(
                (route) => pathname?.startsWith(route) && route !== `/${locale}/shipping/dashboard`,
            )

            if (baseRoute) {
                setTitle(routeTitles[baseRoute])
            } else if (pathname?.includes("/shipping")) {
                setTitle("Shipping Dashboard")
            }
        }
    }, [pathname, locale])

    // Initialize open menus based on current path
    React.useEffect(() => {
        const newOpenMenus: Record<string, boolean> = {}
        navItems.forEach((item) => {
            if (item.items) {
                const isSubmenuActive = item.items.some((subItem) => isPathActive(subItem.href || ""))
                if (isSubmenuActive) {
                    newOpenMenus[item.title] = true
                }
            }
        })
        setOpenMenus(newOpenMenus)
    }, [pathname])

    const toggleMenu = React.useCallback(
        (title: string) => {
            if (!expanded && !isMobile) {
                setExpanded(true)
                setOpenMenus({ [title]: true })
                return
            }

            setOpenMenus((prev) => {
                const isCurrentlyOpen = prev[title]
                if (isCurrentlyOpen) {
                    return { [title]: false }
                } else {
                    return { [title]: true }
                }
            })
        },
        [expanded, isMobile],
    )

    const handleLogout = React.useCallback(() => {
        logout()
    }, [])

    const handleLinkClick = React.useCallback(
        (itemTitle: string, href?: string) => {
            setClickedItem(href || itemTitle)
            setTimeout(() => setClickedItem(null), 200)

            if (isMobile && onClose) {
                onClose()
            }
        },
        [isMobile, onClose],
    )

    const toggleTheme = React.useCallback(() => {
        setTheme(theme === "dark" ? "light" : "dark")
    }, [theme, setTheme])

    return (
        <TooltipProvider>
            <div
                className={cn(
                    "flex h-full flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
                    isMobile ? "w-full" : expanded ? "w-64" : "w-16",
                )}
            >
                {/* Header */}
                <div className="flex h-16 shrink-0 items-center gap-2 px-4 border-b">
                    {expanded || isMobile ? (
                        <>
                            <Logo />
                            {isMobile && onClose && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onClose}
                                    className="ml-auto h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200"
                                >
                                    <X className="size-4" />
                                </Button>
                            )}
                        </>
                    ) : (
                        <div className="flex w-full justify-center">
                            <Logo />
                        </div>
                    )}
                </div>

                {/* Collapse Toggle */}
                {!isMobile && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -right-3 top-20 z-20 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar shadow-[var(--ds-shadow-raised)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200"
                        onClick={() => setExpanded(!expanded)}
                    >
                        {expanded ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </Button>
                )}

                <Separator className="bg-sidebar-border" />

                {/* Main Navigation */}
                <ScrollArea className="flex-1 px-3">
                    <div className="space-y-2 py-4">
                        <div className="px-3 py-2">
                            <h2 className="mb-2 px-4 text-lg font-semibold">{tr("Shipping Portal")}</h2>
                            <div className="space-y-1">
                                {navItems.map((item) => {
                                    const isMenuOpen = openMenus[item.title] || false
                                    const hasSubmenu = item.items && item.items.length > 0
                                    const isMenuActive = hasSubmenu && item.items?.some((subItem) => isPathActive(subItem.href || ""))
                                    const isItemActive = isPathActive(item.href || "") || isMenuActive
                                    const isClicked = clickedItem === (item.href || item.title)

                                    if (hasSubmenu) {
                                        return (
                                            <li key={item.title}>
                                                <Collapsible
                                                    open={expanded || isMobile ? isMenuOpen || isMenuActive : false}
                                                    onOpenChange={() => toggleMenu(item.title)}
                                                >
                                                    <div className="relative">
                                                        {expanded || isMobile ? (
                                                            <CollapsibleTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    className={cn(
                                                                        "w-full justify-between text-sidebar-foreground transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                                                        isItemActive &&
                                                                        "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[var(--ds-shadow-raised)]",
                                                                        isClicked && "scale-95",
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <item.icon className="size-4 shrink-0" />
                                                                        <span className="truncate">{item.title}</span>
                                                                    </div>
                                                                    <ChevronDown
                                                                        className={cn(
                                                                            "size-4 transition-transform duration-200",
                                                                            (isMenuOpen || isMenuActive) && "rotate-180",
                                                                        )}
                                                                    />
                                                                </Button>
                                                            </CollapsibleTrigger>
                                                        ) : (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className={cn(
                                                                            "size-10 text-sidebar-foreground transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                                                            isItemActive && "bg-sidebar-accent text-sidebar-accent-foreground shadow-[var(--ds-shadow-raised)]",
                                                                            isClicked && "scale-95",
                                                                        )}
                                                                        onClick={() => toggleMenu(item.title)}
                                                                    >
                                                                        <item.icon className="size-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="right" className="font-normal">
                                                                    {item.title}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}

                                                        <CollapsibleContent className="overflow-hidden transition-all duration-300 ease-in-out data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                                                            {expanded || isMobile ? (
                                                                <div className="px-6 pb-1 pt-2">
                                                                    <ul className="grid gap-1 border-l border-sidebar-border px-2">
                                                                        {item.items?.map((subItem) => {
                                                                            const isSubActive = isPathActive(subItem.href || "")
                                                                            const isSubClicked = clickedItem === subItem.href
                                                                            const subItemHref = getLocalizedHref(subItem.href || "#")
                                                                            return (
                                                                                <li key={subItem.title}>
                                                                                    <Link
                                                                                        href={subItemHref}
                                                                                        onClick={() => handleLinkClick(subItem.title, subItem.href)}
                                                                                        className={cn(
                                                                                            "flex h-9 min-w-8 items-center gap-3 overflow-hidden rounded-md px-2 text-sm font-medium text-sidebar-foreground ring-sidebar-ring transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2",
                                                                                            isSubActive &&
                                                                                            "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-[var(--ds-shadow-raised)]",
                                                                                            isSubClicked && "scale-95",
                                                                                        )}
                                                                                    >
                                                                                        <div className="size-2 rounded-full bg-current opacity-60 transition-opacity duration-200" />
                                                                                        <span className="truncate">{subItem.title}</span>
                                                                                    </Link>
                                                                                </li>
                                                                            )
                                                                        })}
                                                                    </ul>
                                                                </div>
                                                            ) : null}
                                                        </CollapsibleContent>
                                                    </div>
                                                </Collapsible>
                                            </li>
                                        )
                                    }

                                    const itemHref = getLocalizedHref(item.href || "#")

                                    return (
                                        <li key={item.title}>
                                            {expanded || isMobile ? (
                                                <Link
                                                    href={itemHref}
                                                    onClick={() => handleLinkClick(item.title, item.href)}
                                                    className={cn(
                                                        "flex h-10 min-w-8 items-center gap-3 overflow-hidden rounded-md px-3 text-sm font-medium text-sidebar-foreground ring-sidebar-ring transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2",
                                                        isPathActive(item.href || "") &&
                                                        "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-[var(--ds-shadow-raised)]",
                                                        isClicked && "scale-95",
                                                    )}
                                                >
                                                    <item.icon className="size-4 shrink-0" />
                                                    <span className="truncate">{item.title}</span>
                                                </Link>
                                            ) : (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Link
                                                            href={itemHref}
                                                            onClick={() => handleLinkClick(item.title, item.href)}
                                                            className={cn(
                                                                "flex size-10 items-center justify-center rounded-md text-sidebar-foreground ring-sidebar-ring transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2",
                                                                isPathActive(item.href || "") &&
                                                                "bg-sidebar-accent text-sidebar-accent-foreground shadow-[var(--ds-shadow-raised)]",
                                                                isClicked && "scale-95",
                                                            )}
                                                        >
                                                            <item.icon className="size-4" />
                                                        </Link>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right" className="font-normal">
                                                        {item.title}
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </li>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <Separator className="bg-sidebar-border" />

                {/* Footer */}
                <div className="p-4 border-t">
                    {expanded || isMobile ? (
                        <div className="space-y-2">
                            {/* Theme Toggle */}
                            <ThemeToggle />

                            {/* User Menu */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="h-12 w-full justify-start gap-3 p-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200"
                                        disabled={isLoading}
                                    >
                                        <Avatar className="h-8 w-8 rounded-lg">
                                            <AvatarImage
                                                src={user?.avatar || user?.profileImage || "/avatars/default.jpg"}
                                                alt={user?.name || user?.fullName || tr("User")}
                                            />
                                            <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                                {user?.name?.charAt(0)?.toUpperCase() ||
                                                    user?.fullName?.charAt(0)?.toUpperCase() ||
                                                    user?.firstName?.charAt(0)?.toUpperCase() ||
                                                    user?.email?.charAt(0)?.toUpperCase() ||
                                                    "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {isLoading
                            ? tr("Loading...")
                            : user?.name ||
                            user?.fullName ||
                            `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
                            tr("User")}
                      </span>
                                            <span className="truncate text-xs opacity-70">
                        {isLoading ? "..." : user?.email || tr("No email")}
                      </span>
                                        </div>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56" side="top">
                                    <DropdownMenuItem className="cursor-pointer">
                                        <Settings className="mr-2 h-4 w-4" />{tr("Account Settings")}</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                                        <LogOut className="mr-2 h-4 w-4" />{tr("Sign out")}</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            {/* Theme Toggle - Collapsed */}
                            <ThemeToggle />

                            {/* User Avatar - Collapsed */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-9 p-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200"
                                        disabled={isLoading}
                                    >
                                        <Avatar className="h-7 w-7 rounded-lg">
                                            <AvatarImage
                                                src={user?.avatar || user?.profileImage || "/avatars/default.jpg"}
                                                alt={user?.name || user?.fullName || tr("User")}
                                            />
                                            <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                                                {user?.name?.charAt(0)?.toUpperCase() ||
                                                    user?.fullName?.charAt(0)?.toUpperCase() ||
                                                    user?.firstName?.charAt(0)?.toUpperCase() ||
                                                    user?.email?.charAt(0)?.toUpperCase() ||
                                                    "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56" side="top">
                                    <DropdownMenuItem className="cursor-pointer">
                                        <Settings className="mr-2 h-4 w-4" />{tr("Account Settings")}</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                                        <LogOut className="mr-2 h-4 w-4" />{tr("Sign out")}</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                </div>
            </div>
        </TooltipProvider>
    )
}
