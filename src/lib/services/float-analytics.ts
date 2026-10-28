import { getFloatTransactions, getAdminPaymentStatus } from "./transactions"

// Enhanced types for combined data analysis
export interface EnhancedFloatTransaction {
    id: number
    phoneNumber: string
    floatAccountNumber: string
    providerId: number
    amount: string
    createdAt: string
    updatedAt: string
    status: string
    floatId: number
    userId: number
    transactionReference: string
    paymentStatus?: string
    processingTime?: number
    failureReason?: string
    retryCount?: number
    lastStatusUpdate?: string
    float: {
        id: number
        floatAccountNumber: string
        amountIn: string
        amountOut: string
        balance: string
        phoneNumber: string
        status: string
        paymentChannel: string
        remarks: string | null
        createdAt: string
        updatedAt: string
        configurationType: string
        commissionPercentage: number | null
        commissionAmount: number | null
        floatType: string
        mainPoolId: number | null
        userId: number
    }
    user: {
        id: number
        username: string
        fullName: string
        phoneNumber: string
    }
}

export interface ChannelPerformanceMetrics {
    channel: string
    totalTransactions: number
    totalAmount: number
    successRate: number
    averageAmount: number
    averageProcessingTime: number
    failureReasons: { [key: string]: number }
    hourlyDistribution: { [hour: string]: number }
    dailyTrends: { date: string; count: number; amount: number; successRate: number }[]
}

export interface UserBehaviorAnalytics {
    userId: number
    username: string
    fullName: string
    totalTransactions: number
    totalAmount: number
    averageTransactionAmount: number
    preferredChannels: { channel: string; count: number; percentage: number }[]
    transactionPatterns: {
        peakHours: number[]
        peakDays: string[]
        frequency: "high" | "medium" | "low"
    }
    riskScore: number
    lastActivity: string
}

export interface FloatHealthMetrics {
    totalFloats: number
    activeFloats: number
    totalBalance: number
    utilizationRate: number
    lowBalanceFloats: number
    criticalFloats: number
    channelDistribution: { [channel: string]: { count: number; balance: number } }
    performanceScore: number
}

export interface ComprehensiveAnalytics {
    overview: {
        totalTransactions: number
        totalAmount: number
        successRate: number
        averageProcessingTime: number
        activeUsers: number
        revenueToday: number
        revenueThisMonth: number
        growthRate: number
    }
    channelMetrics: ChannelPerformanceMetrics[]
    userAnalytics: UserBehaviorAnalytics[]
    floatHealth: FloatHealthMetrics
    riskAnalysis: {
        suspiciousTransactions: EnhancedFloatTransaction[]
        failurePatterns: { pattern: string; count: number; impact: string }[]
        recommendations: string[]
    }
    timeBasedInsights: {
        hourlyVolume: { hour: number; transactions: number; amount: number }[]
        dailyTrends: { date: string; transactions: number; amount: number; successRate: number }[]
        weeklyComparison: { week: string; change: number; trend: "up" | "down" | "stable" }[]
    }
}

export class FloatAnalyticsService {
    private static instance: FloatAnalyticsService
    private cache: Map<string, { data: any; timestamp: number }> = new Map()
    private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

    static getInstance(): FloatAnalyticsService {
        if (!FloatAnalyticsService.instance) {
            FloatAnalyticsService.instance = new FloatAnalyticsService()
        }
        return FloatAnalyticsService.instance
    }

