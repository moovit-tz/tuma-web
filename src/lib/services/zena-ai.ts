import type { ComprehensiveAnalytics } from "./float-analytics"

export interface ZenaInsight {
    id: string
    type: "alert" | "recommendation" | "opportunity" | "insight"
    priority: "high" | "medium" | "low"
    title: string
    description: string
    impact: string
    actionItems: string[]
    category: string
    confidence: number
    data?: any
}

export interface ZenaAnalysis {
    summary: string
    keyInsights: ZenaInsight[]
    recommendations: ZenaInsight[]
    alerts: ZenaInsight[]
    opportunities: ZenaInsight[]
    conversationStarters: string[]
    timestamp: Date
}

class ZenaAIService {
    private cache = new Map<string, ZenaAnalysis>()
    private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

    async analyzeData(analytics: ComprehensiveAnalytics): Promise<ZenaAnalysis> {
        const cacheKey = this.generateCacheKey(analytics)
        const cached = this.cache.get(cacheKey)

        if (cached && Date.now() - cached.timestamp.getTime() < this.CACHE_DURATION) {
            return cached
        }

        try {
            // For now, we'll use rule-based analysis
            // This can be replaced with actual AI integration later
            const analysis = this.generateRuleBasedAnalysis(analytics)
            this.cache.set(cacheKey, analysis)
            return analysis
        } catch (error) {
            console.error("Error analyzing data with Zena:", error)
            return this.getFallbackAnalysis(analytics)
        }
    }

    async chatWithZena(
        message: string,
        analytics: ComprehensiveAnalytics,
        conversationHistory: Array<{ role: string; content: string }> = [],
    ): Promise<{ textStream: AsyncIterable<string> }> {
        // Simulate streaming response for now
        return {
            textStream: this.generateStreamingResponse(message, analytics, conversationHistory),
        }
    }

    private async *generateStreamingResponse(
        message: string,
        analytics: ComprehensiveAnalytics,
        conversationHistory: Array<{ role: string; content: string }>,
    ): AsyncIterable<string> {
        const response = this.generateChatResponse(message, analytics)
        const words = response.split(" ")

        for (const word of words) {
            yield word + " "
            // Simulate typing delay
            await new Promise((resolve) => setTimeout(resolve, 50))
        }
    }

    private generateChatResponse(message: string, analytics: ComprehensiveAnalytics): string {
        const lowerMessage = message.toLowerCase()

        if (lowerMessage.includes("success rate")) {
            return `Your current success rate is ${analytics.summary.successRate.toFixed(1)}%. ${
                analytics.summary.successRate < 85
                    ? "This is below the recommended 85% threshold. I recommend investigating failed transactions and checking payment gateway connectivity."
                    : "This is within the healthy range. Keep monitoring for any downward trends."
            }`
        }

        if (lowerMessage.includes("channel") || lowerMessage.includes("payment")) {
            const topChannel = analytics.channelMetrics?.reduce((prev, current) =>
                prev.totalTransactions > current.totalTransactions ? prev : current,
            )
            return topChannel
                ? `Your top-performing channel is ${topChannel.channel} with ${topChannel.totalTransactions.toLocaleString()} transactions and a ${topChannel.successRate.toFixed(1)}% success rate. Consider optimizing this channel further or promoting it to users.`
                : "I need more channel data to provide specific recommendations about payment channels."
        }

        if (lowerMessage.includes("float") || lowerMessage.includes("balance")) {
            return `Your float system has a performance score of ${analytics.floatHealth?.performanceScore || "N/A"}/100 with ${analytics.floatHealth?.utilizationRate?.toFixed(1) || "N/A"}% utilization. ${
                (analytics.floatHealth?.criticalFloats || 0) > 0
                    ? `⚠️ You have ${analytics.floatHealth?.criticalFloats} critical float(s) that need immediate attention.`
                    : "Your float balances appear to be healthy."
            }`
        }

        if (lowerMessage.includes("risk") || lowerMessage.includes("alert")) {
            const suspiciousCount = analytics.riskAnalysis?.suspiciousTransactions?.length || 0
            return `I've identified ${suspiciousCount} potentially suspicious transactions. ${
                suspiciousCount > 0
                    ? "I recommend reviewing these transactions manually and implementing additional verification steps for high-risk patterns."
                    : "Your transaction patterns appear normal with no significant risk indicators detected."
            }`
        }

        if (lowerMessage.includes("revenue") || lowerMessage.includes("growth")) {
            return `Your total transaction volume is ${analytics.summary.totalAmount.toLocaleString()} TZS with a growth rate of ${analytics.summary.growthRate?.toFixed(1) || "N/A"}%. ${
                (analytics.summary.growthRate || 0) > 10
                    ? "This strong growth indicates expansion opportunities. Consider scaling infrastructure and marketing efforts."
                    : "Focus on optimizing existing channels and improving user experience to drive growth."
            }`
        }

        if (lowerMessage.includes("user") || lowerMessage.includes("behavior")) {
            return `You have ${analytics.summary.activeUsers.toLocaleString()} active users. Based on transaction patterns, I recommend focusing on user retention strategies and identifying high-value user segments for targeted improvements.`
        }

        // Default response
        return `Based on your analytics data: You've processed ${analytics.summary.totalTransactions.toLocaleString()} transactions with a ${analytics.summary.successRate.toFixed(1)}% success rate. Your system is handling ${analytics.summary.totalAmount.toLocaleString()} TZS in volume. What specific aspect would you like me to analyze further?`
    }

