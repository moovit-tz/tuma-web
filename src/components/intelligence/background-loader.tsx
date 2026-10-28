"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getAllCompanies, getCompanyAgentCount } from "@/lib/services/company"
import { getCompaniesActivity, getCompaniesPeriodMetrics, overviewRange } from "@/lib/services/parcel"
import { backgroundRequest, mapWithConcurrency } from "@/lib/concurrency"
import { useMemo, useEffect, useState } from "react"

// How long to hold off before warming caches, so the page the user actually
// opened gets the network first.
// Long enough that the dashboard's own first requests (right after sign-in) go first
const PRELOAD_DELAY_MS = 12000

/**
 * LogisticsIntelligencePreloader
 * 
 * This component runs the heavy industrial intelligence queries in the background
 * as soon as the user enters the operational terminal. This warms up the 
 * TanStack Query cache so that the "Companies" and "Dashboard" modules load 
 * instantly with high-fidelity performance metrics.
 *
 * It waits for the browser to go idle (after PRELOAD_DELAY_MS) before
 * starting: these are one request per company, and firing them alongside
 * the current page's own requests saturates the browser's per-host
 * connection pool and stalls that page's data.
 *
 * Warms the Companies overview's period-independent data: per-company
 * all-time volume and last activity (one small request per company) and
 * agent counts. Period figures are loaded by the page itself.
 */
export function LogisticsIntelligencePreloader() {
    const [ready, setReady] = useState(false)

    useEffect(() => {
        let idleHandle: number | undefined
        const timer = window.setTimeout(() => {
            if (typeof window.requestIdleCallback === "function") {
                idleHandle = window.requestIdleCallback(() => setReady(true), { timeout: 5000 })
            } else {
                setReady(true)
            }
        }, PRELOAD_DELAY_MS)
        return () => {
            window.clearTimeout(timer)
            if (idleHandle !== undefined) window.cancelIdleCallback?.(idleHandle)
        }
    }, [])

    // 1. Warm up the global companies dataset
    const { data: allCompaniesData } = useQuery({
        queryKey: ["all-companies"],
        queryFn: async () => ({ data: await getAllCompanies() }),
        enabled: ready,
        staleTime: 1000 * 60 * 10, // 10 minutes cache
    })

    const allCompanyIds = useMemo(() => {
        if (!allCompaniesData?.data) return []
        return (Array.isArray(allCompaniesData.data) ? allCompaniesData.data : [])
            .map((c: any) => c.id) as number[]
    }, [allCompaniesData])

    // 2. Warm up all-time volume and last activity (Dormant Partners)
    useQuery({
        queryKey: ["companies-activity", allCompanyIds],
        queryFn: ({ signal }) => getCompaniesActivity(allCompanyIds, signal),
        enabled: allCompanyIds.length > 0,
        staleTime: 1000 * 60 * 10,
    })

    // 3. Warm the Companies overview's Today / 7 day figures (built
    //    server-side; same keys as the page, so a warm entry renders
    //    instantly there). 30 days (~100 backend requests) loads on demand.
    const queryClient = useQueryClient()
    useEffect(() => {
        if (!ready) return
        for (const period of ["today", "7d"] as const) {
            queryClient.prefetchQuery({
                queryKey: ["companies-period-metrics", period],
                queryFn: ({ signal }) => getCompaniesPeriodMetrics(overviewRange(period), { signal }),
                staleTime: 1000 * 60 * 10,
            })
        }
    }, [ready, queryClient])

    // 4. Warm up workforce density metrics (Agent counts)
    useQuery({
        queryKey: ["companies-agent-counts-map-v3", allCompanyIds],
        queryFn: async () => {
            if (allCompanyIds.length === 0) return {}
            const counts = await mapWithConcurrency(allCompanyIds, allCompanyIds.length, (id) => backgroundRequest(() => getCompanyAgentCount(id)))
            const map: Record<number, number> = {}
            allCompanyIds.forEach((id, i) => { map[id] = counts[i] })
            return map
        },
        enabled: allCompanyIds.length > 0,
        staleTime: 1000 * 60 * 10,
    })

    return null // Invisible preloader
}
