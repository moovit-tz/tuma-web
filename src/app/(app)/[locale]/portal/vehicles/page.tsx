import Link from "next/link";
import { CircleCheck, FileWarning, Route, Search, Truck, Wrench, X } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { listVehicles } from "@/server/services/partner";
import { branchOptions, effectiveBranch } from "@/server/services/branches";
import { BranchFilter } from "@/components/partner/branch-filter";
import { fmt, getDict } from "@/i18n";
import { dateOnly, nowMs, num } from "@/lib/format";
import { BannerLink, PageTabs, Pager, Panel, Stat } from "@/components/shell/page-header";
import { VehicleDialog } from "@/components/partner/vehicle-dialog";
import { VehicleCard, VehicleStatus, docState, docsDue, loadPct, type VehicleRow } from "@/components/partner/vehicle-card";
import { DashboardBody, DashboardLayout } from "@/components/dashboards/layout";
import { cn } from "@/lib/utils";

export const instant = false;

type Tab = "overview" | "all";
const FILTERS = [undefined, "available", "on_trip", "maintenance", "expired"] as const;
const PAGE_SIZE = 12;

/**
 * Vehicles: one page with two tabs. Overview is laid out like the dashboard (fleet figures, loads on board, documents
 * coming due); All vehicles is the card grid with status filters, search and paging. The branch carries across both.
 */
