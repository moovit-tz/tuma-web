import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Nothing to show, said properly (the states sheet): a soft round icon, a bold title, one clear line, one clear next
 * step. `tone="brand"` (default) for a first use or something to do; `"neutral"` (grey) for expired, cancelled or
 * can't-connect. `compact` for a panel inside a page; the default for a whole page's list.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  body,
  action,
  compact,
  tone = "brand",
  className,
}: {
  icon?: LucideIcon;
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
  tone?: "brand" | "neutral";
  className?: string;
}) {
  return (
    <div role="status" className={cn("flex flex-col items-center px-6 text-center", compact ? "py-8" : "py-14 sm:py-16", className)}>
      <div
        className={cn(
          "grid place-items-center rounded-full",
          tone === "brand" ? "bg-brand-red/10 text-brand-ink" : "bg-muted text-muted-foreground",
          compact ? "size-14" : "size-[76px]",
        )}
      >
        <Icon aria-hidden className={compact ? "size-6" : "size-8"} strokeWidth={1.75} />
      </div>
      <h3 className={cn("font-display font-bold tracking-tight", compact ? "mt-4 text-[15px]" : "mt-5 text-lg")}>{title}</h3>
      {body && <p className={cn("text-muted-foreground mt-1.5 max-w-sm text-balance", compact ? "text-[13px]" : "text-sm")}>{body}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/**
 * A state said inside a flow, above what it's about ("The payment didn't go through. Nothing was charged."). `error`
 * is a solid red band with white text (AA), `warn` amber, `info` a quiet card.
 */
export function StateBanner({
  tone = "error",
  icon: Icon,
  children,
  action,
  className,
}: {
  tone?: "error" | "warn" | "info";
  icon?: LucideIcon;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium",
        tone === "error" && "bg-[#b8201f] text-white",
        tone === "warn" && "bg-warn/10 text-warn border-warn/25 border",
        tone === "info" && "bg-card border",
        className,
      )}
    >
      {Icon && <Icon aria-hidden className="size-[18px] shrink-0" />}
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}
