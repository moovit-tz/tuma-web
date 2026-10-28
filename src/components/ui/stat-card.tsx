import * as React from "react"
import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * StatCard — the single shared KPI-tile implementation.
 *
 * Replaces the nine independent gradient/glassmorphism stat-tile
 * implementations found across admin/biz/ops in the design audit. Border,
 * not shadow-xl; tabular numerals; a delta instead of decoration.
 */
export interface StatCardProps extends React.ComponentProps<"div"> {
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  /** Positive shows in success color with an up arrow, negative in danger with a down arrow. */
  delta?: {
    value: string
    direction: "up" | "down" | "flat"
  }
  loading?: boolean
}

function StatCard({ label, value, icon: Icon, delta, loading, className, ...props }: StatCardProps) {
  return (
    <div
      data-slot="stat-card"
      className={cn(
        "flex flex-col gap-2 rounded-md border border-border bg-card p-4",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {Icon && <Icon className="size-4 text-muted-foreground" aria-hidden="true" />}
      </div>

      {loading ? (
        <Skeleton className="h-7 w-24" />
      ) : (
        <span className="font-variant-numeric-tabular text-2xl font-semibold tracking-tight text-foreground [font-variant-numeric:tabular-nums]">
          {value}
        </span>
      )}

      {delta && !loading && (
        <span
          className={cn(
            "inline-flex w-fit items-center gap-1 text-xs font-medium",
            delta.direction === "up" && "text-success",
            delta.direction === "down" && "text-danger",
            delta.direction === "flat" && "text-muted-foreground"
          )}
        >
          {delta.direction === "up" && <ArrowUp className="size-3" aria-hidden="true" />}
          {delta.direction === "down" && <ArrowDown className="size-3" aria-hidden="true" />}
          {delta.value}
        </span>
      )}
    </div>
  )
}

/** Grid wrapper — keeps stat-card rows off arbitrary padding/gap values. */
function StatCardGrid({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-card-grid"
      className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4", className)}
      {...props}
    />
  )
}

export { StatCard, StatCardGrid }
