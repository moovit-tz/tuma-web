import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/*
 * Route loading screens, shaped like the portal pages they stand in for:
 * the toolbar, the tab bar, the navy stat cards, then charts and/or a table
 * with a navy banner and one page (10 rows) of placeholders. Matching the
 * real layout means nothing jumps when the page arrives.
 */

interface AdminPageLoaderProps {
    showStats?: boolean
    showTable?: boolean
    showCharts?: boolean
    showToolbar?: boolean
    showTabs?: boolean
    className?: string
}

// Placeholder bar on the navy surfaces
const OnNavy = ({ className }: { className?: string }) => <div className={cn("animate-pulse rounded-[var(--ds-radius-small)] bg-white/10", className)} />

function Toolbar() {
    return (
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3">
            <Skeleton className="h-10 flex-1 min-w-0" />
            <div className="flex gap-3">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-40" />
            </div>
            <div className="flex gap-3">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-32 bg-[#ffd428]/40" />
            </div>
        </div>
    )
}

function TabBar() {
    return (
        <div className="flex gap-2 rounded-[var(--ds-radius-small)] bg-slate-100 p-1.5 dark:bg-black/20">
            <Skeleton className="h-11 flex-1 bg-white dark:bg-white/10" />
            <Skeleton className="h-11 flex-1 bg-transparent" />
            <Skeleton className="hidden h-11 flex-1 bg-transparent sm:block" />
        </div>
    )
}

function StatCards() {
    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-[var(--ds-radius-large)] bg-[#242a37] p-6 shadow-[var(--ds-shadow-raised)]">
                    <OnNavy className="mb-4 size-10" />
                    <OnNavy className="h-3 w-24" />
                    <OnNavy className="mt-3 h-7 w-32" />
                    <OnNavy className="mt-3 h-3 w-40" />
                </div>
            ))}
        </div>
    )
}

function ChartCards() {
    return (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="overflow-hidden rounded-[var(--ds-radius-large)] bg-white shadow-[var(--ds-shadow-raised)] dark:bg-[#1a1f2b] lg:col-span-2">
                <div className="bg-[#242a37] px-6 py-7"><OnNavy className="h-5 w-48" /><OnNavy className="mt-2 h-3 w-64" /></div>
                <div className="flex h-[260px] items-end gap-3 p-6">
                    {[40, 65, 50, 80, 35, 70, 55, 90, 45, 60].map((h, i) => (
                        <Skeleton key={i} className="flex-1 rounded-t-[var(--ds-radius-small)] rounded-b-none" style={{ height: `${h}%` }} />
                    ))}
                </div>
            </div>
            <div className="overflow-hidden rounded-[var(--ds-radius-large)] bg-white shadow-[var(--ds-shadow-raised)] dark:bg-[#1a1f2b]">
                <div className="bg-[#242a37] px-6 py-7"><OnNavy className="h-5 w-36" /><OnNavy className="mt-2 h-3 w-48" /></div>
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-6 py-4">
                            <Skeleton className="size-8 shrink-0 rounded-full" />
                            <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                            <Skeleton className="h-4 w-16" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function TableCard() {
    return (
        <div className="overflow-hidden rounded-[var(--ds-radius-large)] border border-slate-100 bg-white shadow-[var(--ds-shadow-raised)] dark:border-white/5 dark:bg-[#1a1f2b]">
            <div className="bg-[#242a37] px-6 pb-6 pt-8">
                <OnNavy className="h-6 w-56" />
                <OnNavy className="mt-2 h-3 w-80 max-w-full" />
                <div className="mt-8 flex gap-6">
                    {["w-8", "flex-[3]", "flex-[2]", "flex-[2]", "flex-1"].map((width, i) => <OnNavy key={i} className={cn("h-3", width)} />)}
                </div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-white/5">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-6 px-6 py-4">
                        <Skeleton className="h-3 w-8" />
                        <div className="flex-[3] space-y-2"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                        <Skeleton className="h-3.5 flex-[2]" />
                        <Skeleton className="h-3.5 flex-[2]" />
                        <Skeleton className="h-7 flex-1 rounded-full" />
                    </div>
                ))}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 dark:border-white/5">
                <Skeleton className="h-3 w-40" />
                <div className="flex gap-2"><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-20" /></div>
            </div>
        </div>
    )
}

export function AdminPageLoader({ showStats = true, showTable = true, showCharts = false, showToolbar = true, showTabs = true, className }: AdminPageLoaderProps) {
    return (
        <div role="status" aria-live="polite" aria-busy="true" className={cn("space-y-8 animate-in fade-in duration-200", className)}>
            <span className="sr-only">Loading page</span>
            {showToolbar && <Toolbar />}
            {showTabs && <TabBar />}
            {showStats && <StatCards />}
            {showCharts && <ChartCards />}
            {showTable && <TableCard />}
        </div>
    )
}

// Settings and other form pages: section tabs and stacked panels
function SettingsLoader() {
    return (
        <div role="status" aria-busy="true" className="space-y-8 animate-in fade-in duration-200">
            <span className="sr-only">Loading page</span>
            <TabBar />
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-[var(--ds-radius-large)] bg-white shadow-[var(--ds-shadow-raised)] dark:bg-[#1a1f2b]">
                    <div className="bg-[#242a37] px-6 py-6"><OnNavy className="h-5 w-44" /><OnNavy className="mt-2 h-3 w-72 max-w-full" /></div>
                    <div className="space-y-5 p-6">
                        {Array.from({ length: 3 }).map((_, j) => (
                            <div key={j} className="flex items-center justify-between gap-6">
                                <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-48" /><Skeleton className="h-3 w-72 max-w-full" /></div>
                                <Skeleton className="h-6 w-11 rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

// Page types (the names the route loading files use)
export function CompaniesPageLoader() { return <AdminPageLoader showCharts showTable={false} /> }
export function VehiclesPageLoader() { return <AdminPageLoader showCharts showTable={false} /> }
export function UsersPageLoader() { return <AdminPageLoader showTabs={false} showStats={false} /> }
export function AgentsPageLoader() { return <AdminPageLoader showCharts showTable={false} /> }
export function RolesPageLoader() { return <SettingsLoader /> }
export function FinancePageLoader() { return <AdminPageLoader showCharts showTable={false} /> }
export function ParcelsPageLoader() { return <AdminPageLoader showCharts showTable={false} /> }
export function RoutesPageLoader() { return <AdminPageLoader showStats={false} /> }
export function LocationPageLoader() { return <AdminPageLoader showCharts showTable={false} /> }
export function ReportsPageLoader() { return <AdminPageLoader showTable={false} showCharts /> }
export function SettingsPageLoader() { return <SettingsLoader /> }
export function DashboardPageLoader() { return <AdminPageLoader showToolbar={false} showTabs={false} showCharts showTable /> }
