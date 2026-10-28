"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { OpsSidebar } from "@/components/ops/OpsSidebar"
import { Button } from "@/components/ui/button"
import { Menu01Icon } from "@hugeicons/core-free-icons"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"
import { UserNav } from "@/components/dashboard/user-nav"
import {
    Sheet,
    SheetContent,
} from "@/components/ui/sheet"
import { TitleProvider, useTitle } from "@/context/TitleContext"
import { AuthGuard } from "@/components/auth/auth-guard"
import { PortalGuard } from "@/components/auth/portal-guard"
import { useParams } from "next/navigation"
import { HeaderActions } from "@/components/shell/header-actions"
import { LogisticsIntelligencePreloader } from "@/components/intelligence/background-loader"

// Inner component that uses the title context
function OpsLayoutInner({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile()
    const params = useParams()
    const localeString = (params?.locale as string) || "en"
    const { title, subtitle } = useTitle()

    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [mounted, setMounted] = useState(false)

    // Handle hydration issues by delaying certain renders until after mount
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="flex min-h-screen bg-[#f8fafc] dark:bg-[#1a1f2b]">
                <div className="flex-1 p-6 flex items-center justify-center">
                    <div className="animate-pulse flex flex-col items-center gap-4">
                        <div className="size-10 bg-slate-200 dark:bg-white/5 rounded-full" />
                        <div className="h-2 w-24 bg-slate-200 dark:bg-white/5 rounded" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-[#f8fafc] dark:bg-[#1a1f2b]">
            {/* Desktop Sidebar */}
            <OpsSidebar 
                expanded={sidebarOpen} 
                onExpandedChange={setSidebarOpen} 
                isOpen={mobileOpen}
            />

            {/* Mobile Sidebar (Sheet) */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetContent side="left" className="p-0 border-none w-[280px]">
                    <OpsSidebar 
                        expanded={true} 
                        isOpen={true}
                    />
                </SheetContent>
            </Sheet>

            {/* Main Content Area */}
            <main
                className={cn(
                    "flex-1 flex flex-col transition-all duration-300 min-w-0 [--portal-header-h:4rem] sm:[--portal-header-h:5rem]",
                    sidebarOpen && !isMobile ? "pl-[280px]" : !isMobile ? "pl-20" : "pl-0"
                )}
            >
                {/* Clean Modern Topbar - Light Background */}
                <header className="h-16 sm:h-20 bg-white dark:bg-[#242a37] border-b border-slate-200 dark:border-white/5 sticky top-0 z-40 flex items-center px-4 sm:px-8 shadow-[var(--ds-shadow-raised)]">
                    <div className="flex items-center justify-between w-full max-w-[1920px] mx-auto gap-4">
                        
                        {/* Left Section: Context */}
                        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
                            {isMobile && (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => setMobileOpen(true)}
                                    className="text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-[var(--ds-radius-small)] cursor-pointer outline-none"
                                >
                                    <Icon icon={Menu01Icon} size={20} />
                                </Button>
                            )}
                            
                            <div className="min-w-0">
                                <h1 className="truncate text-base sm:text-xl font-semibold text-[#242a37] dark:text-white leading-none">{title}</h1>
                                <p className="hidden sm:flex text-xs text-slate-400 font-bold mt-1.5 items-center gap-2">
                                    <span className="size-1.5 rounded-full bg-[#ffd428]" />
                                    {subtitle}
                                </p>
                            </div>
                        </div>

                        {/* Right Section: Actions & Identity */}
                        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                            
                            <HeaderActions role="OPS" />

                            <UserNav />
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 p-4 sm:p-6 max-w-[1920px] mx-auto w-full min-w-0">
                    <AuthGuard><PortalGuard portal="ops">{children}</PortalGuard></AuthGuard>
                </div>
            </main>

            {/* Background Intelligence Preloader - Warms cache for instant analytics */}
            <LogisticsIntelligencePreloader />


        </div>
    )
}

export default function OpsLayout({ children }: { children: React.ReactNode }) {
    return (
        <TitleProvider>
            <OpsLayoutInner>{children}</OpsLayoutInner>
        </TitleProvider>
    )
}