    private generateRuleBasedAnalysis(analytics: ComprehensiveAnalytics): ZenaAnalysis {
        const insights: ZenaInsight[] = []
        const recommendations: ZenaInsight[] = []
        const alerts: ZenaInsight[] = []
        const opportunities: ZenaInsight[] = []

        // Analyze success rate
        if (analytics.summary.successRate < 85) {
            alerts.push({
                id: "low-success-rate",
                type: "alert",
                priority: "high",
                title: "Low Success Rate Alert",
                description: `Your success rate of ${analytics.summary.successRate.toFixed(1)}% is below the recommended 85% threshold.`,
                impact: "High - Affecting customer satisfaction and revenue",
                actionItems: [
                    "Investigate payment gateway connectivity",
                    "Review failed transaction patterns",
                    "Contact payment providers for support",
                    "Implement retry mechanisms for failed transactions",
                ],
                category: "Performance",
                confidence: 95,
            })
        } else if (analytics.summary.successRate > 95) {
            insights.push({
                id: "excellent-success-rate",
                type: "insight",
                priority: "low",
                title: "Excellent Success Rate",
                description: `Your success rate of ${analytics.summary.successRate.toFixed(1)}% is excellent.`,
                impact: "Positive - Strong system performance",
                actionItems: [
                    "Maintain current system configuration",
                    "Document best practices",
                    "Monitor for any degradation",
                ],
                category: "Performance",
                confidence: 90,
            })
        }

        // Analyze growth rate
        if ((analytics.summary.growthRate || 0) > 20) {
            opportunities.push({
                id: "high-growth-opportunity",
                type: "opportunity",
                priority: "high",
                title: "High Growth Momentum",
                description: `Strong growth rate of ${analytics.summary.growthRate?.toFixed(1)}% indicates expansion opportunity.`,
                impact: "High - Potential for significant revenue increase",
                actionItems: [
                    "Scale infrastructure to handle increased volume",
                    "Expand marketing and user acquisition",
                    "Consider new channel partnerships",
                    "Optimize pricing strategies",
                ],
                category: "Revenue",
                confidence: 85,
            })
        } else if ((analytics.summary.growthRate || 0) < -10) {
            alerts.push({
                id: "negative-growth",
                type: "alert",
                priority: "high",
                title: "Declining Growth Rate",
                description: `Negative growth rate of ${analytics.summary.growthRate?.toFixed(1)}% requires attention.`,
                impact: "High - Revenue decline risk",
                actionItems: [
                    "Analyze user churn patterns",
                    "Review competitive landscape",
                    "Improve user experience",
                    "Implement retention strategies",
                ],
                category: "Revenue",
                confidence: 90,
            })
        }

        // Analyze float health
        if ((analytics.floatHealth?.criticalFloats || 0) > 0) {
            alerts.push({
                id: "critical-float-balance",
                type: "alert",
                priority: "high",
                title: "Critical Float Balance",
                description: `${analytics.floatHealth?.criticalFloats} float(s) have critically low balance.`,
                impact: "Critical - May cause transaction failures",
                actionItems: [
                    "Immediately rebalance critical floats",
                    "Set up automated balance monitoring",
                    "Establish minimum balance thresholds",
                    "Create emergency rebalancing procedures",
                ],
                category: "Operations",
                confidence: 100,
            })
        }

        // Analyze channel performance
        if (analytics.channelMetrics && analytics.channelMetrics.length > 0) {
            const worstChannel = analytics.channelMetrics.reduce((prev, current) =>
                prev.successRate < current.successRate ? prev : current,
            )

            if (worstChannel.successRate < 80) {
                alerts.push({
                    id: "poor-channel-performance",
                    type: "alert",
                    priority: "high",
                    title: `${worstChannel.channel} Performance Issue`,
                    description: `${worstChannel.channel} has a low success rate of ${worstChannel.successRate.toFixed(1)}%.`,
                    impact: "High - Significant revenue loss potential",
                    actionItems: [
                        `Review ${worstChannel.channel} integration`,
                        "Check for API changes or issues",
                        "Consider temporary routing to other channels",
                        "Escalate with payment provider",
                    ],
                    category: "Performance",
                    confidence: 90,
                })
            }

            const topChannel = analytics.channelMetrics.reduce((prev, current) =>
                prev.totalAmount > current.totalAmount ? prev : current,
            )

            recommendations.push({
                id: "optimize-top-channel",
                type: "recommendation",
                priority: "medium",
                title: `Optimize ${topChannel.channel} Channel`,
                description: `${topChannel.channel} is your highest revenue channel with ${topChannel.totalAmount.toLocaleString()} TZS.`,
                impact: "Medium - Maximize top performing channel",
                actionItems: [
                    `Increase ${topChannel.channel} transaction limits`,
                    "Negotiate better rates with provider",
                    "Promote this channel to users",
                    "Ensure optimal uptime and performance",
                ],
                category: "Revenue",
                confidence: 80,
            })
        }

        // Analyze utilization
        if ((analytics.floatHealth?.utilizationRate || 0) < 70) {
            recommendations.push({
                id: "improve-utilization",
                type: "recommendation",
                priority: "medium",
                title: "Improve Float Utilization",
                description: `Float utilization rate of ${analytics.floatHealth?.utilizationRate?.toFixed(1)}% indicates underutilized resources.`,
                impact: "Medium - Optimize resource allocation",
                actionItems: [
                    "Redistribute funds from underutilized floats",
                    "Deactivate unused floats",
                    "Optimize float allocation algorithms",
                    "Monitor usage patterns for better distribution",
                ],
                category: "Operations",
                confidence: 75,
            })
        }

        // Generate summary
        const summary = this.generateSummary(analytics, alerts, opportunities)

        return {
            summary,
            keyInsights: insights,
            recommendations,
            alerts,
            opportunities,
            conversationStarters: [
                "What's driving my current success rate and how can I improve it?",
                "Which payment channel should I focus on for growth?",
                "How can I optimize my float allocation strategy?",
                "What are the biggest risks in my current setup?",
                "Show me opportunities to increase revenue",
                "How do my users behave and what does that mean?",
                "What should be my priorities for the next month?",
                "How can I improve my system performance?",
            ],
            timestamp: new Date(),
        }
    }

