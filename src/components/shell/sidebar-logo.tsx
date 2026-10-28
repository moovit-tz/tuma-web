import Image from "next/image"
import { cn } from "@/lib/utils"
import { useTr } from "@/lib/i18n/portal"

/**
 * MySafari logo for the navy sidebars: the yellow wordmark when expanded,
 * the trolley mark when collapsed. Both are crops of /logo.png.
 */
export function SidebarLogo({
    collapsed,
    portal,
    className,
}: {
    collapsed?: boolean
    /** Small label after the wordmark, e.g. "Ops" */
    portal?: string
    className?: string
}) {
    const tr = useTr()
    if (collapsed) {
        return (
            <Image
                src="/logo-mark.png"
                alt={tr("MySafari")}
                width={36}
                height={36}
                priority
                className={cn("size-9 rounded-[6px]", className)}
            />
        )
    }
    return (
        <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
            <Image
                src="/logo-sidebar.png"
                alt={tr("MySafari Parcel")}
                width={111}
                height={36}
                priority
                className="h-9 w-auto rounded-[6px]"
            />
            {portal && <span className="truncate text-sm font-semibold text-white/60">{portal}</span>}
        </div>
    )
}
