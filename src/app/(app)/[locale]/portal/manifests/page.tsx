import Link from "next/link";
import { ClipboardList, PackageOpen, Send } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { listManifests } from "@/server/services/manifests";
import { fmt, getDict } from "@/i18n";
import { dateTime } from "@/lib/format";
import { PageHeader, PageTabs, Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shell/data-table";
import { EmptyState } from "@/components/shell/empty-state";
import { ManifestStatus } from "@/components/agent/manifest-status";

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
  const canSend = user.permissions.has("shipment.dispatch");
  const comingN = (coming ?? list).manifests.filter((x) => x.status === "on_the_way").length;

  return (
    <div>
      <PageHeader icon={ClipboardList} title={m.title} description={m.sub}>
        {canSend && (
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
        <DataTable
          rows={list.manifests}
          rowKey={(x) => x.id}
          href={(x) => `${base}/${x.id}`}
          minWidth={820}
          empty={
            <EmptyState
              icon={dir === "in" ? PackageOpen : ClipboardList}
              title={dir === "in" ? t.agent.empty.mfIn.title : t.agent.empty.mfOut.title}
              body={dir === "in" ? t.agent.empty.mfIn.body : t.agent.empty.mfOut.body}
              action={
                dir === "out" && canSend ? (
                  <Button asChild>
                    <Link href={`${base}/new`}>
                      <Send /> {m.send}
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          }
          columns={[
            {
              key: "ref",
              header: m.ref,
              mobile: "title",
              cell: (x) => (
                <>
                  <Link href={`${base}/${x.id}`} prefetch={false} className="font-mono text-[13px] font-medium underline-offset-4 hover:underline">
                    {x.ref}
                  </Link>
                  <span className="text-muted-foreground hidden text-xs sm:block">{x.mode === "door" ? m.door : m.point}</span>
                </>
              ),
            },
            {
              key: "route",
              header: m.route,
              mobile: "subtitle",
              className: "max-w-64",
              cell: (x) => (
                <span className="block truncate">
                  {x.fromName ?? "—"} → {x.mode === "door" ? m.door : (x.toName ?? "—")}
                </span>
              ),
            },
            {
              key: "carrier",
              header: m.carrier,
              className: "max-w-48",
              cell: (x) => (
                <span className="block truncate">
                  {x.carrier.name}
                  {x.carrier.plate && <span className="text-muted-foreground block font-mono text-xs">{x.carrier.plate}</span>}
                </span>
              ),
            },
            {
              key: "parcels",
              header: m.parcels,
              cell: (x) => (
                <span className="tabular">
                  {x.parcels}
                  {x.mode === "point" && <span className="text-muted-foreground block text-xs">{fmt(m.arrivedN, { n: x.arrived, total: x.parcels })}</span>}
                </span>
              ),
            },
            { key: "status", header: m.status, mobile: "aside", cell: (x) => <ManifestStatus status={x.status} label={((m as Record<string, unknown>)[x.status] as string) ?? x.status} /> },
            { key: "created", header: m.created, align: "right", cell: (x) => <span className="text-muted-foreground text-xs whitespace-nowrap">{dateTime(x.createdAt, locale)}</span> },
          ]}
        />
      </Panel>
    </div>
  );
}
