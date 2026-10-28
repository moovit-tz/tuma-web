"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { getCurrentUser } from "@/lib/auth"
import { CheckCircle, Loader2, Star } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { useTr } from "@/lib/i18n/portal"

interface LoadingStep {
    icon: React.ComponentType<{ className?: string }>
    text: string
    color: string
    bgColor: string
    action: () => Promise<any>
}

interface PageLoadingProps {
    pageTitle: string
    pageIcon: React.ComponentType<{ className?: string }>
    steps: LoadingStep[]
    onDataFetched?: (data: any) => void
    greeting?: string
    subtitle?: string
}

export function PageLoading({
                                pageTitle,
                                pageIcon: PageIcon,
                                steps,
                                onDataFetched,
                                greeting,
                                subtitle,
                            }: PageLoadingProps) {
    const tr = useTr()
    const [user, setUser] = useState<any>(null)
    const [currentStep, setCurrentStep] = useState(0)
    const [progress, setProgress] = useState(0)
    const [dots, setDots] = useState("")
    const [completedSteps, setCompletedSteps] = useState<number[]>([])
    const [isVisible, setIsVisible] = useState(false)
    const [isExiting, setIsExiting] = useState(false)
    const [fetchedData, setFetchedData] = useState<any>({})

    // Entrance animation
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 100)
        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        const userData = getCurrentUser()
        setUser(userData)
    }, [])

    // Animate dots
    useEffect(() => {
        const interval = setInterval(() => {
            setDots((prev) => {
                if (prev === "...") return ""
                return prev + "."
            })
        }, 500)

        return () => clearInterval(interval)
    }, [])

    // Execute steps with real data fetching
    useEffect(() => {
        let isMounted = true

        const executeSteps = async () => {
            const results: any = {}

            for (let i = 0; i < steps.length; i++) {
                if (!isMounted) return

                setCurrentStep(i)
                setProgress((i / steps.length) * 100)

                try {
                    // Execute the step action
                    const result = await steps[i].action()
                    results[`step_${i}`] = result

                    if (!isMounted) return

                    // Mark step as completed
                    setCompletedSteps((prev) => [...prev, i])

                    // Wait a bit before next step for better UX
                    await new Promise((resolve) => setTimeout(resolve, 600))
                } catch (error) {
                    console.error(`Error in step ${i}:`, error)
                    // Continue with next step even if one fails
                    results[`step_${i}`] = { error: error.message }
                }
            }

            if (!isMounted) return

            // Final progress update
            setProgress(100)
            setCurrentStep(steps.length)

            // Store fetched data
            setFetchedData(results)

            // Wait a moment to show completion
            await new Promise((resolve) => setTimeout(resolve, 1000))

            // Start exit animation
            setIsExiting(true)

            // Wait for exit animation to complete
            await new Promise((resolve) => setTimeout(resolve, 500))

            // Notify parent component with fetched data
            if (onDataFetched) {
                onDataFetched(results)
            }
        }

        executeSteps()

        return () => {
            isMounted = false
        }
    }, [steps, onDataFetched])

    const userName = user?.fullName || user?.name || user?.username || "Admin"
    const firstName = userName.split(" ")[0]

    return (
        <>
            {/* Animated Background */}
            <div className="fixed inset-0 bg-black/20 z-50">
                {/* Floating particles */}
                <div className="absolute inset-0 overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-float"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 3}s`,
                                animationDuration: `${3 + Math.random() * 2}s`,
                            }}
                        >
                            <Star className="h-2 w-2 text-primary/30" />
                        </div>
                    ))}
                </div>

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-primary/5" />
            </div>

            {/* Dialog Container */}
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
                <Card
                    className={`w-full max-w-md transform transition-all duration-300 ease-out ${
                        isVisible && !isExiting
                            ? "translate-y-0 opacity-100 scale-100"
                            : isExiting
                                ? "translate-y-8 opacity-0 scale-95"
                                : "translate-y-8 opacity-0 scale-95"
                    } shadow-[var(--ds-shadow-raised)] border-0 bg-background`}
                >
                    <CardContent className="p-8 space-y-8">
                        {/* Animated Header */}
                        <div className="text-center space-y-4">
                            {/* Main Logo with Pulse Animation */}
                            <div className="relative mx-auto w-20 h-20">
                                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                                <div className="absolute inset-2 rounded-full bg-primary/30 animate-pulse" />
                                <div className="relative h-20 w-20 rounded-full bg-primary flex items-center justify-center shadow-[var(--ds-shadow-raised)]">
                                    <PageIcon
                                        className="h-10 w-10 text-primary-foreground animate-pulse"
                                        style={{ animationDuration: "2s" }}
                                    />
                                </div>
                                {/* Status indicator */}
                                <div className="absolute -top-1 -right-1 h-6 w-6 bg-green-500 rounded-full flex items-center justify-center shadow-[var(--ds-shadow-raised)] animate-bounce">
                                    {progress === 100 ? (
                                        <CheckCircle className="h-4 w-4 text-white" />
                                    ) : (
                                        <Loader2 className="h-3 w-3 text-white animate-spin" />
                                    )}
                                </div>
                            </div>

                            {/* Greeting with Typewriter Effect */}
                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold text-primary animate-fade-in">
                                    {greeting || tr("Welcome to {pageTitle}, {firstName}!", { pageTitle, firstName })} 👋
                                </h1>
                                <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: "0.3s" }}>
                                    {subtitle || tr("Loading your {pageTitle} data", { pageTitle: pageTitle.toLowerCase() })}
                                    {dots}
                                </p>
                            </div>
                        </div>

                        {/* Enhanced Progress Section */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-medium">{tr("Progress")}</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-primary text-lg">{Math.round(progress)}%</span>
                                    {progress === 100 && <CheckCircle className="h-4 w-4 text-green-500 animate-bounce" />}
                                </div>
                            </div>

                            {/* Animated Progress Bar */}
                            <div className="relative">
                                <Progress value={progress} className="h-3 bg-muted/50" />
                                <div className="absolute inset-0 bg-transparent animate-shimmer" />
                            </div>

                            <div className="text-center">
                <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                  {currentStep < steps.length ? (
                      <>{tr("Step")}{" "}{currentStep + 1}{" "}{tr("of")}{" "}{steps.length}
                      </>
                  ) : (
                      <>{tr("Complete! Loading {pageTitle}...", { pageTitle })}</>
                  )}
                </span>
                            </div>
                        </div>

                        {/* Animated Steps */}
                        <div className="space-y-3">
                            {steps.map((step, index) => {
                                const Icon = step.icon
                                const isActive = index === currentStep
                                const isCompleted = completedSteps.includes(index)
                                const isPending = index > currentStep

                                return (
                                    <div
                                        key={index}
                                        className={`flex items-center gap-4 p-4 rounded-[var(--ds-radius-small)] transition-all duration-300 transform ${
                                            isActive
                                                ? "bg-primary/10 border border-primary/20 scale-105 shadow-[var(--ds-shadow-raised)]"
                                                : isCompleted
                                                    ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 scale-100"
                                                    : isPending
                                                        ? "bg-muted/30 border border-transparent opacity-60 scale-95"
                                                        : "bg-muted/50 border border-transparent scale-100"
                                        }`}
                                        style={{
                                            animationDelay: `${index * 0.1}s`,
                                        }}
                                    >
                                        {/* Animated Icon */}
                                        <div className="relative">
                                            <div
                                                className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                                                    isActive
                                                        ? `${step.bgColor} text-white shadow-[var(--ds-shadow-raised)]`
                                                        : isCompleted
                                                            ? "bg-green-500 text-white shadow-[var(--ds-shadow-raised)]"
                                                            : isPending
                                                                ? "bg-muted border-2 border-muted-foreground/20"
                                                                : "bg-muted"
                                                }`}
                                            >
                                                {isCompleted ? (
                                                    <CheckCircle className="h-5 w-5 animate-scale-in" />
                                                ) : isActive ? (
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                ) : (
                                                    <Icon className="h-5 w-5" />
                                                )}
                                            </div>
                                            {/* Pulse effect for active step */}
                                            {isActive && (
                                                <div className={`absolute inset-0 rounded-full ${step.bgColor} opacity-30 animate-ping`} />
                                            )}
                                        </div>

                                        {/* Step Text */}
                                        <div className="flex-1">
                      <span
                          className={`font-medium transition-all duration-300 ${
                              isActive
                                  ? step.color + " text-base"
                                  : isCompleted
                                      ? "text-green-600 dark:text-green-400"
                                      : isPending
                                          ? "text-muted-foreground/60"
                                          : "text-muted-foreground"
                          }`}
                      >
                        {step.text}
                          {isActive && <span className="inline-block ml-1 animate-pulse">{dots}</span>}
                          {isCompleted && <span className="inline-block ml-2 text-green-600 animate-bounce">✓</span>}
                      </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Fun Facts with Staggered Animation */}
                        <div className="text-center space-y-2">
                            <p className="text-sm text-muted-foreground animate-fade-in-up" style={{ animationDelay: "1s" }}>
                                {tr("💡 We're preparing your personalized {pageTitle} experience!", { pageTitle: pageTitle.toLowerCase() })}</p>
                            <p className="text-sm text-muted-foreground animate-fade-in-up" style={{ animationDelay: "2s" }}>{tr("Loading the latest data…")}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(180deg); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
        </>
    )
}
