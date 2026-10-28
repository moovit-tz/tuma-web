"use client"

import { useParams } from "next/navigation"
import {
    Package01Icon,
    CheckListIcon,
    UserGroupIcon,
    BusIcon,
    MoneyReceive01Icon,
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
        {
            title: "Delivered",
            value: periodStats ? fmt(periodStats.delivered) : NO_VALUE,
            loading: isLoadingPeriodStats,
            icon: CheckListIcon,
            sub: periodLabel,
        },
        { title: "My Agents", value: summary(data?.totalAgents), loading: isLoadingSummary, icon: UserGroupIcon, sub: "Registered agents" },
        { title: "My Vehicles", value: summary(data?.totalVehicles), loading: isLoadingSummary, icon: BusIcon, sub: "Fleet in operation" },
        {
            // Shipping revenue = sum of parcel prices (totalValue is the
            // declared value of the goods, not money the company earned).
            title: "Revenue",
            value: periodStats?.totalsComplete ? `TZS ${fmt(periodStats.totalPrice)}` : NO_VALUE,
            loading: isLoadingPeriodStats,
            icon: MoneyReceive01Icon,
            sub: periodStats && !periodStats.totalsComplete ? "Too many parcels to total" : periodLabel,
        },
    ]
}

export default function OwnerDashboardPage() {
    const params = useParams()
    const locale = (params?.locale as string) || "en"
    return (
        <PortalDashboard
            basePath="/biz"
            fallbackName="Owner"
            snapshotLabel={`Overview for ${new Date().toLocaleDateString(locale, {
                month: "long",
                day: "numeric",
                year: "numeric",
            })}`}
            includeValueTotals
            buildStats={buildStats}
        />
    )
}
