"use client"

import type React from "react"
import { useState } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { UserNav } from "@/components/dashboard/user-nav"
import { HeaderActions } from "@/components/shell/header-actions"
import { TitleProvider, useTitle } from "@/context/TitleContext"
import { AuthGuard } from "@/components/auth/auth-guard"
import { PortalGuard } from "@/components/auth/portal-guard"
import type { Portal } from "@/lib/portal-access"
import { useTr } from "@/lib/i18n/portal"

/**
 * DashboardShell — the one authenticated-portal layout.
 *
 * `admin/layout.tsx` and `biz/layout.tsx` were byte-identical duplicates
 * (see design audit, root cause #2); this is that shared implementation.
 * The role-specific sidebar is injected via `renderSidebar` so the shell
 * itself carries zero portal-specific logic.
 */
export interface SidebarRenderProps {
    expanded: boolean
    onExpandedChange: (expanded: boolean) => void
    isMobile: boolean
    onClose: () => void
}

export interface DashboardShellProps {
    children: React.ReactNode
    renderSidebar: (props: SidebarRenderProps) => React.ReactNode
    // Which portal this shell is; staff from other portals are sent to their own
    portal?: Portal
}

function DashboardShellInner({ children, renderSidebar, portal }: DashboardShellProps) {
    const tr = useTr()
    const isMobile = useIsMobile()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarExpanded, setSidebarExpanded] = useState(true)
    const { title } = useTitle()

    const sidebarWidth = isMobile ? 0 : sidebarExpanded ? 280 : 80

    return (
        <AuthGuard requireAuth={true}>
            <div className="h-screen w-screen overflow-hidden bg-background">
                {/* Mobile sidebar backdrop */}
                {isMobile && sidebarOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black/50"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                {isMobile ? (
                    <div
                        className={cn(
                            "fixed inset-y-0 left-0 z-50 w-[280px] transform transition-transform duration-300 ease-in-out",
                            sidebarOpen ? "translate-x-0" : "-translate-x-full"
                        )}
                    >
                        {renderSidebar({
                            expanded: true,
                            onExpandedChange: () => {},
                            isMobile: true,
                            onClose: () => setSidebarOpen(false),
                        })}
                    </div>
                ) : (
                    <div
                        className="fixed inset-y-0 left-0 z-30 transition-all duration-300 ease-in-out"
                        style={{ width: sidebarWidth }}
                    >
                        {renderSidebar({
                            expanded: sidebarExpanded,
                            onExpandedChange: setSidebarExpanded,
                            isMobile: false,
                            onClose: () => {},
                        })}
                    </div>
                )}

                {/* Main content */}
                <div
                    className="flex h-full flex-col transition-all duration-300 ease-in-out"
                    style={{ marginLeft: isMobile ? 0 : sidebarWidth }}
                >
                    <header
                        className="fixed top-0 right-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 transition-all duration-300 ease-in-out"
                        style={{ left: isMobile ? 0 : sidebarWidth }}
                    >
                        {isMobile && (
                            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">{tr("Toggle menu")}</span>
                            </Button>
                        )}

                        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2 font-semibold">
                                <span className="truncate">{title}</span>
                            </div>
                            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                                {portal && <HeaderActions role={portal === "admin" ? "ADMIN" : portal === "biz" ? "OWNER" : "OPS"} />}
                                <UserNav />
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto pt-16 [--portal-header-h:4rem]">
                        <div className="container mx-auto p-4 md:p-6">{portal ? <PortalGuard portal={portal}>{children}</PortalGuard> : children}</div>
                    </main>
                </div>
            </div>
        </AuthGuard>
    )
}

export function DashboardShell({ children, renderSidebar, portal }: DashboardShellProps) {
    return (
        <TitleProvider>
            <DashboardShellInner renderSidebar={renderSidebar} portal={portal}>{children}</DashboardShellInner>
        </TitleProvider>
    )
}
