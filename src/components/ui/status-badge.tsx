import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * StatusBadge — the single way state should be represented in this app.
 *
 * Semantic color (success/warning/danger/info) marks state only. It never
 * becomes the background of a whole card or button — see the design audit's
 * "Color" section. A neutral dot + label reads faster in a dense table than
 * a filled, shadowed pill.
 */
const statusBadgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      status: {
        success: "border-success/20 bg-success/10 text-success",
        warning: "border-warning/25 bg-warning/10 text-warning",
        danger: "border-danger/20 bg-danger/10 text-danger",
        info: "border-info/20 bg-info/10 text-info",
        neutral: "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      status: "neutral",
    },
  }
)

const dotVariants = cva("size-1.5 shrink-0 rounded-full", {
  variants: {
    status: {
      success: "bg-success",
      warning: "bg-warning",
      danger: "bg-danger",
      info: "bg-info",
      neutral: "bg-muted-foreground",
    },
  },
  defaultVariants: {
    status: "neutral",
  },
})

export interface StatusBadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof statusBadgeVariants> {
  /** Hide the leading dot indicator. */
  hideDot?: boolean
}

function StatusBadge({ className, status, hideDot, children, ...props }: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    >
      {!hideDot && <span className={cn(dotVariants({ status }))} aria-hidden="true" />}
      {children}
    </span>
  )
}

export { StatusBadge, statusBadgeVariants }
