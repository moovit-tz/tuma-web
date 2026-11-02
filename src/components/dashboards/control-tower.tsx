import { AlarmClock, CheckCircle2, PackageOpen, Package, TriangleAlert, Wallet } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { dashboardStats, listExceptions, listShipments } from "@/server/services/shipments";
import { getDict } from "@/i18n";
import { money, num, percent } from "@/lib/format";
import { BannerLink, Panel, Stat } from "@/components/shell/page-header";
import { DashboardGreeting } from "./greeting";
import { DashboardBody, DashboardLayout, RangeFilter } from "./layout";
import { rangeStart, type DashRange } from "@/domain/range";
import { StateBars } from "@/components/shipments/state-bars";
import { ShipmentTable } from "@/components/shipments/shipment-table";
import { ExceptionList } from "@/components/shipments/exception-list";

/** Control tower v1 — FR-OPS-01. */
export async function ControlTowerDashboard({ locale, range }: { locale: string; range: DashRange }) {
  const user = (await getCurrentUser())!;
  const t = getDict(locale);
  const canExceptions = user.permissions.has("exception.manage");
  const [stats, atRisk, exc] = await Promise.all([
    dashboardStats(user, rangeStart(range)),
    listShipments(user, { atRisk: true, limit: 10 }),
    canExceptions ? listExceptions("open") : Promise.resolve([]),
  ]);
  const base = `/${locale}/portal/shipments`;
  const period = t.dashboard.range[range];
  return (
    <DashboardLayout>
      <DashboardGreeting name={user.name} eyebrow={t.console.title}>
        <RangeFilter locale={locale} value={range} />
      </DashboardGreeting>
      <div className="grid shrink-0 grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat icon={Package} label={t.dashboard.open} value={num(stats.open, locale)} hint={period} href={`${base}?state=OPEN`} />
        <Stat icon={AlarmClock} label={t.dashboard.atRisk} value={num(stats.atRisk, locale)} tone={stats.atRisk ? "bad" : undefined} hint={t.dashboard.asOfNow} href={`${base}?risk=1`} />
        <Stat icon={TriangleAlert} label={t.dashboard.exceptions} value={num(stats.openExceptions, locale)} tone={stats.openExceptions ? "warn" : undefined} hint={t.dashboard.asOfNow} href={canExceptions ? `/${locale}/portal/exceptions` : undefined} />
        <Stat icon={PackageOpen} label={t.console.unassigned} value={num(stats.states.AWAITING_HANDOVER ?? 0, locale)} hint={period} href={`${base}?state=AWAITING_HANDOVER`} />
        <Stat icon={CheckCircle2} label={t.dashboard.onTime} value={percent(stats.onTimeRate, locale)} hint={`${period} · n = ${num(stats.delivered, locale)}`} />
        <Stat icon={Wallet} label={t.console.cashHeld} value={money(stats.codHeld, locale)} hint={t.dashboard.asOfNow} />
      </div>
      <DashboardBody className="xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-h-0 flex-col gap-5">
          <Panel fill banner icon={AlarmClock} title={t.dashboard.atRisk} description={t.dashboard.atRiskHint} action={<BannerLink href={`${base}?risk=1`}>{t.dashboard.viewAll}</BannerLink>} className="lg:flex-1 lg:basis-0">
            <ShipmentTable rows={atRisk.items} locale={locale} basePath={base} showAccount />
          </Panel>
          {canExceptions && (
            <Panel fill banner icon={TriangleAlert} title={t.console.exceptionsTitle} action={<BannerLink href={`/${locale}/portal/exceptions`}>{t.dashboard.viewAll}</BannerLink>} className="lg:flex-1 lg:basis-0">
              <ExceptionList rows={exc.slice(0, 8)} locale={locale} />
            </Panel>
          )}
        </div>
        <Panel fill banner icon={Package} title={t.dashboard.byState} description={period}>
          <StateBars states={stats.states} locale={locale} basePath={base} />
        </Panel>
      </DashboardBody>
    </DashboardLayout>
  );
}

/** See the area layout: authenticated pages render per request. */
export const instant = false;
