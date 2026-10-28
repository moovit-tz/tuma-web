"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import {
    Package,
    Users,
    Building2,
    Truck,
    Building,
    CheckCircle,
    XCircle,
    DollarSign,
    Clock,
    Inbox,
    RefreshCw,
} from "lucide-react"
import { useTr } from "@/lib/i18n/portal"

interface EnhancedDashboardStatsProps {
    data?: any
    isLoading?: boolean
    onRefresh?: () => void
}

interface StatCard {
    key: string
    title: string
    value: number | string
    icon: React.ComponentType<{ className?: string }>
    description?: string
    color?: "blue" | "green" | "red" | "yellow" | "purple" | "orange" | "teal" | "indigo"
    available: boolean
}

export function EnhancedDashboardStats({ data, isLoading = false, onRefresh }: EnhancedDashboardStatsProps) {
    const tr = useTr()
    const [localLoading, setLocalLoading] = useState(false)
    const [statsData, setStatsData] = useState<any>(data)

    // Fetch dashboard stats from API
    const fetchDashboardStats = async () => {
        try {
            setLocalLoading(true)
            const response = await fetch("/api/dashboard", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            })

            if (!response.ok) {
                throw new Error("Failed to fetch dashboard stats")
            }

            const result = await response.json()
            console.log("Dashboard stats fetched:", result)
            setStatsData(result)
        } catch (error) {
            console.error("Error fetching dashboard stats:", error)
        } finally {
            setLocalLoading(false)
        }
    }

    // Auto-fetch data on mount if no data is provided
    useEffect(() => {
        if (!statsData && !isLoading && !localLoading) {
            console.log("Auto-fetching dashboard stats on mount...")
            fetchDashboardStats()
        }
    }, [])

    // Update local state when data prop changes
    useEffect(() => {
        if (data) {
            setStatsData(data)
        }
    }, [data])

    // Format numbers with commas
    const formatNumber = (num: number | undefined | null): string => {
        if (num == null) return "0"
        return num.toLocaleString()
    }

    // Format currency
    const formatCurrency = (num: number | undefined | null): string => {
        if (num == null) return "TZS 0"
        return `TZS ${num.toLocaleString()}`
    }

    // Determine user role from data - check multiple possible locations
    const userRole =
        statsData?.userRole?.toUpperCase() ||
        statsData?.role?.toUpperCase() ||
        statsData?.stats?.role?.toUpperCase() ||
        "USER"

    const isBizRole = ["OWNER", "BUSINESS", "BIZ", "COMPANY_OWNER"].includes(userRole)
    const isOpsRole = ["OPS", "OPERATIONS", "ADMIN", "SUPER_ADMIN"].includes(userRole)

    console.log("Dashboard stats component - role detection:", { userRole, isBizRole, isOpsRole, statsData })

    // Extract stats from the data structure
    const stats = statsData?.stats || statsData || {}

    // Define stats based on user role
    const getStatsForRole = (): StatCard[] => {
        if (isBizRole) {
            // Business Owner Dashboard Stats - exactly as specified
            return [
                {
                    key: "totalParcelsPrice",
                    title: tr("Total Revenue"),
                    value: formatCurrency(stats?.totalParcelsPrice || stats?.totalRevenue || stats?.revenue?.total),
                    icon: DollarSign,
                    description: tr("Total parcels revenue"),
                    color: "green" as const,
                    available: true,
                },
                {
                    key: "totalAgents",
                    title: tr("Total Agents"),
                    value: formatNumber(stats?.totalAgents || stats?.agents?.total),
                    icon: Users,
                    description: tr("Active agents"),
                    color: "purple" as const,
                    available: true,
                },
                // {
                //     key: "totalOffices",
                //     title: "Total Offices",
                //     value: formatNumber(stats?.totalOffices || stats?.offices?.total),
                //     icon: Building,
                //     description: "Branch offices",
                //     color: "teal" as const,
                //     available: true,
                // },
                {
                    key: "totalVehicles",
                    title: tr("Total Vehicles"),
                    value: formatNumber(stats?.totalVehicles || stats?.vehicles?.total),
                    icon: Truck,
                    description: tr("Fleet vehicles"),
                    color: "indigo" as const,
                    available: true,
                },
                {
                    key: "receivedParcels",
                    title: tr("Received Parcels"),
                    value: formatNumber(stats?.receivedParcels || stats?.parcels?.received),
                    icon: Inbox,
                    description: tr("Parcels received"),
                    color: "blue" as const,
                    available: true,
                },
                {
                    key: "deliveredParcels",
                    title: tr("Delivered Parcels"),
                    value: formatNumber(stats?.deliveredParcels || stats?.parcels?.delivered),
                    icon: CheckCircle,
                    description: tr("Successfully delivered"),
                    color: "green" as const,
                    available: true,
                },
                {
                    key: "lostParcels",
                    title: tr("Lost Parcels"),
                    value: formatNumber(stats?.lostParcels || stats?.parcels?.lost || 0),
                    icon: XCircle,
                    description: tr("Requires attention"),
                    color: "red" as const,
                    available: true,
                },
            ]
        } else if (isOpsRole) {
            // Operations/Admin Dashboard Stats
            return [
                {
                    key: "totalParcels",
                    title: tr("Total Parcels"),
                    value: formatNumber(stats?.totalParcels || stats?.parcels?.total),
                    icon: Package,
                    description: tr("All parcels in system"),
                    color: "blue" as const,
                    available: true,
                },
                {
                    key: "totalCompanies",
                    title: tr("Companies"),
                    value: formatNumber(stats?.totalCompanies || stats?.companies?.total),
                    icon: Building2,
                    description: tr("Registered companies"),
                    color: "purple" as const,
                    available: true,
                },
                {
                    key: "totalAgents",
                    title: tr("Total Agents"),
                    value: formatNumber(stats?.totalAgents || stats?.agents?.total),
                    icon: Users,
                    description: tr("Active agents"),
                    color: "green" as const,
                    available: true,
                },
                {
                    key: "totalVehicles",
                    title: tr("Total Vehicles"),
                    value: formatNumber(stats?.totalVehicles || stats?.vehicles?.total),
                    icon: Truck,
                    description: tr("Fleet vehicles"),
                    color: "orange" as const,
                    available: true,
                },
                {
                    key: "totalOffices",
                    title: tr("Booking Offices"),
                    value: formatNumber(stats?.totalOffices || stats?.offices?.total),
                    icon: Building,
                    description: tr("All offices"),
                    color: "yellow" as const,
                    available: true,
                },
                {
                    key: "deliveredParcels",
                    title: tr("Delivered"),
                    value: formatNumber(stats?.deliveredParcels || stats?.parcels?.delivered),
                    icon: CheckCircle,
                    description: tr("Successfully delivered"),
                    color: "green" as const,
                    available: true,
                },
                {
                    key: "receivedParcels",
                    title: tr("Received"),
                    value: formatNumber(stats?.receivedParcels || stats?.parcels?.received),
                    icon: Package,
                    description: tr("Parcels received"),
                    color: "blue" as const,
                    available: true,
                },
                {
                    key: "lostParcels",
                    title: tr("Lost Parcels"),
                    value: formatNumber(stats?.lostParcels || stats?.parcels?.lost || 0),
                    icon: XCircle,
                    description: tr("Requires attention"),
                    color: "red" as const,
                    available: true,
                },
            ]
        } else {
            // Agent/Other roles - Basic stats
            return [
                {
                    key: "totalParcels",
                    title: tr("My Parcels"),
                    value: formatNumber(stats?.totalParcels || stats?.parcels?.total),
                    icon: Package,
                    description: tr("Parcels I've handled"),
                    color: "blue" as const,
                    available: true,
                },
                {
                    key: "deliveredParcels",
                    title: tr("Delivered"),
                    value: formatNumber(stats?.deliveredParcels || stats?.parcels?.delivered),
                    icon: CheckCircle,
                    description: tr("Successfully delivered"),
                    color: "green" as const,
                    available: true,
                },
                {
                    key: "pendingParcels",
                    title: tr("Pending"),
                    value: formatNumber(stats?.pendingParcels || stats?.parcels?.pending),
                    icon: Clock,
                    description: tr("Awaiting delivery"),
                    color: "orange" as const,
                    available: true,
                },
            ]
        }
    }

    const statCards = getStatsForRole().filter((stat) => stat.available)

    // Calculate grid columns based on number of items
    const getGridClass = () => {
        const count = statCards.length
        if (count === 0) return "grid-cols-1"
        if (count === 1) return "grid-cols-1"
        if (count === 2) return "grid-cols-1 sm:grid-cols-2"
        if (count === 3) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        if (count === 4) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        if (count <= 6) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        // For 7+ items, use responsive grid
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    }

    // Get color classes for card styling
    const getColorClasses = (color: StatCard["color"]) => {
        switch (color) {
            case "blue":
                return {
                    iconBg: "bg-blue-100 dark:bg-blue-900/30",
                    iconColor: "text-blue-600 dark:text-blue-400",
                    border: "border-l-blue-500",
                    gradient: "bg-blue-50 dark:bg-blue-950/20",
                }
            case "green":
                return {
                    iconBg: "bg-green-100 dark:bg-green-900/30",
                    iconColor: "text-green-600 dark:text-green-400",
                    border: "border-l-green-500",
                    gradient: "bg-green-50 dark:bg-green-950/20",
                }
            case "red":
                return {
                    iconBg: "bg-red-100 dark:bg-red-900/30",
                    iconColor: "text-red-600 dark:text-red-400",
                    border: "border-l-red-500",
                    gradient: "bg-red-50 dark:bg-red-950/20",
                }
            case "yellow":
                return {
                    iconBg: "bg-yellow-100 dark:bg-yellow-900/30",
                    iconColor: "text-yellow-600 dark:text-yellow-400",
                    border: "border-l-yellow-500",
                    gradient: "bg-yellow-50 dark:bg-yellow-950/20",
                }
            case "purple":
                return {
                    iconBg: "bg-purple-100 dark:bg-purple-900/30",
                    iconColor: "text-purple-600 dark:text-purple-400",
                    border: "border-l-purple-500",
                    gradient: "bg-purple-50 dark:bg-purple-950/20",
                }
            case "orange":
                return {
                    iconBg: "bg-orange-100 dark:bg-orange-900/30",
                    iconColor: "text-orange-600 dark:text-orange-400",
                    border: "border-l-orange-500",
                    gradient: "bg-orange-50 dark:bg-orange-950/20",
                }
            case "teal":
                return {
                    iconBg: "bg-teal-100 dark:bg-teal-900/30",
                    iconColor: "text-teal-600 dark:text-teal-400",
                    border: "border-l-teal-500",
                    gradient: "bg-teal-50 dark:bg-teal-950/20",
                }
            case "indigo":
                return {
                    iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
                    iconColor: "text-indigo-600 dark:text-indigo-400",
                    border: "border-l-indigo-500",
                    gradient: "bg-indigo-50 dark:bg-indigo-950/20",
                }
            default:
                return {
                    iconBg: "bg-gray-100 dark:bg-gray-900/30",
                    iconColor: "text-gray-600 dark:text-gray-400",
                    border: "border-l-gray-500",
                    gradient: "bg-gray-50 dark:bg-gray-950/20",
                }
        }
    }

    const loading = isLoading || localLoading

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
                        <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
                    </div>
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="h-4 w-24 bg-muted rounded"></div>
                                <div className="h-10 w-10 bg-muted rounded-lg"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 w-20 bg-muted rounded mb-2"></div>
                                <div className="h-3 w-32 bg-muted rounded"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    // If no stats available
    if (statCards.length === 0 || !stats || Object.keys(stats).length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold">{tr("Dashboard Overview")}</h2>
                        <p className="text-muted-foreground">
                            {statsData?.companyName ? `${statsData.companyName} • ` : ""}
                            {userRole.replace("_", " ")}{" "}{tr("Dashboard")}</p>
                    </div>
                </div>
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                        <Package className="h-12 w-12 text-muted-foreground/50" />
                        <div className="text-center space-y-2">
                            <p className="text-lg font-medium text-muted-foreground">{tr("No statistics available")}</p>
                            <p className="text-sm text-muted-foreground/70">{tr("Refresh to get real-time stats")}</p>
                        </div>
                        {onRefresh && (
                            <Button onClick={onRefresh} variant="outline" className="mt-4 bg-transparent">
                                <RefreshCw className="h-4 w-4 mr-2" />{tr("Refresh Stats")}</Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Role and Company Information */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold">{tr("Dashboard Overview")}</h2>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1">
                        {statsData?.companyName && <span className="font-medium">{statsData.companyName} • </span>}
                        {isBizRole ? tr("Business Dashboard") : isOpsRole ? tr("Dashboard") : tr("Agent Dashboard")}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="capitalize text-xs sm:text-sm">
                        {userRole.toLowerCase().replace("_", " ")}
                    </Badge>
                    {statsData?.companyName && (
                        <Badge variant="secondary" className="text-xs sm:text-sm">
                            <Building2 className="h-3 w-3 mr-1" />
                            {statsData.companyName}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Stats Cards with Dynamic Grid */}
            <div className={`grid gap-3 sm:gap-4 ${getGridClass()}`}>
                {statCards.map((stat) => {
                    const colors = getColorClasses(stat.color)
                    const IconComponent = stat.icon

                    return (
                        <Card
                            key={stat.key}
                            className={`group relative overflow-hidden transition-colors duration-300 border-l-4 ${colors.border} cursor-default`}
                        >
                            <div
                                className={`absolute inset-0 ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                            />
                            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                                <div
                                    className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center ${colors.iconBg} transition-transform duration-300`}
                                >
                                    <IconComponent className={`h-4 w-4 sm:h-5 sm:w-5 ${colors.iconColor}`} />
                                </div>
                            </CardHeader>
                            <CardContent className="relative">
                                <div className="text-xl sm:text-2xl font-bold mb-1">{stat.value}</div>
                                {stat.description && <p className="text-xs sm:text-xs text-muted-foreground">{stat.description}</p>}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
