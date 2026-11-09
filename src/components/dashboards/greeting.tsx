"use client";
import { useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { cn } from "@/lib/utils";

const noop = () => () => {};

/**
 * Dashboard heading from the parcel portal: "Good morning, Grace", today's date, and a refresh button.
 * The greeting follows the viewer's clock, so it is set after mount to keep server and client renders equal.
 */
export function DashboardGreeting({ name, eyebrow, children }: { name: string; eyebrow?: string; children?: React.ReactNode }) {
  const { dict: t, locale } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  // The clock is the viewer's, so the greeting and date appear after hydration (server and client renders match).
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const now = new Date();
  const h = now.getHours();
  const hello = hydrated ? (h < 12 ? t.shell.morning : h < 17 ? t.shell.afternoon : t.shell.evening) : null;
  const date = hydrated
    ? now.toLocaleDateString(locale === "sw" ? "sw-TZ" : locale === "fr" ? "fr" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h2 className="font-display text-[26px] leading-tight font-bold tracking-[-0.02em]">
          {hello ?? t.dashboard.greeting}, <span className="text-brand-ink">{name.split(" ")[0]}</span>
        </h2>
        <p className="text-muted-foreground mt-0.5 min-h-5 text-sm">{date && fmt(t.shell.overviewFor, { date })}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <button
          type="button"
          onClick={() => start(() => router.refresh())}
          disabled={pending}
          aria-label={t.shell.refresh}
          title={t.shell.refresh}
          className="bg-card hover:bg-muted grid size-10 shrink-0 place-items-center rounded-md border outline-none focus-visible:ring-2 disabled:opacity-60"
        >
          <RefreshCw className={cn("size-4", pending && "animate-spin")} />
        </button>
      </div>
    </div>
  );
}
