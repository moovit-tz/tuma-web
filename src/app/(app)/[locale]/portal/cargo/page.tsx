import Link from "next/link";
import { Boxes, Building, CheckCircle2, Hourglass, PackageCheck, Search, Truck, X } from "lucide-react";
import { getCurrentUser, type CurrentUser } from "@/server/auth/current-user";
import { cargoByBranch, listCargo, pageCargo, partnerDashboard, vehicleOptions, type CargoView } from "@/server/services/partner";
import { branchOptions, effectiveBranch } from "@/server/services/branches";
import { fmt, getDict } from "@/i18n";
import { num } from "@/lib/format";
import { asRange, rangeStart, type DashRange } from "@/domain/range";
import { BannerLink, PageTabs, Pager, Panel, Stat } from "@/components/shell/page-header";
import { RecentCargo } from "@/components/partner/recent-cargo";
import { CargoTable } from "@/components/partner/cargo-table";
import { BranchFilter } from "@/components/partner/branch-filter";
import { StateBars } from "@/components/shipments/state-bars";
import { DashboardBody, DashboardLayout, RangeFilter } from "@/components/dashboards/layout";
import { cn } from "@/lib/utils";

export const instant = false;

const VIEWS: CargoView[] = ["received", "transit", "expected", "delivered", "all"];
type Tab = "overview" | "all";
type Dash = Awaited<ReturnType<typeof partnerDashboard>>;
type Branches = Awaited<ReturnType<typeof branchOptions>>;
type Ctx = { locale: string; user: CurrentUser; range: DashRange; since: Date | null; branch: string | null; branches: Branches; d: Dash; base: string };

/**
 * Cargo: one page with two tabs. Overview is laid out like the dashboard (figures, latest cargo, breakdown by branch or
 * status); All cargo is the paged list with view filters and search. Branch and period sit above both and carry across.
 */
export default async function CargoPage({ params, searchParams }: PageProps<"/[locale]/portal/cargo">) {
  const { locale } = await params;
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const tab: Tab = one(sp.tab) === "all" ? "all" : "overview";
  const range = asRange(one(sp.range));
  const user = (await getCurrentUser())!;
  const t = getDict(locale);
  const p = t.partner;
  const since = rangeStart(range);
  const branch = await effectiveBranch(user, one(sp.branch));
  const [d, branches] = await Promise.all([partnerDashboard(user, since, branch), branchOptions(user)]);

  const base = `/${locale}/portal/cargo`;
  const keep = (r: DashRange = range) => {
    const u = new URLSearchParams();
    if (r !== "30d") u.set("range", r);
    if (branch && !user.branchId) u.set("branch", branch);
    return u;
  };
  const tabHref = (to: Tab) => {
    const u = keep();
    if (to === "all") u.set("tab", "all");
    const s = u.toString();
    return s ? `${base}?${s}` : base;
  };
  const period = t.dashboard.range[range];
  const branchName = branches.find((b) => b.id === branch)?.name;
  const total = Object.values(d.states).reduce((a, n) => a + n, 0);
  const ctx: Ctx = { locale, user, range, since, branch, branches, d, base };

  return (
    <DashboardLayout>
      <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-[26px] leading-tight font-bold tracking-[-0.02em]">{p.cargo.title}</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">{[branchName ?? (branches.length > 1 ? t.branches.all : null), period].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BranchFilter options={branches} value={branch} locked={Boolean(user.branchId)} />
          <RangeFilter
            locale={locale}
            value={range}
            hrefFor={(r) => {
              const u = keep(r);
              if (tab === "all") {
                const cur = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
                for (const k of ["tab", "view", "q", "state"]) if (cur.get(k)) u.set(k, cur.get(k)!);
              }
              const s = u.toString();
              return s ? `${base}?${s}` : base;
            }}
          />
        </div>
      </div>

      <PageTabs
        className="mb-0 shrink-0 lg:static"
        label={p.cargo.title}
        items={[
          { href: tabHref("overview"), label: p.cargo.overview, active: tab === "overview" },
          { href: tabHref("all"), label: p.cargo.allTitle, active: tab === "all", count: total },
        ]}
      />

      {tab === "overview" ? (
        <Overview ctx={ctx} />
      ) : (
        <AllCargo ctx={ctx} view={(VIEWS.includes(one(sp.view) as CargoView) ? one(sp.view) : "all") as CargoView} q={one(sp.q)} state={one(sp.state)} pageNo={Number(one(sp.page) ?? 1) || 1} />
      )}
    </DashboardLayout>
  );
}

/** Link into the All cargo tab with the current branch and period. */
function allHref(ctx: Ctx, o: { view?: string; state?: string; branch?: string; q?: string; page?: number }) {
  const u = new URLSearchParams({ tab: "all" });
  if (o.view && o.view !== "all") u.set("view", o.view);
  if (ctx.range !== "30d") u.set("range", ctx.range);
  const br = o.branch ?? (ctx.branch && !ctx.user.branchId ? ctx.branch : undefined);
  if (br) u.set("branch", br);
  if (o.q) u.set("q", o.q);
  if (o.state) u.set("state", o.state);
  if (o.page && o.page > 1) u.set("page", String(o.page));
  return `${ctx.base}?${u}`;
}

async function Overview({ ctx }: { ctx: Ctx }) {
  const { locale, user, range, since, branch, branches, d, base } = ctx;
  const t = getDict(locale);
  const p = t.partner;
  const [recent, perBranch] = await Promise.all([listCargo(user, { view: "all", since, branchId: branch, limit: 8 }), cargoByBranch(user, since)]);
  const period = t.dashboard.range[range];
  const showBranches = !branch && perBranch.length > 1 && branches.length > 1;
  const totals = perBranch.reduce((a, r) => ({ received: a.received + r.received, transit: a.transit + r.transit, expected: a.expected + r.expected, delivered: a.delivered + r.delivered }), { received: 0, transit: 0, expected: 0, delivered: 0 });
  const all = (view: string) => allHref(ctx, { view });

  return (
    <>
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
                    const cell = (view: string, n: number, last = false) => (
                      <td className={last ? "px-5 text-right" : "px-3 text-right"}>
                        <Link href={allHref(ctx, { view, branch: r.id })} className="tabular font-medium underline-offset-4 hover:underline">
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
            <StateBars states={d.states} locale={locale} basePath={allHref(ctx, {})} />
          </Panel>
        )}
      </DashboardBody>
    </>
  );
}

