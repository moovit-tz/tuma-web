"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TrendingUp, TrendingDown, Users, DollarSign, Clock, AlertTriangle, Activity, Target, Zap } from "lucide-react"
import { floatAnalytics, type ComprehensiveAnalytics } from "@/lib/services/float-analytics"
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts"
import { useTr } from "@/lib/i18n/portal"

interface FloatTransactionsOverviewProps {
    transactions: any[]
    globalStats: any
    loading: boolean
    hasActiveFilters: boolean
    searchQuery: string
    statusFilter: string
    channelFilter: string
}

const CHANNEL_COLORS = {
    AIRTEL: "#ff6b35",
    AZAM: "#1e40af",
    HALOPESA: "#059669",
    TIGO: "#dc2626",
}

export function FloatTransactionsOverview({
                                              transactions,
                                              globalStats,
                                              loading,
                                              hasActiveFilters,
                                              searchQuery,
                                              statusFilter,
                                              channelFilter,
                                          }: FloatTransactionsOverviewProps) {
    const tr = useTr()
    const [analytics, setAnalytics] = useState<ComprehensiveAnalytics | null>(null)
    const [analyticsLoading, setAnalyticsLoading] = useState(true)

    useEffect(() => {
        async function loadAnalytics() {
            try {
                setAnalyticsLoading(true)
                const filters = {
                    ...(statusFilter !== "all" && { statuses: [statusFilter] }),
                    ...(channelFilter !== "all" && { channels: [channelFilter] }),
                    ...(searchQuery && { search: searchQuery }),
                }

                const data = await floatAnalytics.getComprehensiveAnalytics(filters)
                setAnalytics(data)
            } catch (error) {
                console.error("Error loading analytics:", error)
            } finally {
                setAnalyticsLoading(false)
            }
        }

        loadAnalytics()
    }, [statusFilter, channelFilter, searchQuery])

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-TZ", {
            style: "currency",
            currency: "TZS",
            minimumFractionDigits: 0,
        }).format(amount)
    }

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat().format(num)
    }

    if (loading || analyticsLoading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16 mb-2" />
                                <Skeleton className="h-3 w-32" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-64 w-full" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-64 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    if (!analytics) {
        return (
            <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{tr("Unable to load analytics data. Please try refreshing the page.")}</AlertDescription>
            </Alert>
        )
    }

    const { overview, channelMetrics, floatHealth, riskAnalysis, timeBasedInsights } = analytics

    return (
        <div className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{tr("Total Volume")}</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(overview.totalAmount)}</div>
                        <p className="text-xs text-muted-foreground">{tr("{formatNumber} transactions", { formatNumber: formatNumber(overview.totalTransactions) })}</p>
                        <div className="flex items-center space-x-1 mt-1">
                            {overview.growthRate > 0 ? (
                                <TrendingUp className="h-3 w-3 text-green-500" />
                            ) : (
                                <TrendingDown className="h-3 w-3 text-red-500" />
                            )}
                            <span className={`text-xs ${overview.growthRate > 0 ? "text-green-500" : "text-red-500"}`}>
                {tr("{abs}% vs last month", { abs: Math.abs(overview.growthRate).toFixed(1) })}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{tr("Success Rate")}</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{overview.successRate.toFixed(1)}%</div>
                        <Progress value={overview.successRate} className="mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">{tr("{formatNumber} successful payments", { formatNumber: formatNumber(globalStats.paid) })}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{tr("Avg Processing Time")}</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {overview.averageProcessingTime < 60
                                ? `${overview.averageProcessingTime.toFixed(0)}s`
                                : `${(overview.averageProcessingTime / 60).toFixed(1)}m`}
                        </div>
                        <p className="text-xs text-muted-foreground">{tr("Average transaction time")}</p>
                        <Badge variant={overview.averageProcessingTime < 60 ? "default" : "destructive"} className="mt-1">
                            {overview.averageProcessingTime < 60 ? tr("Fast") : tr("Slow")}
                        </Badge>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{tr("Active Users")}</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(overview.activeUsers)}</div>
                        <p className="text-xs text-muted-foreground">{tr("Unique users this period")}</p>
                        <div className="text-xs text-green-600 mt-1">
                            {tr("Avg: {v} TZS per user", { v: (overview.totalAmount / overview.activeUsers).toLocaleString() })}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Revenue Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{tr("Today's Revenue")}</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(overview.revenueToday)}</div>
                        <p className="text-xs text-muted-foreground">{tr("Revenue generated today")}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{tr("This Month's Revenue")}</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(overview.revenueThisMonth)}</div>
                        <p className="text-xs text-muted-foreground">{tr("Monthly revenue total")}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Channel Performance Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>{tr("Channel Performance")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={channelMetrics}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="channel" />
                                <YAxis />
                                <Tooltip
                                    formatter={(value: any, name: string) => [
                                        name === "successRate" ? `${value.toFixed(1)}%` : formatNumber(value),
                                        name === "successRate" ? "Success Rate" : "Total Transactions",
                                    ]}
                                />
                                <Bar dataKey="totalTransactions" fill="#8884d8" />
                                <Bar dataKey="successRate" fill="#82ca9d" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Channel Distribution Pie Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>{tr("Transaction Distribution by Channel")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={channelMetrics}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ channel, percent }) => `${channel} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="totalTransactions"
                                >
                                    {channelMetrics.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={CHANNEL_COLORS[entry.channel as keyof typeof CHANNEL_COLORS] || "#8884d8"}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatNumber(value as number)} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Hourly Volume Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>{tr("24-Hour Transaction Volume")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={timeBasedInsights.hourlyVolume}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="hour" />
                            <YAxis />
                            <Tooltip
                                formatter={(value: any, name: string) => [
                                    name === "amount" ? formatCurrency(value) : formatNumber(value),
                                    name === "amount" ? "Amount" : "Transactions",
                                ]}
                                labelFormatter={(hour) => `${hour}:00`}
                            />
                            <Area type="monotone" dataKey="transactions" stackId="1" stroke="#8884d8" fill="#8884d8" />
                            <Area type="monotone" dataKey="amount" stackId="2" stroke="#82ca9d" fill="#82ca9d" />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Float Health Metrics */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{tr("Float Health Score")}</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{floatHealth.performanceScore}/100</div>
                        <Progress value={floatHealth.performanceScore} className="mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">{tr("Overall system performance")}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{tr("Float Utilization")}</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{floatHealth.utilizationRate.toFixed(1)}%</div>
                        <Progress value={floatHealth.utilizationRate} className="mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                            {tr("{activeFloats} of {totalFloats} floats active", { activeFloats: floatHealth.activeFloats, totalFloats: floatHealth.totalFloats })}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{tr("Total Float Balance")}</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(floatHealth.totalBalance)}</div>
                        <p className="text-xs text-muted-foreground">{tr("Across all active floats")}</p>
                        {floatHealth.lowBalanceFloats > 0 && (
                            <div className="flex items-center space-x-1 mt-1">
                                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                                <span className="text-xs text-yellow-600">{tr("{lowBalanceFloats} low balance alerts", { lowBalanceFloats: floatHealth.lowBalanceFloats })}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Risk Analysis & Recommendations */}
            {riskAnalysis.recommendations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            <span>{tr("Recommendations")}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {riskAnalysis.recommendations.slice(0, 5).map((recommendation, index) => (
                                <Alert key={index}>
                                    <AlertDescription>{recommendation}</AlertDescription>
                                </Alert>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Active Filters Summary */}
            {hasActiveFilters && (
                <Card>
                    <CardHeader>
                        <CardTitle>{tr("Active Filters")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {searchQuery && <Badge variant="secondary">{tr("Search: \"{searchQuery}\"", { searchQuery })}</Badge>}
                            {statusFilter !== "all" && <Badge variant="secondary">{tr("Status: {statusFilter}", { statusFilter })}</Badge>}
                            {channelFilter !== "all" && <Badge variant="secondary">{tr("Channel: {channelFilter}", { channelFilter })}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{tr("Showing analytics for filtered data only. Remove filters to see complete overview.")}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
