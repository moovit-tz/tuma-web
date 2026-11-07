import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { manifestDetail } from "@/server/services/manifests";
import { DomainError } from "@/server/services/shipments";
import { fmt, getDict } from "@/i18n";
import { dateTime } from "@/lib/format";
import { Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { StateBadge } from "@/components/shipments/state-badge";
import { CheckInRow, ManifestCheckIn } from "@/components/agent/manifest-check-in";
import { PrintButton } from "@/components/agent/print-button";
import { cn } from "@/lib/utils";

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
      <div>
        <Link href={`/${locale}/portal/manifests${d.outgoing ? "" : "?dir=in"}`} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm print:hidden">
          <ArrowLeft className="size-4" /> {m.back}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="eyebrow">{d.mode === "door" ? m.door : m.point}</div>
            <h1 className="mt-1 font-mono text-[26px] font-semibold tracking-tight sm:text-[30px]">{d.ref}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", d.status === "on_the_way" ? "bg-warn/15 text-warn" : d.status === "arrived" ? "bg-ok/15 text-ok" : "bg-muted")}>{statusLabel}</span>
              <span className="text-muted-foreground">{fmt(m.totals, { parcels: d.totals.parcels, pieces: d.totals.pieces, kg: d.totals.weightKg })}</span>
              <span className="text-muted-foreground">{dateTime(d.createdAt, locale)}</span>
            </div>
          </div>
          <PrintButton label={m.print} />
        </div>
      </div>

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
        <div className="table-scroll">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-muted-foreground h-10 border-b text-left text-xs">
                <th className="w-10 px-4 font-medium">#</th>
                <th className="px-3 font-medium">{t.agent.desk.waybill}</th>
                <th className="px-3 font-medium">{t.agent.desk.to}</th>
                <th className="px-3 font-medium">{t.agent.desk.goods}</th>
                <th className="px-3 font-medium">{t.agent.desk.state}</th>
                {d.mode === "point" && <th className="px-4 text-right font-medium">{m.inAt}</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {d.parcels.map((p) => (
                <tr key={p.waybill} className={cn(p.arrived && "bg-ok/5")}>
                  <td className="text-muted-foreground tabular px-4 py-2.5">{p.seq}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/${locale}/portal/parcels/${p.waybill}`} prefetch={false} className="font-mono text-[13px] font-medium underline-offset-4 hover:underline">
                      {p.waybill}
                    </Link>
                  </td>
                  <td className="max-w-56 truncate px-3 py-2.5">
                    {p.to.name}
                    <span className="text-muted-foreground block truncate text-xs">
                      {p.to.phone} · {[p.to.district, p.to.region].filter(Boolean).join(", ")}
                    </span>
                  </td>
                  <td className="max-w-52 truncate px-3 py-2.5">
                    {p.goods}
                    <span className="text-muted-foreground block text-xs">
                      {p.pieces} · {p.weightKg} kg
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <StateBadge state={p.state} label={t.states[p.state]} />
                  </td>
                  {d.mode === "point" && (
                    <td className="px-4 py-2.5 text-right">{p.arrived ? <Check className="text-ok ml-auto size-4" /> : incoming ? <CheckInRow id={d.id} waybill={p.waybill} /> : <span className="text-muted-foreground">—</span>}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
