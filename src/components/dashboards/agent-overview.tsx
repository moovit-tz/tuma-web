import Link from "next/link";
import { CheckCircle2, Clock3, Hourglass, PackageCheck, PackageOpen, Plus, Truck, Wallet } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { agentParcels, agentSummary } from "@/server/services/agent-parcels";
import { fmt, getDict } from "@/i18n";
import { money, num, relative } from "@/lib/format";
import { BannerLink, Panel, Stat } from "@/components/shell/page-header";
import { StateBadge } from "@/components/shipments/state-badge";
import { Button } from "@/components/ui/button";
import { DashboardGreeting } from "./greeting";
import { DashboardBody, DashboardLayout } from "./layout";
import { cn } from "@/lib/utils";

/**
 * The parcel agent's home on the web, the app's home at a desk: where the office's parcels are (each figure opens the
 * desk on that stage), what came in today, this week and this month, the last seven days, the parcels that have sat at
 * the counter the longest, and the latest ones.
 */
export async function AgentOverview({ locale }: { locale: string }) {
  const user = (await getCurrentUser())!;
  const t = getDict(locale);
  const a = t.agent;
  const [s, inHand, recent] = await Promise.all([
    agentSummary(user),
    agentParcels(user, { view: "in_hand", limit: 100 }),
    agentParcels(user, { view: "all", limit: 8 }),
  ]);
  const base = `/${locale}/portal/parcels`;
  // Longest at the counter first.
  const attention = [...inHand.parcels].sort((x, y) => +new Date(x.updatedAt) - +new Date(y.updatedAt)).slice(0, 6);
  const peak = Math.max(1, ...s.days.map((d) => Math.max(d.booked, d.delivered)));
  const dayLabel = (iso: string) => new Date(`${iso}T12:00:00+03:00`).toLocaleDateString(locale === "sw" ? "sw-TZ" : locale === "fr" ? "fr" : "en-GB", { weekday: "short" });
  const canBook = user.permissions.has("shipment.create");

  return (
    <DashboardLayout>
      <DashboardGreeting name={user.name}>
        {canBook && (
          <Button asChild>
            <Link href={`/${locale}/portal/parcels/new`}>
              <Plus /> {t.nav.newShipment}
            </Link>
          </Button>
        )}
      </DashboardGreeting>

      {s.trial && (
        <p className="border-warn/40 bg-warn/10 shrink-0 rounded-md border px-4 py-2.5 text-sm">
          {fmt(a.dash.trial, { left: s.trial.remaining, limit: s.trial.allowance })}
        </p>
      )}

      <div className="grid shrink-0 grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Hourglass} label={a.dash.expected} value={num(s.counts.expected, locale)} hint={a.dash.expectedHint} href={`${base}?view=expected`} />
        <Stat icon={PackageCheck} label={a.dash.inHand} value={num(s.counts.inHand, locale)} hint={a.dash.inHandHint} href={`${base}?view=in_hand`} tone={s.counts.inHand > 0 ? "warn" : undefined} />
        <Stat icon={Truck} label={a.dash.onTheWay} value={num(s.counts.onTheWay, locale)} hint={s.counts.manifestsComing ? fmt(a.dash.manifestsComing, { n: s.counts.manifestsComing }) : a.dash.onTheWayHint} href={`${base}?view=on_the_way`} />
        <Stat icon={PackageOpen} label={a.dash.ready} value={num(s.counts.readyForCollection, locale)} hint={a.dash.readyHint} href={`${base}?view=in_hand`} />
      </div>

      <DashboardBody className="xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-h-0 min-w-0 flex-col gap-5">
          <Panel banner icon={Wallet} title={a.dash.takings} description={t.dashboard.asOfNow} className="shrink-0">
            <dl className="grid grid-cols-3 divide-x">
              {(
                [
                  [a.dash.today, s.periods.today],
                  [a.dash.week, s.periods.week],
                  [a.dash.month, s.periods.month],
                ] as const
              ).map(([label, p]) => (
                <div key={label} className="flex min-w-0 flex-col px-4 py-3">
                  <dt className="text-muted-foreground truncate text-xs">{label}</dt>
                  <dd className="font-display tabular mt-0.5 truncate text-lg font-semibold">{money(p.value, locale)}</dd>
                  <dd className="text-muted-foreground text-xs">{fmt(a.dash.parcelsN, { n: num(p.parcels, locale) })}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel fill banner icon={PackageCheck} title={a.dash.recent} description={a.desk.sub} action={<BannerLink href={base}>{t.dashboard.viewAll}</BannerLink>}>
            <ParcelRows rows={recent.parcels} locale={locale} empty={a.desk.empty} />
          </Panel>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col gap-5 [&>section:last-child]:flex-1">
          <Panel banner icon={CheckCircle2} title={a.dash.last7} description={`${a.dash.booked} · ${a.dash.delivered}`} className="shrink-0">
            <div className="flex h-36 items-end gap-2 px-4 pt-4 pb-2" role="img" aria-label={a.dash.last7}>
              {s.days.map((d) => (
                <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <div className="flex h-24 w-full items-end justify-center gap-0.5">
                    <span title={`${a.dash.booked}: ${d.booked}`} className="bg-brand-red w-1/2 max-w-3 rounded-t-sm" style={{ height: `${(d.booked / peak) * 100}%`, minHeight: d.booked ? 3 : 0 }} />
                    <span title={`${a.dash.delivered}: ${d.delivered}`} className="bg-ok w-1/2 max-w-3 rounded-t-sm" style={{ height: `${(d.delivered / peak) * 100}%`, minHeight: d.delivered ? 3 : 0 }} />
                  </div>
                  <span className="text-muted-foreground text-[11px] capitalize">{dayLabel(d.day)}</span>
                </div>
              ))}
            </div>
            <div className="text-muted-foreground flex gap-4 px-4 pb-3 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="bg-brand-red size-2 rounded-full" /> {a.dash.booked}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="bg-ok size-2 rounded-full" /> {a.dash.delivered}
              </span>
            </div>
          </Panel>

          <Panel fill banner icon={Clock3} title={a.dash.attention} description={a.dash.attentionSub} action={<BannerLink href={`${base}?view=in_hand`}>{t.dashboard.viewAll}</BannerLink>}>
            {attention.length ? (
              <ul className="divide-y">
                {attention.map((p) => (
                  <li key={p.waybill}>
                    <Link href={`${base}/${p.waybill}`} prefetch={false} className="hover:bg-muted/40 flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span className="min-w-0">
                        <span className="block font-mono text-[13px] font-medium">{p.waybill}</span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {p.to.name} · {relative(p.updatedAt, locale)}
                        </span>
                      </span>
                      <StateBadge state={p.state} label={t.states[p.state]} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground px-4 py-10 text-center text-sm">{a.dash.attentionEmpty}</p>
            )}
          </Panel>
        </div>
      </DashboardBody>
    </DashboardLayout>
  );
}

type Row = Awaited<ReturnType<typeof agentParcels>>["parcels"][number];

/** The latest parcels on the dashboard: waybill, who it's for, status. */
function ParcelRows({ rows, locale, empty }: { rows: Row[]; locale: string; empty: string }) {
  const t = getDict(locale);
  const a = t.agent;
  if (!rows.length) return <p className="text-muted-foreground px-4 py-14 text-center text-sm">{empty}</p>;
  return (
    <div className="table-scroll h-full">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-[30%]" />
          <col />
          <col className="w-[20%]" />
          <col className="w-[24%]" />
        </colgroup>
        <thead>
          <tr className="h-10 text-left text-xs">
            <th className="px-5">{a.desk.waybill}</th>
            <th className="px-3">{a.desk.to}</th>
            <th className="px-3 text-right">{a.desk.total}</th>
            <th className="px-5">{a.desk.state}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.waybill} className="hover:bg-muted/40">
              <td className="truncate px-5 py-3">
                <Link href={`/${locale}/portal/parcels/${r.waybill}`} prefetch={false} className="font-mono text-[13px] font-medium underline-offset-4 hover:underline">
                  {r.waybill}
                </Link>
              </td>
              <td className="truncate px-3 py-3" title={`${r.to.name} · ${r.to.district ?? ""}, ${r.to.region}`}>
                {r.to.name}
                <span className="text-muted-foreground block truncate text-xs">{[r.to.district, r.to.region].filter(Boolean).join(", ")}</span>
              </td>
              <td className={cn("tabular truncate px-3 py-3 text-right", !r.total && "text-muted-foreground")}>{r.total ? money(r.total, locale) : "—"}</td>
              <td className="truncate px-5 py-3">
                <StateBadge state={r.state} label={t.states[r.state]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
