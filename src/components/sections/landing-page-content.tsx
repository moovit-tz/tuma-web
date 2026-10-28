"use client"

import { FloatingSupport } from "@/components/floating-support"
import { SiteNavbar } from "@/components/site/navbar"
import { Hero } from "@/components/landing/hero"
import { TopBanner } from "@/components/landing/top-banner"

export function LandingPageContent() {
    return (
        <div className="relative flex min-h-svh flex-col bg-white">
            <TopBanner />
            <SiteNavbar />
            <main className="flex flex-1 flex-col">
                <Hero />
            </main>
            <FloatingSupport />
        </div>
    )
}