    private getCachedData<T>(key: string): T | null {
        const cached = this.cache.get(key)
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.data as T
        }
        return null
    }

    private setCachedData(key: string, data: any): void {
        this.cache.set(key, { data, timestamp: Date.now() })
    }

    /**
     * Get comprehensive analytics with optional filters
     */
    async getComprehensiveAnalytics(filters?: {
        dateFrom?: string
        dateTo?: string
        channels?: string[]
        statuses?: string[]
    }): Promise<ComprehensiveAnalytics> {
        const cacheKey = `comprehensive_analytics_${JSON.stringify(filters)}`
        const cached = this.getCachedData<ComprehensiveAnalytics>(cacheKey)
        if (cached) {
            console.log("[Analytics] Returning cached comprehensive analytics")
            return cached
        }

        console.log("[Analytics] Generating comprehensive analytics with filters:", filters)

        try {
            // Fetch data from both endpoints
            const [transactionsData, paymentStatusData] = await Promise.all([
                this.fetchAllTransactions(filters),
                this.fetchPaymentStatusData(filters),
            ])

            // Combine and enhance the data
            const enhancedTransactions = this.combineTransactionData(transactionsData, paymentStatusData)

            // Generate comprehensive analytics
            const analytics: ComprehensiveAnalytics = {
                overview: this.generateOverviewMetrics(enhancedTransactions),
                channelMetrics: this.generateChannelMetrics(enhancedTransactions),
                userAnalytics: this.generateUserAnalytics(enhancedTransactions),
                floatHealth: this.generateFloatHealthMetrics(enhancedTransactions),
                riskAnalysis: this.generateRiskAnalysis(enhancedTransactions),
                timeBasedInsights: this.generateTimeBasedInsights(enhancedTransactions),
            }

            this.setCachedData(cacheKey, analytics)
            console.log("✅ Comprehensive analytics generated successfully")
            return analytics
        } catch (error) {
            console.error("❌ Error generating comprehensive analytics:", error)
            throw error
        }
    }

    private async fetchAllTransactions(filters?: any): Promise<any[]> {
        console.log("[Analytics] Fetching all transactions")
        const allTransactions = []
        let page = 1
        let hasMore = true

        while (hasMore) {
            try {
                const response = await getFloatTransactions({
                    page,
                    limit: 100,
                    ...filters,
                })

                allTransactions.push(...(response.transactions || []))

                if (!response.pagination || page >= response.pagination.totalPages) {
                    hasMore = false
                } else {
                    page++
                }
            } catch (error) {
                console.error(`[Analytics] Error fetching page ${page}:`, error)
                hasMore = false
            }
        }

        console.log(`[Analytics] Fetched ${allTransactions.length} transactions`)
        return allTransactions
    }

    private async fetchPaymentStatusData(filters?: any): Promise<any[]> {
        console.log("[Analytics] Fetching payment status data")
        const allPaymentStatus = []
        let page = 1
        let hasMore = true

        while (hasMore) {
            try {
                const response = await getAdminPaymentStatus({
                    page,
                    limit: 100,
                    ...filters,
                })

                if (response.data) {
                    allPaymentStatus.push(...response.data)
                }

                if (!response.meta || page >= response.meta.last_page) {
                    hasMore = false
                } else {
                    page++
                }
            } catch (error) {
                console.error(`[Analytics] Error fetching payment status page ${page}:`, error)
                hasMore = false
            }
        }

        console.log(`[Analytics] Fetched ${allPaymentStatus.length} payment status records`)
        return allPaymentStatus
    }

    private combineTransactionData(transactions: any[], paymentStatus: any[]): EnhancedFloatTransaction[] {
        const paymentStatusMap = new Map()
        paymentStatus.forEach((status) => {
            if (status.transactionReference || status.reference) {
                paymentStatusMap.set(status.transactionReference || status.reference, status)
            }
        })

        return transactions.map((transaction) => {
            const statusData = paymentStatusMap.get(transaction.transactionReference)

            return {
                ...transaction,
                paymentStatus: statusData?.paymentStatus || transaction.status,
                processingTime: statusData?.processingTime || this.calculateProcessingTime(transaction),
                failureReason: statusData?.failureReason || null,
                retryCount: statusData?.retryCount || 0,
                lastStatusUpdate: statusData?.updatedAt || transaction.updatedAt,
            }
        })
    }

    private calculateProcessingTime(transaction: any): number {
        const created = new Date(transaction.createdAt)
        const updated = new Date(transaction.updatedAt)
        return Math.abs(updated.getTime() - created.getTime()) / 1000 // seconds
    }

    private generateOverviewMetrics(transactions: EnhancedFloatTransaction[]) {
        const total = transactions.length
        const totalAmount = transactions.reduce((sum, t) => sum + Number.parseFloat(t.amount), 0)
        const successful = transactions.filter((t) => t.status === "PAID").length
        const successRate = total > 0 ? (successful / total) * 100 : 0

        const avgProcessingTime = transactions.reduce((sum, t) => sum + (t.processingTime || 0), 0) / total
        const uniqueUsers = new Set(transactions.map((t) => t.userId)).size

        const today = new Date().toISOString().split("T")[0]
        const thisMonth = new Date().toISOString().slice(0, 7)

        const todayTransactions = transactions.filter((t) => t.createdAt.startsWith(today))
        const thisMonthTransactions = transactions.filter((t) => t.createdAt.startsWith(thisMonth))

        const revenueToday = todayTransactions.reduce((sum, t) => sum + Number.parseFloat(t.amount), 0)
        const revenueThisMonth = thisMonthTransactions.reduce((sum, t) => sum + Number.parseFloat(t.amount), 0)

        const growthRate = this.calculateGrowthRate(transactions)

        return {
            totalTransactions: total,
            totalAmount,
            successRate,
            averageProcessingTime: avgProcessingTime,
            activeUsers: uniqueUsers,
            revenueToday,
            revenueThisMonth,
            growthRate,
        }
    }

    private generateChannelMetrics(transactions: EnhancedFloatTransaction[]): ChannelPerformanceMetrics[] {
        const channelGroups = this.groupBy(transactions, (t) => t.float.paymentChannel)

        return Object.entries(channelGroups).map(([channel, channelTransactions]) => {
            const total = channelTransactions.length
            const successful = channelTransactions.filter((t) => t.status === "PAID").length
            const totalAmount = channelTransactions.reduce((sum, t) => sum + Number.parseFloat(t.amount), 0)

            const failureReasons = this.groupBy(
                channelTransactions.filter((t) => t.status === "FAILED"),
                (t) => t.failureReason || "Unknown",
            )

            const hourlyDist = this.generateHourlyDistribution(channelTransactions)
            const dailyTrends = this.generateDailyTrends(channelTransactions)

            return {
                channel,
                totalTransactions: total,
                totalAmount,
                successRate: total > 0 ? (successful / total) * 100 : 0,
                averageAmount: total > 0 ? totalAmount / total : 0,
                averageProcessingTime: channelTransactions.reduce((sum, t) => sum + (t.processingTime || 0), 0) / total,
                failureReasons: Object.fromEntries(
                    Object.entries(failureReasons).map(([reason, txns]) => [reason, txns.length]),
                ),
                hourlyDistribution: hourlyDist,
                dailyTrends,
            }
        })
    }

    private generateUserAnalytics(transactions: EnhancedFloatTransaction[]): UserBehaviorAnalytics[] {
        const userGroups = this.groupBy(transactions, (t) => t.userId.toString())

        return Object.entries(userGroups)
            .map(([userId, userTransactions]) => {
                const user = userTransactions[0].user
                const totalAmount = userTransactions.reduce((sum, t) => sum + Number.parseFloat(t.amount), 0)

                const channelPreferences = this.groupBy(userTransactions, (t) => t.float.paymentChannel)
                const preferredChannels = Object.entries(channelPreferences)
                    .map(([channel, txns]) => ({
                        channel,
                        count: txns.length,
                        percentage: (txns.length / userTransactions.length) * 100,
                    }))
                    .sort((a, b) => b.count - a.count)

                const transactionPatterns = this.analyzeTransactionPatterns(userTransactions)
                const riskScore = this.calculateUserRiskScore(userTransactions)

                return {
                    userId: Number.parseInt(userId),
                    username: user.username,
                    fullName: user.fullName,
                    totalTransactions: userTransactions.length,
                    totalAmount,
                    averageTransactionAmount: totalAmount / userTransactions.length,
                    preferredChannels,
                    transactionPatterns,
                    riskScore,
                    lastActivity: userTransactions[0].createdAt,
                }
            })
            .sort((a, b) => b.totalAmount - a.totalAmount)
    }

    private generateFloatHealthMetrics(transactions: EnhancedFloatTransaction[]): FloatHealthMetrics {
        const floatGroups = this.groupBy(transactions, (t) => t.floatId.toString())
        const floats = Object.values(floatGroups).map((txns) => txns[0].float)

        const totalBalance = floats.reduce((sum, f) => sum + Number.parseFloat(f.balance), 0)
        const activeFloats = floats.filter((f) => f.status === "active").length
        const lowBalanceFloats = floats.filter((f) => Number.parseFloat(f.balance) < 10000).length
        const criticalFloats = floats.filter((f) => Number.parseFloat(f.balance) < 1000).length

        const channelDistribution = this.groupBy(floats, (f) => f.paymentChannel)
        const channelDist = Object.fromEntries(
            Object.entries(channelDistribution).map(([channel, channelFloats]) => [
                channel,
                {
                    count: channelFloats.length,
                    balance: channelFloats.reduce((sum, f) => sum + Number.parseFloat(f.balance), 0),
                },
            ]),
        )

        const utilizationRate = this.calculateUtilizationRate(transactions, floats)
        const performanceScore = this.calculatePerformanceScore(transactions, floats)

        return {
            totalFloats: floats.length,
            activeFloats,
            totalBalance,
            utilizationRate,
            lowBalanceFloats,
            criticalFloats,
            channelDistribution: channelDist,
            performanceScore,
        }
    }

    private generateRiskAnalysis(transactions: EnhancedFloatTransaction[]) {
        const suspiciousTransactions = this.identifySuspiciousTransactions(transactions)
        const failurePatterns = this.analyzeFailurePatterns(transactions)
        const recommendations = this.generateRecommendations(transactions, failurePatterns)

        return {
            suspiciousTransactions,
            failurePatterns,
            recommendations,
        }
    }

    private generateTimeBasedInsights(transactions: EnhancedFloatTransaction[]) {
        const hourlyVolume = this.generateHourlyVolume(transactions)
        const dailyTrends = this.generateDailyTrends(transactions)
        const weeklyComparison = this.generateWeeklyComparison(transactions)

        return {
            hourlyVolume,
            dailyTrends,
            weeklyComparison,
        }
    }

    // Helper methods
    private groupBy<T>(array: T[], keyFn: (item: T) => string): { [key: string]: T[] } {
        return array.reduce(
            (groups, item) => {
                const key = keyFn(item)
                if (!groups[key]) groups[key] = []
                groups[key].push(item)
                return groups
            },
            {} as { [key: string]: T[] },
        )
    }

    private generateHourlyDistribution(transactions: EnhancedFloatTransaction[]): { [hour: string]: number } {
        const hourly: { [hour: string]: number } = {}

        transactions.forEach((t) => {
            const hour = new Date(t.createdAt).getHours().toString()
            hourly[hour] = (hourly[hour] || 0) + 1
        })

        return hourly
    }

    private generateDailyTrends(transactions: EnhancedFloatTransaction[]) {
        const dailyGroups = this.groupBy(transactions, (t) => t.createdAt.split("T")[0])

        return Object.entries(dailyGroups)
            .map(([date, dayTransactions]) => ({
                date,
                count: dayTransactions.length,
                amount: dayTransactions.reduce((sum, t) => sum + Number.parseFloat(t.amount), 0),
                successRate: (dayTransactions.filter((t) => t.status === "PAID").length / dayTransactions.length) * 100,
            }))
            .sort((a, b) => a.date.localeCompare(b.date))
    }

    private calculateGrowthRate(transactions: EnhancedFloatTransaction[]): number {
        const now = new Date()
        const currentMonth = now.toISOString().slice(0, 7)
        const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1).toISOString().slice(0, 7)

        const currentMonthTxns = transactions.filter((t) => t.createdAt.startsWith(currentMonth))
        const previousMonthTxns = transactions.filter((t) => t.createdAt.startsWith(previousMonth))

        if (previousMonthTxns.length === 0) return 0

        return ((currentMonthTxns.length - previousMonthTxns.length) / previousMonthTxns.length) * 100
    }

    private analyzeTransactionPatterns(transactions: EnhancedFloatTransaction[]) {
        const hours = transactions.map((t) => new Date(t.createdAt).getHours())
        const days = transactions.map((t) => new Date(t.createdAt).toLocaleDateString("en-US", { weekday: "long" }))

        const hourCounts = this.groupBy(
            hours.map((h) => ({ hour: h })),
            (item) => item.hour.toString(),
        )
        const dayCounts = this.groupBy(
            days.map((d) => ({ day: d })),
            (item) => item.day,
        )

        const peakHours = Object.entries(hourCounts)
            .sort(([, a], [, b]) => b.length - a.length)
            .slice(0, 3)
            .map(([hour]) => Number.parseInt(hour))

        const peakDays = Object.entries(dayCounts)
            .sort(([, a], [, b]) => b.length - a.length)
            .slice(0, 2)
            .map(([day]) => day)

        const frequency = transactions.length > 50 ? "high" : transactions.length > 10 ? "medium" : "low"

        return {
            peakHours,
            peakDays,
            frequency: frequency as "high" | "medium" | "low",
        }
    }

    private calculateUserRiskScore(transactions: EnhancedFloatTransaction[]): number {
        let riskScore = 0

        if (transactions.length > 20) riskScore += 20

        const avgAmount = transactions.reduce((sum, t) => sum + Number.parseFloat(t.amount), 0) / transactions.length
        if (avgAmount > 100000) riskScore += 30

        const failureRate = transactions.filter((t) => t.status === "FAILED").length / transactions.length
        if (failureRate > 0.3) riskScore += 25

        const uniqueChannels = new Set(transactions.map((t) => t.float.paymentChannel)).size
        if (uniqueChannels > 2) riskScore += 15

        const recentTransactions = transactions.filter((t) => {
            const txnDate = new Date(t.createdAt)
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
            return txnDate > dayAgo
        })
        if (recentTransactions.length > 10) riskScore += 10

        return Math.min(riskScore, 100)
    }

    private calculateUtilizationRate(transactions: EnhancedFloatTransaction[], floats: any[]): number {
        const activeFloats = floats.filter((f) => f.status === "active").length
        const floatsWithRecentActivity = new Set(
            transactions
                .filter((t) => {
                    const txnDate = new Date(t.createdAt)
                    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    return txnDate > weekAgo
                })
                .map((t) => t.floatId),
        ).size

        return activeFloats > 0 ? (floatsWithRecentActivity / activeFloats) * 100 : 0
    }

    private calculatePerformanceScore(transactions: EnhancedFloatTransaction[], floats: any[]): number {
        const successRate = (transactions.filter((t) => t.status === "PAID").length / transactions.length) * 100
        const avgProcessingTime = transactions.reduce((sum, t) => sum + (t.processingTime || 0), 0) / transactions.length
        const utilizationRate = this.calculateUtilizationRate(transactions, floats)

        const timeScore = Math.max(0, 100 - avgProcessingTime / 60)
        const performanceScore = successRate * 0.5 + timeScore * 0.3 + utilizationRate * 0.2

        return Math.round(performanceScore)
    }

    private identifySuspiciousTransactions(transactions: EnhancedFloatTransaction[]): EnhancedFloatTransaction[] {
        return transactions
            .filter((t) => {
                const amount = Number.parseFloat(t.amount)
                const isLargeAmount = amount > 500000
                const isRepeatedFailure = t.retryCount && t.retryCount > 3
                const isUnusualTime = this.isUnusualTime(t.createdAt)

                return isLargeAmount || isRepeatedFailure || isUnusualTime
            })
            .slice(0, 20)
    }

    private isUnusualTime(dateString: string): boolean {
        const date = new Date(dateString)
        const hour = date.getHours()
        return hour < 6 || hour > 23
    }

    private analyzeFailurePatterns(transactions: EnhancedFloatTransaction[]) {
        const failedTransactions = transactions.filter((t) => t.status === "FAILED")
        const patterns = []

        const channelFailures = this.groupBy(failedTransactions, (t) => t.float.paymentChannel)
        Object.entries(channelFailures).forEach(([channel, failures]) => {
            if (failures.length > 10) {
                patterns.push({
                    pattern: `High failure rate on ${channel}`,
                    count: failures.length,
                    impact: failures.length > 50 ? "High" : failures.length > 20 ? "Medium" : "Low",
                })
            }
        })

        const hourlyFailures = this.groupBy(failedTransactions, (t) => new Date(t.createdAt).getHours().toString())
        Object.entries(hourlyFailures).forEach(([hour, failures]) => {
            if (failures.length > 15) {
                patterns.push({
                    pattern: `Failures spike at ${hour}:00`,
                    count: failures.length,
                    impact: "Medium",
                })
            }
        })

        return patterns
    }

    private generateRecommendations(transactions: EnhancedFloatTransaction[], failurePatterns: any[]): string[] {
        const recommendations = []

        const successRate = (transactions.filter((t) => t.status === "PAID").length / transactions.length) * 100
        if (successRate < 85) {
            recommendations.push("Overall success rate is below 85%. Consider investigating payment gateway issues.")
        }

        const channelMetrics = this.generateChannelMetrics(transactions)
        channelMetrics.forEach((channel) => {
            if (channel.successRate < 80) {
                recommendations.push(
                    `${channel.channel} has low success rate (${channel.successRate.toFixed(1)}%). Consider reviewing integration.`,
                )
            }
        })

        const avgProcessingTime = transactions.reduce((sum, t) => sum + (t.processingTime || 0), 0) / transactions.length
        if (avgProcessingTime > 300) {
            recommendations.push("Average processing time is high. Consider optimizing payment processing workflow.")
        }

        failurePatterns.forEach((pattern) => {
            if (pattern.impact === "High") {
                recommendations.push(`Address ${pattern.pattern} - this is causing significant impact.`)
            }
        })

        const floats = transactions.map((t) => t.float)
        const lowBalanceFloats = floats.filter((f) => Number.parseFloat(f.balance) < 10000).length
        if (lowBalanceFloats > 0) {
            recommendations.push(`${lowBalanceFloats} float(s) have low balance. Consider rebalancing.`)
        }

        return recommendations.slice(0, 10)
    }

    private generateHourlyVolume(transactions: EnhancedFloatTransaction[]) {
        const hourlyData: { [hour: number]: { transactions: number; amount: number } } = {}

        for (let hour = 0; hour < 24; hour++) {
            hourlyData[hour] = { transactions: 0, amount: 0 }
        }

        transactions.forEach((t) => {
            const hour = new Date(t.createdAt).getHours()
            hourlyData[hour].transactions++
            hourlyData[hour].amount += Number.parseFloat(t.amount)
        })

        return Object.entries(hourlyData).map(([hour, data]) => ({
            hour: Number.parseInt(hour),
            transactions: data.transactions,
            amount: data.amount,
        }))
    }

    private generateWeeklyComparison(transactions: EnhancedFloatTransaction[]) {
        const now = new Date()
        const thisWeek = transactions.filter((t) => {
            const txnDate = new Date(t.createdAt)
            const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            return txnDate > weekStart
        })

        const lastWeek = transactions.filter((t) => {
            const txnDate = new Date(t.createdAt)
            const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
            const lastWeekEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            return txnDate > lastWeekStart && txnDate <= lastWeekEnd
        })

        const change = lastWeek.length > 0 ? ((thisWeek.length - lastWeek.length) / lastWeek.length) * 100 : 0
        const trend = change > 5 ? "up" : change < -5 ? "down" : "stable"

        return [
            {
                week: "This Week",
                change,
                trend: trend as "up" | "down" | "stable",
            },
        ]
    }
}

// Export singleton instance
export const floatAnalytics = FloatAnalyticsService.getInstance()