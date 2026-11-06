import Link from "next/link";
import { CheckCircle2, Hourglass, PackageCheck, Truck, Wallet } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { listCargo, partnerDashboard } from "@/server/services/partner";
import { fmt, getDict } from "@/i18n";
import { money, num } from "@/lib/format";
import { rangeStart, type DashRange } from "@/domain/range";
import { BannerLink, Panel, Stat } from "@/components/shell/page-header";
import { RecentCargo } from "@/components/partner/recent-cargo";
import { BranchFilter } from "@/components/partner/branch-filter";
import { branchOptions, effectiveBranch } from "@/server/services/branches";
import { DashboardGreeting } from "./greeting";
import { DashboardBody, DashboardLayout, RangeFilter } from "./layout";
import { cn } from "@/lib/utils";

export async function PartnerOverview({ locale, range, branch: asked }: { locale: string; range: DashRange; branch: string | null }) {
  const user = (await getCurrentUser())!;
  const t = getDict(locale);
  const p = t.partner;
  const since = rangeStart(range);
  const branch = await effectiveBranch(user, asked);
  const [d, recent, branches] = await Promise.all([
    partnerDashboard(user, since, branch),
    listCargo(user, { view: "all", since, limit: 8, branchId: branch }),
    branchOptions(user),
  ]);
  const base = `/${locale}/portal`;
  const finance = user.permissions.has("partner.finance.manage");
  const period = t.dashboard.range[range];
  const branchQs = `${range !== "30d" ? `&range=${range}` : ""}${branch && !user.branchId ? `&branch=${branch}` : ""}`;

  const finRows = [
    { href: `${base}/invoices?tab=open`, label: p.dash.receivables, sub: fmt(p.dash.invoices, { n: d.receivables.invoices }), value: money(d.receivables.amount, locale), tone: "" },
    { href: `${base}/invoices?tab=overdue`, label: p.dash.overdue, sub: fmt(p.dash.invoices, { n: d.overdue.invoices }), value: money(d.overdue.amount, locale), tone: d.overdue.amount ? "text-parcel" : "" },
    { href: `${base}/payments`, label: p.dash.unmatched, sub: fmt(p.dash.payments, { n: d.unmatched.payments }), value: money(d.unmatched.amount, locale), tone: d.unmatched.payments ? "text-warn" : "" },
    { href: `${base}/invoices/new`, label: p.dash.uninvoiced, sub: null, value: num(d.uninvoiced, locale), tone: "" },
  ];

  return (
    <DashboardLayout>
      <DashboardGreeting name={user.name}>
        <BranchFilter options={branches} value={branch} locked={Boolean(user.branchId)} />
        <RangeFilter locale={locale} value={range} hrefFor={(r) => `${base}?range=${r}${branch && !user.branchId ? `&branch=${branch}` : ""}`} />
      </DashboardGreeting>

      <div className="grid shrink-0 grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={PackageCheck} label={p.dash.received} value={num(d.received, locale)} hint={p.dash.receivedHint} href={`${base}/cargo?tab=all&view=received${branchQs}`} />
        <Stat icon={Truck} label={p.dash.inTransit} value={num(d.inTransit, locale)} hint={p.dash.inTransitHint} href={`${base}/cargo?tab=all&view=transit${branchQs}`} />
        <Stat icon={Hourglass} label={p.dash.awaiting} value={num(d.awaiting, locale)} hint={p.dash.awaitingHint} href={`${base}/cargo?tab=all&view=expected${branchQs}`} />
        <Stat icon={CheckCircle2} label={p.dash.delivered30} value={num(d.delivered, locale)} hint={period} href={`${base}/cargo?tab=all&view=delivered${branchQs}`} />
      </div>

      <DashboardBody className="xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel fill banner icon={PackageCheck} title={p.dash.recent} description={period} action={<BannerLink href={`${base}/cargo?tab=all${branchQs}`}>{t.dashboard.viewAll}</BannerLink>}>
          <RecentCargo rows={recent} locale={locale} />
        </Panel>

        <div className="flex min-h-0 min-w-0 flex-col gap-5 [&>section:last-child]:flex-1">
          <Panel banner icon={Truck} title={p.dash.fleet} description={t.dashboard.asOfNow} action={<BannerLink href={`${base}/vehicles`}>{t.dashboard.viewAll}</BannerLink>} className="shrink-0">
            <dl className="grid grid-cols-3 divide-x">
              {(
                [
                  [p.dash.available, d.fleet.available, "text-ok", "available"],
                  [p.dash.onTrip, d.fleet.onTrip, "", "on_trip"],
                  [p.dash.maintenance, d.fleet.maintenance, "text-warn", "maintenance"],
                ] as const
              ).map(([label, n, tone, status]) => (
                <Link key={label} href={`${base}/vehicles?tab=all&status=${status}`} className="hover:bg-muted/50 flex flex-col-reverse items-center px-2 py-3 text-center">
                  <dt className="text-muted-foreground mt-0.5 text-xs">{label}</dt>
                  <dd className={cn("font-display tabular text-2xl font-semibold", tone)}>{n}</dd>
                </Link>
              ))}
            </dl>
          </Panel>

          {finance && (
            <Panel fill banner icon={Wallet} title={p.nav.finance} description={t.dashboard.asOfNow} action={<BannerLink href={`${base}/invoices`}>{t.dashboard.viewAll}</BannerLink>}>
              <dl className="grid h-full grid-cols-2 [&>*:nth-child(odd)]:border-r [&>*:nth-child(-n+2)]:border-b">
                {finRows.map((r) => (
                  <Link key={r.href} href={r.href} className="hover:bg-muted/50 flex min-w-0 flex-col justify-center px-4 py-3">
                    <dt className="text-muted-foreground truncate text-xs">{r.label}</dt>
                    <dd className={cn("font-display tabular mt-0.5 truncate text-lg font-semibold", r.tone)}>{r.value}</dd>
                    {r.sub && <dd className="text-muted-foreground truncate text-xs">{r.sub}</dd>}
                  </Link>
                ))}
              </dl>
            </Panel>
          )}
        </div>
      </DashboardBody>
    </DashboardLayout>
  );
}
