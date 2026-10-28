import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useTr } from "@/lib/i18n/portal"

/*
 * Loading placeholders shaped like the content they stand in for — used
 * instead of spinners wherever a section, list, table or page is loading.
 */

/** Rows of a list: a line of title + a line of detail, value on the right */
export function ListSkeleton({ rows = 4, className, avatar = false }: { rows?: number; className?: string; avatar?: boolean }) {
    const tr = useTr()
    return (
        <div className={cn("divide-y divide-slate-100 dark:divide-white/5", className)} aria-busy="true" aria-label={tr("Loading")}>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        {avatar && <Skeleton className="size-8 shrink-0 rounded-full" />}
                        <div className="min-w-0 flex-1 space-y-2">
                            <Skeleton className="h-3.5 w-2/5" />
                            <Skeleton className="h-3 w-3/5" />
                        </div>
                    </div>
                    <Skeleton className="h-4 w-14 shrink-0" />
                </div>
            ))}
        </div>
    )
}

/** Table body rows (<tr>) for a table with `cols` columns */
export function TableRowsSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, r) => (
                <tr key={r} aria-hidden>
                    {Array.from({ length: cols }).map((_, c) => (
                        <td key={c} className="px-6 py-4">
                            <Skeleton className={cn("h-4", c === 0 ? "w-3/4" : c === cols - 1 ? "ml-auto w-14" : "w-1/2")} />
                            {c === 0 && <Skeleton className="mt-2 h-3 w-1/2" />}
                        </td>
                    ))}
                </tr>
            ))}
        </>
    )
}

/** A single figure on a stat card */
export function StatSkeleton({ className }: { className?: string }) {
    const tr = useTr()
    return <Skeleton className={cn("h-7 w-20", className)} aria-label={tr("Loading")} />
}

/** Label/value detail panel (a sheet's info section) */
export function DetailSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
    const tr = useTr()
    return (
        <div className={cn("space-y-6", className)} aria-busy="true" aria-label={tr("Loading")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-3 rounded-[var(--ds-radius-large)] border border-slate-100 bg-white p-5 dark:border-white/5 dark:bg-[#1a1f2b]">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-7 w-24" />
                    </div>
                ))}
            </div>
            <div className="rounded-[var(--ds-radius-large)] border border-slate-100 bg-white dark:border-white/5 dark:bg-[#1a1f2b]">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 last:border-0 dark:border-white/5">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-3.5 w-32" />
                    </div>
                ))}
            </div>
        </div>
    )
}

/** Whole page: header, four stat cards and a table */
export function PageSkeleton() {
    const tr = useTr()
    return (
        <div className="space-y-8 p-6" aria-busy="true" aria-label={tr("Loading page")}>
            <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-12 w-full max-w-md" />
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-[var(--ds-radius-large)]" />
                ))}
            </div>
            <div className="overflow-hidden rounded-[var(--ds-radius-large)] border border-slate-100 bg-white dark:border-white/5 dark:bg-[#1a1f2b]">
                <Skeleton className="h-24 rounded-none" />
                <ListSkeleton rows={6} />
            </div>
        </div>
    )
}
