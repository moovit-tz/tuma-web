import { Icon } from "@/components/ui/icon"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { cardValueClass } from "@/lib/card-text"

// The navy summary card used across the portal pages (Companies design)
export function NavyCard({ label, value, sub, icon }: { label: string; value?: string; sub: string; icon: any }) {
    return (
        <Card className="rounded-[var(--ds-radius-large)] border-none h-full bg-[#242a37] relative overflow-hidden shadow-[var(--ds-shadow-raised)]">
            <div className="absolute right-[-15px] bottom-[-15px] opacity-[0.05] text-[#ffd428] pointer-events-none rotate-12"><Icon icon={icon} size={100} /></div>
            <CardContent className="p-6 relative z-10">
                <div className="size-10 rounded-[var(--ds-radius-small)] flex items-center justify-center bg-white/5 mb-4"><Icon icon={icon} className="size-5 text-[#ffd428]" /></div>
                <p className="text-xs font-semibold text-[#ffd428]/60 mb-1">{label}</p>
                {value === undefined ? <Skeleton className="h-7 w-16 bg-white/10" /> : <h3 className={cn(cardValueClass(value), "font-semibold leading-tight text-white tabular-nums line-clamp-2 break-words")} title={value}>{value}</h3>}
                <p className="text-xs font-bold text-white/40 mt-2">{sub}</p>
            </CardContent>
        </Card>
    )
}
