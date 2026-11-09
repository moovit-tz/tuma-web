import Link from "next/link";
import { Banknote, CalendarDays, Download, HandCoins, Wallet } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { paymentRecords, paymentSettingsFor } from "@/server/services/agent-payments";
import { fmt, getDict } from "@/i18n";
import { dateOnly, dateTime, money } from "@/lib/format";
import { PageHeader, PageTabs, Panel, Stat } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { PaymentSettingsForm } from "@/components/agent/payment-settings-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const instant = false;

type Tab = "payments" | "invoices" | "settings";

/**
 * The agent's money at a desk: what the counter took today, this week and this month (cash and mobile money, with
 * Tuma's commission), what's still to collect, every payment and invoice (with CSV exports), and the payments set-up.
 */
export default async function MoneyPage({ params, searchParams }: PageProps<"/[locale]/portal/money">) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("agent.workspace") || !user.accountId) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const m = t.agent.money;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const tab: Tab = one("tab") === "invoices" ? "invoices" : one("tab") === "settings" ? "settings" : "payments";
  const method = one("method") === "cash" || one("method") === "mobile_money" ? one("method") : undefined;
  const status = (["open", "overdue", "paid"] as const).find((x) => x === one("status")) ?? "all";
  const before = one("before");
  const settings = await paymentSettingsFor(user);
  const records = tab === "settings" ? null : await paymentRecords(user, { kind: tab, method, status, before, limit: 50 });
  const c = settings.collected;
  const base = `/${locale}/portal/money`;
  const href = (q: Record<string, string | undefined>) => {
    const u = new URLSearchParams(Object.entries({ tab, method, status: status === "all" ? undefined : status, ...q }).filter(([, v]) => v) as [string, string][]);
    if (u.get("tab") === "payments") u.delete("tab");
    const s = u.toString();
    return s ? `${base}?${s}` : base;
  };
  const pct = `${(settings.commissionBps / 100).toLocaleString("en", { maximumFractionDigits: 2 })}%`;
  const period = (k: "today" | "week" | "month") => c[k];

  return (
    <div>
      <PageHeader title={m.title} description={m.sub} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(["today", "week", "month"] as const).map((k, i) => (
          <Stat
            key={k}
            label={m[k]}
            value={money(period(k).total, locale)}
            hint={fmt(m.takenHint, { n: period(k).parcels, cash: money(period(k).cash, locale), momo: money(period(k).mobileMoney, locale) })}
            icon={[Banknote, CalendarDays, Wallet][i]}
          />
        ))}
        <Stat
          label={m.toCollect}
          value={money(c.toCollect.payOnDelivery.amount + c.toCollect.invoices.amount, locale)}
          hint={`${fmt(m.podHint, { n: c.toCollect.payOnDelivery.parcels })} · ${fmt(m.invHint, { n: c.toCollect.invoices.count })}`}
          tone={c.toCollect.invoices.amount > 0 ? "warn" : undefined}
          icon={HandCoins}
        />
      </div>
      {c.month.commission > 0 && <p className="text-muted-foreground -mt-3 mb-5 text-xs">{fmt(m.commission, { amount: money(c.month.commission, locale) })}</p>}

      <PageTabs
        label={m.title}
        items={[
          { href: base, label: m.payments, active: tab === "payments" },
          { href: `${base}?tab=invoices`, label: m.invoices, active: tab === "invoices", count: c.toCollect.invoices.count || undefined },
          { href: `${base}?tab=settings`, label: m.settings, active: tab === "settings" },
        ]}
      />

      {tab === "settings" ? (
        <PaymentSettingsForm
          initial={{ momo: settings.momo, payOnDelivery: settings.payOnDelivery }}
          canManage={settings.canManage}
          blockedBy={settings.blockedBy}
          pct={pct}
        />
      ) : (
        <Panel
          title={tab === "payments" ? m.payments : m.invoices}
          action={
            <div className="flex flex-wrap items-center gap-2">
              {(tab === "payments"
                ? ([
                    [undefined, m.all],
                    ["cash", m.methods.cash],
                    ["mobile_money", m.methods.mobile_money],
                  ] as const)
                : ([
                    [undefined, m.all],
                    ["open", m.open],
                    ["overdue", m.overdue],
                    ["paid", m.paid],
                  ] as const)
              ).map(([v, label]) => {
                const on = tab === "payments" ? method === v : (v ?? "all") === status;
                return (
                  <Link
                    key={label}
                    href={tab === "payments" ? href({ method: v, before: undefined }) : href({ status: v, before: undefined })}
                    className={cn("rounded-full border px-3 py-1 text-xs font-medium", on ? "bg-foreground text-background border-foreground" : "hover:bg-muted")}
                  >
                    {label}
                  </Link>
                );
              })}
              <Button size="sm" variant="outline" asChild>
                <a href={`/api/exports/${tab}?${tab === "payments" ? (method ? `method=${method}` : "") : `status=${status}`}`} download>
                  <Download /> {m.export}
                </a>
              </Button>
            </div>
          }
        >
          {tab === "payments" ? (
            (records?.payments ?? []).length === 0 ? (
              <p className="text-muted-foreground px-4 py-16 text-center text-sm">{m.empty}</p>
            ) : (
              <div className="table-scroll">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="text-muted-foreground h-10 border-b text-left text-xs">
                      <th className="px-4 font-medium">{m.at}</th>
                      <th className="px-3 font-medium">{m.waybill}</th>
                      <th className="px-3 font-medium">{m.paidBy}</th>
                      <th className="px-3 font-medium">{m.method}</th>
                      <th className="px-4 text-right font-medium">{m.amount}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {records!.payments!.map((p) => (
                      <tr key={`${p.waybill}-${p.at}`} className="hover:bg-muted/40">
                        <td className="text-muted-foreground px-4 py-2.5 text-xs whitespace-nowrap">{dateTime(p.at, locale)}</td>
                        <td className="px-3 py-2.5">
                          <Link href={`/${locale}/portal/parcels/${p.waybill}`} prefetch={false} className="font-mono text-[13px] font-medium underline-offset-4 hover:underline">
                            {p.waybill}
                          </Link>
                        </td>
                        <td className="max-w-56 truncate px-3 py-2.5">{p.paidBy ?? "—"}</td>
                        <td className="px-3 py-2.5">{m.methods[p.method] ?? p.method}</td>
                        <td className="tabular px-4 py-2.5 text-right font-medium">{money(p.amount, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (records?.invoices ?? []).length === 0 ? (
            <p className="text-muted-foreground px-4 py-16 text-center text-sm">{m.invEmpty}</p>
          ) : (
            <div className="table-scroll">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-muted-foreground h-10 border-b text-left text-xs">
                    <th className="px-4 font-medium">{m.invNo}</th>
                    <th className="px-3 font-medium">{m.billTo}</th>
                    <th className="px-3 font-medium">{m.status}</th>
                    <th className="px-3 font-medium">{m.due}</th>
                    <th className="px-3 text-right font-medium">{m.total}</th>
                    <th className="px-4 text-right font-medium">{m.owed}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {records!.invoices!.map((v) => {
                    const bill = v.billTo as { name?: string } | null;
                    return (
                      <tr key={v.id} className="hover:bg-muted/40">
                        <td className="px-4 py-2.5 font-mono text-[13px] font-medium">
                          {v.number}
                          <span className="text-muted-foreground block font-sans text-xs">{dateOnly(v.at, locale)}</span>
                        </td>
                        <td className="max-w-56 truncate px-3 py-2.5">
                          {v.customerId ? (
                            <Link href={`/${locale}/portal/customers/${v.customerId}`} prefetch={false} className="underline-offset-4 hover:underline">
                              {bill?.name ?? "—"}
                            </Link>
                          ) : (
                            (bill?.name ?? "—")
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", v.status === "paid" ? "bg-ok/15 text-ok" : v.overdue ? "bg-brand-red/10 text-brand-ink" : "bg-muted")}>
                            {v.overdue ? m.overdue : (m.inv[v.status] ?? v.status)}
                          </span>
                        </td>
                        <td className="text-muted-foreground px-3 py-2.5 text-xs whitespace-nowrap">{dateOnly(v.due, locale)}</td>
                        <td className="tabular px-3 py-2.5 text-right">{money(v.total, locale)}</td>
                        <td className={cn("tabular px-4 py-2.5 text-right font-medium", v.owed > 0 && "text-warn")}>{money(v.owed, locale)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {(() => {
            const list = tab === "payments" ? records?.payments : records?.invoices;
            if (!list || (list.length < 50 && !before)) return null;
            return (
              <div className="flex justify-end gap-2 border-t px-4 py-3">
                {before && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={href({ before: undefined })}>{m.newest}</Link>
                  </Button>
                )}
                {list.length === 50 && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={href({ before: list[list.length - 1].at })}>{m.older}</Link>
                  </Button>
                )}
              </div>
            );
          })()}
        </Panel>
      )}
    </div>
  );
}
