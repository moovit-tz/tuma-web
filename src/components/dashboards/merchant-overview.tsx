import Link from "next/link";
import { AlarmClock, CheckCircle2, Package, PackagePlus, Wallet } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { dashboardStats, listShipments } from "@/server/services/shipments";
import { getDict } from "@/i18n";
import { money, num, percent } from "@/lib/format";
import { BannerLink, Panel, Stat } from "@/components/shell/page-header";
import { DashboardGreeting } from "./greeting";
import { DashboardBody, DashboardLayout, RangeFilter } from "./layout";
import { rangeStart, type DashRange } from "@/domain/range";
import { StateBars } from "@/components/shipments/state-bars";
import { ShipmentTable } from "@/components/shipments/shipment-table";
import { Button } from "@/components/ui/button";

export async function MerchantOverview({ locale, range }: { locale: string; range: DashRange }) {
  const user = (await getCurrentUser())!;
  const t = getDict(locale);
  const [stats, recent] = await Promise.all([dashboardStats(user, rangeStart(range)), listShipments(user, { limit: 12 })]);
  const base = `/${locale}/portal/shipments`;
  const period = t.dashboard.range[range];
  return (
    <DashboardLayout>
      <DashboardGreeting name={user.name}>
        <RangeFilter locale={locale} value={range} />
        {user.permissions.has("shipment.create") && (
          <Button asChild className="h-10">
            <Link href={`${base}/new`}>
              <PackagePlus /> {t.nav.newShipment}
            </Link>
          </Button>
        )}
      </DashboardGreeting>
      <div className="grid shrink-0 grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Package} label={t.dashboard.open} value={num(stats.open, locale)} hint={period} href={`${base}?state=OPEN`} />
        <Stat icon={AlarmClock} label={t.dashboard.atRisk} value={num(stats.atRisk, locale)} hint={t.dashboard.atRiskHint} tone={stats.atRisk ? "warn" : undefined} href={`${base}?risk=1`} />
        <Stat icon={CheckCircle2} label={t.dashboard.onTime} value={percent(stats.onTimeRate, locale)} hint={`${period} · n = ${num(stats.delivered, locale)}`} />
        <Stat icon={Wallet} label={t.dashboard.codHeld} value={money(stats.codHeld, locale)} hint={`${num(stats.codHeldCount, locale)} ${t.shipments.title.toLowerCase()}`} />
      </div>
      <DashboardBody className="xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel fill banner icon={Package} title={t.dashboard.recent} description={t.dashboard.freshness} action={<BannerLink href={base}>{t.dashboard.viewAll}</BannerLink>}>
          <ShipmentTable rows={recent.items} locale={locale} basePath={base} />
        </Panel>
        <Panel fill banner icon={Package} title={t.dashboard.byState} description={period}>
          <StateBars states={stats.states} locale={locale} basePath={base} />
        </Panel>
      </DashboardBody>
    </DashboardLayout>
  );
}

/** See the area layout: authenticated pages render per request. */
export const instant = false;
