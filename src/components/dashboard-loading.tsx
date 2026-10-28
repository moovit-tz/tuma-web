"use client"
import { useEffect } from "react"
import { DashboardPageLoader } from "@/components/admin/admin-page-loader"

interface DashboardLoadingProps {
    onDataFetched?: (data: { dashboardData: any; recentParcels: any[]; totalParcels?: number }) => void
}

/**
 * Shown while the dashboard's first data fetch is in flight. Renders a
 * skeleton shaped like the real dashboard and starts the fetch immediately
 * on mount — no simulated progress bar, no greeting copy, no artificial
 * delay before the real request even starts (the previous version awaited
 * a ~2s fake progress animation before it began fetching).
 */
export function DashboardLoading({ onDataFetched }: DashboardLoadingProps) {
    useEffect(() => {
        let isMounted = true

        const loadData = async () => {
            try {
                const { getUnifiedDashboardData, getRecentParcels } = await import("@/lib/services/dashboard-unified")
                const [dashboardData, parcelsResponse] = await Promise.all([
                    getUnifiedDashboardData(),
                    getRecentParcels(1, 10),
                ])

                if (!isMounted) return

                onDataFetched?.({
                    dashboardData,
                    recentParcels: parcelsResponse.success ? parcelsResponse.data || [] : [],
                    totalParcels: parcelsResponse.success ? parcelsResponse.total || 0 : 0,
                })
            } catch (error) {
                console.error("Error loading dashboard data:", error)
                if (isMounted) {
                    onDataFetched?.({
                        dashboardData: {
                            totalParcels: 0,
                            totalAgents: 0,
                            totalCompanies: 0,
                            totalVehicles: 0,
                            totalOffices: 0,
                            deliveredParcels: 0,
                            lostParcels: 0,
                            complaints: 0,
                        },
                        recentParcels: [],
                    })
                }
            }
        }

        loadData()
        return () => {
            isMounted = false
        }
        // Intentionally run once on mount — this component is unmounted as
        // soon as onDataFetched fires, so it never needs to re-fetch.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return <DashboardPageLoader />
}
