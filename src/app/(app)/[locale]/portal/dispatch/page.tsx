import { CheckCircle2, Clock, Route, Send, UserRound } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { canDispatch, dispatchable, driverCounts, jobCounts, listJobs, pickupPoints, type JobTab } from "@/server/services/dispatch";
import { fmt, getDict } from "@/i18n";
import { dateTime, money, num } from "@/lib/format";
import { PageTabs, Panel, Stat } from "@/components/shell/page-header";
import { DashboardBody, DashboardLayout } from "@/components/dashboards/layout";
import { JobBuilder } from "@/components/dispatch/job-builder";
import { CancelJobButton } from "@/components/dispatch/cancel-job";
import { NoAccess } from "@/components/shell/no-access";

export const instant = false;

const TABS: JobTab[] = ["open", "active", "done", "all"];

/** Dispatch board: build jobs from waybills for Tuma-X drivers and follow them until they're done. */
export default async function DispatchPage({ params, searchParams }: PageProps<"/[locale]/portal/dispatch">) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  const t = getDict(locale);
  const j = t.dispatch;
  if (!canDispatch(user)) return <NoAccess locale={locale} />;
  const tab = (TABS.includes(sp.tab as JobTab) ? sp.tab : "open") as JobTab;
  const [rows, counts, ready, pickups, drivers] = await Promise.all([listJobs(user, tab), jobCounts(user), dispatchable(user), pickupPoints(user), driverCounts(user)]);
  const base = `/${locale}/portal/dispatch`;

  return (
    <DashboardLayout>
      <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-[26px] leading-tight font-bold tracking-[-0.02em]">{j.title}</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">{j.subtitle}</p>
        </div>
        <JobBuilder
          pickups={pickups.map((p) => ({ id: p.id, label: p.label }))}
          ready={ready.map((r) => ({ waybill: r.waybill, name: r.consignee.name, place: [r.consignee.address.district, r.consignee.address.region].filter(Boolean).join(", "), kg: Math.round(r.weightG / 100) / 10, state: r.state, cod: Boolean(r.codAmount) }))}
        />
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Clock} label={j.waiting} value={num(counts.open, locale)} hint={j.tabs.open} href={`${base}?tab=open`} tone={counts.open ? "warn" : undefined} />
        <Stat icon={Route} label={j.onRoad} value={num(counts.active, locale)} hint={j.asOf} href={`${base}?tab=active`} />
        <Stat icon={CheckCircle2} label={j.doneToday} value={num(counts.done, locale)} hint={j.tabs.done} href={`${base}?tab=done`} />
        <Stat icon={UserRound} label={j.online} value={num(drivers.online, locale)} hint={fmt(j.approvedDrivers, { n: drivers.approved })} href={`/${locale}/portal/drivers?tab=online`} />
      </div>

      <DashboardBody className="lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-0">
        <PageTabs className="mb-0 lg:static" label={j.title} items={TABS.map((k) => ({ href: `${base}?tab=${k}`, label: j.tabs[k], active: k === tab, count: counts[k] }))} />
        <Panel fill banner icon={Send} className="mt-4" title={j.tabs[tab]} description={fmt(j.jobsCount, { n: rows.length })}>
          {rows.length === 0 ? (
            <p className="text-muted-foreground px-4 py-14 text-center text-sm">{j.empty}</p>
          ) : (
            <div className="table-scroll">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="text-left text-xs">
                    <th className="px-5 py-2.5">{j.job}</th>
                    <th className="px-3 py-2.5">{j.region}</th>
                    <th className="px-3 py-2.5">{j.stops}</th>
                    <th className="px-3 py-2.5">{j.driver}</th>
                    <th className="px-3 py-2.5">{t.shipments.state}</th>
                    <th className="px-3 py-2.5 text-right">{j.payout}</th>
                    <th className="px-5 py-2.5 text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map(({ j: job, driver, driverPhone, stops, delivered, failed, waybills }) => (
                    <tr key={job.id} className="hover:bg-muted/40 align-top">
                      <td className="px-5 py-3">
                        <div className="font-mono text-[13px] font-medium">{job.ref}</div>
                        <div className="text-muted-foreground text-xs">
                          {j.kinds[job.kind]} · {dateTime(job.createdAt, locale)}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div>{job.region}</div>
                        <div className="text-muted-foreground max-w-[200px] truncate text-xs" title={job.pickup.address}>
                          {job.pickup.name}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="tabular">{fmt(j.progress, { done: delivered + failed, n: stops })}</div>
                        <div className="text-muted-foreground max-w-[220px] truncate font-mono text-[11px]" title={waybills.join(", ")}>
                          {waybills.join(", ")}
                        </div>
                      </td>
                      <td className="px-3 py-3">{driver ? <><div>{driver}</div><div className="text-muted-foreground font-mono text-xs">{driverPhone}</div></> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-3">
                        <span className="bg-muted border-border inline-flex rounded-full border px-2 py-0.5 text-xs font-medium">{j.statuses[job.status] ?? job.status}</span>
                        {job.status === "in_progress" && job.phase && <div className="text-muted-foreground mt-1 text-xs">{j.phases[job.phase] ?? job.phase}</div>}
                        {job.cancelReason && <div className="text-muted-foreground mt-1 max-w-[180px] truncate text-xs" title={job.cancelReason}>{job.cancelReason}</div>}
                      </td>
                      <td className="tabular px-3 py-3 text-right font-medium">{money(job.payout, locale)}</td>
                      <td className="px-5 py-2 text-right">{(job.status === "open" || job.status === "assigned") && <CancelJobButton id={job.id} jobRef={job.ref} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </DashboardBody>
    </DashboardLayout>
  );
}
