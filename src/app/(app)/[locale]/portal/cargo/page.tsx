import Link from "next/link";
import { Building, CheckCircle2, Hourglass, PackageCheck, Truck } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { cargoByBranch, listCargo, partnerDashboard } from "@/server/services/partner";
import { branchOptions, effectiveBranch } from "@/server/services/branches";
import { getDict } from "@/i18n";
import { num } from "@/lib/format";
import { asRange, rangeStart } from "@/domain/range";
import { BannerLink, Panel, Stat } from "@/components/shell/page-header";
import { RecentCargo } from "@/components/partner/recent-cargo";
import { BranchFilter } from "@/components/partner/branch-filter";
import { StateBars } from "@/components/shipments/state-bars";
import { DashboardBody, DashboardLayout, RangeFilter } from "@/components/dashboards/layout";

export const instant = false;

/**
 * Cargo overview, laid out like the dashboard: branch and period at the top, the four figures, the latest cargo, and
 * a breakdown by branch (company-wide view) or by status (one branch). Every figure opens the matching All cargo list.
 */
export default async function CargoOverviewPage({ params, searchParams }: PageProps<"/[locale]/portal/cargo">) {
  const { locale } = await params;
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const range = asRange(one(sp.range));
  const user = (await getCurrentUser())!;
  const t = getDict(locale);
  const p = t.partner;
  const since = rangeStart(range);
  const branch = await effectiveBranch(user, one(sp.branch));
  const [d, recent, branches, perBranch] = await Promise.all([
    partnerDashboard(user, since, branch),
    listCargo(user, { view: "all", since, branchId: branch, limit: 8 }),
    branchOptions(user),
    cargoByBranch(user, since),
  ]);

  const base = `/${locale}/portal/cargo`;
  const keep = `${range !== "30d" ? `&range=${range}` : ""}${branch && !user.branchId ? `&branch=${branch}` : ""}`;
  const all = (view: string, extra = "") => `${base}/all?view=${view}${keep}${extra}`;
  const period = t.dashboard.range[range];
  const branchName = branches.find((b) => b.id === branch)?.name;
  const showBranches = !branch && perBranch.length > 1;
  const totals = perBranch.reduce((a, r) => ({ received: a.received + r.received, transit: a.transit + r.transit, expected: a.expected + r.expected, delivered: a.delivered + r.delivered }), { received: 0, transit: 0, expected: 0, delivered: 0 });

  return (
    <DashboardLayout>
      <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-[26px] leading-tight font-bold tracking-[-0.02em]">{p.cargo.title}</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">{[branchName ?? (branches.length > 1 ? t.branches.all : null), period].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BranchFilter options={branches} value={branch} locked={Boolean(user.branchId)} />
          <RangeFilter locale={locale} value={range} hrefFor={(r) => `${base}?range=${r}${branch && !user.branchId ? `&branch=${branch}` : ""}`} />
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={PackageCheck} label={p.dash.received} value={num(d.received, locale)} hint={p.dash.receivedHint} href={all("received")} />
        <Stat icon={Truck} label={p.dash.inTransit} value={num(d.inTransit, locale)} hint={p.dash.inTransitHint} href={all("transit")} />
        <Stat icon={Hourglass} label={p.dash.awaiting} value={num(d.awaiting, locale)} hint={p.dash.awaitingHint} href={all("expected")} />
        <Stat icon={CheckCircle2} label={p.dash.delivered30} value={num(d.delivered, locale)} hint={period} href={all("delivered")} />
      </div>

      <DashboardBody className="xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel fill banner icon={PackageCheck} title={p.cargo.latest} description={period} action={<BannerLink href={all("all")}>{t.dashboard.viewAll}</BannerLink>}>
          <RecentCargo rows={recent} locale={locale} />
        </Panel>

        {showBranches ? (
          <Panel fill banner icon={Building} title={p.cargo.byBranch} description={period} action={<BannerLink href={`/${locale}/portal/branches`}>{t.branches.title}</BannerLink>}>
            <div className="table-scroll">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col />
                  <col className="w-[16%]" />
                  <col className="w-[16%]" />
                  <col className="w-[16%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead>
                  <tr className="text-left text-xs">
                    <th className="px-5">{t.branches.branch}</th>
                    <th className="px-3 text-right">{p.cargo.views.received}</th>
                    <th className="px-3 text-right">{p.cargo.views.transit}</th>
                    <th className="px-3 text-right">{p.cargo.views.expected}</th>
                    <th className="px-5 text-right">{p.cargo.views.delivered}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {perBranch.map((r) => {
                    const at = (view: string) => `${base}/all?view=${view}${range !== "30d" ? `&range=${range}` : ""}&branch=${r.id}`;
                    const cell = (view: string, n: number, last = false) => (
                      <td className={last ? "px-5 text-right" : "px-3 text-right"}>
                        <Link href={at(view)} className="tabular font-medium underline-offset-4 hover:underline">
                          {num(n, locale)}
                        </Link>
                      </td>
                    );
                    return (
                      <tr key={r.id} className="hover:bg-muted/40">
                        <td className="truncate px-5 py-3">
                          <Link href={`${base}?branch=${r.id}${range !== "30d" ? `&range=${range}` : ""}`} className="font-medium underline-offset-4 hover:underline">
                            {r.name}
                          </Link>
                          <span className="text-muted-foreground ml-2 font-mono text-[11px]">{r.code}</span>
                        </td>
                        {cell("received", r.received)}
                        {cell("transit", r.transit)}
                        {cell("expected", r.expected)}
                        {cell("delivered", r.delivered, true)}
                      </tr>
                    );
                  })}
                  <tr className="bg-muted/50 font-semibold">
                    <td className="px-5 py-3">{t.common.all}</td>
                    <td className="tabular px-3 text-right">{num(totals.received, locale)}</td>
                    <td className="tabular px-3 text-right">{num(totals.transit, locale)}</td>
                    <td className="tabular px-3 text-right">{num(totals.expected, locale)}</td>
                    <td className="tabular px-5 text-right">{num(totals.delivered, locale)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>
        ) : (
          <Panel fill banner icon={Truck} title={p.cargo.byState} description={period} action={<BannerLink href={all("all")}>{t.dashboard.viewAll}</BannerLink>}>
            <StateBars states={d.states} locale={locale} basePath={`${base}/all`} />
          </Panel>
        )}
      </DashboardBody>
    </DashboardLayout>
  );
}
