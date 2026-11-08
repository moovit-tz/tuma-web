import Link from "next/link";
import { ArrowDownToLine, Banknote, HandCoins, Landmark, Receipt, Wallet } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { financeLedger, reconciliation, type LedgerSource } from "@/server/services/admin/finance";
import { fmt, getDict } from "@/i18n";
import { dateTime, money } from "@/lib/format";
import { PageHeader, PageTabs, Panel, Stat } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecheckButton } from "@/components/admin/recheck-button";
import { WalletAdjustForm } from "@/components/admin/wallet-adjust-form";
import { cn } from "@/lib/utils";

export const instant = false;

const SOURCES: LedgerSource[] = ["wallet", "momo", "cod", "invoice"];
const PERIODS = [7, 30, 90];

/** The unified ledger (with period totals) and the HuduPay reconciliation, with wallet adjustments under four eyes. */
export default async function FinancePage({ params, searchParams }: PageProps<"/[locale]/portal/admin/finance">) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("finance.view")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const f = t.admin.finance;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const tab = one("tab") === "reconcile" ? "reconcile" : "ledger";
  const source = SOURCES.includes(one("source") as LedgerSource) ? (one("source") as LedgerSource) : undefined;
  const days = PERIODS.includes(Number(one("days"))) ? Number(one("days")) : 30;
  const base = `/${locale}/portal/admin/finance`;
  const href = (q: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams(
      Object.entries({ days: days === 30 ? undefined : days, source, ...q })
        .filter(([, v]) => v !== undefined && String(v) !== "")
        .map(([k, v]) => [k, String(v)]),
    );
    const s = u.toString();
    return s ? `${base}?${s}` : base;
  };
  const ledger = await financeLedger(user, { days, source, before: one("before") });
  const recon = tab === "reconcile" ? await reconciliation(user) : null;
  const tt = ledger.totals;
  const chip = (on: boolean) => cn("rounded-full border px-3 py-1 text-xs font-medium", on ? "bg-foreground text-background border-foreground" : "hover:bg-muted");
  return (
    <>
      <PageHeader title={f.title} description={f.sub} icon={Landmark}>
        <div className="flex gap-1.5">
          {PERIODS.map((d) => (
            <Link key={d} href={href({ days: d === 30 ? undefined : d, tab: tab === "ledger" ? undefined : tab })} className={chip(d === days)}>
              {fmt(f.period, { n: d })}
            </Link>
          ))}
        </div>
      </PageHeader>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={f.topups} value={money(tt.topups, locale)} hint={fmt(f.refundsAdjust, { refunds: money(tt.refunds, locale), adjustments: money(tt.adjustments, locale) })} icon={Wallet} />
        <Stat label={f.momo} value={money(tt.momo, locale)} hint={`${f.walletSpend}: ${money(tt.walletSpend, locale)}`} icon={HandCoins} />
        <Stat label={f.cod} value={money(tt.codCollected, locale)} hint={fmt(f.codHeld, { amount: money(tt.codHeld, locale) })} tone={tt.codHeld ? "warn" : undefined} icon={Banknote} />
        <Stat label={f.invoiced} value={money(tt.invoiced, locale)} hint={fmt(f.invoiceOpen, { amount: money(tt.invoiceOpen, locale) })} icon={Receipt} />
      </div>
      <PageTabs
        label={f.title}
        items={[
          { href: href({ tab: undefined, before: undefined }), label: f.ledger, active: tab === "ledger" },
          { href: href({ tab: "reconcile", source: undefined, before: undefined }), label: f.reconcile, active: tab === "reconcile" },
        ]}
      />
      {tab === "ledger" ? (
        <Panel
          title={f.ledger}
          action={
            <div className="flex flex-wrap gap-1.5">
              <Link href={href({ source: undefined, before: undefined })} className={chip(!source)}>
                {f.all}
              </Link>
              {SOURCES.map((s) => (
                <Link key={s} href={href({ source: s, before: undefined })} className={chip(source === s)}>
                  {f.sources[s]}
                </Link>
              ))}
            </div>
          }
          footer={
            ledger.next ? (
              <div className="flex justify-end px-4 py-2.5">
                <Button size="sm" variant="outline" asChild>
                  <Link href={href({ before: ledger.next })}>{f.older}</Link>
                </Button>
              </div>
            ) : undefined
          }
        >
          {ledger.rows.length === 0 ? (
            <p className="text-muted-foreground px-4 py-16 text-center text-sm">{f.empty}</p>
          ) : (
            <div className="table-scroll">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="text-muted-foreground h-10 border-b text-left text-xs">
                    <th className="px-4 font-medium">{f.at}</th>
                    <th className="px-3 font-medium">{f.source}</th>
                    <th className="px-3 font-medium">{f.reference}</th>
                    <th className="px-3 font-medium">{f.waybill}</th>
                    <th className="px-3 font-medium">{f.party}</th>
                    <th className="px-3 font-medium">{f.status}</th>
                    <th className="px-4 text-right font-medium">{f.amount}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ledger.rows.map((r) => (
                    <tr key={`${r.source}-${r.reference}-${r.at}`} className="hover:bg-muted/40">
                      <td className="text-muted-foreground px-4 py-2.5 text-xs whitespace-nowrap">{dateTime(r.at, locale)}</td>
                      <td className="px-3 py-2.5">
                        {f.sources[r.source]} <span className="text-muted-foreground">· {f.kinds[r.kind] ?? r.kind}</span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">{r.reference}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{r.waybill ?? "—"}</td>
                      <td className="max-w-48 truncate px-3 py-2.5">{r.party ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={r.status === "failed" ? "destructive" : r.status === "pending" || r.status === "open" ? "secondary" : "outline"}>{f.statuses[r.status] ?? r.status}</Badge>
                      </td>
                      <td className={cn("tabular px-4 py-2.5 text-right font-medium", r.amount < 0 && "text-muted-foreground")}>{money(r.amount, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-6">
            <ReconTable title={fmt(f.stuck, { n: recon!.stuckMinutes })} sub={f.stuckSub} rows={recon!.pending} empty={f.reconEmpty} locale={locale} canAct={recon!.canReconcile} f={f} />
            <ReconTable title={f.failed} sub={f.failedSub} rows={recon!.failed} empty={f.failedEmpty} locale={locale} canAct={false} f={f} />
          </div>
          {recon!.canReconcile && (
            <Panel title={f.adjust} icon={ArrowDownToLine}>
              <WalletAdjustForm locale={locale} />
            </Panel>
          )}
        </div>
      )}
    </>
  );
}

type Recon = Awaited<ReturnType<typeof reconciliation>>["pending"];

function ReconTable({ title, sub, rows, empty, locale, canAct, f }: { title: string; sub: string; rows: Recon; empty: string; locale: string; canAct: boolean; f: ReturnType<typeof getDict>["admin"]["finance"] }) {
  return (
    <Panel title={title}>
      <p className="text-muted-foreground border-b px-4 py-2.5 text-xs">{sub}</p>
      {rows.length === 0 ? (
        <p className="text-muted-foreground px-4 py-10 text-center text-sm">{empty}</p>
      ) : (
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.reference} className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tabular font-semibold">{money(r.amount, locale)}</span>
                  <Badge variant="outline">{r.source === "momo" ? f.sources.momo : f.kinds.topup}</Badge>
                  {r.waybill && <span className="font-mono text-xs">{r.waybill}</span>}
                </div>
                <div className="text-muted-foreground mt-0.5 text-xs">
                  <span className="font-mono">{r.reference}</span> · {r.phone ?? "—"} · {dateTime(r.at, locale)}
                  {r.failure && ` · ${r.failure}`}
                </div>
              </div>
              {canAct && (r.checkable ? <RecheckButton source={r.source} reference={r.reference} /> : <span className="text-muted-foreground text-xs">{f.noProvider}</span>)}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
