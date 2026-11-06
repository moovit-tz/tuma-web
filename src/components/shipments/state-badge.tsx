import { cn } from "@/lib/utils";
import { StateIcon, stateColor } from "./state-icon";

/**
 * Status badge: a single badge in the stage's colour with its icon (the same as the app). An open exception is not shown as a second badge;
 * it is listed on the Exceptions page and on the shipment itself, and named in the badge's tooltip here.
 */
export function StateBadge({ state, label, exception, exceptionLabel, className }: { state: string; label: string; exception?: boolean; exceptionLabel?: string; className?: string }) {
  return (
    <span
      data-state={state}
      title={exception && exceptionLabel ? `${label} · ${exceptionLabel}` : undefined}
      className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap", className)}
      style={{
        color: stateColor(state),
        background: `color-mix(in srgb, ${stateColor(state)} 10%, transparent)`,
        borderColor: `color-mix(in srgb, ${stateColor(state)} 30%, transparent)`,
      }}
    >
      <StateIcon state={state} className="size-3.5" />
      {label}
    </span>
  );
}
