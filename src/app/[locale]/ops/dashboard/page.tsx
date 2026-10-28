"use client"

import { useParams } from "next/navigation"
import {
    Package01Icon,
    OfficeIcon,
    UserGroupIcon,
    BusIcon,
    Location01Icon,
} from "@hugeicons/core-free-icons"
import { PortalDashboard, NO_VALUE, type PortalStatsContext, type StatDef } from "@/components/dashboard/portal-dashboard"

function buildStats({ data, isLoadingSummary, periodStats, isLoadingPeriodStats, periodLabel }: PortalStatsContext): StatDef[] {
    const fmt = (n: number) => new Intl.NumberFormat("en-TZ").format(n || 0)
    const summary = (n?: number) => (data ? fmt(n ?? 0) : NO_VALUE)
    return [
        {
            title: "Total Parcels",
            value: periodStats ? fmt(periodStats.total) : NO_VALUE,
            loading: isLoadingPeriodStats,
            icon: Package01Icon,
            sub: periodLabel,
        },
        { title: "Companies", value: summary(data?.totalCompanies), loading: isLoadingSummary, icon: OfficeIcon, sub: "On the network" },
        { title: "Total Agents", value: summary(data?.totalAgents), loading: isLoadingSummary, icon: UserGroupIcon, sub: "Field workforce" },
        { title: "Total Vehicles", value: summary(data?.totalVehicles), loading: isLoadingSummary, icon: BusIcon, sub: "Fleet in operation" },
        { title: "Booking Offices", value: summary(data?.totalOffices), loading: isLoadingSummary, icon: Location01Icon, sub: "Offices nationwide" },
    ]
}

export default function OpsDashboardPage() {
    const params = useParams()
    const locale = (params?.locale as string) || "en"
    return (
        <PortalDashboard
            basePath="/ops"
            fallbackName="Operator"
            snapshotLabel={`Overview for ${new Date().toLocaleDateString(locale, {
                month: "long",
                day: "numeric",
                year: "numeric",
            })}`}
            buildStats={buildStats}
        />
    )
}
