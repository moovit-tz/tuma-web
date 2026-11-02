import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current-user";
import { listClients } from "@/server/services/partner";
import { getDict } from "@/i18n";
import { money, num } from "@/lib/format";
import { PageHeader, Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { ClientDialog } from "@/components/partner/client-dialog";
import { clientFormValues } from "@/components/partner/client-form-values";

export const instant = false;

export default async function ClientsPage({ params }: PageProps<"/[locale]/portal/clients">) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("partner.clients.manage")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const c = t.partner.clients;
  const rows = await listClients(user);
  const finance = user.permissions.has("partner.finance.manage");
  return (
    <>
      <PageHeader eyebrow={t.partner.nav.crm} title={c.title}>
        <ClientDialog />
      </PageHeader>
      <Panel>
        {rows.length === 0 ? (
          <p className="text-muted-foreground px-4 py-14 text-center text-sm">{c.empty}</p>
        ) : (
          <div className="table-scroll">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs">
                  <th className="px-4 py-2.5 font-medium">{c.name}</th>
                  <th className="px-3 py-2.5 font-medium">{c.contact}</th>
                  <th className="px-3 py-2.5 font-medium">{c.region}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{c.terms}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{c.shipments}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{c.outstanding}</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ c: cl, shipments, outstanding }) => (
                  <tr key={cl.id} className="hover:bg-muted/50 border-b last:border-0">
                    <td className="px-4 py-2.5">
                      <Link href={`/${locale}/portal/clients/${cl.id}`} className="font-medium underline-offset-4 hover:underline">
                        {cl.name}
                      </Link>
                      {!cl.active && <span className="bg-muted text-muted-foreground ml-2 rounded px-1.5 py-0.5 text-[11px]">{c.archived}</span>}
                      {cl.tin && <div className="text-muted-foreground font-mono text-xs">TIN {cl.tin}</div>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div>{cl.contactName ?? "—"}</div>
                      <div className="text-muted-foreground font-mono text-xs">{cl.phone ?? cl.email ?? ""}</div>
                    </td>
                    <td className="px-3 py-2.5">{cl.region ?? "—"}</td>
                    <td className="tabular px-3 py-2.5 text-right">{cl.creditTermsDays}</td>
                    <td className="tabular px-3 py-2.5 text-right">{num(Number(shipments), locale)}</td>
                    <td className={"tabular px-3 py-2.5 text-right " + (Number(outstanding) > 0 ? "font-medium" : "text-muted-foreground")}>{money(Number(outstanding), locale)}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {finance && (
                        <Link href={`/${locale}/portal/invoices/new?client=${cl.id}`} className="mr-1 text-sm underline-offset-4 hover:underline">
                          {c.invoice}
                        </Link>
                      )}
                      <ClientDialog initial={clientFormValues(cl)} />
                    </td>
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