    private generateSummary(
        analytics: ComprehensiveAnalytics,
        alerts: ZenaInsight[],
        opportunities: ZenaInsight[],
    ): string {
        const { summary } = analytics
        let summaryText = `Your system processed ${summary.totalTransactions.toLocaleString()} transactions worth ${summary.totalAmount.toLocaleString()} TZS with a ${summary.successRate.toFixed(1)}% success rate.`

        if (alerts.length > 0) {
            summaryText += ` ⚠️ ${alerts.length} critical issue${alerts.length > 1 ? "s" : ""} need${alerts.length === 1 ? "s" : ""} immediate attention.`
        }

        if (opportunities.length > 0) {
            summaryText += ` 🚀 ${opportunities.length} growth opportunit${opportunities.length > 1 ? "ies" : "y"} identified.`
        }

        if ((summary.growthRate || 0) > 0) {
            summaryText += ` Your system is growing at ${summary.growthRate?.toFixed(1)}% rate.`
        }

        return summaryText
    }

    private generateCacheKey(analytics: ComprehensiveAnalytics): string {
        return `analysis_${analytics.summary.totalTransactions}_${analytics.summary.successRate}_${Date.now()}`
    }

    private getFallbackAnalysis(analytics: ComprehensiveAnalytics): ZenaAnalysis {
        return {
            summary: `Analyzed ${analytics.summary.totalTransactions.toLocaleString()} transactions with ${analytics.summary.successRate.toFixed(1)}% success rate. System analysis completed.`,
            keyInsights: [
                {
                    id: "fallback_insight",
                    type: "insight",
                    priority: "medium",
                    title: "System Overview",
                    description: `Your system is processing ${analytics.summary.totalTransactions.toLocaleString()} transactions.`,
                    impact: "Informational",
                    actionItems: ["Continue monitoring system performance"],
                    category: "Performance",
                    confidence: 100,
                },
            ],
            recommendations: [
                {
                    id: "fallback_recommendation",
                    type: "recommendation",
                    priority: "low",
                    title: "Regular Monitoring",
                    description: "Continue regular monitoring of system performance.",
                    impact: "Maintain system health",
                    actionItems: ["Set up regular performance reviews"],
                    category: "Operations",
                    confidence: 90,
                },
            ],
            alerts: [],
            opportunities: [],
            conversationStarters: [
                "What's my current system performance?",
                "How are my transactions performing?",
                "What should I monitor regularly?",
                "How can I improve my system?",
            ],
            timestamp: new Date(),
        }
    }
}

export const zenaAI = new ZenaAIService()
