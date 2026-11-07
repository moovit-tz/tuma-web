import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { manifestDetail } from "@/server/services/manifests";
import { DomainError } from "@/server/services/shipments";
import { fmt, getDict } from "@/i18n";
import { dateTime } from "@/lib/format";
import { PageHeader, Panel } from "@/components/shell/page-header";
import { ManifestStatus } from "@/components/agent/manifest-status";
import { NoAccess } from "@/components/shell/no-access";
import { StateBadge } from "@/components/shipments/state-badge";
import { CheckInRow, ManifestCheckIn } from "@/components/agent/manifest-check-in";
import { PrintButton } from "@/components/agent/print-button";
import { DataTable } from "@/components/shell/data-table";

export const instant = false;

/** One manifest: where it goes, who carries it, its parcels, and (at the office it's coming to) checking them in. */
export default async function ManifestPage({ params }: PageProps<"/[locale]/portal/manifests/[id]">) {
  const { locale, id } = await params;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("agent.workspace") || !user.accountId) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const m = t.agent.mf;
  const d = await manifestDetail(user, id).catch((e) => {
    if (e instanceof DomainError && e.status === 404) return null;
    throw e;
  });
  if (!d) notFound();
  const incoming = !d.outgoing && d.mode === "point" && d.status === "on_the_way";
  const statusLabel = ((m as Record<string, unknown>)[d.status] as string) ?? d.status;
  const c = d.carrier as { kind: string; name: string; phone?: string; plate?: string; ref?: string };

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: `/${locale}/portal/manifests${d.outgoing ? "" : "?dir=in"}`, label: m.back }}
        eyebrow={d.mode === "door" ? m.door : m.point}
        title={<span className="font-mono">{d.ref}</span>}
        badge={<ManifestStatus status={d.status} label={statusLabel} />}
        description={`${fmt(m.totals, { parcels: d.totals.parcels, pieces: d.totals.pieces, kg: d.totals.weightKg })} · ${dateTime(d.createdAt, locale)}`}
      >
        <PrintButton label={m.print} />
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel title={m.route}>
          <div className="space-y-1 px-4 py-3 text-sm">
            <p className="font-medium">{[d.from.business, d.from.name].filter(Boolean).join(" · ")}</p>
            <p className="text-muted-foreground text-xs">→ {d.to ? [d.to.business, d.to.name, d.to.district, d.to.region].filter(Boolean).join(" · ") : m.door}</p>
          </div>
        </Panel>
        <Panel title={m.carrier}>
          <div className="space-y-1 px-4 py-3 text-sm">
            <p className="font-medium">{c.name}</p>
            <p className="text-muted-foreground text-xs">{[c.phone, c.plate, c.ref].filter(Boolean).join(" · ") || "—"}</p>
            {d.job && (
              <p className="text-muted-foreground text-xs">
                {fmt(m.tumaJob, { ref: d.job.ref })} · {d.job.assigned ? m.jobAssigned : m.jobWaiting}
              </p>
            )}
          </div>
        </Panel>
        <Panel title={m.note}>
          <div className="space-y-1 px-4 py-3 text-sm">
            <p>{d.note ?? "—"}</p>
            {d.createdBy && <p className="text-muted-foreground text-xs">{fmt(m.by, { name: d.createdBy })}</p>}
          </div>
        </Panel>
      </div>

      {incoming && (
        <Panel banner title={m.checkInTitle} description={`${m.checkInBody} · ${fmt(m.arrivedN, { n: d.totals.arrived, total: d.totals.parcels })}`} className="print:hidden">
          <div className="p-4">
            <ManifestCheckIn id={d.id} />
          </div>
        </Panel>
      )}

      <Panel title={`${m.parcels} · ${d.totals.parcels}`}>
        <DataTable
          rows={d.parcels}
          rowKey={(p) => p.waybill}
          minWidth={760}
          rowClassName={(p) => (p.arrived ? "bg-ok/5" : undefined)}
          columns={[
            { key: "seq", header: "#", mobile: "hidden", className: "w-10", cell: (p) => <span className="text-muted-foreground tabular">{p.seq}</span> },
            {
              key: "waybill",
              header: t.agent.desk.waybill,
              mobile: "title",
              cell: (p) => (
                <Link href={`/${locale}/portal/parcels/${p.waybill}`} prefetch={false} className="font-mono text-[13px] font-medium underline-offset-4 hover:underline">
                  {p.waybill}
                </Link>
              ),
            },
            {
              key: "to",
              header: t.agent.desk.to,
              mobile: "subtitle",
              className: "max-w-56",
              cell: (p) => (
                <span className="block truncate">
                  {p.to.name}
                  <span className="text-muted-foreground hidden truncate text-xs sm:block">
                    {p.to.phone} · {[p.to.district, p.to.region].filter(Boolean).join(", ")}
                  </span>
                </span>
              ),
            },
            {
              key: "goods",
              header: t.agent.desk.goods,
              className: "max-w-52",
              cell: (p) => (
                <span className="block truncate">
                  {p.goods}
                  <span className="text-muted-foreground block text-xs">
                    {p.pieces} · {p.weightKg} kg
                  </span>
                </span>
              ),
            },
            { key: "state", header: t.agent.desk.state, mobile: "aside", cell: (p) => <StateBadge state={p.state} label={t.states[p.state]} /> },
            ...(d.mode === "point"
              ? [
                  {
                    key: "in",
                    header: m.inAt,
                    align: "right" as const,
                    cell: (p: (typeof d.parcels)[number]) =>
                      p.arrived ? <Check className="text-ok ml-auto size-4" aria-label={m.arrived} /> : incoming ? <CheckInRow id={d.id} waybill={p.waybill} /> : <span className="text-muted-foreground">—</span>,
                  },
                ]
              : []),
          ]}
        />
      </Panel>
    </div>
  );
}
