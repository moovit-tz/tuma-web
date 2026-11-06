import Link from "next/link";
import { getDict } from "@/i18n";
import { RANGES, type DashRange } from "@/domain/range";
import { cn } from "@/lib/utils";

/**
 * Dashboard page fills the window on large screens: header and figures at natural height, panels share the rest.
 * Panel contents stretch to their panel (cargo rows, finance tiles) so no blank space is left; longer lists scroll inside.
 * 8rem = the top bar (4rem) + the main area's vertical padding (2 × 2rem).
 */
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-5 lg:h-[calc(100dvh-8rem)] lg:min-h-[640px]">{children}</div>;
}

/** The panels area: takes what the window leaves on large screens; panels in a row share the same height. */
export function DashboardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-[minmax(0,1fr)] gap-5 lg:min-h-0 lg:flex-1", className)}>{children}</div>;
}

/** Period switch from the parcel portal (Today · 7 days · 30 days · All time). Links, so each period has a URL. */
export function RangeFilter({ locale, value, hrefFor }: { locale: string; value: DashRange; hrefFor?: (r: DashRange) => string }) {
  const t = getDict(locale);
  return (
    <nav aria-label={t.dashboard.period} className="bg-muted flex w-fit max-w-full overflow-x-auto rounded-md p-1">
      {RANGES.map((r) => (
        <Link
          key={r}
          href={hrefFor ? hrefFor(r) : `/${locale}/portal?range=${r}`}
          scroll={false}
          aria-current={r === value ? "page" : undefined}
          className={cn(
            "h-8 shrink-0 rounded px-3.5 text-[13px] leading-8 font-semibold whitespace-nowrap outline-none transition-colors focus-visible:ring-2",
            r === value ? "bg-sidebar text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.dashboard.range[r]}
        </Link>
      ))}
    </nav>
  );
}
