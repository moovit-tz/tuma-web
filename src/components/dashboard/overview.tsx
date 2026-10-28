"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Package,
    Users,
    Building,
    Truck,
    Building2,
    TrendingUp,
    FileText,
    MapPin,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react"
import { motion } from "framer-motion"
import { useTr } from "@/lib/i18n/portal"

interface OverviewProps {
    userRole: 'ADMIN' | 'OPS' | 'OWNER' | 'CUSTOMER' | 'BUSINESS' | 'AGENT'
    dashboardData: any
}

export function Overview({ userRole, dashboardData }: OverviewProps) {
    const tr = useTr()
    // Define role-specific stats
    const getRoleStats = () => {
        switch (userRole) {
            case 'ADMIN':
                return [
                    {
                        title: tr("Total Users"),
                        value: dashboardData?.totalUsers?.toLocaleString() || "0",
                        change: dashboardData?.totalUsers !== undefined ? "Real Data" : "No Data",
                        trend: "neutral" as const,
                        icon: Users,
                        iconColor: "text-blue-600",
                        iconBg: "bg-blue-100 dark:bg-blue-900/20",
                        description: tr("All users in the system"),
                    },
                    {
                        title: tr("Total Companies"),
                        value: dashboardData?.totalCompanies?.toLocaleString() || "0",
                        change: dashboardData?.totalCompanies !== undefined ? "Real Data" : "No Data",
                        trend: "neutral" as const,
                        icon: Building,
                        iconColor: "text-purple-600",
                        iconBg: "bg-purple-100 dark:bg-purple-900/20",
                        description: tr("Registered companies"),
                    },
                    {
                        title: tr("Total Locations"),
                        value: dashboardData?.totalLocations?.toLocaleString() || "0",
                        change: dashboardData?.totalLocations !== undefined ? "Real Data" : "No Data",
                        trend: "neutral" as const,
                        icon: MapPin,
                        iconColor: "text-green-600",
                        iconBg: "bg-green-100 dark:bg-green-900/20",
                        description: tr("System locations"),
                    },
                    {
                        title: tr("Total Vehicles"),
                        value: dashboardData?.totalVehicles?.toLocaleString() || "0",
                        change: dashboardData?.totalVehicles !== undefined ? "Real Data" : "No Data",
                        trend: "neutral" as const,
                        icon: Truck,
                        iconColor: "text-orange-600",
                        iconBg: "bg-orange-100 dark:bg-orange-900/20",
                        description: tr("Fleet vehicles"),
                    },
                    {
                        title: tr("Total Parcels"),
                        value: dashboardData?.totalParcels?.toLocaleString() || "0",
                        change: dashboardData?.totalParcels !== undefined ? "Real Data" : "No Data",
                        trend: "neutral" as const,
                        icon: Package,
                        iconColor: "text-indigo-600",
                        iconBg: "bg-indigo-100 dark:bg-indigo-900/20",
                        description: tr("All parcels in the system"),
                    },
                    {
                        title: tr("Total Parcel Value"),
                        value: new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "TZS",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                        }).format(dashboardData?.totalParcelValue || 0),
                        change: dashboardData?.totalParcelValue !== undefined ? "Real Data" : "No Data",
                        trend: "neutral" as const,
                        icon: DollarSign,
                        iconColor: "text-emerald-600",
                        iconBg: "bg-emerald-100 dark:bg-emerald-900/20",
                        description: tr("Total value of all parcels"),
                    },
                ]

            case 'OPS':
                return [
                    {
                        title: tr("Total Parcels"),
                        value: dashboardData?.totalParcels?.toLocaleString() || "0",
                        change: dashboardData?.totalParcels !== undefined ? "Real Data" : "No Data",
                        trend: "neutral" as const,
                        icon: Package,
                        iconColor: "text-blue-600",
                        iconBg: "bg-blue-100 dark:bg-blue-900/20",
                        description: tr("All parcels in the system"),
                    },
                    {
                        title: tr("Total Agents"),
                        value: dashboardData?.totalAgents?.toLocaleString() || "0",
                        change: dashboardData?.totalAgents !== undefined ? "Real Data" : "No Data",
                        trend: "neutral" as const,
                        icon: Users,
                        iconColor: "text-green-600",
                        iconBg: "bg-green-100 dark:bg-green-900/20",
                        description: tr("Active agents"),
                    },
                    {
                        title: tr("Total Companies"),
                        value: dashboardData?.totalCompanies?.toLocaleString() || "0",
                        change: dashboardData?.totalCompanies !== undefined ? "Real Data" : "No Data",
                        trend: "neutral" as const,
                        icon: Building,
                        iconColor: "text-purple-600",
                        iconBg: "bg-purple-100 dark:bg-purple-900/20",
                        description: tr("Registered companies"),
                    },
                    {
                        title: tr("Total Vehicles"),
                        value: dashboardData?.totalVehicles?.toLocaleString() || "0",
                        change: dashboardData?.totalVehicles !== undefined ? "Real Data" : "No Data",
                        trend: "neutral" as const,
                        icon: Truck,
                        iconColor: "text-orange-600",
                        iconBg: "bg-orange-100 dark:bg-orange-900/20",
                        description: tr("Fleet vehicles"),
                    },
                    {
                        title: tr("Total Offices"),
                        value: dashboardData?.totalOffices?.toLocaleString() || "0",
                        change: dashboardData?.totalOffices !== undefined ? "Real Data" : "No Data",
                        trend: "neutral" as const,
                        icon: Building2,
                        iconColor: "text-teal-600",
                        iconBg: "bg-teal-100 dark:bg-teal-900/20",
                        description: tr("Booking offices"),
                    },
                    {
                        title: tr("Delivered Parcels"),
                        value: dashboardData?.deliveredParcels?.toLocaleString() || "0",
                        change: dashboardData?.deliveredParcels !== undefined ? "Real Data" : "No Data",
                        trend: "neutral" as const,
                        icon: TrendingUp,
                        iconColor: "text-emerald-600",
                        iconBg: "bg-emerald-100 dark:bg-emerald-900/20",
                        description: tr("Successfully delivered"),
                    },
                    {
                        title: tr("Lost Parcels"),
                        value: dashboardData?.lostParcels?.toLocaleString() || "0",
                        change: dashboardData?.lostParcels !== undefined ? "Real Data" : "No Data",
                        trend: "neutral" as const,
                        icon: Package,
                        iconColor: "text-red-600",
                        iconBg: "bg-red-100 dark:bg-red-900/20",
                        description: tr("Parcels lost (>5 days in transit)"),
                    },
                    {
                        title: tr("Complaints"),
                        value: dashboardData?.complaints?.toLocaleString() || "0",
                        change: dashboardData?.complaints !== undefined ? "Real Data" : "No Data",
                        trend: "neutral" as const,
                        icon: FileText,
                        iconColor: "text-yellow-600",
                        iconBg: "bg-yellow-100 dark:bg-yellow-900/20",
                        description: tr("Customer complaints"),
                    },
                ]

            case 'OWNER':
                return [
                    {
                        title: tr("Total Price"),
                        value: new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "TZS",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                        }).format(dashboardData?.totalPrice || 0),
                        change: dashboardData?.totalPrice !== undefined ? "Real Data" : "No Data",
                        trend: "neutral" as const,
                        icon: DollarSign,
                        iconColor: "text-green-600",
                        iconBg: "bg-green-100 dark:bg-green-900/20",
                        description: tr("Total revenue"),
                    },
                    {
                        title: tr("Total Agents"),
                        value: dashboardData?.totalAgents?.toLocaleString() || "0",
                        change: dashboardData?.totalAgents !== undefined ? "Real Data" : "No Data",
                        trend: "neutral" as const,
                        icon: Users,
                        iconColor: "text-blue-600",
                        iconBg: "bg-blue-100 dark:bg-blue-900/20",
                        description: tr("Active agents"),
                    },
                    {
                        title: tr("Total Branches"),
                        value: dashboardData?.totalBranches?.toLocaleString() || "0",
                        change: dashboardData?.totalBranches !== undefined ? "Real Data" : "No Data",
                        trend: "neutral" as const,
                        icon: Building2,
                        iconColor: "text-purple-600",
                        iconBg: "bg-purple-100 dark:bg-purple-900/20",
                        description: tr("Company branches"),
                    },
                    {
                        title: tr("Total Vehicles"),
                        value: dashboardData?.totalVehicles?.toLocaleString() || "0",
                        change: dashboardData?.totalVehicles !== undefined ? "Real Data" : "No Data",
                        trend: "neutral" as const,
                        icon: Truck,
                        iconColor: "text-orange-600",
                        iconBg: "bg-orange-100 dark:bg-orange-900/20",
                        description: tr("Fleet vehicles"),
                    },
                    {
                        title: tr("Total Parcels"),
                        value: dashboardData?.totalParcels?.toLocaleString() || "0",
                        change: dashboardData?.totalParcels !== undefined ? "Real Data" : "No Data",
                        trend: "neutral" as const,
                        icon: Package,
                        iconColor: "text-indigo-600",
                        iconBg: "bg-indigo-100 dark:bg-indigo-900/20",
                        description: tr("All parcels"),
                    },
                    {
                        title: tr("Delivered Parcels"),
                        value: dashboardData?.deliveredParcels?.toLocaleString() || "0",
                        change: dashboardData?.deliveredParcels !== undefined ? "Real Data" : "No Data",
                        trend: "neutral" as const,
                        icon: TrendingUp,
                        iconColor: "text-emerald-600",
                        iconBg: "bg-emerald-100 dark:bg-emerald-900/20",
                        description: tr("Successfully delivered"),
                    },
                    {
                        title: tr("Lost Parcels"),
                        value: dashboardData?.lostParcels?.toLocaleString() || "0",
                        change: dashboardData?.lostParcels !== undefined ? "Real Data" : "No Data",
                        trend: "neutral" as const,
                        icon: Package,
                        iconColor: "text-red-600",
                        iconBg: "bg-red-100 dark:bg-red-900/20",
                        description: tr("Parcels lost (>5 days in transit)"),
                    },
                    {
                        title: tr("Complaints"),
                        value: dashboardData?.complaints?.toLocaleString() || "0",
                        change: dashboardData?.complaints !== undefined ? "Real Data" : "No Data",
                        trend: "neutral" as const,
                        icon: FileText,
                        iconColor: "text-yellow-600",
                        iconBg: "bg-yellow-100 dark:bg-yellow-900/20",
                        description: tr("Customer complaints"),
                    },
                ]

            default:
                return []
        }
    }

    const stats = getRoleStats()

    if (stats.length === 0) {
        return null
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-xl">{tr("Overview")}</CardTitle>
                <CardDescription>{tr("Key metrics and performance indicators")}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.3 }}
                        >
                            <Card
                                className="transition-colors duration-200 border group cursor-pointer"
                                title={stat.description}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                                            <p className="text-2xl font-bold">{stat.value}</p>
                                            <div className="flex items-center gap-1">
                                                {stat.trend === "up" ? (
                                                    <ArrowUpRight className="h-3 w-3 text-green-600 dark:text-green-400" />
                                                ) : stat.trend === "down" ? (
                                                    <ArrowDownRight className="h-3 w-3 text-red-600 dark:text-red-400" />
                                                ) : (
                                                    <div className="h-3 w-3" />
                                                )}
                                                <span
                                                    className={`text-xs font-medium ${
                                                        stat.trend === "up"
                                                            ? "text-green-600 dark:text-green-400"
                                                            : stat.trend === "down"
                                                                ? "text-red-600 dark:text-red-400"
                                                                : "text-muted-foreground"
                                                    }`}
                                                >
                                                    {stat.change}
                                                </span>
                                            </div>
                                        </div>
                                        <div
                                            className={`h-10 w-10 rounded-lg ${stat.iconBg} flex items-center justify-center transition-colors duration-300`}
                                        >
                                            <stat.icon
                                                className={`h-5 w-5 ${stat.iconColor} transition-transform duration-300`}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}