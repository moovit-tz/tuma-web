"use client"

import { CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react"
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

type Tone = "success" | "destructive" | "warning" | "info"

// Accent and icon per tone (the card itself is always the same white/navy card)
const TONE: Record<Tone, { icon: typeof Info; badge: string; bar: string }> = {
    success: { icon: CheckCircle2, badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300", bar: "bg-emerald-500" },
    destructive: { icon: XCircle, badge: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300", bar: "bg-rose-500" },
    warning: { icon: AlertTriangle, badge: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300", bar: "bg-amber-500" },
    info: { icon: Info, badge: "bg-slate-100 text-[#242a37] dark:bg-white/10 dark:text-[#ffd428]", bar: "bg-[#ffd428]" },
}

// Most toasts don't pass a variant. Messages about nothing happening read as
// information; the rest confirm that something worked.
// Error wording (English and Swahili) without variant: "destructive" still reads as an error.
const NEUTRAL = /\b(nothing|no |not |none|already|hakuna|bado|haku|si )/i
const ERROR = /(couldn['’]?t|could not|failed|error|unable|invalid|denied|not allowed|imeshindikana|hitilafu|hairuhusiwi|si sahihi)/i
function toneOf(variant: string | null | undefined, title: unknown): Tone {
    if (variant === "destructive" || variant === "success" || variant === "warning" || variant === "info") return variant
    const text = String(title ?? "")
    if (ERROR.test(text)) return "destructive"
    return NEUTRAL.test(text) ? "info" : "success"
}

// Errors stay up longer so there's time to read them
const DURATION: Record<Tone, number> = { success: 4500, info: 5000, warning: 7000, destructive: 8000 }

export function Toaster() {
    const { toasts } = useToast()

    return (
        <ToastProvider swipeDirection="right">
            {toasts.map(({ id, title, description, action, variant, duration, ...props }) => {
                const tone = toneOf(variant, title)
                const { icon: ToneIcon, badge, bar } = TONE[tone]
                const ms = duration ?? DURATION[tone]
                return (
                    <Toast key={id} variant={tone} duration={ms} {...props}>
                        <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", badge)} aria-hidden>
                            <ToneIcon className="size-4" />
                        </span>
                        <div className="grid min-w-0 flex-1 gap-0.5 pt-1">
                            {title && <ToastTitle>{title}</ToastTitle>}
                            {description && <ToastDescription>{description}</ToastDescription>}
                            {action}
                        </div>
                        <ToastClose />
                        {/* Time left; pauses while hovered, like the toast itself */}
                        <span
                            aria-hidden
                            className={cn("toast-countdown absolute bottom-0 left-0 h-[3px] w-full origin-left", bar)}
                            style={{ animationDuration: `${ms}ms` }}
                        />
                    </Toast>
                )
            })}
            <ToastViewport />
        </ToastProvider>
    )
}
