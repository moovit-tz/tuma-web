import { cn } from "@/lib/utils";

/**
 * Status badge: a single badge, one uniform style for every status. An open exception is not shown as a second badge;
 * it is listed on the Exceptions page and on the shipment itself, and named in the badge's tooltip here.
 */
export function StateBadge({ state, label, exception, exceptionLabel, className }: { state: string; label: string; exception?: boolean; exceptionLabel?: string; className?: string }) {
  return (
    <span
      data-state={state}
      title={exception && exceptionLabel ? `${label} · ${exceptionLabel}` : undefined}
      className={cn("bg-muted text-foreground border-border inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap", className)}
    >
      {label}
    </span>
  );
}
