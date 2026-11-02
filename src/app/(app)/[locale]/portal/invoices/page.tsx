import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { listInvoices } from "@/server/services/partner";
import { fmt, getDict } from "@/i18n";
import { dateOnly, money, nowMs } from "@/lib/format";
import { PageHeader, PageTabs, Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const instant = false;

const TABS = ["open", "overdue", "paid", "all"] as const;
type Tab = (typeof TABS)[number];

const TONE: Record<string, string> = {
  paid: "border-ok/30 bg-ok/10 text-ok",
  partially_paid: "border-warn/30 bg-warn/10 text-warn",
  issued: "border-border",
  void: "border-border text-muted-foreground line-through",
  draft: "border-border text-muted-foreground",
};

export default async function InvoicesPage({ params, searchParams }: PageProps<"/[locale]/portal/invoices">) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("partner.finance.manage")) return <NoAccess locale={locale} />;
  const sp = await searchParams;
  const tab = (TABS.includes(sp.tab as Tab) ? sp.tab : "open") as Tab;
  const t = getDict(locale);
  const iv = t.partner.invoices;
  const rows = await listInvoices(user, tab);
  const now = nowMs();
  const base = `/${locale}/portal/invoices`;
  return (
    <>
      <PageHeader title={iv.title}>
        <Button asChild>
          <Link href={`${base}/new`}>
            <Plus /> {iv.new}
          </Link>
        </Button>
      </PageHeader>
      <PageTabs label={iv.title} items={TABS.map((k) => ({ href: `${base}?tab=${k}`, label: iv.tabs[k], active: k === tab }))} />
      <Panel>
        {rows.length === 0 ? (
          <p className="text-muted-foreground px-4 py-14 text-center text-sm">{iv.empty}</p>
        ) : (
          <div className="table-scroll">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs">
                  <th className="px-4 py-2.5 font-medium">{iv.number}</th>
                  <th className="px-3 py-2.5 font-medium">{iv.client}</th>
                  <th className="px-3 py-2.5 font-medium">{iv.issued}</th>
                  <th className="px-3 py-2.5 font-medium">{iv.due}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{iv.total}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{iv.balance}</th>
                  <th className="px-4 py-2.5 font-medium">{iv.status}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ i, clientName }) => {
                  const balance = i.total - i.amountPaid;
                  const open = i.status === "issued" || i.status === "partially_paid";
                  const daysOver = open ? Math.floor((now - i.dueDate.getTime()) / 86400_000) : 0;
                  return (
                    <tr key={i.id} className="hover:bg-muted/50 border-b last:border-0">
                      <td className="px-4 py-2.5 font-mono text-[13px] font-medium">{i.number}</td>
                      <td className="px-3 py-2.5">
                        {clientName}
                        <div className="text-muted-foreground text-xs">
                          {i.lines.length} × {t.shipments.waybill.toLowerCase()}
                        </div>
                      </td>
                      <td className="text-muted-foreground px-3 py-2.5">{dateOnly(i.issueDate, locale)}</td>
                      <td className="px-3 py-2.5">
                        {dateOnly(i.dueDate, locale)}
                        {daysOver > 0 && <div className="text-parcel text-xs font-medium">{fmt(iv.overdueBy, { d: daysOver })}</div>}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right">{money(i.total, locale)}</td>
                      <td className={cn("tabular px-3 py-2.5 text-right", balance > 0 ? "font-medium" : "text-muted-foreground")}>{money(balance, locale)}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-xs font-medium", TONE[i.status])}>{iv.statuses[i.status]}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
