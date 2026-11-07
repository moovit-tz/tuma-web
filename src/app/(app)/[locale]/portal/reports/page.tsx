import Link from "next/link";
import { Download, Hourglass, Package, PackageCheck, Star, TriangleAlert, Wallet } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { agentReport, REPORT_PERIODS } from "@/server/services/agent-parcels";
import { agentRatings } from "@/server/services/ratings";
import { fmt, getDict } from "@/i18n";
import { dateOnly, money, num } from "@/lib/format";
import { PageHeader, PageTabs, Panel, Stat } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const instant = false;

type Period = (typeof REPORT_PERIODS)[number];

/** Bars for a breakdown: key, label, count and value. */
function Breakdown({ rows, locale, empty }: { rows: { key: string; label: string; n: number; value: number }[]; locale: string; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  if (!rows.length) return <p className="text-muted-foreground px-4 py-8 text-center text-sm">{empty}</p>;
  return (
    <ul className="space-y-2.5 p-4">
      {rows.map((r) => (
        <li key={r.key} className="text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate">{r.label}</span>
            <span className="tabular text-muted-foreground shrink-0 text-xs">
              {num(r.n, locale)} · {money(r.value, locale)}
            </span>
          </div>
          <div className="bg-muted mt-1 h-1.5 overflow-hidden rounded-full">
            <div className="bg-primary h-full rounded-full" style={{ width: `${(r.n / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * The office's report, as in the app (More → Reports): parcels and value for the period, delivered and failed, what's
 * still to collect, day by day, and breakdowns by payment, service, destination and who booked; then the receivers'
 * ratings. Exports the days as CSV.
 */
export default async function ReportsPage({ params, searchParams }: PageProps<"/[locale]/portal/reports">) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("agent.workspace") || !user.permissions.has("report.view") || !user.accountId) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const r = t.agent.rep;
  const period: Period = (REPORT_PERIODS as readonly string[]).includes(sp.period as string) ? (sp.period as Period) : "week";
  const [rep, rat] = await Promise.all([agentReport(user, { period }), agentRatings(user)]);
  const base = `/${locale}/portal/reports`;
  const peak = Math.max(1, ...rep.series.map((d) => Math.max(d.parcels, d.delivered)));
  const dayLabel = (iso: string) =>
    new Date(`${iso}T12:00:00+03:00`).toLocaleDateString(locale === "sw" ? "sw-TZ" : locale === "fr" ? "fr" : "en-GB", rep.series.length <= 7 ? { weekday: "short" } : { day: "numeric", month: "short" });
  // Long periods: label every few bars so they stay readable.
  const every = Math.ceil(rep.series.length / 10);
  const starsMax = Math.max(1, ...Object.values(rat.stars));

  return (
    <div className="space-y-6">
      <PageHeader title={r.title} description={r.sub}>
        <Button variant="outline" asChild>
          <a href={`/api/exports/report?period=${period}`} download>
            <Download /> {r.export}
          </a>
        </Button>
      </PageHeader>
      <PageTabs label={r.title} items={REPORT_PERIODS.map((p) => ({ href: p === "week" ? base : `${base}?period=${p}`, label: r.periods[p], active: p === period }))} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={r.parcels} value={num(rep.totals.parcels, locale)} hint={fmt(r.average, { amount: money(rep.totals.average, locale) })} icon={Package} />
        <Stat label={r.value} value={money(rep.totals.value, locale)} icon={Wallet} />
        <Stat label={r.delivered} value={num(rep.totals.delivered, locale)} hint={rep.totals.failed ? `${r.failed}: ${rep.totals.failed}` : undefined} tone={rep.totals.failed ? "warn" : undefined} icon={PackageCheck} />
        <Stat label={r.toCollect} value={money(rep.totals.toCollect, locale)} icon={Hourglass} />
      </div>

      <Panel title={r.daily} description={dateOnly(rep.from, locale)}>
        <div className="px-4 pt-4 pb-3">
          <div className="flex h-44 items-end gap-1">
            {rep.series.map((d) => (
              <div key={d.day} className="group relative flex h-full flex-1 items-end gap-px" title={`${d.day}: ${d.parcels} · ${money(d.value, locale)} · ${r.delivered} ${d.delivered}`}>
                <div className="bg-primary/85 w-1/2 rounded-t-sm" style={{ height: `${(d.parcels / peak) * 100}%`, minHeight: d.parcels ? 3 : 0 }} />
                <div className="bg-ok/70 w-1/2 rounded-t-sm" style={{ height: `${(d.delivered / peak) * 100}%`, minHeight: d.delivered ? 3 : 0 }} />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-1">
            {rep.series.map((d, i) => (
              <span key={d.day} className="text-muted-foreground flex-1 truncate text-center text-[10.5px]">
                {i % every === 0 ? dayLabel(d.day) : ""}
              </span>
            ))}
          </div>
          <div className="text-muted-foreground mt-3 flex gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="bg-primary/85 size-2.5 rounded-sm" /> {r.booked}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="bg-ok/70 size-2.5 rounded-sm" /> {r.delivered}
            </span>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={r.byPayment}>
          <Breakdown rows={rep.byPayment.map((x) => ({ ...x, label: r.pay[x.key] ?? x.key }))} locale={locale} empty={r.none} />
        </Panel>
        <Panel title={r.byService}>
          <Breakdown rows={rep.byService.map((x) => ({ ...x, label: t.service[x.key] ?? x.key }))} locale={locale} empty={r.none} />
        </Panel>
        <Panel title={r.byRegion}>
          <Breakdown rows={rep.byRegion.map((x) => ({ ...x, label: x.key }))} locale={locale} empty={r.none} />
        </Panel>
        <Panel title={r.byStaff}>
          <Breakdown rows={rep.byStaff.map((x) => ({ key: x.key ?? "-", label: x.name, n: x.n, value: x.value }))} locale={locale} empty={r.none} />
        </Panel>
      </div>

      <Panel title={r.ratings} description={r.ratingsSub}>
        <div className="grid gap-6 p-4 md:grid-cols-[220px_1fr_1fr]">
          <div>
            <div className="text-muted-foreground text-xs">{r.score}</div>
            {rat.score !== null ? (
              <div className="mt-1 flex items-center gap-2">
                <span className="font-display text-4xl font-semibold">{rat.score}</span>
                <span className="text-muted-foreground text-sm">
                  <Star className="inline size-4 fill-amber-400 text-amber-400" /> {rat.average}
                </span>
              </div>
            ) : (
              <p className="mt-1 text-sm">{fmt(r.noScore, { n: rat.minRatings })}</p>
            )}
            <p className="text-muted-foreground mt-2 text-xs">{fmt(r.ratedN, { n: rat.count, asked: rat.asked })}</p>
            <ul className="mt-4 space-y-1">
              {[5, 4, 3, 2, 1].map((s) => (
                <li key={s} className="grid grid-cols-[20px_1fr_28px] items-center gap-2 text-xs">
                  <span className="tabular">{s}★</span>
                  <span className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <span className="block h-full rounded-full bg-amber-400" style={{ width: `${((rat.stars[s] ?? 0) / starsMax) * 100}%` }} />
                  </span>
                  <span className="tabular text-muted-foreground text-right">{rat.stars[s] ?? 0}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-muted-foreground mb-2 text-xs">{r.issues}</div>
            {Object.keys(rat.issues).length === 0 ? (
              <p className="text-muted-foreground text-sm">—</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {Object.entries(rat.issues)
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, n]) => (
                    <li key={k} className="flex justify-between gap-3">
                      <span className="flex items-center gap-1.5">
                        <TriangleAlert className="text-warn size-3.5" /> {r.issueNames[k] ?? k}
                      </span>
                      <span className="tabular text-muted-foreground">{n}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
          <div>
            <div className="text-muted-foreground mb-2 text-xs">{r.feedback}</div>
            {rat.recent.length === 0 ? (
              <p className="text-muted-foreground text-sm">{r.noFeedback}</p>
            ) : (
              <ul className="max-h-64 space-y-3 overflow-y-auto text-sm">
                {rat.recent.map((x) => (
                  <li key={`${x.waybill}-${x.at}`}>
                    <div className="flex items-center gap-2">
                      <span className={cn("tabular text-xs font-semibold", (x.stars ?? 0) <= 2 ? "text-brand-red" : "text-amber-500")}>{x.stars}★</span>
                      <Link href={`/${locale}/portal/parcels/${x.waybill}`} prefetch={false} className="font-mono text-xs underline-offset-4 hover:underline">
                        {x.waybill}
                      </Link>
                      <span className="text-muted-foreground ml-auto text-xs">{dateOnly(x.at, locale)}</span>
                    </div>
                    {(x.comment || x.issue) && <p className="text-muted-foreground mt-0.5 text-xs">{[x.issue ? r.issueNames[x.issue] : null, x.comment].filter(Boolean).join(" · ")}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
