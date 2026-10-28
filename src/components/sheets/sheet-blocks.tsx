import type * as React from "react"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { useTr } from "@/lib/i18n/portal"

/*
 * Building blocks for the profile sheets (agent, company, parcel, owner):
 * a small grey heading over a white card, on the sheet's grey canvas.
 */

export const SHEET_CARD =
    "rounded-[var(--ds-radius-large)] border border-slate-100 bg-white shadow-[var(--ds-shadow-raised)] dark:border-white/5 dark:bg-[#1a1f2b]"

export function SheetSection({
    title,
    icon,
    action,
    children,
    className,
    bare = false,
}: {
    title: React.ReactNode
    icon?: any
    /** Rendered on the right of the heading (a link or small button) */
    action?: React.ReactNode
    children: React.ReactNode
    className?: string
    /** Don't wrap children in the white card (for grids of tiles) */
    bare?: boolean
}) {
    return (
        <section className={cn("space-y-3", className)}>
            <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                    {icon && <Icon icon={icon} size={14} />}
                    {title}
                </h3>
                {action}
            </div>
            {bare ? children : <div className={cn(SHEET_CARD, "overflow-hidden")}>{children}</div>}
        </section>
    )
}

export interface DetailRow {
    label: React.ReactNode
    value: React.ReactNode
    mono?: boolean
    strong?: boolean
}

/** Label/value rows (Atlassian "description list") */
export function DetailList({ rows }: { rows: DetailRow[] }) {
    return (
        <dl className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((row, i) => (
                <div key={i} className="flex items-center justify-between gap-4 px-5 py-3">
                    <dt className="shrink-0 text-sm text-slate-500">{row.label}</dt>
                    <dd
                        className={cn(
                            "min-w-0 truncate text-right text-sm font-semibold text-[#242a37] dark:text-white",
                            row.mono && "font-mono",
                            row.strong && "text-base",
                        )}
                    >
                        {row.value ?? "—"}
                    </dd>
                </div>
            ))}
        </dl>
    )
}

export interface StatTile {
    label: React.ReactNode
    value: React.ReactNode
    hint?: React.ReactNode
    /** Navy tile with a yellow value — use for the one headline figure */
    emphasis?: boolean
}

export function StatGrid({ tiles, columns = 3 }: { tiles: StatTile[]; columns?: 2 | 3 | 4 }) {
    return (
        <div
            className={cn(
                "grid grid-cols-1 gap-4",
                columns === 2 && "sm:grid-cols-2",
                columns === 3 && "sm:grid-cols-3",
                columns === 4 && "sm:grid-cols-2 lg:grid-cols-4",
            )}
        >
            {tiles.map((t, i) => (
                <div
                    key={i}
                    className={cn(
                        "rounded-[var(--ds-radius-large)] p-5",
                        t.emphasis ? "bg-[#242a37] text-white shadow-[var(--ds-shadow-raised)]" : SHEET_CARD,
                    )}
                >
                    <p className={cn("text-xs font-semibold", t.emphasis ? "text-white/50" : "text-slate-400")}>{t.label}</p>
                    <p
                        className={cn(
                            "mt-2 break-words text-2xl font-bold leading-tight tabular-nums",
                            t.emphasis ? "text-[#ffd428]" : "text-[#242a37] dark:text-white",
                        )}
                    >
                        {t.value}
                    </p>
                    {t.hint && (
                        <p className={cn("mt-2 text-xs", t.emphasis ? "text-white/50" : "text-slate-500")}>{t.hint}</p>
                    )}
                </div>
            ))}
        </div>
    )
}

export function SheetEmpty({ icon, title, description }: { icon?: any; title: string; description?: string }) {
    return (
        <div className="px-6 py-14 text-center">
            {icon && (
                <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5">
                    <Icon icon={icon} size={20} className="text-slate-400" />
                </div>
            )}
            <p className="text-sm font-semibold text-[#242a37] dark:text-white">{title}</p>
            {description && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
        </div>
    )
}

/** Previous / next footer for paged lists inside a sheet card */
export function SheetPager({
    page,
    totalPages,
    onPage,
    summary,
}: {
    page: number
    totalPages: number
    onPage: (page: number) => void
    summary?: React.ReactNode
}) {
    const tr = useTr()
    if (totalPages <= 1 && !summary) return null
    return (
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 dark:border-white/5">
            <p className="text-xs text-slate-500">{summary ?? tr("Page {page} of {totalPages}", { page, totalPages })}</p>
            {totalPages > 1 && (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={tr("Previous page")}>
                        <Icon icon={ArrowLeft01Icon} size={16} />
                    </Button>
                    <span className="min-w-14 text-center text-xs font-semibold tabular-nums text-[#242a37] dark:text-white">
                        {page} / {totalPages}
                    </span>
                    <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label={tr("Next page")}>
                        <Icon icon={ArrowRight01Icon} size={16} />
                    </Button>
                </div>
            )}
        </div>
    )
}

/** Atlassian lozenge for row statuses inside sheets */
export function SheetLozenge({ status }: { status?: string | null }) {
    const s = String(status || "UNKNOWN").toUpperCase()
    const tone =
        ["ACTIVE", "SUCCESS", "COMPLETED", "DELIVERED", "PAID"].includes(s)
            ? "bg-[#ffd428] text-[#242a37]"
            : ["FAILED", "ERROR", "CANCELLED", "CANCELED", "LOST"].includes(s)
                ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                : ["PENDING", "PAUSED", "PROCESSING"].includes(s)
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                    : ["DISPATCHED", "IN_TRANSIT", "OFFLOADED"].includes(s)
                        ? "bg-[#242a37] text-white dark:bg-white dark:text-[#242a37]"
                        : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200"
    return (
        <span className={cn("inline-flex h-6 items-center rounded-[var(--ds-radius-small)] px-2 text-xs font-semibold", tone)}>
            {s.replace(/_/g, " ")}
        </span>
    )
}
