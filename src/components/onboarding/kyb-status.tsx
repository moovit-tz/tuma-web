import Link from "next/link";
import { getDict } from "@/i18n";
import { formatTin } from "@/domain/agents";
import { cn } from "@/lib/utils";
import type { kybView } from "@/server/services/kyb";

type App = Awaited<ReturnType<typeof kybView>>;
type Status = keyof ReturnType<typeof getDict>["onboarding"]["status"];

const TONE: Record<string, string> = {
  submitted: "text-foreground",
  in_review: "text-amber-700 dark:text-amber-400",
  needs_info: "text-amber-700 dark:text-amber-400",
  approved: "text-emerald-700 dark:text-emerald-400",
  rejected: "text-brand-ink",
};

/** Where the application stands, the reviewer's note, and the one action that fits the status. */
/** `base` is where the application lives: /onboarding before there's a workspace, /portal/application after. */
export function KybStatus({ app, locale, base = `/${locale}/onboarding` }: { app: App; locale: string; base?: string }) {
  const o = getDict(locale).onboarding;
  const status = app.status as Status;
  const a = app.application;
  const fmt = (iso: string) => new Intl.DateTimeFormat(locale === "sw" ? "sw-TZ" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Dar_es_Salaam" }).format(new Date(iso));
  return (
    <div className="space-y-5">
      <section className="bg-card rounded-xl border p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground font-mono text-xs tracking-wider">{app.ref}</span>
          <span className="bg-muted rounded-full px-2.5 py-0.5 text-xs font-medium">{a.businessName}</span>
        </div>
        <h2 className={cn("font-display mt-3 text-2xl font-bold tracking-tight", TONE[status])}>{o.status[status] ?? status}</h2>
        <p className="text-muted-foreground mt-1.5 text-[15px] leading-relaxed">{o.next[status]}</p>
        {app.note && (
          <div className="border-brand-red/25 bg-brand-red/5 mt-4 rounded-lg border p-3.5">
            <p className="eyebrow">{o.reviewerNote}</p>
            <p className="mt-1 text-[15px]">{app.note}</p>
          </div>
        )}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {status === "approved" ? (
            <Link href={`/${locale}/portal`} className="bg-brand-red hover:bg-brand-red/90 inline-flex h-11 items-center justify-center rounded-md px-5 font-semibold text-black">
              {o.openWorkspace}
            </Link>
          ) : app.canEdit ? (
            <Link href={`${base}?edit=1`} className="bg-brand-red hover:bg-brand-red/90 inline-flex h-11 items-center justify-center rounded-md px-5 font-semibold text-black">
              {o.edit}
            </Link>
          ) : (
            <Link href={base} prefetch={false} className="hover:bg-muted inline-flex h-11 items-center justify-center rounded-md border px-5 font-semibold">
              {o.refresh}
            </Link>
          )}
        </div>
        <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 border-t pt-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-xs">{o.tin}</dt>
            <dd className="font-mono">{formatTin(a.tin)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">{o.region}</dt>
            <dd>{[a.office.district, a.office.region].filter(Boolean).join(", ")}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground text-xs">{o.workflow}</dt>
            <dd>{a.workflow.map((w) => o.steps[w as keyof typeof o.steps] ?? w).join("  ›  ")}</dd>
          </div>
        </dl>
      </section>
      {app.events.length > 0 && (
        <section className="bg-card rounded-xl border p-5 sm:p-6">
          <h3 className="eyebrow">{o.history}</h3>
          <ol className="mt-3 space-y-3">
            {[...app.events].reverse().map((e, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", i === 0 ? "bg-brand-red" : "bg-border")} />
                <div>
                  <p className="font-medium">{o.status[e.status as Status] ?? e.status}</p>
                  <p className="text-muted-foreground text-xs">{fmt(e.at)}</p>
                  {e.note && <p className="mt-1">{e.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
