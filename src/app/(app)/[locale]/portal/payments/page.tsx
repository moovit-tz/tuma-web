import { CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { clientOptions, listPayments } from "@/server/services/partner";
import { getDict } from "@/i18n";
import { dateOnly, money } from "@/lib/format";
import { PageHeader, PageTabs, Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { MatchDialog, RecordPaymentDialog } from "@/components/partner/payment-dialogs";

export const instant = false;

export default async function PaymentsPage({ params, searchParams }: PageProps<"/[locale]/portal/payments">) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("partner.finance.manage")) return <NoAccess locale={locale} />;
  const sp = await searchParams;
  const tab = sp.tab === "all" ? "all" : "unmatched";
  const t = getDict(locale);
  const p = t.partner.payments;
  const [rows, clients] = await Promise.all([listPayments(user, tab), clientOptions(user)]);
  const base = `/${locale}/portal/payments`;
  return (
    <>
      <PageHeader title={p.title}>
        <RecordPaymentDialog clients={clients} />
      </PageHeader>
      <PageTabs label={p.title} items={(["unmatched", "all"] as const).map((k) => ({ href: `${base}?tab=${k}`, label: p.tabs[k], active: k === tab }))} />
      <Panel>
        {rows.length === 0 ? (
          <div className="px-4 py-14 text-center">
            {tab === "unmatched" && <CheckCircle2 className="text-ok mx-auto mb-2 size-7" />}
            <p className="text-muted-foreground text-sm">{tab === "unmatched" ? p.empty : p.emptyAll}</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs">
                  <th className="px-4 py-2.5 font-medium">{p.received}</th>
                  <th className="px-3 py-2.5 font-medium">{p.client}</th>
                  <th className="px-3 py-2.5 font-medium">{p.method}</th>
                  <th className="px-3 py-2.5 font-medium">{p.reference}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{p.amount}</th>
                  <th className="px-4 py-2.5 font-medium">{p.invoice}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ p: pay, clientName, invoiceNumber }) => (
                  <tr key={pay.id} className="hover:bg-muted/50 border-b last:border-0">
                    <td className="px-4 py-2.5">{dateOnly(pay.receivedAt, locale)}</td>
                    <td className="px-3 py-2.5">{clientName ?? <span className="text-muted-foreground">{p.unknownClient}</span>}</td>
                    <td className="px-3 py-2.5">{p.methods[pay.method] ?? pay.method}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{pay.reference ?? "—"}</td>
                    <td className="tabular px-3 py-2.5 text-right font-medium">{money(pay.amount, locale)}</td>
                    <td className="px-4 py-2.5">{invoiceNumber ? <span className="font-mono text-[13px]">{invoiceNumber}</span> : <MatchDialog paymentId={pay.id} amount={pay.amount} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
