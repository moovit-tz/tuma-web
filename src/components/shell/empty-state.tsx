import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Nothing to show, said properly: an icon, what this place is for, why it's empty (or what to do), and the action that
 * fills it. `compact` for a panel inside a page; the default for a whole page's list.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  body,
  action,
  compact,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 text-center", compact ? "py-8" : "py-14 sm:py-16", className)}>
      <div className={cn("relative grid place-items-center rounded-full", compact ? "size-12" : "size-16")}>
        <span aria-hidden className="bg-brand-red/10 absolute inset-0 rounded-full" />
        <span aria-hidden className="border-brand-red/20 absolute -inset-2 rounded-full border border-dashed" />
        <Icon aria-hidden className={cn("text-brand-ink relative", compact ? "size-5" : "size-7")} strokeWidth={1.75} />
      </div>
      <h3 className={cn("font-display font-semibold tracking-tight", compact ? "mt-4 text-[15px]" : "mt-5 text-lg")}>{title}</h3>
      {body && <p className={cn("text-muted-foreground mt-1.5 max-w-sm text-balance", compact ? "text-[13px]" : "text-sm")}>{body}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
