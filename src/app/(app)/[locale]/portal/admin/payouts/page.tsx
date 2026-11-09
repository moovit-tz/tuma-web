import { HandCoins } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { POINT_HANDOVER_FEE, listPayouts } from "@/server/services/admin/payouts";
import { fmt, getDict } from "@/i18n";
import { dateOnly, money } from "@/lib/format";
import { PageHeader, PageTabs, Panel, Stat } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { EmptyState } from "@/components/shell/empty-state";
import { Badge } from "@/components/ui/badge";
import { ActionForm } from "@/components/admin/kit";
import { markPaidAction, proposePayoutsAction } from "@/app/actions/admin";

export const instant = false;

/** Payouts to drivers and points: propose a period, a second person approves, FinOps pays. */
export default async function PayoutsPage({ params, searchParams }: PageProps<"/[locale]/portal/admin/payouts">) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("payout.propose") && !user.permissions.has("finance.view")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const p = t.staff.payouts;
  const tab = sp.tab === "paid" ? "paid" : "open";
  const { rows, kpis, canPropose, canMarkPaid } = await listPayouts(user, tab);
  const base = `/${locale}/portal/admin/payouts`;
  return (
    <>
      <PageHeader title={p.title} description={p.sub} icon={HandCoins} />
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label={p.kpiProposed} value={money(kpis.proposed, locale)} />
        <Stat label={p.kpiSent} value={money(kpis.sent, locale)} />
        <Stat label={p.kpiPaid} value={money(kpis.paid30, locale)} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <PageTabs
            label={p.title}
            items={[
              { href: base, label: p.open, active: tab === "open" },
              { href: `${base}?tab=paid`, label: p.done, active: tab === "paid" },
            ]}
          />
          <Panel>
            {rows.length === 0 ? (
              <EmptyState icon={HandCoins} title={p.empty.title} body={p.empty.body} />
            ) : (
              <div className="table-scroll">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="h-10 text-left">
                      <th className="px-4">{p.payee}</th>
                      <th className="px-3">{p.period}</th>
                      <th className="px-3 text-right">{p.lines}</th>
                      <th className="px-3 text-right">{p.amount}</th>
                      <th className="px-4">{p.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((r) => (
                      <tr key={r.id} className="align-top">
                        <td className="px-4 py-3">
                          <div className="font-medium">{r.payeeName}</div>
                          <div className="text-muted-foreground text-xs">
                            <span className="font-mono">{r.ref}</span> · {p.payeeTypes[r.payeeType]}
                          </div>
                        </td>
                        <td className="text-muted-foreground px-3 py-3 text-xs whitespace-nowrap">
                          {dateOnly(r.periodFrom, locale)} – {dateOnly(r.periodTo, locale)}
                        </td>
                        <td className="tabular px-3 py-3 text-right">{r.lineCount}</td>
                        <td className="tabular px-3 py-3 text-right font-medium">{money(r.amount, locale)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={r.status === "paid" ? "outline" : r.status === "rejected" ? "secondary" : "default"}>{p.statuses[r.status]}</Badge>
                          {r.providerRef && <div className="text-muted-foreground mt-1 font-mono text-[11px]">{r.providerRef}</div>}
                          {canMarkPaid && r.status === "sent" && (
                            <ActionForm className="mt-2" columns={1} action={markPaidAction.bind(null, r.id)} submit={p.markPaid} done={p.paid} fields={[{ name: "providerRef", label: p.providerRef, required: true, min: 3 }]} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
        {canPropose && (
          <Panel title={p.build} description={fmt(p.fee, { fee: money(POINT_HANDOVER_FEE, locale) })} className="self-start">
            <ActionForm
              className="p-4"
              columns={1}
              action={proposePayoutsAction}
              submit={p.propose}
              done={p.propose}
              fields={[
                { name: "from", label: p.from, required: true, placeholder: "2026-11-01" },
                { name: "to", label: p.to, required: true, placeholder: "2026-11-07" },
              ]}
            />
          </Panel>
        )}
      </div>
    </>
  );
}
