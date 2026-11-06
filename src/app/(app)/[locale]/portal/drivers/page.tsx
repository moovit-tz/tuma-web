import { UserRound } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { canManageDrivers, driverCounts, listDrivers } from "@/server/services/dispatch";
import { fmt, getDict } from "@/i18n";
import { nowMs, num, relative } from "@/lib/format";
import { TZ_REGIONS } from "@/domain/pricing";
import { PageTabs, Panel } from "@/components/shell/page-header";
import { DashboardBody, DashboardLayout } from "@/components/dashboards/layout";
import { AddDriverDialog } from "@/components/dispatch/driver-dialog";
import { DriverStatusButton } from "@/components/dispatch/driver-status";
import { NoAccess } from "@/components/shell/no-access";
import { cn } from "@/lib/utils";

export const instant = false;

const TABS = ["all", "pending", "approved", "online", "suspended"] as const;
type Tab = (typeof TABS)[number];

/** Tuma-X drivers: review registrations, add drivers, see who is online, suspend. */
export default async function DriversPage({ params, searchParams }: PageProps<"/[locale]/portal/drivers">) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  const t = getDict(locale);
  const d = t.drivers;
  if (!canManageDrivers(user)) return <NoAccess locale={locale} />;
  const tab = (TABS.includes(sp.tab as Tab) ? sp.tab : "all") as Tab;
  const [rows, counts] = await Promise.all([listDrivers(user, tab === "all" ? undefined : tab), driverCounts(user)]);
  const staff = user.permissions.has("drivers.manage");
  const base = `/${locale}/portal/drivers`;
  const now = nowMs();

  return (
    <DashboardLayout>
      <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-[26px] leading-tight font-bold tracking-[-0.02em]">{d.title}</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">{d.subtitle}</p>
        </div>
        <AddDriverDialog regions={[...TZ_REGIONS]} />
      </div>

      <DashboardBody className="lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-0">
        <PageTabs className="mb-0 lg:static" label={d.title} items={TABS.map((k) => ({ href: k === "all" ? base : `${base}?tab=${k}`, label: d.tabs[k], active: k === tab, count: counts[k] }))} />
        <Panel fill banner icon={UserRound} className="mt-4" title={d.tabs[tab]} description={fmt(t.dispatch.approvedDrivers, { n: counts.approved })}>
          {rows.length === 0 ? (
            <p className="text-muted-foreground px-4 py-14 text-center text-sm">{d.empty}</p>
          ) : (
            <div className="table-scroll">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="text-left text-xs">
                    <th className="px-5 py-2.5">{d.name}</th>
                    <th className="px-3 py-2.5">{d.vehicle}</th>
                    <th className="px-3 py-2.5">{d.region}</th>
                    {staff && <th className="px-3 py-2.5">{d.fleet}</th>}
                    <th className="px-3 py-2.5">{d.status}</th>
                    <th className="px-3 py-2.5">{d.online}</th>
                    <th className="px-3 py-2.5 text-right">{d.jobsDone}</th>
                    <th className="px-5 py-2.5 text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map(({ d: row, name, fleet, active, done }) => {
                    const live = row.online && row.status === "approved";
                    return (
                      <tr key={row.userId} className="hover:bg-muted/40">
                        <td className="px-5 py-3">
                          <div className="font-medium">{name || "—"}</div>
                          <div className="text-muted-foreground font-mono text-xs">{row.phone}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div>{d.vehicles[row.vehicleKind] ?? row.vehicleKind}</div>
                          <div className="text-muted-foreground font-mono text-xs">{row.plate || "—"}</div>
                        </td>
                        <td className="px-3 py-3">{row.region}</td>
                        {staff && <td className="px-3 py-3">{fleet ?? d.tumaPool}</td>}
                        <td className="px-3 py-3">
                          <span className="bg-muted border-border inline-flex rounded-full border px-2 py-0.5 text-xs font-medium">{d.statuses[row.status] ?? row.status}</span>
                          {active > 0 && <div className="text-muted-foreground mt-1 text-xs">{d.onJob}</div>}
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1.5">
                            <span aria-hidden className={cn("size-2 rounded-full", live ? "bg-ok" : "bg-muted-foreground/40")} />
                            {live ? d.online : d.offline}
                          </span>
                          {row.lastSeenAt && <div className="text-muted-foreground text-xs">{relative(row.lastSeenAt, locale, now)}</div>}
                        </td>
                        <td className="tabular px-3 py-3 text-right">{num(done, locale)}</td>
                        <td className="px-5 py-2 text-right">
                          <DriverStatusButton id={row.userId} status={row.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </DashboardBody>
    </DashboardLayout>
  );
}
