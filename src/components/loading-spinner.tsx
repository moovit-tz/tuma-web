import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTr } from "@/lib/i18n/portal"

interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg"
    className?: string
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: "h-4 w-4",
        md: "h-6 w-6",
        lg: "h-10 w-10",
    }

    return <Loader2 className={cn("animate-spin text-primary", sizeClasses[size], className)} />
}

export function PageLoader() {
    const tr = useTr()
    return (
        <div className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center bg-background/40 z-50">
            <div className="flex flex-col items-center gap-6 p-8 rounded-[var(--ds-radius-large)] glass-panel border border-white/10 shadow-[var(--ds-shadow-raised)] animate-in fade-in zoom-in duration-300">
                <div className="relative flex items-center justify-center">
                    <div className="relative bg-background/50 p-4 rounded-[var(--ds-radius-large)] border border-white/10">
                        <LoadingSpinner size="lg" className="text-primary" />
                    </div>
                </div>
                <div className="space-y-2 text-center">
                    <h3 className="text-xl font-bold text-foreground">{tr("Loading")}</h3>
                    <p className="text-sm font-medium text-muted-foreground animate-pulse">{tr("Please wait a moment...")}</p>
                </div>
            </div>
        </div>
    )
}

export function TableLoader() {
    const tr = useTr()
    return (
        <div className="flex h-[400px] w-full items-center justify-center bg-card/30 rounded-[var(--ds-radius-small)] border border-border/50">
            <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                <div className="relative">
                    <div className="relative bg-background/50 p-3 rounded-[var(--ds-radius-small)] border border-white/10 shadow-[var(--ds-shadow-raised)]">
                        <LoadingSpinner size="md" className="text-primary" />
                    </div>
                </div>
                <div className="space-y-1 text-center">
                    <p className="text-sm font-semibold text-foreground/80">{tr("Fetching Data")}</p>
                    <p className="text-xs text-muted-foreground">{tr("Loading records...")}</p>
                </div>
            </div>
        </div>
    )
}
