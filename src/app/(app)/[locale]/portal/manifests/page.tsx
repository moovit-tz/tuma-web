import Link from "next/link";
import { Send } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { listManifests } from "@/server/services/manifests";
import { fmt, getDict } from "@/i18n";
import { dateTime } from "@/lib/format";
import { PageHeader, PageTabs, Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const instant = false;

/** Manifests: what this office sent on (Sent) and what's on its way to it (Coming in), the ones on the way first. */
export default async function ManifestsPage({ params, searchParams }: PageProps<"/[locale]/portal/manifests">) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("agent.workspace") || !user.accountId) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const m = t.agent.mf;
  const dir = sp.dir === "in" ? "in" : "out";
  const [list, coming] = await Promise.all([listManifests(user, { dir, limit: 100 }), dir === "out" ? listManifests(user, { dir: "in", limit: 100 }) : null]);
  const base = `/${locale}/portal/manifests`;
  const comingN = (coming ?? list).manifests.filter((x) => x.status === "on_the_way").length;

  return (
    <div>
      <PageHeader title={m.title} description={m.sub}>
        {user.permissions.has("shipment.dispatch") && (
          <Button asChild>
            <Link href={`${base}/new`}>
              <Send /> {m.send}
            </Link>
          </Button>
        )}
      </PageHeader>
      <PageTabs
        label={m.title}
        items={[
          { href: base, label: m.out, active: dir === "out" },
          { href: `${base}?dir=in`, label: m.in, active: dir === "in", count: comingN || undefined },
        ]}
      />
      <Panel>
        {list.manifests.length === 0 ? (
          <p className="text-muted-foreground px-4 py-16 text-center text-sm">{m.empty}</p>
        ) : (
          <div className="table-scroll">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-muted-foreground h-10 border-b text-left text-xs">
                  <th className="px-4 font-medium">{m.ref}</th>
                  <th className="px-3 font-medium">{m.route}</th>
                  <th className="px-3 font-medium">{m.carrier}</th>
                  <th className="px-3 font-medium">{m.parcels}</th>
                  <th className="px-3 font-medium">{m.status}</th>
                  <th className="px-4 text-right font-medium">{m.created}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.manifests.map((x) => (
                  <tr key={x.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link href={`${base}/${x.id}`} prefetch={false} className="font-mono text-[13px] font-medium underline-offset-4 hover:underline">
                        {x.ref}
                      </Link>
                      <span className="text-muted-foreground block text-xs">{x.mode === "door" ? m.door : m.point}</span>
                    </td>
                    <td className="max-w-64 truncate px-3 py-3">
                      {x.fromName ?? "—"} → {x.mode === "door" ? m.door : (x.toName ?? "—")}
                    </td>
                    <td className="max-w-48 truncate px-3 py-3">
                      {x.carrier.name}
                      {x.carrier.plate && <span className="text-muted-foreground block font-mono text-xs">{x.carrier.plate}</span>}
                    </td>
                    <td className="tabular px-3 py-3">
                      {x.parcels}
                      {x.mode === "point" && <span className="text-muted-foreground block text-xs">{fmt(m.arrivedN, { n: x.arrived, total: x.parcels })}</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", x.status === "on_the_way" ? "bg-warn/15 text-warn" : x.status === "arrived" ? "bg-ok/15 text-ok" : "bg-muted text-muted-foreground")}>
                        {(m as Record<string, unknown>)[x.status] as string ?? x.status}
                      </span>
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-right text-xs whitespace-nowrap">{dateTime(x.createdAt, locale)}</td>
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
