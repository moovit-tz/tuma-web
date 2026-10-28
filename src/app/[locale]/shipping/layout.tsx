"use client"

import type React from "react"

import { useState } from "react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { ShippingSidebar } from "@/components/shipping/ShippingSidebar"
import { UserNav } from "@/components/dashboard/user-nav"
import { AuthGuard } from "@/components/auth/auth-guard"
import { TitleProvider } from "@/context/TitleContext"

export default function ShippingLayout({
                                           children,
                                       }: {
    children: React.ReactNode
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const isMobile = useIsMobile()

    return (
        <AuthGuard requireAuth={true}>
            <TitleProvider>
                <div className="flex h-screen overflow-hidden bg-background">
                    {/* Desktop Sidebar */}
                    {!isMobile && (
                        <div className="hidden md:flex">
                            <ShippingSidebar />
                        </div>
                    )}

                    {/* Mobile Sidebar */}
                    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                        <SheetContent side="left" className="p-0 w-64">
                            <ShippingSidebar onClose={() => setSidebarOpen(false)} isMobile={true} />
                        </SheetContent>
                    </Sheet>

                    {/* Main Content */}
                    <div className="flex flex-1 flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex h-16 items-center justify-between border-b bg-background px-6">
                            <div className="flex items-center gap-4">
                                {isMobile && (
                                    <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="md:hidden">
                                        <Menu className="h-5 w-5" />
                                    </Button>
                                )}
                                <h1 className="text-lg font-semibold">Shipping Portal</h1>
                            </div>
                            <UserNav />
                        </div>

                        {/* Page Content */}
                        <main className="flex-1 overflow-auto [--portal-header-h:0px]">{children}</main>
                    </div>
                </div>
            </TitleProvider>
        </AuthGuard>
    )
}
