import Link from "next/link";
import { FileWarning } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { CLAIM_KINDS, listClaims } from "@/server/services/admin/claims";
import { getDict } from "@/i18n";
import { dateOnly, money, num } from "@/lib/format";
import { PageHeader, PageTabs, Panel, Stat } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { EmptyState } from "@/components/shell/empty-state";
import { Badge } from "@/components/ui/badge";
import { ActionForm } from "@/components/admin/kit";
import { openClaimAction } from "@/app/actions/admin";

export const instant = false;

const TONE: Record<string, "outline" | "secondary" | "destructive" | "default"> = { open: "outline", investigating: "secondary", proposed: "default", settled: "outline", rejected: "secondary" };

/** The claims desk: open claims first, with the network's claims rate and what was paid and recovered. */
export default async function ClaimsPage({ params, searchParams }: PageProps<"/[locale]/portal/admin/claims">) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("claims.handle")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const c = t.staff.claims;
  const tab = sp.tab === "closed" ? "closed" : "active";
  const { rows, kpis } = await listClaims(user, tab);
  const base = `/${locale}/portal/admin/claims`;
  return (
    <>
      <PageHeader title={c.title} description={c.sub} icon={FileWarning} />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={c.kpiOpen} value={num(kpis.open, locale)} tone={kpis.open ? "warn" : undefined} />
        <Stat label={c.kpiProposed} value={num(kpis.proposed, locale)} />
        <Stat label={c.kpiPaid} value={money(kpis.paid30, locale)} hint={`${c.kpiRecovered}: ${money(kpis.recovered, locale)}`} />
        <Stat label={c.kpiRate} value={kpis.per1000.toLocaleString(locale)} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <PageTabs
            label={c.title}
            items={[
              { href: base, label: c.active, active: tab === "active" },
              { href: `${base}?tab=closed`, label: c.closed, active: tab === "closed" },
            ]}
          />
          <Panel>
            {rows.length === 0 ? (
              <EmptyState icon={FileWarning} title={c.empty.title} body={c.empty.body} />
            ) : (
              <div className="table-scroll">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="h-10 text-left">
                      <th className="px-4">{c.ref}</th>
                      <th className="px-3">{c.claimant}</th>
                      <th className="px-3">{c.kind}</th>
                      <th className="px-3 text-right">{c.amount}</th>
                      <th className="px-3">{c.status}</th>
                      <th className="px-4">{c.opened_at}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/40">
                        <td className="px-4 py-3">
                          <Link href={`${base}/${r.id}`} className="font-mono text-[13px] font-semibold hover:underline">
                            {r.ref}
                          </Link>
                          <div className="text-muted-foreground font-mono text-xs">{r.waybill}</div>
                        </td>
                        <td className="px-3 py-3">{r.claimantName}</td>
                        <td className="px-3 py-3">{c.kinds[r.kind] ?? r.kind}</td>
                        <td className="tabular px-3 py-3 text-right">{money(r.settledAmount ?? r.proposedAmount ?? r.amountClaimed, locale)}</td>
                        <td className="px-3 py-3">
                          <Badge variant={TONE[r.status] ?? "outline"}>{c.statuses[r.status] ?? r.status}</Badge>
                          {r.liableParty && <div className="text-muted-foreground mt-1 text-xs">{c.parties[r.liableParty]}</div>}
                        </td>
                        <td className="text-muted-foreground px-4 py-3 text-xs whitespace-nowrap">{dateOnly(r.createdAt, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
        <Panel title={c.newTitle} className="self-start">
          <ActionForm
            className="p-4"
            columns={1}
            action={openClaimAction}
            submit={c.open}
            done={c.opened}
            fields={[
              { name: "waybill", label: c.waybill, required: true, placeholder: "AAA001" },
              { name: "kind", label: c.kind, type: "select", options: CLAIM_KINDS.map((k) => ({ value: k, label: c.kinds[k] })) },
              { name: "claimantName", label: c.claimant, required: true, min: 2 },
              { name: "claimantPhone", label: c.claimantPhone, hint: c.claimantPhoneHint, placeholder: "07XX XXX XXX" },
              { name: "amountClaimed", label: c.amount, type: "number", required: true },
              { name: "description", label: c.description, type: "textarea", required: true, min: 10 },
            ]}
          />
        </Panel>
      </div>
    </>
  );
}
