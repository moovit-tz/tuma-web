import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Package, TriangleAlert, User, Wallet } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { customerProfile } from "@/server/services/customers";
import { DomainError } from "@/server/services/shipments";
import { fmt, getDict } from "@/i18n";
import { dateOnly, money, num, relative } from "@/lib/format";
import { Panel, Stat } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { StateBadge } from "@/components/shipments/state-badge";
import { CustomerActions } from "@/components/agent/customer-actions";
import { cn } from "@/lib/utils";

export const instant = false;

/** One customer: details, what they send and receive, what they still owe, a company's people, and their parcels. */
export default async function CustomerPage({ params }: PageProps<"/[locale]/portal/customers/[id]">) {
  const { locale, id } = await params;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("agent.workspace") || !user.accountId) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const c = t.agent.cust;
  const p = await customerProfile(user, id).catch((e) => {
    if (e instanceof DomainError && e.status === 404) return null;
    throw e;
  });
  if (!p) notFound();
  const k = p.customer;
  const s = p.stats;
  const peak = Math.max(1, ...s.months.map((x) => x.parcels));
  const monthLabel = (ym: string) => new Date(`${ym}-15T12:00:00+03:00`).toLocaleDateString(locale === "sw" ? "sw-TZ" : locale === "fr" ? "fr" : "en-GB", { month: "short" });
  const details: [string, string | null][] = [
    [c.phone, k.phone],
    [c.otherPhones, k.otherPhones?.length ? k.otherPhones.join(", ") : null],
    [c.email, k.email],
    [c.tin, k.tin],
    [c.regNo, k.regNo],
    [c.contactName, k.contactName],
    [c.place, [k.district, k.region].filter(Boolean).join(", ") || null],
    [c.landmark, k.landmark],
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/${locale}/portal/customers`} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="size-4" /> {c.back}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="eyebrow flex items-center gap-1.5">
              {k.kind === "company" ? <Building2 className="size-3.5" /> : <User className="size-3.5" />} {k.kind === "company" ? c.company : c.individual}
            </div>
            <h1 className="mt-1 text-[26px] font-semibold tracking-tight sm:text-[30px]">{k.name}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{s.firstAt ? fmt(c.since, { date: dateOnly(s.firstAt, locale) }) : null}</p>
          </div>
          <CustomerActions customer={k} canManage={p.canManage} locale={locale} />
        </div>
      </div>

      {(p.reports.byOthers > 0 || p.reports.mine.length > 0) && (
        <div className="border-brand-red/30 bg-brand-red/5 text-brand-red flex items-start gap-2 rounded-lg border px-4 py-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            {p.reports.byOthers > 0 && <p>{fmt(c.byOthers, { n: p.reports.byOthers })}</p>}
            {p.reports.mine.length > 0 && <p>{fmt(c.youReported, { reasons: p.reports.mine.map((r) => c.reasons[r] ?? r).join(", ") })}</p>}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={c.parcels} value={num(s.parcels, locale)} hint={`${c.sent} ${s.sent} · ${c.received} ${s.received}`} icon={Package} />
        <Stat label={c.last30} value={num(s.last30, locale)} hint={s.lastAt ? relative(s.lastAt, locale) : undefined} />
        <Stat label={c.spent} value={money(s.spent, locale)} icon={Wallet} />
        <Stat label={c.owed} value={money(s.owed, locale)} hint={s.unpaidInvoices ? `${c.unpaidInv}: ${s.unpaidInvoices}` : undefined} tone={s.owed > 0 ? "warn" : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={c.details}>
          <dl className="divide-y text-sm">
            {details
              .filter(([, v]) => v)
              .map(([label, v]) => (
                <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="truncate text-right font-medium">{v}</dd>
                </div>
              ))}
          </dl>
        </Panel>
        <Panel title={c.months}>
          <div className="flex h-40 items-end gap-2 px-4 pt-4 pb-3">
            {s.months.map((x) => (
              <div key={x.month} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-muted-foreground tabular text-[11px]">{x.parcels || ""}</span>
                <div className="bg-primary/80 w-full rounded-t" style={{ height: `${Math.max(2, (x.parcels / peak) * 96)}px` }} />
                <span className="text-muted-foreground text-[11px]">{monthLabel(x.month)}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title={k.kind === "company" && p.people.length ? c.people : c.regions}>
          <ul className="divide-y text-sm">
            {(k.kind === "company" && p.people.length ? p.people.map((x) => [x.name, x.parcels] as const) : s.topRegions.map((x) => [x.region, x.parcels] as const)).map(([name, n]) => (
              <li key={name} className="flex justify-between px-4 py-2.5">
                <span className="truncate">{name}</span>
                <span className="tabular text-muted-foreground">{n}</span>
              </li>
            ))}
            {!p.people.length && !s.topRegions.length && <li className="text-muted-foreground px-4 py-6 text-center">—</li>}
          </ul>
        </Panel>
      </div>

      {(p.unpaid.invoices.length > 0 || p.unpaid.parcels.length > 0) && (
        <Panel title={c.owed}>
          <ul className="divide-y text-sm">
            {p.unpaid.invoices.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="font-mono text-[13px]">{i.number}</span>
                <span className={cn("text-xs", i.overdue ? "text-brand-red" : "text-muted-foreground")}>
                  {i.overdue ? t.agent.money.overdue : t.agent.money.due} {dateOnly(i.due, locale)}
                </span>
                <span className="tabular ml-auto font-medium">{money(i.owed, locale)}</span>
              </li>
            ))}
            {p.unpaid.parcels.map((x) => (
              <li key={x.waybill} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <Link href={`/${locale}/portal/parcels/${x.waybill}`} prefetch={false} className="font-mono text-[13px] underline-offset-4 hover:underline">
                  {x.waybill}
                </Link>
                <StateBadge state={x.state} label={t.states[x.state]} />
                <span className="tabular ml-auto font-medium">{money(x.total, locale)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title={`${c.recent} · ${p.parcels.length}`}>
        {p.parcels.length === 0 ? (
          <p className="text-muted-foreground px-4 py-10 text-center text-sm">—</p>
        ) : (
          <div className="table-scroll">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-muted-foreground h-10 border-b text-left text-xs">
                  <th className="px-4 font-medium">{t.agent.desk.waybill}</th>
                  <th className="px-3 font-medium">{t.agent.desk.to}</th>
                  <th className="px-3 font-medium">{t.agent.desk.state}</th>
                  <th className="px-3 text-right font-medium">{t.agent.money.amount}</th>
                  <th className="px-4 text-right font-medium">{t.agent.money.at}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {p.parcels.map((x) => (
                  <tr key={x.waybill} className="hover:bg-muted/40">
                    <td className="px-4 py-2.5">
                      <Link href={`/${locale}/portal/parcels/${x.waybill}`} prefetch={false} className="font-mono text-[13px] font-medium underline-offset-4 hover:underline">
                        {x.waybill}
                      </Link>
                      <span className="text-muted-foreground block text-xs">{x.sent ? c.sent : c.received}</span>
                    </td>
                    <td className="max-w-56 truncate px-3 py-2.5">
                      {x.sent ? x.to : x.from}
                      <span className="text-muted-foreground block truncate text-xs">{[x.district, x.region].filter(Boolean).join(", ")}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <StateBadge state={x.state} label={t.states[x.state]} />
                    </td>
                    <td className="tabular px-3 py-2.5 text-right">{money(x.total, locale)}</td>
                    <td className="text-muted-foreground px-4 py-2.5 text-right text-xs whitespace-nowrap">{dateOnly(x.createdAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
