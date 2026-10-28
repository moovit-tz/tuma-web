"use client"

import { useState, useEffect, useCallback } from "react"
import { safeStorage } from "@/lib/safe-storage"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    X,
    Sparkles,
    Brain,
    AlertTriangle,
    Send,
    Wand2,
    ChevronRight,
    Trophy,
    Activity,
    Lightbulb,
    ChevronDown,
    ChevronUp,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useTr } from "@/lib/i18n/portal"

interface DashboardBannersProps {
    dashboardData: any
    showAIBanner: boolean
    onDismissAI: () => void
}

interface SmartBanner {
    id: string
    type: "insight" | "recommendation" | "alert" | "achievement" | "tip" | "ai"
    priority: number
    title: string
    description: string
    icon: any
    theme: BannerTheme
    badgeText?: string
    actions: BannerAction[]
    dismissible: boolean
    conditions: (data: any) => boolean
    urgencyLevel: "low" | "medium" | "high" | "critical"
}

interface BannerTheme {
    gradient: string
    iconBg: string
    textColor: string
    badgeColor: string
    buttonGradient: string
}

interface BannerAction {
    label: string
    action: string
    variant?: "default" | "outline" | "ghost"
}

export function DashboardBanners({ dashboardData, showAIBanner, onDismissAI }: DashboardBannersProps) {
    const tr = useTr()
    const [dismissedBanners, setDismissedBanners] = useState<string[]>([])
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0)
    const [showAISuggestionModal, setShowAISuggestionModal] = useState(false)
    const [isBannerVisible, setIsBannerVisible] = useState(true)
    const [aiFeedback, setAiFeedback] = useState("")

    const bannerThemes: Record<string, BannerTheme> = {
        ai: {
            gradient: "bg-indigo-50 dark:bg-indigo-950/50",
            iconBg: "bg-indigo-500 shadow-[var(--ds-shadow-raised)]",
            textColor: "text-indigo-900 dark:text-indigo-100",
            badgeColor: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
            buttonGradient: "bg-indigo-500 hover:bg-indigo-600",
        },
        insight: {
            gradient: "bg-blue-50 dark:bg-blue-950/50",
            iconBg: "bg-blue-500 shadow-[var(--ds-shadow-raised)]",
            textColor: "text-blue-900 dark:text-blue-100",
            badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
            buttonGradient: "bg-blue-500 hover:bg-blue-600",
        },
        alert: {
            gradient: "bg-red-50 dark:bg-red-950/50",
            iconBg: "bg-red-500 shadow-[var(--ds-shadow-raised)]",
            textColor: "text-red-900 dark:text-red-100",
            badgeColor: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
            buttonGradient: "bg-red-500 hover:bg-red-600",
        },
        recommendation: {
            gradient: "bg-emerald-50 dark:bg-emerald-950/50",
            iconBg: "bg-emerald-500 shadow-[var(--ds-shadow-raised)]",
            textColor: "text-emerald-900 dark:text-emerald-100",
            badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
            buttonGradient: "bg-emerald-500 hover:bg-emerald-600",
        },
        achievement: {
            gradient: "bg-yellow-50 dark:bg-yellow-950/50",
            iconBg: "bg-yellow-500 shadow-[var(--ds-shadow-raised)]",
            textColor: "text-yellow-900 dark:text-yellow-100",
            badgeColor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
            buttonGradient: "bg-yellow-500 hover:bg-yellow-600",
        },
        tip: {
            gradient: "bg-violet-50 dark:bg-violet-950/50",
            iconBg: "bg-violet-500 shadow-[var(--ds-shadow-raised)]",
            textColor: "text-violet-900 dark:text-violet-100",
            badgeColor: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
            buttonGradient: "bg-violet-500 hover:bg-violet-600",
        },
    }

    const smartBanners: SmartBanner[] = [
        {
            id: "zena-ai-assistant",
            type: "ai",
            priority: 10,
            title: tr("Meet Zena - Your AI Assistant is Coming Soon! 🚀"),
            description: tr("We're building an intelligent AI assistant to revolutionize how you manage parcels, analyze data, and boost productivity."),
            icon: Brain,
            theme: bannerThemes.ai,
            badgeText: "Coming Soon",
            actions: [
                { label: tr("Shape Zena's Future"), action: "ai-suggestions" },
                { label: tr("Maybe Later"), action: "skip", variant: "ghost" },
            ],
            dismissible: true,
            urgencyLevel: "medium",
            conditions: () => showAIBanner,
        },
        {
            id: "critical-alert",
            type: "alert",
            priority: 9,
            title: "",
            description: "",
            icon: AlertTriangle,
            theme: bannerThemes.alert,
            badgeText: "Urgent",
            actions: [
                { label: tr("Take Action"), action: "handle-alert" },
                { label: tr("View Details"), action: "view-details", variant: "outline" },
            ],
            dismissible: true,
            urgencyLevel: "critical",
            conditions: (data) => {
                const lostParcels = data?.lostParcels || 0
                const complaints = data?.complaints || 0
                return lostParcels > 0 || complaints > 3
            },
        },
        {
            id: "achievement-milestone",
            type: "achievement",
            priority: 7,
            title: "",
            description: "",
            icon: Trophy,
            theme: bannerThemes.achievement,
            badgeText: "Achievement",
            actions: [
                { label: tr("View Stats"), action: "view-achievements" },
                { label: tr("Share"), action: "share-achievement", variant: "outline" },
            ],
            dismissible: true,
            urgencyLevel: "low",
            conditions: (data) => {
                const totalParcels = data?.totalParcels || 0
                const deliveryRate = totalParcels > 0 ? (data?.deliveredParcels || 0) / totalParcels : 0
                return totalParcels > 100 || deliveryRate > 0.95
            },
        },
        {
            id: "smart-recommendation",
            type: "recommendation",
            priority: 6,
            title: tr("Tips"),
            description: tr("Based on your usage patterns, try using keyboard shortcuts and bulk actions to save time."),
            icon: Lightbulb,
            theme: bannerThemes.recommendation,
            badgeText: "Recommended",
            actions: [
                { label: tr("Learn More"), action: "learn-more" },
                { label: tr("Remind Later"), action: "remind-later", variant: "outline" },
            ],
            dismissible: true,
            urgencyLevel: "medium",
            conditions: (data) => (data?.totalParcels || 0) > 50,
        },
        {
            id: "pro-tip",
            type: "tip",
            priority: 5,
            title: tr("⚡ Pro Tip: Keyboard Shortcuts"),
            description: tr("Press 'Ctrl + K' to quickly search for any parcel, agent, or company. Power users save 2+ hours daily!"),
            icon: Sparkles,
            theme: bannerThemes.tip,
            badgeText: "Pro Tip",
            actions: [
                { label: tr("Try It Now"), action: "try-tip" },
                { label: tr("More Tips"), action: "view-tips", variant: "outline" },
            ],
            dismissible: true,
            urgencyLevel: "low",
            conditions: () => true,
        },
    ]

    // Load dismissed banners from safeStorage
    useEffect(() => {
        const saved = safeStorage.getItem("dismissed-banners")
        if (saved) {
            try {
                setDismissedBanners(JSON.parse(saved))
            } catch (e) {
                console.error("Error parsing dismissed banners:", e)
            }
        }
    }, [])

    // Handle banner dismissal
    const handleDismiss = useCallback((bannerId: string) => {
        const updated = [...dismissedBanners, bannerId]
        setDismissedBanners(updated)
        safeStorage.setItem("dismissed-banners", JSON.stringify(updated))

        if (bannerId === "zena-ai-assistant") {
            onDismissAI()
        }

        toast({
            title: tr("Banner dismissed"),
            description: tr("You won't see this banner for a while."),
        })
    }, [dismissedBanners, onDismissAI])

    // Handle banner actions
    const handleBannerAction = useCallback((action: string) => {
        const currentPath = window.location.pathname
        const locale = currentPath.split('/')[1]
        const routePrefix = currentPath.includes('/ops/') ? `/${locale}/ops` :
            currentPath.includes('/biz/') ? `/${locale}/biz` :
                `/${locale}/admin`

        switch (action) {
            case "ai-suggestions":
                setShowAISuggestionModal(true)
                break
            case "skip":
                handleDismiss("zena-ai-assistant")
                break
            case "handle-alert":
                if ((dashboardData?.lostParcels || 0) > 0) {
                    window.location.href = `${routePrefix}/parcels?status=lost`
                } else if ((dashboardData?.complaints || 0) > 3) {
                    window.location.href = `${routePrefix}/complaints`
                }
                break
            case "view-details":
                window.location.href = `${routePrefix}/parcels`
                break
            case "view-achievements":
                toast({
                    title: tr("Achievement Center"),
                    description: tr("Coming soon - track all your milestones!"),
                })
                break
            case "share-achievement":
                if (navigator.clipboard) {
                    navigator.clipboard.writeText("I just achieved a new milestone in MySafari Parcel Management!")
                    toast({
                        title: tr("Achievement copied!"),
                        description: tr("Share your success with your team."),
                    })
                }
                break
            case "learn-more":
                window.location.href = `${routePrefix}/help?tab=workflow`
                break
            case "remind-later":
                toast({
                    title: tr("Reminder set"),
                    description: tr("We'll remind you about this tomorrow."),
                })
                handleDismiss("smart-recommendation")
                break
            case "try-tip":
                toast({
                    title: tr("Great choice!"),
                    description: tr("Try pressing Ctrl + K to use the quick search."),
                })
                break
            case "view-tips":
                window.location.href = `${routePrefix}/help?tab=tips`
                break
            default:
                console.log("Action:", action)
        }
    }, [dashboardData, handleDismiss])

    // Get eligible banners
    const eligibleBanners = smartBanners.filter(banner => {
        if (dismissedBanners.includes(banner.id)) return false
        return banner.conditions(dashboardData)
    }).map(banner => {
        // Personalize content for specific banners
        if (banner.id === "critical-alert") {
            const lostParcels = dashboardData?.lostParcels || 0
            const complaints = dashboardData?.complaints || 0

            if (lostParcels > 0 && complaints > 3) {
                return {
                    ...banner,
                    title: `🚨 Critical: ${lostParcels} lost parcels + ${complaints} complaints`,
                    description: "Multiple issues detected. Lost parcels may be causing customer complaints. Immediate investigation recommended.",
                }
            } else if (lostParcels > 0) {
                return {
                    ...banner,
                    title: `⚠️ ${lostParcels} parcels may be lost`,
                    description: "Parcels have been in transit for over 5 days. Quick action can prevent customer dissatisfaction.",
                }
            } else {
                return {
                    ...banner,
                    title: `📢 ${complaints} unresolved complaints`,
                    description: "Customer satisfaction is at risk. Addressing these quickly can improve your service rating.",
                }
            }
        }

        if (banner.id === "achievement-milestone") {
            const totalParcels = dashboardData?.totalParcels || 0
            const deliveryRate = totalParcels > 0 ? Math.round(((dashboardData?.deliveredParcels || 0) / totalParcels) * 100) : 0

            if (deliveryRate > 95) {
                return {
                    ...banner,
                    title: `🏆 Outstanding! ${deliveryRate}% delivery success rate`,
                    description: `You've achieved exceptional delivery performance with ${dashboardData?.deliveredParcels} successful deliveries. Keep up the excellent work!`,
                }
            } else {
                return {
                    ...banner,
                    title: `🎉 Milestone reached: ${totalParcels} parcels managed!`,
                    description: `You've successfully processed over ${totalParcels} parcels. Your growing business shows great progress.`,
                }
            }
        }

        return banner
    }).sort((a, b) => b.priority - a.priority)

    // Auto-rotate banners
    useEffect(() => {
        if (eligibleBanners.length > 1) {
            const timer = setInterval(() => {
                setCurrentBannerIndex((prev) => (prev + 1) % eligibleBanners.length)
            }, 45000)
            return () => clearInterval(timer)
        }
    }, [eligibleBanners.length])

    const currentBanner = eligibleBanners[currentBannerIndex % eligibleBanners.length] || null

    if (!currentBanner) return null

    const IconComponent = currentBanner.icon

    return (
        <>
            {/* Show/Hide Toggle Button - Always visible */}
            {!isBannerVisible && (
                <div className="flex justify-center">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsBannerVisible(true)}
                        className="shadow-[var(--ds-shadow-raised)] transition-colors"
                    >
                        <ChevronDown className="h-4 w-4 mr-2" />{tr("Show Banners (")}{eligibleBanners.length})
                    </Button>
                </div>
            )}

            {/* Banner Card */}
            {isBannerVisible && (
                <Card className={`relative overflow-hidden border shadow-[var(--ds-shadow-raised)] ${currentBanner.theme.gradient} transition-all duration-300`}>
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4 flex-1">
                                {/* Icon */}
                                <div className={`h-12 w-12 rounded-[var(--ds-radius-small)] flex items-center justify-center text-white ${currentBanner.theme.iconBg}`}>
                                    <IconComponent className="h-6 w-6" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    {/* Header */}
                                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                                        <h3 className={`text-lg font-semibold ${currentBanner.theme.textColor}`}>
                                            {currentBanner.title}
                                        </h3>

                                        {currentBanner.badgeText && (
                                            <Badge className={`text-xs font-medium border ${currentBanner.theme.badgeColor}`}>
                                                <Sparkles className="h-3 w-3 mr-1" />
                                                {currentBanner.badgeText}
                                            </Badge>
                                        )}

                                        {currentBanner.urgencyLevel === "critical" && (
                                            <Badge className="bg-red-500 text-white animate-pulse">
                                                <AlertTriangle className="h-3 w-3 mr-1" />{tr("Critical")}</Badge>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <p className={`mb-4 text-sm leading-relaxed ${currentBanner.theme.textColor} opacity-90`}>
                                        {currentBanner.description}
                                    </p>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3 flex-wrap">
                                        {currentBanner.actions.map((action, index) => (
                                            <Button
                                                key={index}
                                                size="sm"
                                                variant={action.variant || "default"}
                                                onClick={() => handleBannerAction(action.action)}
                                                className={
                                                    action.variant === "default"
                                                        ? `text-white shadow-[var(--ds-shadow-raised)] transition-colors duration-200 ${currentBanner.theme.buttonGradient}`
                                                        : action.variant === "outline"
                                                            ? `border-current hover:bg-current/10 ${currentBanner.theme.textColor}`
                                                            : `hover:bg-current/10 ${currentBanner.theme.textColor}`
                                                }
                                            >
                                                {action.variant === "default" && currentBanner.type === "ai" && (
                                                    <Wand2 className="h-4 w-4 mr-2" />
                                                )}
                                                {action.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-2">
                                {/* Hide Banner */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsBannerVisible(false)}
                                    className={`h-8 w-8 hover:bg-white/20 dark:hover:bg-white/10 transition-colors ${currentBanner.theme.textColor}`}
                                    title={tr("Hide banners")}
                                >
                                    <ChevronUp className="h-4 w-4" />
                                </Button>

                                {/* Next Banner */}
                                {eligibleBanners.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setCurrentBannerIndex((prev) => (prev + 1) % eligibleBanners.length)}
                                        className={`h-8 w-8 hover:bg-white/20 dark:hover:bg-white/10 transition-colors ${currentBanner.theme.textColor}`}
                                        title={tr("Next banner")}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                )}

                                {/* Dismiss */}
                                {currentBanner.dismissible && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDismiss(currentBanner.id)}
                                        className={`h-8 w-8 hover:bg-white/20 dark:hover:bg-white/10 transition-colors ${currentBanner.theme.textColor}`}
                                        title={tr("Dismiss permanently")}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Banner rotation indicator */}
                        {eligibleBanners.length > 1 && (
                            <div className="flex justify-center mt-4 gap-1">
                                {eligibleBanners.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentBannerIndex(index)}
                                        className={`h-1.5 w-6 rounded-full transition-all ${
                                            index === currentBannerIndex
                                                ? "bg-current opacity-80"
                                                : "bg-current opacity-30 hover:opacity-50"
                                        } ${currentBanner.theme.textColor}`}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>

                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                        <div className="absolute inset-0 bg-white rounded-full transform rotate-45 scale-150" />
                    </div>
                </Card>
            )}

            {/* AI Suggestion Modal */}
            <Dialog open={showAISuggestionModal} onOpenChange={setShowAISuggestionModal}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Brain className="h-5 w-5 text-indigo-600" />{tr("Help Shape Zena's Future")}</DialogTitle>
                        <DialogDescription>{tr("Your feedback will help us build the perfect AI assistant for parcel management.")}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="feedback">{tr("What would you like Zena to help you with most?")}</Label>
                            <Textarea
                                id="feedback"
                                value={aiFeedback}
                                onChange={(e) => setAiFeedback(e.target.value)}
                                placeholder={tr("For example: 'Help me identify parcels that might get lost', 'Automate my daily reports', 'Suggest optimal delivery routes'...")}
                                rows={4}
                                className="resize-none"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAISuggestionModal(false)}>{tr("Maybe Later")}</Button>
                        <Button
                            onClick={() => {
                                toast({
                                    title: tr("Thank you!"),
                                    description: tr("Your feedback will help us build a better AI assistant."),
                                })
                                setAiFeedback("")
                                setShowAISuggestionModal(false)
                                handleDismiss("zena-ai-assistant")
                            }}
                            disabled={!aiFeedback.trim()}
                            className="bg-indigo-500"
                        >
                            <Send className="h-4 w-4 mr-2" />{tr("Submit Feedback")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}