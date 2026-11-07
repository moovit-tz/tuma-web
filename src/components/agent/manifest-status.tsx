import { cn } from "@/lib/utils";

/** A manifest's status as a pill: on the way (amber), arrived (green), anything else quiet. */
export function ManifestStatus({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        status === "on_the_way" ? "bg-warn/15 text-warn" : status === "arrived" ? "bg-ok/15 text-ok" : "bg-muted text-muted-foreground",
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
