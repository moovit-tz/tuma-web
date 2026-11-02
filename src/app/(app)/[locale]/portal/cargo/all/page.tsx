import { Boxes, Search, X } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current-user";
import { pageCargo, partnerDashboard, vehicleOptions, type CargoView } from "@/server/services/partner";
import { branchOptions, effectiveBranch } from "@/server/services/branches";
import { fmt, getDict } from "@/i18n";
import { asRange, rangeStart, type DashRange } from "@/domain/range";
import { PageTabs, Pager, Panel } from "@/components/shell/page-header";
import { CargoTable } from "@/components/partner/cargo-table";
import { BranchFilter } from "@/components/partner/branch-filter";
import { DashboardBody, DashboardLayout, RangeFilter } from "@/components/dashboards/layout";

export const instant = false;

const VIEWS: CargoView[] = ["received", "transit", "expected", "delivered", "all"];

/** Every shipment the partner handles: view tabs with counts, search, branch and period, 25 to a page. */
export default async function AllCargoPage({ params, searchParams }: PageProps<"/[locale]/portal/cargo/all">) {
  const { locale } = await params;
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const view = (VIEWS.includes(one(sp.view) as CargoView) ? one(sp.view) : "all") as CargoView;
  const q = one(sp.q);
  const state = one(sp.state);
  const range = asRange(one(sp.range));
  const pageNo = Number(one(sp.page) ?? 1) || 1;
  const user = (await getCurrentUser())!;
  const t = getDict(locale);
  const p = t.partner;
  const since = rangeStart(range);
  const branch = await effectiveBranch(user, one(sp.branch));
  const [d, list, fleet, branches] = await Promise.all([
    partnerDashboard(user, since, branch),
    pageCargo(user, { view, q, state, since, branchId: branch, page: pageNo }),
    vehicleOptions(user),
    branchOptions(user),
  ]);

  const base = `/${locale}/portal/cargo/all`;
  const href = (o: { view?: CargoView; range?: DashRange; page?: number; state?: string | null }) => {
    const u = new URLSearchParams();
    u.set("view", o.view ?? view);
    const r = o.range ?? range;
    if (r !== "30d") u.set("range", r);
    if (branch && !user.branchId) u.set("branch", branch);
    if (q) u.set("q", q);
    const st = o.state === undefined ? state : o.state;
    if (st) u.set("state", st);
    if (o.page && o.page > 1) u.set("page", String(o.page));
    return `${base}?${u}`;
  };
  const counts: Record<CargoView, number> = {
    received: d.received,
    transit: d.inTransit,
    expected: d.awaiting,
    delivered: d.delivered,
    all: Object.values(d.states).reduce((a, n) => a + n, 0),
  };
  const period = t.dashboard.range[range];
  const branchName = branches.find((b) => b.id === branch)?.name;

  return (
    <DashboardLayout>
      <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-[26px] leading-tight font-bold tracking-[-0.02em]">{p.cargo.allTitle}</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">{[branchName ?? (branches.length > 1 ? t.branches.all : null), period].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BranchFilter options={branches} value={branch} locked={Boolean(user.branchId)} />
          <RangeFilter locale={locale} value={range} hrefFor={(r) => href({ range: r })} />
        </div>
      </div>

      <DashboardBody className="lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-0">
        <PageTabs
          className="mb-0 lg:static lg:shadow-none"
          label={p.cargo.allTitle}
          items={VIEWS.map((v) => ({ href: href({ view: v, state: null }), label: p.cargo.views[v], active: v === view && !state, count: counts[v] }))}
          aside={
            <form action={base} className="relative w-full sm:w-72">
              <input type="hidden" name="view" value={view} />
              {range !== "30d" && <input type="hidden" name="range" value={range} />}
              {branch && !user.branchId && <input type="hidden" name="branch" value={branch} />}
              {state && <input type="hidden" name="state" value={state} />}
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden />
              <input name="q" defaultValue={q} placeholder={p.cargo.search} aria-label={t.common.search} className="bg-card h-9 w-full rounded-md border pr-3 pl-9 text-sm outline-none" />
            </form>
          }
        />
        <Panel
          fill
          banner
          icon={Boxes}
          className="mt-4"
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
    </DashboardLayout>
  );
}
