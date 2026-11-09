import Link from "next/link";
import { CheckCheck, FileDown, Inbox, PackageOpen, Plus, Search, SearchX, Truck, Boxes, Hourglass, type LucideIcon } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { AGENT_VIEWS, agentParcels, agentSummary, type AgentView } from "@/server/services/agent-parcels";
import { fmt, getDict } from "@/i18n";
import { money, relative } from "@/lib/format";
import { PageHeader, PageTabs, Panel } from "@/components/shell/page-header";
import { StateBadge } from "@/components/shipments/state-badge";
import { NoAccess } from "@/components/shell/no-access";
import { DataTable } from "@/components/shell/data-table";
import { EmptyState } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const instant = false;

const LIMIT = 100;

/** The desk's tabs (the app also has a hand-over list). */
type DeskView = Exclude<AgentView, "to_hand_over">;
const DESK_VIEWS = AGENT_VIEWS.filter((v): v is DeskView => v !== "to_hand_over");

const VIEW_ICON: Record<DeskView, LucideIcon> = { expected: Hourglass, in_hand: PackageOpen, on_the_way: Truck, done: CheckCheck, all: Inbox };

/**
 * The parcels desk: the office's parcels by where they are (Expected, In hand, On the way, Done, All), the same stages
 * as the app, with a search by waybill, name or phone. Each row opens the parcel and its next step.
 */
export default async function ParcelsDesk({ params, searchParams }: PageProps<"/[locale]/portal/parcels">) {
  const { locale } = await params;
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("agent.workspace")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const a = t.agent;
  const view = (DESK_VIEWS as readonly string[]).includes(one(sp.view) ?? "") ? (one(sp.view) as DeskView) : "in_hand";
  const q = one(sp.q)?.trim().slice(0, 80);
  const [s, list] = await Promise.all([agentSummary(user), agentParcels(user, { view, q, limit: LIMIT })]);
  const base = `/${locale}/portal/parcels`;
  const href = (v: AgentView) => {
    const u = new URLSearchParams({ view: v });
    if (q) u.set("q", q);
    return `${base}?${u}`;
  };
  const counts: Partial<Record<AgentView, number>> = { expected: s.counts.expected, in_hand: s.counts.inHand, on_the_way: s.counts.onTheWay };
  const rows = list.parcels;
  const canBook = user.permissions.has("shipment.create");

  return (
    <div>
      <PageHeader icon={Boxes} title={a.desk.title} description={a.desk.sub}>
        {rows.length > 0 && (
          <Button asChild variant="outline">
            <a href={`/api/agent/parcel-list?${new URLSearchParams({ view, lang: locale, ...(q ? { q } : {}) })}`} target="_blank" rel="noopener">
              <FileDown /> {a.desk.print}
            </a>
          </Button>
        )}
        {canBook && (
          <Button asChild>
            <Link href={`/${locale}/portal/parcels/new`}>
              <Plus /> {a.book.title}
            </Link>
          </Button>
        )}
      </PageHeader>

      <PageTabs
        label={a.desk.title}
        items={DESK_VIEWS.map((v) => ({ href: href(v), label: a.views[v], active: v === view, count: q ? undefined : counts[v] }))}
        aside={
          <form action={base} className="relative w-full sm:w-72">
            <input type="hidden" name="view" value={view} />
            <Search aria-hidden className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input name="q" defaultValue={q} placeholder={a.desk.search} aria-label={a.desk.search} className="pl-8" />
          </form>
        }
      />

      <Panel>
        <DataTable
          rows={rows}
          rowKey={(r) => r.waybill}
          href={(r) => `${base}/${r.waybill}`}
          minWidth={860}
          empty={
            q ? (
              <EmptyState icon={SearchX} title={a.empty.search.title} body={a.empty.search.body} />
            ) : (
              <EmptyState
                icon={VIEW_ICON[view]}
                title={a.empty.desk[view].title}
                body={a.empty.desk[view].body}
                action={
                  canBook && (view === "in_hand" || view === "all") ? (
                    <Button asChild>
                      <Link href={`${base}/new`}>
                        <Plus /> {a.book.title}
                      </Link>
                    </Button>
                  ) : undefined
                }
              />
            )
          }
          columns={[
            {
              key: "waybill",
              header: a.desk.waybill,
              mobile: "title",
              cell: (r) => (
                <>
                  <Link href={`${base}/${r.waybill}`} prefetch={false} className="font-mono text-[13px] font-medium underline-offset-4 hover:underline">
                    {r.waybill}
                  </Link>
                  <span className="text-muted-foreground block font-sans text-xs font-normal">{r.deliveryMode === "wakala_collect" ? a.desk.collect : a.desk.door}</span>
                </>
              ),
            },
            {
              key: "from",
              header: a.desk.from,
              className: "max-w-44",
              cell: (r) => (
                <span className="block truncate">
                  {r.from.name}
                  <span className="text-muted-foreground block truncate text-xs">{r.from.region}</span>
                </span>
              ),
            },
            {
              key: "to",
              header: a.desk.to,
              mobile: "subtitle",
              className: "max-w-48",
              cell: (r) => (
                <span className="block truncate">
                  {r.to.name}
                  <span className="text-muted-foreground hidden truncate text-xs sm:block">{[r.to.district, r.to.region].filter(Boolean).join(", ")}</span>
                </span>
              ),
            },
            {
              key: "goods",
              header: a.desk.goods,
              className: "max-w-52",
              cell: (r) => (
                <span className="block truncate" title={r.goods ?? ""}>
                  {r.goods}
                  <span className="text-muted-foreground hidden text-xs sm:block">
                    {r.pieces === 1 ? t.shipments.pieceOne : fmt(t.shipments.piecesN, { n: r.pieces })}
                  </span>
                </span>
              ),
            },
            { key: "total", header: a.desk.total, align: "right", cell: (r) => <span className={cn("tabular", !r.total && "text-muted-foreground")}>{r.total ? money(r.total, locale) : "—"}</span> },
            { key: "state", header: a.desk.state, mobile: "aside", cell: (r) => <StateBadge state={r.state} label={t.states[r.state]} /> },
            { key: "updated", header: a.desk.updated, align: "right", cell: (r) => <span className="text-muted-foreground text-xs whitespace-nowrap">{relative(r.updatedAt, locale)}</span> },
          ]}
        />
        {rows.length >= LIMIT && <p className="text-muted-foreground border-t px-4 py-2.5 text-xs">{fmt(a.desk.showing, { n: LIMIT })}</p>}
      </Panel>
    </div>
  );
}
