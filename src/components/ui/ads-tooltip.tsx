"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

/**
 * Tooltip following the Atlassian Design System spec: 300ms show delay
 * (instant when moving between triggers), bold neutral background, inverse
 * 12px text, small radius, 2px/6px padding, 240px max width, no arrow, 8px
 * offset. Mirrors @atlaskit/tooltip's `content` / `position` API.
 *
 * Wrap a group of triggers in one AdsTooltipProvider so the skip-delay
 * behaviour carries across them.
 */
function AdsTooltipProvider({
    delayDuration = 300,
    skipDelayDuration = 300,
    ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
    return <TooltipPrimitive.Provider delayDuration={delayDuration} skipDelayDuration={skipDelayDuration} {...props} />
}

interface AdsTooltipProps {
    content: React.ReactNode
    position?: "top" | "right" | "bottom" | "left"
    /** Render the trigger alone, with no tooltip */
    disabled?: boolean
    children: React.ReactElement
}

function AdsTooltip({ content, position = "bottom", disabled = false, children }: AdsTooltipProps) {
    if (disabled || !content) return children

    return (
        <TooltipPrimitive.Root>
            <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
            <TooltipPrimitive.Portal>
                <TooltipPrimitive.Content
                    side={position}
                    sideOffset={8}
                    collisionPadding={8}
                    className={cn(
                        "z-[100] max-w-[240px] break-words rounded-[var(--ds-radius-small)] px-1.5 py-0.5",
                        "text-xs leading-4 font-normal [font-family:var(--ds-font-family-body)]",
                        "bg-[var(--ds-background-neutral-bold)] text-[var(--ds-text-inverse)]",
                        "animate-in fade-in-0 duration-100",
                        "data-[side=right]:slide-in-from-left-1 data-[side=left]:slide-in-from-right-1",
                        "data-[side=top]:slide-in-from-bottom-1 data-[side=bottom]:slide-in-from-top-1",
                        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
                    )}
                >
                    {content}
                </TooltipPrimitive.Content>
            </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
    )
}

export { AdsTooltip, AdsTooltipProvider }