export default async function VehiclesPage({ params, searchParams }: PageProps<"/[locale]/portal/vehicles">) {
  const { locale } = await params;
  const sp = await searchParams;
  const one = (x: string | string[] | undefined) => (Array.isArray(x) ? x[0] : x) || undefined;
  const status = one(sp.status);
  // Older links (search, dashboard) carry only ?status=; they belong to the list.
  const tab: Tab = one(sp.tab) === "all" || status ? "all" : "overview";
  const q = one(sp.q)?.trim();
  const user = (await getCurrentUser())!;
  const t = getDict(locale);
  const v = t.partner.vehicles;
  const branch = await effectiveBranch(user, one(sp.branch) ?? null);
  const [all, branches] = await Promise.all([listVehicles(user, branch), branchOptions(user)]);
  const branchOpts = branches.map((b) => [b.id, `${b.code} · ${b.name}`] as [string, string]);
  const canManage = user.permissions.has("partner.vehicles.manage");
  const now = nowMs();

  const base = `/${locale}/portal/vehicles`;
  const href = (o: { tab?: Tab; status?: string | null; q?: string | null; page?: number }) => {
    const u = new URLSearchParams();
    const to = o.tab ?? tab;
    if (to === "all") u.set("tab", "all");
    if (branch && !user.branchId) u.set("branch", branch);
    if (to === "all") {
      const st = o.status === undefined ? status : o.status;
      if (st) u.set("status", st);
      const qq = o.q === undefined ? q : o.q;
      if (qq) u.set("q", qq);
      if (o.page && o.page > 1) u.set("page", String(o.page));
    }
    const s = u.toString();
    return s ? `${base}?${s}` : base;
  };
  const match = (f: string | undefined) => (row: VehicleRow) => (!f ? true : f === "expired" ? docsDue(row, now) : row.v.status === f);
  const count = (f: string | undefined) => all.filter(match(f)).length;
  const branchName = branches.find((b) => b.id === branch)?.name;

  return (
    <DashboardLayout>
      <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-[26px] leading-tight font-bold tracking-[-0.02em]">{v.title}</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">{[branchName ?? (branches.length > 1 ? t.branches.all : null), fmt(v.fleetSize, { n: all.length })].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BranchFilter options={branches} value={branch} locked={Boolean(user.branchId)} />
          {canManage && <VehicleDialog branches={branchOpts} initial={branch ? { kind: "truck", status: "available", branchId: branch } : undefined} />}
        </div>
      </div>

      <PageTabs
        className="mb-0 shrink-0 lg:static"
        label={v.title}
        items={[
          { href: href({ tab: "overview" }), label: v.overview, active: tab === "overview" },
          { href: href({ tab: "all", status: null, q: null }), label: v.allTitle, active: tab === "all", count: all.length },
        ]}
      />

      {tab === "overview" ? (
        <Overview rows={all} locale={locale} now={now} href={href} count={count} />
      ) : (
        <AllVehicles rows={all.filter(match(status))} locale={locale} now={now} href={href} count={count} status={status} q={q} branch={branch && !user.branchId ? branch : undefined} canManage={canManage} branchOpts={branchOpts} pageNo={Number(one(sp.page) ?? 1) || 1} base={base} />
      )}
    </DashboardLayout>
  );
}

type Href = (o: { tab?: Tab; status?: string | null; q?: string | null; page?: number }) => string;

function Overview({ rows, locale, now, href, count }: { rows: VehicleRow[]; locale: string; now: number; href: Href; count: (f: string | undefined) => number }) {
  const t = getDict(locale);
  const v = t.partner.vehicles;
  const list = (status?: string) => href({ tab: "all", status: status ?? null, q: null });
  const loaded = rows.filter((r) => Number(r.loadCount) > 0).sort((a, b) => loadPct(b) - loadPct(a) || a.v.plate.localeCompare(b.v.plate));
  const due = rows
    .flatMap((r) =>
      (
        [
          [v.insurance, r.v.insuranceExpiry],
          [v.inspection, r.v.inspectionExpiry],
        ] as const
      ).flatMap(([doc, d]) => {
        const s = docState(d, now);
        return d && (s === "expired" || s === "soon") ? [{ row: r, doc, d, s }] : [];
      }),
    )
    .sort((a, b) => a.d.getTime() - b.d.getTime());
  const docsN = count("expired");

  return (
    <>
      <div className="grid shrink-0 grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={CircleCheck} label={v.statuses.available} value={num(count("available"), locale)} hint={v.availableHint} href={list("available")} />
        <Stat icon={Route} label={v.statuses.on_trip} value={num(count("on_trip"), locale)} hint={v.onTripHint} href={list("on_trip")} />
        <Stat icon={Wrench} label={v.statuses.maintenance} value={num(count("maintenance"), locale)} hint={v.maintenanceHint} href={list("maintenance")} />
        <Stat icon={FileWarning} label={v.docsDue} value={num(docsN, locale)} hint={v.docsDueHint} tone={docsN ? "warn" : undefined} href={list("expired")} />
      </div>

      <DashboardBody className="xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Panel fill banner icon={Truck} title={v.onRoad} description={t.dashboard.asOfNow} action={<BannerLink href={list()}>{t.dashboard.viewAll}</BannerLink>}>
          {loaded.length === 0 ? (
            <p className="text-muted-foreground px-4 py-14 text-center text-sm">{v.onRoadEmpty}</p>
          ) : (
            <div className="table-scroll">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[26%]" />
                  <col />
                  <col className="w-[28%]" />
                  <col className="w-[22%]" />
                </colgroup>
                <thead>
                  <tr className="text-left text-xs">
                    <th className="px-5">{v.plate}</th>
                    <th className="px-3">{v.driver}</th>
                    <th className="px-3">{v.load}</th>
                    <th className="px-5">{v.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loaded.map((r) => {
                    const pct = loadPct(r);
                    return (
                      <tr key={r.v.id} className="hover:bg-muted/40">
                        <td className="truncate px-5 py-3">
                          <span className="font-mono text-[13px] font-medium">{r.v.plate}</span>
                          {r.branchCode && <span className="text-muted-foreground ml-2 font-mono text-[11px]">{r.branchCode}</span>}
                        </td>
                        <td className="truncate px-3 py-3">{r.v.driverName ?? <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="bg-sunken h-1.5 flex-1 overflow-hidden rounded-full">
                              <span className={cn("block h-full rounded-full", pct > 90 ? "bg-parcel" : "bg-primary")} style={{ width: `${pct}%` }} />
                            </span>
                            <span className="tabular w-9 text-right text-xs font-medium">{pct}%</span>
                          </div>
                        </td>
                        <td className="truncate px-5 py-3">
                          <VehicleStatus status={r.v.status} locale={locale} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel fill banner icon={FileWarning} title={v.docsDue} description={v.docsDueHint} action={<BannerLink href={list("expired")}>{t.dashboard.viewAll}</BannerLink>}>
          {due.length === 0 ? (
            <p className="text-muted-foreground px-4 py-14 text-center text-sm">{v.allValid}</p>
          ) : (
            <div className="table-scroll">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[30%]" />
                  <col />
                  <col className="w-[34%]" />
                </colgroup>
                <thead>
                  <tr className="text-left text-xs">
                    <th className="px-5">{v.plate}</th>
                    <th className="px-3">{v.document}</th>
                    <th className="px-5 text-right">{v.due}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {due.map(({ row, doc, d, s }) => (
                    <tr key={row.v.id + doc} className="hover:bg-muted/40">
                      <td className="truncate px-5 py-3 font-mono text-[13px] font-medium">{row.v.plate}</td>
                      <td className="truncate px-3 py-3">{doc}</td>
                      <td className={cn("truncate px-5 py-3 text-right font-medium", s === "expired" ? "text-destructive" : "text-warn")} title={s === "expired" ? v.expired : v.expiresSoon}>
                        {dateOnly(d, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </DashboardBody>
    </>
  );
}

function AllVehicles({
  rows,
  locale,
  now,
  href,
  count,
  status,
  q,
  branch,
  canManage,
  branchOpts,
  pageNo,
  base,
}: {
  rows: VehicleRow[];
  locale: string;
  now: number;
  href: Href;
  count: (f: string | undefined) => number;
  status?: string;
  q?: string;
  branch?: string;
  canManage: boolean;
  branchOpts: [string, string][];
  pageNo: number;
  base: string;
}) {
  const t = getDict(locale);
  const v = t.partner.vehicles;
  const needle = q?.toLowerCase();
  const found = needle ? rows.filter((r) => [r.v.plate, r.v.driverName, r.v.make, r.branchCode].some((x) => x?.toLowerCase().includes(needle))) : rows;
  const pages = Math.max(1, Math.ceil(found.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, pageNo), pages);
  const shown = found.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const label = (f: (typeof FILTERS)[number]) => (!f ? t.common.all : f === "expired" ? v.docsDue : v.statuses[f]);

  return (
    <DashboardBody className="lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label={v.allTitle} className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {FILTERS.map((f) => {
            const active = f === status;
            return (
              <Link
                key={f ?? "all"}
                href={href({ status: f ?? null })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-[13px] font-medium whitespace-nowrap outline-none focus-visible:ring-2",
                  active ? "bg-sidebar border-sidebar text-white" : "bg-card hover:bg-muted",
                )}
              >
                {label(f)}
                <span className={cn("tabular rounded-full px-1.5 text-[11px] leading-[18px]", active ? "bg-brand-red text-black" : "bg-muted text-muted-foreground")}>{num(count(f), locale)}</span>
              </Link>
            );
          })}
        </nav>
        <form action={base} className="relative w-full sm:w-72">
          <input type="hidden" name="tab" value="all" />
          {branch && <input type="hidden" name="branch" value={branch} />}
          {status && <input type="hidden" name="status" value={status} />}
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden />
          <input name="q" defaultValue={q} placeholder={v.search} aria-label={t.common.search} className="bg-card h-9 w-full rounded-md border pr-3 pl-9 text-sm outline-none focus-visible:ring-2" />
        </form>
      </div>

      <Panel
        fill
        banner
        icon={Truck}
        title={label(status as (typeof FILTERS)[number])}
        description={fmt(v.showing, { n: found.length })}
        action={
          q ? (
            <Link href={href({ q: null })} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-white/10 px-3 text-[13px] font-semibold text-white hover:bg-white/15">
              <X className="size-4" aria-hidden /> “{q}”
            </Link>
          ) : undefined
        }
        footer={<Pager page={page} pages={pages} total={found.length} size={PAGE_SIZE} hrefFor={(n) => href({ page: n })} labels={v.pager} />}
      >
        {shown.length === 0 ? (
          <p className="text-muted-foreground px-4 py-14 text-center text-sm">{q || status ? t.shipments.emptyHint : v.empty}</p>
        ) : (
          <ul className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((row) => (
              <VehicleCard key={row.v.id} row={row} locale={locale} now={now} canManage={canManage} branchOpts={branchOpts} />
            ))}
          </ul>
        )}
      </Panel>
    </DashboardBody>
  );
}
