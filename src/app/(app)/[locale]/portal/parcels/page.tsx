import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { AGENT_VIEWS, agentParcels, agentSummary, type AgentView } from "@/server/services/agent-parcels";
import { fmt, getDict } from "@/i18n";
import { money, relative } from "@/lib/format";
import { PageHeader, PageTabs, Panel } from "@/components/shell/page-header";
import { StateBadge } from "@/components/shipments/state-badge";
import { NoAccess } from "@/components/shell/no-access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const instant = false;

const LIMIT = 100;

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
  const view = (AGENT_VIEWS as readonly string[]).includes(one(sp.view) ?? "") ? (one(sp.view) as AgentView) : "in_hand";
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

  return (
    <div>
      <PageHeader title={a.desk.title} description={a.desk.sub}>
        {user.permissions.has("shipment.create") && (
          <Button asChild>
            <Link href={`/${locale}/portal/parcels/new`}>
              <Plus /> {t.nav.newShipment}
            </Link>
          </Button>
        )}
      </PageHeader>

      <PageTabs
        label={a.desk.title}
        items={AGENT_VIEWS.map((v) => ({ href: href(v), label: a.views[v], active: v === view, count: q ? undefined : counts[v] }))}
        aside={
          <form action={base} className="relative w-full sm:w-72">
            <input type="hidden" name="view" value={view} />
            <Search aria-hidden className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input name="q" defaultValue={q} placeholder={a.desk.search} aria-label={a.desk.search} className="pl-8" />
          </form>
        }
      />

      <Panel>
        {rows.length === 0 ? (
          <p className="text-muted-foreground px-4 py-16 text-center text-sm">{q ? a.desk.emptySearch : a.desk.empty}</p>
        ) : (
          <div className="table-scroll">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="text-muted-foreground h-10 border-b text-left text-xs">
                  <th className="px-4 font-medium">{a.desk.waybill}</th>
                  <th className="px-3 font-medium">{a.desk.from}</th>
                  <th className="px-3 font-medium">{a.desk.to}</th>
                  <th className="px-3 font-medium">{a.desk.goods}</th>
                  <th className="px-3 text-right font-medium">{a.desk.total}</th>
                  <th className="px-3 font-medium">{a.desk.state}</th>
                  <th className="px-4 text-right font-medium">{a.desk.updated}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.waybill} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link href={`${base}/${r.waybill}`} prefetch={false} className="font-mono text-[13px] font-medium underline-offset-4 hover:underline">
                        {r.waybill}
                      </Link>
                      <span className="text-muted-foreground block text-xs">{r.deliveryMode === "wakala_collect" ? a.desk.collect : a.desk.door}</span>
                    </td>
                    <td className="max-w-44 truncate px-3 py-3">
                      {r.from.name}
                      <span className="text-muted-foreground block truncate text-xs">{r.from.region}</span>
                    </td>
                    <td className="max-w-48 truncate px-3 py-3">
                      {r.to.name}
                      <span className="text-muted-foreground block truncate text-xs">{[r.to.district, r.to.region].filter(Boolean).join(", ")}</span>
                    </td>
                    <td className="max-w-52 truncate px-3 py-3" title={r.goods ?? ""}>
                      {r.goods}
                      <span className="text-muted-foreground block text-xs">
                        {r.pieces} × {t.shipments.pieces.toLowerCase()}
                      </span>
                    </td>
                    <td className={cn("tabular px-3 py-3 text-right", !r.total && "text-muted-foreground")}>{r.total ? money(r.total, locale) : "—"}</td>
                    <td className="px-3 py-3">
                      <StateBadge state={r.state} label={t.states[r.state]} />
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-right text-xs whitespace-nowrap">{relative(r.updatedAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length >= LIMIT && <p className="text-muted-foreground border-t px-4 py-2.5 text-xs">{fmt(a.desk.showing, { n: LIMIT })}</p>}
      </Panel>
    </div>
  );
}
