import Link from "next/link";
import { Building2, Search, TriangleAlert, User } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { agentCustomers, duplicateCustomers } from "@/server/services/customers";
import { fmt, getDict } from "@/i18n";
import { num, relative } from "@/lib/format";
import { PageHeader, PageTabs, Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { DuplicateGroups } from "@/components/agent/customer-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const instant = false;

/** The office's customers (people and companies), searchable, with possible duplicates to merge. */
export default async function CustomersPage({ params, searchParams }: PageProps<"/[locale]/portal/customers">) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("agent.workspace") || !user.accountId) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const c = t.agent.cust;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const kind = sp.kind === "individual" || sp.kind === "company" ? sp.kind : undefined;
  const [list, dups] = await Promise.all([agentCustomers(user, { q: q || undefined, kind, limit: 200 }), q ? null : duplicateCustomers(user)]);
  const base = `/${locale}/portal/customers`;
  const href = (k?: string) => {
    const u = new URLSearchParams();
    if (k) u.set("kind", k);
    if (q) u.set("q", q);
    const s = u.toString();
    return s ? `${base}?${s}` : base;
  };

  return (
    <div>
      <PageHeader title={c.title} description={c.sub} />
      <PageTabs
        label={c.title}
        items={[
          { href: href(), label: c.all, active: !kind },
          { href: href("individual"), label: c.individual, active: kind === "individual" },
          { href: href("company"), label: c.company, active: kind === "company" },
        ]}
        aside={
          <form action={base} className="flex gap-2">
            {kind && <input type="hidden" name="kind" value={kind} />}
            <div className="relative">
              <Search aria-hidden className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input name="q" defaultValue={q} placeholder={c.search} aria-label={c.search} className="h-9 w-64 pl-8" />
            </div>
            <Button type="submit" variant="outline" size="sm" className="h-9">
              {t.common.search}
            </Button>
          </form>
        }
      />
      {dups && dups.groups.length > 0 && (
        <Panel title={`${c.dupTitle} · ${dups.groups.length}`} description={c.dupBody} className="mb-6">
          <DuplicateGroups groups={dups.groups} canMerge={dups.canMerge} locale={locale} />
        </Panel>
      )}
      <Panel>
        {list.customers.length === 0 ? (
          <p className="text-muted-foreground px-4 py-16 text-center text-sm">{q ? c.noMatch : c.empty}</p>
        ) : (
          <div className="table-scroll">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-muted-foreground h-10 border-b text-left text-xs">
                  <th className="px-4 font-medium">{c.name}</th>
                  <th className="px-3 font-medium">{c.phone}</th>
                  <th className="px-3 font-medium">{c.place}</th>
                  <th className="px-3 text-right font-medium">{c.sent}</th>
                  <th className="px-3 text-right font-medium">{c.received}</th>
                  <th className="px-4 text-right font-medium">{c.last}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.customers.map((x) => (
                  <tr key={x.id} className="hover:bg-muted/40">
                    <td className="max-w-72 px-4 py-2.5">
                      <Link href={`${base}/${x.id}`} prefetch={false} className="flex items-center gap-2 font-medium underline-offset-4 hover:underline">
                        {x.kind === "company" ? <Building2 className="text-muted-foreground size-4 shrink-0" /> : <User className="text-muted-foreground size-4 shrink-0" />}
                        <span className="truncate">{x.name}</span>
                        {x.flagged > 0 && <TriangleAlert aria-label={fmt(c.flagged, { n: x.flagged })} className="text-brand-ink size-4 shrink-0" />}
                      </Link>
                      {x.contactName && <span className="text-muted-foreground block truncate pl-6 text-xs">{x.contactName}</span>}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[13px] whitespace-nowrap">{x.phone}</td>
                    <td className="text-muted-foreground max-w-48 truncate px-3 py-2.5">{[x.district, x.region].filter(Boolean).join(", ") || "—"}</td>
                    <td className="tabular px-3 py-2.5 text-right">{num(x.sent, locale)}</td>
                    <td className="tabular px-3 py-2.5 text-right">{num(x.received, locale)}</td>
                    <td className="text-muted-foreground px-4 py-2.5 text-right text-xs whitespace-nowrap">{x.lastSeenAt ? relative(x.lastSeenAt, locale) : "—"}</td>
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