async function AllCargo({ ctx, view, q, state, pageNo }: { ctx: Ctx; view: CargoView; q?: string; state?: string; pageNo: number }) {
  const { locale, user, range, since, branch, branches, d, base } = ctx;
  const t = getDict(locale);
  const p = t.partner;
  const [list, fleet] = await Promise.all([pageCargo(user, { view, q, state, since, branchId: branch, page: pageNo }), vehicleOptions(user)]);
  const counts: Record<CargoView, number> = {
    received: d.received,
    transit: d.inTransit,
    expected: d.awaiting,
    delivered: d.delivered,
    all: Object.values(d.states).reduce((a, n) => a + n, 0),
  };
  const href = (o: { view?: CargoView; page?: number; state?: string | null }) =>
    allHref(ctx, { view: o.view ?? view, q, state: (o.state === undefined ? state : o.state) ?? undefined, page: o.page });

  return (
    <DashboardBody className="lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label={p.cargo.allTitle} className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {VIEWS.map((v) => {
            const active = v === view && !state;
            return (
              <Link
                key={v}
                href={href({ view: v, state: null })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-[13px] font-medium whitespace-nowrap outline-none focus-visible:ring-2",
                  active ? "bg-sidebar border-sidebar text-white" : "bg-card hover:bg-muted",
                )}
              >
                {p.cargo.views[v]}
                <span className={cn("tabular rounded-full px-1.5 text-[11px] leading-[18px]", active ? "bg-brand-red text-white" : "bg-muted text-muted-foreground")}>{num(counts[v], locale)}</span>
              </Link>
            );
          })}
        </nav>
        <form action={base} className="relative w-full sm:w-72">
          <input type="hidden" name="tab" value="all" />
          {view !== "all" && <input type="hidden" name="view" value={view} />}
          {range !== "30d" && <input type="hidden" name="range" value={range} />}
          {branch && !user.branchId && <input type="hidden" name="branch" value={branch} />}
          {state && <input type="hidden" name="state" value={state} />}
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden />
          <input name="q" defaultValue={q} placeholder={p.cargo.search} aria-label={t.common.search} className="bg-card h-9 w-full rounded-md border pr-3 pl-9 text-sm outline-none focus-visible:ring-2" />
        </form>
      </div>

      <Panel
        fill
        banner
        icon={Boxes}
        title={state ? (t.states[state] ?? state) : p.cargo.views[view]}
        description={fmt(p.cargo.showing, { n: list.total })}
        action={
          state ? (
            <Link href={href({ state: null })} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-white/10 px-3 text-[13px] font-semibold text-white hover:bg-white/15">
              <X className="size-4" aria-hidden /> {t.common.all}
            </Link>
          ) : undefined
        }
        footer={<Pager page={list.page} pages={list.pages} total={list.total} size={list.size} hrefFor={(n) => href({ page: n })} labels={p.cargo.pager} />}
      >
        <CargoTable rows={list.rows} locale={locale} vehicles={fleet} canOperate={user.permissions.has("partner.cargo.operate")} showBranch={!branch && branches.length > 1} />
      </Panel>
    </DashboardBody>
  );
}
