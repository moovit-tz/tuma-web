import Link from "next/link";
import { notFound } from "next/navigation";
import { AlarmClock, ArrowLeft, Building2, CheckCircle2, FilePlus2, Mail, MapPin, Package, Phone, Receipt, Truck, UserRound, Warehouse } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { getClient, listCargo, listInvoices, listPayments, vehicleOptions } from "@/server/services/partner";
import { fmt, getDict } from "@/i18n";
import { dateOnly, money, nowMs, num } from "@/lib/format";
import { PageHeader, PageTabs, Panel, Stat } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { CargoTable } from "@/components/partner/cargo-table";
import { ClientDialog } from "@/components/partner/client-dialog";
import { clientFormValues } from "@/components/partner/client-form-values";
import { ClientActiveToggle } from "@/components/partner/client-active";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const instant = false;

const INVOICE_TONE: Record<string, string> = {
  paid: "border-ok/30 bg-ok/10 text-ok",
  partially_paid: "border-warn/30 bg-warn/10 text-warn",
  issued: "border-border",
  void: "border-border text-muted-foreground line-through",
  draft: "border-border text-muted-foreground",
};

/** CRM: one client — who they are, their figures, and every waybill, invoice and payment linked to them. */
export default async function ClientPage({ params, searchParams }: PageProps<"/[locale]/portal/clients/[id]">) {
  const { locale, id } = await params;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("partner.clients.manage")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const p = t.partner;
  const c = p.clients;
  const data = await getClient(user, id);
  if (!data) notFound();
  const { c: cl, shipments: s, finance: f } = data;

  const finance = user.permissions.has("partner.finance.manage");
  const tabs = finance ? (["cargo", "invoices", "payments"] as const) : (["cargo"] as const);
  const sp = await searchParams;
  const tab = (tabs as readonly string[]).includes(sp.tab as string) ? (sp.tab as (typeof tabs)[number]) : "cargo";
  const base = `/${locale}/portal/clients/${cl.id}`;

  const [cargo, fleet, invoices, payments] = await Promise.all([
    tab === "cargo" ? listCargo(user, { view: "all", clientId: cl.id }) : Promise.resolve([]),
    tab === "cargo" ? vehicleOptions(user) : Promise.resolve([]),
    tab === "invoices" ? listInvoices(user, "all", cl.id) : Promise.resolve([]),
    tab === "payments" ? listPayments(user, "all", cl.id) : Promise.resolve([]),
  ]);
  const now = nowMs();

  return (
    <>
      <Link href={`/${locale}/portal/clients`} className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm">
        <ArrowLeft className="size-4" aria-hidden /> {c.back}
      </Link>
      <PageHeader
        eyebrow={p.nav.crm}
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            {cl.name}
            {!cl.active && <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium tracking-normal">{c.archived}</span>}
          </span>
        }
        description={[cl.contactName, cl.region].filter(Boolean).join(" · ") || undefined}
      >
        {finance && cl.active && (
          <Button asChild>
            <Link href={`/${locale}/portal/invoices/new?client=${cl.id}`}>
              <FilePlus2 /> {c.newInvoice}
            </Link>
          </Button>
        )}
        <ClientDialog labelled initial={clientFormValues(cl)} />
        <ClientActiveToggle id={cl.id} active={cl.active} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Package} label={c.total} value={num(s.total, locale)} hint={`${c.lastShipment}: ${s.lastAt ? dateOnly(s.lastAt, locale) : c.none}`} />
        <Stat icon={Warehouse} label={c.received} value={num(s.received, locale)} />
        <Stat icon={Truck} label={c.transit} value={num(s.transit, locale)} />
        {finance ? (
          <Stat
            icon={Receipt}
            label={c.outstanding}
            value={money(f.outstanding, locale)}
            tone={f.overdue > 0 ? "bad" : undefined}
            hint={f.overdue > 0 ? `${c.overdue}: ${money(f.overdue, locale)}` : fmt(c.outstandingHint, { n: f.openInvoices })}
            href={`${base}?tab=invoices`}
          />
        ) : (
          <Stat icon={CheckCircle2} label={c.delivered} value={num(s.delivered, locale)} />
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <PageTabs label={cl.name} items={tabs.map((k) => ({ href: `${base}?tab=${k}`, label: c.tabs[k], active: k === tab }))} />
          <Panel>
            {tab === "cargo" &&
              (cargo.length === 0 ? (
                <p className="text-muted-foreground px-4 py-14 text-center text-sm">{c.noCargo}</p>
              ) : (
                <CargoTable rows={cargo} locale={locale} vehicles={fleet} canOperate={user.permissions.has("partner.cargo.operate")} />
              ))}
            {tab === "invoices" &&
              (invoices.length === 0 ? (
                <p className="text-muted-foreground px-4 py-14 text-center text-sm">{c.noInvoices}</p>
              ) : (
                <div className="table-scroll">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="text-left text-xs">
                        <th className="px-4 py-2.5">{p.invoices.number}</th>
                        <th className="px-3 py-2.5">{p.invoices.issued}</th>
                        <th className="px-3 py-2.5">{p.invoices.due}</th>
                        <th className="px-3 py-2.5 text-right">{p.invoices.total}</th>
                        <th className="px-3 py-2.5 text-right">{p.invoices.balance}</th>
                        <th className="px-4 py-2.5">{p.invoices.status}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map(({ i }) => {
                        const balance = Number(i.total) - Number(i.amountPaid);
                        const late = balance > 0 && i.dueDate.getTime() < now;
                        return (
                          <tr key={i.id} className="border-b last:border-0">
                            <td className="px-4 py-2.5 font-mono font-medium">{i.number}</td>
                            <td className="px-3 py-2.5">{dateOnly(i.issueDate, locale)}</td>
                            <td className={cn("px-3 py-2.5", late && "text-parcel font-medium")}>{dateOnly(i.dueDate, locale)}</td>
                            <td className="tabular px-3 py-2.5 text-right">{money(Number(i.total), locale)}</td>
                            <td className={cn("tabular px-3 py-2.5 text-right", balance > 0 ? "font-medium" : "text-muted-foreground")}>{money(balance, locale)}</td>
                            <td className="px-4 py-2.5">
                              <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-xs font-medium", INVOICE_TONE[i.status])}>{p.invoices.statuses[i.status]}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            {tab === "payments" &&
              (payments.length === 0 ? (
                <p className="text-muted-foreground px-4 py-14 text-center text-sm">{c.noPayments}</p>
              ) : (
                <div className="table-scroll">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead>
                      <tr className="text-left text-xs">
                        <th className="px-4 py-2.5">{p.payments.received}</th>
                        <th className="px-3 py-2.5">{p.payments.method}</th>
                        <th className="px-3 py-2.5">{p.payments.reference}</th>
                        <th className="px-3 py-2.5 text-right">{p.payments.amount}</th>
                        <th className="px-4 py-2.5">{p.payments.invoice}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(({ p: pay, invoiceNumber }) => (
                        <tr key={pay.id} className="border-b last:border-0">
                          <td className="px-4 py-2.5">{dateOnly(pay.receivedAt, locale)}</td>
                          <td className="px-3 py-2.5">{p.payments.methods?.[pay.method] ?? pay.method}</td>
                          <td className="px-3 py-2.5 font-mono text-xs">{pay.reference ?? "—"}</td>
                          <td className="tabular px-3 py-2.5 text-right font-medium">{money(Number(pay.amount), locale)}</td>
                          <td className="px-4 py-2.5 font-mono text-xs">{invoiceNumber ?? <span className="text-warn font-sans font-medium">{p.payments.tabs.unmatched}</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel banner icon={Building2} title={c.contactCard}>
            <dl className="divide-y text-sm">
              {(
                [
                  [UserRound, c.contact, cl.contactName],
                  [Phone, c.phone, cl.phone && <a href={`tel:${cl.phone}`} className="underline-offset-4 hover:underline">{cl.phone}</a>],
                  [Mail, c.email, cl.email && <a href={`mailto:${cl.email}`} className="break-all underline-offset-4 hover:underline">{cl.email}</a>],
                  [MapPin, c.region, cl.region],
                  [Receipt, c.tin, cl.tin && <span className="font-mono">{cl.tin}</span>],
                  [AlarmClock, c.terms, String(cl.creditTermsDays)],
                  [CheckCircle2, c.since, dateOnly(cl.createdAt, locale)],
                ] as const
              ).map(([Icon, label, value]) => (
                <div key={label} className="flex items-start gap-3 px-4 py-3">
                  <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
                  <dt className="text-muted-foreground w-28 shrink-0">{label}</dt>
                  <dd className="min-w-0 flex-1 font-medium">{value || "—"}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          {!cl.active && <p className="text-muted-foreground text-[13px]">{c.archivedNote}</p>}
        </aside>
      </div>
    </>
  );
}
