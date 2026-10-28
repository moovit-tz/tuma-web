"use client"

import * as React from "react"
import { createContext, useContext, useState, ReactNode, useEffect } from "react"
import { usePathname } from "next/navigation"

// Define route title mapping
export const routeTitles: Record<string, string> = {
    // Admin routes
    "/admin/dashboard": "Dashboard",
    "/admin/companies": "Companies",
    "/admin/locations/countries": "Countries",
    "/admin/locations/regions": "Regions",
    "/admin/locations/districts": "Districts",
    "/admin/locations/booking-offices": "Booking Offices",
    "/admin/agents": "Agents",
    "/admin/vehicles/vehicles": "Vehicles",
    "/admin/vehicles/models": "Models",
    "/admin/vehicles/brands": "Brands",
    "/admin/vehicles/fleet-types": "Fleet Types",
    "/admin/vehicles/seat-layouts": "Seat Layouts",
    "/admin/parcels": "Parcels",
    "/admin/finance": "Finance",
    "/admin/settings": "Settings",
    "/admin/help": "Help & Support",

    // OPS routes
    "/ops/dashboard": "Dashboard",
    "/ops/companies": "Companies",
    "/ops/agents": "Agents",
    "/ops/bus-owners": "Owners",
    "/ops/vehicles": "Vehicles",
    "/ops/parcels": "Parcels",
    "/ops/transactions": "Transactions",
    "/ops/help": "Help & Support",
    "/ops/locations/countries": "Countries",
    "/ops/locations/regions": "Regions",
    "/ops/locations/districts": "Districts",
    "/ops/locations/booking-offices": "Booking Offices",
}

export const routeSubtitles: Record<string, string> = {
    "/ops/locations/countries": "Countries the network operates in",
    "/ops/locations/regions": "Regions within each country",
    "/ops/locations/districts": "Districts within each region",
    "/ops/locations/booking-offices": "Offices where parcels are booked and collected",
}

const DEFAULT_SUBTITLE = "Operations portal"

// Create the context
interface TitleContextType {
    title: string
    setTitle: (title: string) => void
    subtitle: string
    setSubtitle: (subtitle: string) => void
}

const TitleContext = createContext<TitleContextType | undefined>(undefined)

// Provider component with automatic path-based title updates
export function TitleProvider({ children }: { children: ReactNode }) {
    const [title, setTitle] = useState("Dashboard")
    const [subtitle, setSubtitle] = useState(DEFAULT_SUBTITLE)
    const pathname = usePathname()

    // Update title based on current path
    useEffect(() => {
        if (!pathname) return

        // Remove locale prefix to get the actual route pattern
        const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/)/, "")

        if (pathWithoutLocale && routeTitles[pathWithoutLocale]) {
            setTitle(routeTitles[pathWithoutLocale])
            setSubtitle(routeSubtitles[pathWithoutLocale] || DEFAULT_SUBTITLE)
        } else {
            // Handle subpaths or unknown paths
            const baseRoute = Object.keys(routeTitles).find(route =>
                pathWithoutLocale?.startsWith(route) &&
                route !== "/admin/dashboard" &&
                route !== "/ops/dashboard"
            )

            if (baseRoute) {
                setTitle(routeTitles[baseRoute])
                setSubtitle(routeSubtitles[baseRoute] || DEFAULT_SUBTITLE)
            } else if (pathWithoutLocale?.startsWith("/admin")) {
                setTitle("Dashboard")
                setSubtitle("Admin portal")
            } else if (pathWithoutLocale?.startsWith("/ops")) {
                setTitle("Dashboard")
                setSubtitle(DEFAULT_SUBTITLE)
            }
        }
    }, [pathname])

    // Update document title whenever the title in context changes
    useEffect(() => {
        if (title) {
            document.title = `MySafari Parcel | ${title}`
        }
    }, [title])

    return (
        <TitleContext.Provider value={{ title, setTitle, subtitle, setSubtitle }}>
            {children}
        </TitleContext.Provider>
    )
}

// Hook to use the title context
export function useTitle() {
    const context = useContext(TitleContext)
    if (context === undefined) {
        throw new Error("useTitle must be used within a TitleProvider")
    }
    return context
}