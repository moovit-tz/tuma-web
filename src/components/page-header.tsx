"use client"

import React from "react"
import { Calendar, Clock } from "lucide-react"
import { useTheme } from "next-themes"
import { safeStorage } from "@/lib/safe-storage"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
    title: string
    description?: string
    heading?: string
    text?: string
    action?: React.ReactNode
    actions?: React.ReactNode
    className?: string
    showGreeting?: boolean
    showDateTime?: boolean
}

export function PageHeader({
                               title,
                               description,
                               heading,
                               text,
                               action,
                               actions,
                               className,
                               showGreeting = false,
                               showDateTime = false,
                           }: PageHeaderProps) {
    const [currentTime, setCurrentTime] = React.useState<Date | null>(null)
    const [userName, setUserName] = React.useState("User")

    // Initialize only once when component mounts
    React.useEffect(() => {
        if (showGreeting || showDateTime) {
            // Set initial time
            setCurrentTime(new Date())

            // Get user data once
            try {
                const storedUser = safeStorage.getItem("user")
                if (storedUser) {
                    const user = JSON.parse(storedUser)
                    setUserName(user.fullName || user.username || user.name || "User")
                }
            } catch (error) {
                console.error("Error getting user data:", error)
            }
        }
    }, []) // Empty dependency array - runs only once

    // Timer effect - separate from initialization
    React.useEffect(() => {
        if (!showDateTime) return

        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)

        return () => clearInterval(timer)
    }, [showDateTime]) // Only depends on showDateTime

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        })
    }

    const formatDate = (date: Date) => {
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
        })
    }

    const getGreeting = () => {
        if (!currentTime) return "Hello"
        const hour = currentTime.getHours()
        if (hour < 12) return "Good Morning"
        if (hour < 17) return "Good Afternoon"
        return "Good Evening"
    }

    // Use actions if provided, otherwise fall back to action
    const actionContent = actions || action

    // Support both naming conventions
    const headerTitle = heading || title
    const headerDescription = text || description

    // If showing greeting, modify the title and description
    const displayTitle = showGreeting && currentTime ? `${getGreeting()}, ${userName}!` : headerTitle

    let displayDescription = headerDescription
    if (showGreeting && currentTime && showDateTime) {
        displayDescription = `${formatDate(currentTime)} • ${formatTime(currentTime)}`
    } else if (showGreeting && currentTime) {
        displayDescription = formatDate(currentTime)
    }

    return (
        <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4", className)}>
            <div className="space-y-2">
                <h1
                    className={cn(
                        "text-2xl font-bold",
                        showGreeting && "text-primary text-3xl",
                    )}
                >
                    {displayTitle}
                </h1>
                {displayDescription && (
                    <div className="flex items-center space-x-3 text-muted-foreground">
                        {showGreeting && showDateTime && currentTime ? (
                            <>
                                <div className="flex items-center space-x-1 bg-muted/50 px-3 py-1.5 rounded-md">
                                    <Calendar className="h-4 w-4" />
                                    <span className="font-medium">{formatDate(currentTime)}</span>
                                </div>
                                <div className="flex items-center space-x-1 bg-muted/50 px-3 py-1.5 rounded-md">
                                    <Clock className="h-4 w-4" />
                                    <span className="font-mono font-medium">{formatTime(currentTime)}</span>
                                </div>
                            </>
                        ) : showGreeting && currentTime ? (
                            <div className="flex items-center space-x-1 bg-muted/50 px-3 py-1.5 rounded-md">
                                <Calendar className="h-4 w-4" />
                                <span className="font-medium">{displayDescription}</span>
                            </div>
                        ) : (
                            <p>{displayDescription}</p>
                        )}
                    </div>
                )}
            </div>
            {actionContent && <div className="flex items-center gap-2 ml-auto">{actionContent}</div>}
        </div>
    )
}
