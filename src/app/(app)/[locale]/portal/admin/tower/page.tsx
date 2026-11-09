import Link from "next/link";
import { Banknote, Bike, Clock, Package, RadioTower, TriangleAlert } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { towerView } from "@/server/services/admin/tower";
import { fmt, getDict } from "@/i18n";
import { dateTime, money, num } from "@/lib/format";
import { PageHeader, Panel, Stat } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { EmptyState } from "@/components/shell/empty-state";
import { Badge } from "@/components/ui/badge";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { TowerMap } from "@/components/admin/tower-map";

export const instant = false;

/** Live operations: KPIs, the map, parcels at risk of missing their step's target, and the picture by region. */
export default async function TowerPage({ params }: PageProps<"/[locale]/portal/admin/tower">) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("tower.view")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const w = t.admin.tower;
  const v = await towerView(user);
  const k = v.kpis;
  const hours = (n: number) => fmt(w.hours, { n: num(n, locale) });
  const positioned = v.risk.filter((r): r is typeof r & { lat: number; lng: number } => r.lat != null && r.lng != null);
  return (
    <>
      <PageHeader title={w.title} description={w.sub} icon={RadioTower}>
        <AutoRefresh label={w.refresh} />
      </PageHeader>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Stat label={w.inFlight} value={num(k.inFlight, locale)} hint={w.inFlightHint} icon={Package} />
        <Stat label={w.late} value={num(k.late, locale)} hint={w.lateHint} tone={k.late ? "bad" : undefined} icon={Clock} />
        <Stat label={w.atRisk} value={num(k.atRisk, locale)} hint={w.atRiskHint} tone={k.atRisk ? "warn" : undefined} icon={Clock} />
        <Stat
          label={w.exceptions}
          value={num(k.openExceptions, locale)}
          hint={fmt(w.exceptionsHint, { n: k.overdueExceptions })}
          tone={k.overdueExceptions ? "bad" : undefined}
          href={user.permissions.has("exception.manage") ? `/${locale}/portal/exceptions` : undefined}
          icon={TriangleAlert}
        />
        <Stat label={w.couriers} value={num(k.couriersOnline, locale)} hint={w.couriersHint} icon={Bike} />
        <Stat label={w.cash} value={money(k.cashHeld, locale)} hint={fmt(w.cashHint, { n: k.cashParcels })} icon={Banknote} />
      </div>
      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title={w.map} action={<span className="text-muted-foreground text-xs">{w.mapSub}</span>}>
          <TowerMap
            couriers={v.couriers}
            parcels={positioned}
            label={w.map}
            legend={{ courier: w.legendCourier, risk: w.legendRisk, late: w.legendLate }}
          />
          {v.couriers.length === 0 && positioned.length === 0 && <p className="text-muted-foreground border-t px-4 py-3 text-xs">{w.noPositions}</p>}
        </Panel>
        <Panel title={w.regions}>
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground h-10 border-b text-left text-xs">
                  <th className="px-4 font-medium">{w.region}</th>
                  <th className="px-3 text-right font-medium">{w.live}</th>
                  <th className="px-3 text-right font-medium">{w.late}</th>
                  <th className="px-4 text-right font-medium">{w.exception}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {v.regions.map((r) => (
                  <tr key={r.region}>
                    <td className="px-4 py-2">{r.region}</td>
                    <td className="tabular px-3 py-2 text-right">{r.live}</td>
                    <td className={`tabular px-3 py-2 text-right ${r.late ? "text-brand-ink font-semibold" : ""}`}>{r.late}</td>
                    <td className="tabular px-4 py-2 text-right">{r.exceptions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
      <Panel title={w.risk} action={<span className="text-muted-foreground hidden text-xs sm:inline">{w.riskSub}</span>}>
        {v.risk.length === 0 ? (
          <EmptyState compact icon={Clock} title={w.emptyRisk.title} body={w.emptyRisk.body} />
        ) : (
          <div className="table-scroll">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-muted-foreground h-10 border-b text-left text-xs">
                  <th className="px-4 font-medium">{w.waybill}</th>
                  <th className="px-3 font-medium">{w.state}</th>
                  <th className="px-3 font-medium">{w.region}</th>
                  <th className="px-3 text-right font-medium">{w.inState}</th>
                  <th className="px-3 text-right font-medium">{w.target}</th>
                  <th className="px-3 font-medium">{w.promised}</th>
                  <th className="px-4 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {v.risk.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/40">
                    <td className="px-4 py-2.5">
                      <Link href={`/${locale}/portal/shipments/${r.waybill}`} prefetch={false} className="font-mono text-[13px] font-medium underline-offset-4 hover:underline">
                        {r.waybill}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">{t.states[r.state as keyof typeof t.states] ?? r.state}</td>
                    <td className="px-3 py-2.5">{r.region ?? "—"}</td>
                    <td className="tabular px-3 py-2.5 text-right">{hours(r.ageHours)}</td>
                    <td className="tabular text-muted-foreground px-3 py-2.5 text-right">{hours(r.targetHours)}</td>
                    <td className="text-muted-foreground px-3 py-2.5 text-xs whitespace-nowrap">{r.promisedAt ? dateTime(r.promisedAt, locale) : "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1.5">
                        {r.exception && <Badge variant="outline">{w.exception}</Badge>}
                        <Badge variant={r.level === "late" ? "destructive" : "secondary"}>{w.level[r.level]}</Badge>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
