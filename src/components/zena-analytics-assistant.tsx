"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Bot,
    User,
    Send,
    TrendingUp,
    AlertTriangle,
    Lightbulb,
    Target,
    MessageSquare,
    Sparkles,
    Brain,
    BarChart3,
} from "lucide-react"
import { zenaAI, type ZenaAnalysis, type ZenaInsight } from "@/lib/services/zena-ai"
import type { ComprehensiveAnalytics } from "@/lib/services/float-analytics"
import { useTr } from "@/lib/i18n/portal"

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
    timestamp: Date
}

interface ZenaAnalyticsAssistantProps {
    analytics: ComprehensiveAnalytics | null
    loading: boolean
}

const InsightCard = ({ insight }: { insight: ZenaInsight }) => {
    const tr = useTr()
    const getIcon = () => {
        switch (insight.type) {
            case "alert":
                return <AlertTriangle className="h-4 w-4" />
            case "recommendation":
                return <Target className="h-4 w-4" />
            case "opportunity":
                return <TrendingUp className="h-4 w-4" />
            default:
                return <Lightbulb className="h-4 w-4" />
        }
    }

    const getVariant = () => {
        switch (insight.priority) {
            case "high":
                return "destructive"
            case "medium":
                return "default"
            default:
                return "secondary"
        }
    }

    const getBorderColor = () => {
        switch (insight.type) {
            case "alert":
                return "border-red-200 dark:border-red-800"
            case "recommendation":
                return "border-blue-200 dark:border-blue-800"
            case "opportunity":
                return "border-green-200 dark:border-green-800"
            default:
                return "border-yellow-200 dark:border-yellow-800"
        }
    }

    return (
        <Card className={`${getBorderColor()} border-l-4`}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        {getIcon()}
                        <CardTitle className="text-sm font-medium">{insight.title}</CardTitle>
                    </div>
                    <Badge variant={getVariant()} className="text-xs">
                        {insight.priority}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">{tr("Impact: {impact}", { impact: insight.impact })}</div>
                    <div className="space-y-1">
                        <div className="text-xs font-medium">{tr("Action Items:")}</div>
                        <ul className="text-xs space-y-1">
                            {insight.actionItems.slice(0, 3).map((item, index) => (
                                <li key={index} className="flex items-start space-x-1">
                                    <span className="text-muted-foreground">•</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <Badge variant="outline" className="text-xs">
                            {insight.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{tr("{confidence}% confidence", { confidence: insight.confidence })}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export function ZenaAnalyticsAssistant({ analytics, loading }: ZenaAnalyticsAssistantProps) {
    const tr = useTr()
    const [analysis, setAnalysis] = useState<ZenaAnalysis | null>(null)
    const [analysisLoading, setAnalysisLoading] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [inputMessage, setInputMessage] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const [activeTab, setActiveTab] = useState<"insights" | "chat">("insights")
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (analytics && !loading) {
            generateAnalysis()
        }
    }, [analytics, loading])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    const generateAnalysis = async () => {
        if (!analytics) return

        try {
            setAnalysisLoading(true)
            const zenaAnalysis = await zenaAI.analyzeData(analytics)
            setAnalysis(zenaAnalysis)

            // Add welcome message
            const welcomeMessage: Message = {
                id: Date.now().toString(),
                role: "assistant",
                content: `Hi! I'm Zena, your AI analytics assistant. I've analyzed your float transaction data and found some interesting insights. ${zenaAnalysis.summary}

I've identified ${zenaAnalysis.keyInsights.length} key insights, ${zenaAnalysis.recommendations.length} recommendations, and ${zenaAnalysis.alerts.length} alerts that need your attention.

Feel free to ask me anything about your data!`,
                timestamp: new Date(),
            }

            setMessages([welcomeMessage])
        } catch (error) {
            console.error("Error generating analysis:", error)
        } finally {
            setAnalysisLoading(false)
        }
    }

    const sendMessage = async () => {
        if (!inputMessage.trim() || !analytics) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: inputMessage,
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])
        setInputMessage("")
        setIsTyping(true)

        try {
            const conversationHistory = messages.map((msg) => ({
                role: msg.role,
                content: msg.content,
            }))

            const stream = await zenaAI.chatWithZena(inputMessage, analytics, conversationHistory)

            let assistantResponse = ""
            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "",
                timestamp: new Date(),
            }

            setMessages((prev) => [...prev, assistantMessage])

            // Read the stream
            for await (const chunk of stream.textStream) {
                assistantResponse += chunk
                setMessages((prev) => {
                    const newMessages = [...prev]
                    const lastMessage = newMessages[newMessages.length - 1]
                    if (lastMessage && lastMessage.role === "assistant") {
                        lastMessage.content = assistantResponse
                    }
                    return newMessages
                })
            }
        } catch (error) {
            console.error("Error sending message:", error)
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "I'm sorry, I encountered an error processing your request. Please try again.",
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, errorMessage])
        } finally {
            setIsTyping(false)
        }
    }

    const handleQuickQuestion = (question: string) => {
        setInputMessage(question)
        setActiveTab("chat")
    }

    if (loading || analysisLoading) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center space-x-2">
                        <Brain className="h-5 w-5 text-blue-500" />
                        <CardTitle>{tr("Zena AI Analytics Assistant")}</CardTitle>
                        <Sparkles className="h-4 w-4 text-yellow-500" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!analytics || !analysis) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center space-x-2">
                        <Brain className="h-5 w-5 text-blue-500" />
                        <CardTitle>{tr("Zena AI Analytics Assistant")}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{tr("No analytics data available for analysis.")}</AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Brain className="h-5 w-5 text-blue-500" />
                            <CardTitle>{tr("Zena AI Analytics Assistant")}</CardTitle>
                            <Sparkles className="h-4 w-4 text-yellow-500" />
                        </div>
                        <div className="flex space-x-2">
                            <Button
                                variant={activeTab === "insights" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setActiveTab("insights")}
                            >
                                <BarChart3 className="h-4 w-4 mr-1" />{tr("Insights")}</Button>
                            <Button
                                variant={activeTab === "chat" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setActiveTab("chat")}
                            >
                                <MessageSquare className="h-4 w-4 mr-1" />{tr("Chat")}</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                </CardContent>
            </Card>

            {activeTab === "insights" ? (
                <div className="space-y-6">
                    {/* Quick Stats */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center space-x-2">
                                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                                    <span className="text-sm font-medium">{tr("Key Insights")}</span>
                                </div>
                                <div className="text-2xl font-bold mt-2">{analysis.keyInsights.length}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center space-x-2">
                                    <Target className="h-4 w-4 text-blue-500" />
                                    <span className="text-sm font-medium">{tr("Recommendations")}</span>
                                </div>
                                <div className="text-2xl font-bold mt-2">{analysis.recommendations.length}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center space-x-2">
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                    <span className="text-sm font-medium">{tr("Alerts")}</span>
                                </div>
                                <div className="text-2xl font-bold mt-2">{analysis.alerts.length}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center space-x-2">
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                    <span className="text-sm font-medium">{tr("Opportunities")}</span>
                                </div>
                                <div className="text-2xl font-bold mt-2">{analysis.opportunities.length}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Alerts - High Priority */}
                    {analysis.alerts.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                <span>{tr("Critical Alerts")}</span>
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                {analysis.alerts.map((alert) => (
                                    <InsightCard key={alert.id} insight={alert} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recommendations */}
                    {analysis.recommendations.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                                <Target className="h-5 w-5 text-blue-500" />
                                <span>{tr("Recommendations")}</span>
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                {analysis.recommendations.map((recommendation) => (
                                    <InsightCard key={recommendation.id} insight={recommendation} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Opportunities */}
                    {analysis.opportunities.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                                <TrendingUp className="h-5 w-5 text-green-500" />
                                <span>{tr("Growth Opportunities")}</span>
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                {analysis.opportunities.map((opportunity) => (
                                    <InsightCard key={opportunity.id} insight={opportunity} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Key Insights */}
                    {analysis.keyInsights.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                                <Lightbulb className="h-5 w-5 text-yellow-500" />
                                <span>{tr("Key Insights")}</span>
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                {analysis.keyInsights.map((insight) => (
                                    <InsightCard key={insight.id} insight={insight} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Questions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{tr("Ask Zena")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-2 md:grid-cols-2">
                                {analysis.conversationStarters.map((question, index) => (
                                    <Button
                                        key={index}
                                        variant="outline"
                                        size="sm"
                                        className="justify-start text-left h-auto p-3"
                                        onClick={() => handleQuickQuestion(question)}
                                    >
                                        {question}
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                /* Chat Interface */
                <Card className="h-[600px] flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <MessageSquare className="h-5 w-5" />
                            <span>{tr("Chat with Zena")}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col p-0">
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                                {messages.map((message) => (
                                    <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                                        <div
                                            className={`max-w-[80%] rounded-lg p-3 ${
                                                message.role === "user"
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted text-muted-foreground"
                                            }`}
                                        >
                                            <div className="flex items-start space-x-2">
                                                {message.role === "assistant" && <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                                                {message.role === "user" && <User className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                                                <div className="flex-1">
                                                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                                                    <div className="text-xs opacity-70 mt-1">{message.timestamp.toLocaleTimeString()}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-muted text-muted-foreground rounded-lg p-3">
                                            <div className="flex items-center space-x-2">
                                                <Bot className="h-4 w-4" />
                                                <div className="flex space-x-1">
                                                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                                                    <div
                                                        className="w-2 h-2 bg-current rounded-full animate-bounce"
                                                        style={{ animationDelay: "0.1s" }}
                                                    />
                                                    <div
                                                        className="w-2 h-2 bg-current rounded-full animate-bounce"
                                                        style={{ animationDelay: "0.2s" }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>
                        <Separator />
                        <div className="p-4">
                            <div className="flex space-x-2">
                                <Input
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    placeholder={tr("Ask Zena about your analytics...")}
                                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                                    disabled={isTyping}
                                />
                                <Button onClick={sendMessage} disabled={!inputMessage.trim() || isTyping}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
