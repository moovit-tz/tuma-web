import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { supportInbox } from "@/server/services/admin/support-desk";
import { fmt, getDict } from "@/i18n";
import { dateTime } from "@/lib/format";
import { PageHeader, PageTabs, Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { EmptyState } from "@/components/shell/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomerSearch } from "@/components/admin/customer-search";

export const instant = false;

/** The support inbox (cases people filed) with a customer search on top. */
export default async function SupportDeskPage({ params, searchParams }: PageProps<"/[locale]/portal/admin/support">) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("support.view")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const s = t.admin.support;
  const status = sp.status === "done" ? "done" : sp.status === "all" ? "all" : "open";
  const before = typeof sp.before === "string" ? sp.before : undefined;
  const inbox = await supportInbox(user, { status, before });
  const base = `/${locale}/portal/admin/support`;
  const empty = status === "done" ? s.emptyDone : s.empty;
  return (
    <>
      <PageHeader title={s.title} description={s.sub} icon={LifeBuoy} badge={inbox.counts.fresh ? <Badge variant="destructive">{fmt(s.newCount, { n: inbox.counts.fresh })}</Badge> : undefined} />
      <div className="mb-5 max-w-xl">
        <CustomerSearch locale={locale} />
      </div>
      <PageTabs
        label={s.title}
        items={[
          { href: base, label: s.open, active: status === "open", count: inbox.counts.open },
          { href: `${base}?status=done`, label: s.done, active: status === "done" },
          { href: `${base}?status=all`, label: s.all, active: status === "all" },
        ]}
      />
      <Panel
        footer={
          inbox.next ? (
            <div className="flex justify-end px-4 py-2.5">
              <Button size="sm" variant="outline" asChild>
                <Link href={`${base}?${new URLSearchParams({ ...(status !== "open" ? { status } : {}), before: inbox.next })}`}>{s.older}</Link>
              </Button>
            </div>
          ) : undefined
        }
      >
        {inbox.rows.length === 0 ? (
          <EmptyState icon={LifeBuoy} title={empty.title} body={empty.body} />
        ) : (
          <div className="table-scroll">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-muted-foreground h-10 border-b text-left text-xs">
                  <th className="px-4 font-medium">{s.ref}</th>
                  <th className="px-3 font-medium">{s.kind}</th>
                  <th className="px-3 font-medium">{s.from}</th>
                  <th className="px-3 font-medium">{s.summary}</th>
                  <th className="px-3 font-medium">{s.status}</th>
                  <th className="px-4 font-medium">{s.received}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {inbox.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/40">
                    <td className="px-4 py-2.5">
                      <Link href={`${base}/${r.id}`} className="font-mono text-[13px] font-medium underline-offset-4 hover:underline">
                        {r.ref}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">{s.kinds[r.kind] ?? r.kind}</td>
                    <td className="px-3 py-2.5">
                      <div>{r.name}</div>
                      <div className="text-muted-foreground text-xs">{r.phone ?? r.email ?? "—"}</div>
                    </td>
                    <td className="max-w-72 px-3 py-2.5">
                      <span className="line-clamp-2">{r.summary || "—"}</span>
                      {r.waybill && <span className="text-muted-foreground font-mono text-xs">{r.waybill}</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={r.status === "new" ? "destructive" : "outline"}>{s.statuses[r.status] ?? r.status}</Badge>
                    </td>
                    <td className="text-muted-foreground px-4 py-2.5 text-xs whitespace-nowrap">{dateTime(r.createdAt, locale)}</td>
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
