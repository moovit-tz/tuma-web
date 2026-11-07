import { notFound } from "next/navigation";
import Link from "next/link";
import { Info, Send } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { agentParcel } from "@/server/services/agent-parcels";
import { DomainError } from "@/server/services/shipments";
import { fmt, getDict } from "@/i18n";
import { dateTime, money } from "@/lib/format";
import { PageHeader, Panel } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { NoAccess } from "@/components/shell/no-access";
import { StateBadge } from "@/components/shipments/state-badge";
import { StateIcon, stateColor } from "@/components/shipments/state-icon";
import { AgentParcelActions } from "@/components/agent/parcel-actions";
import { cn } from "@/lib/utils";

export const instant = false;

type Party = { name: string; phone: string; email?: string; company?: { tin?: string; contactName?: string }; address: { region: string; district?: string; street?: string; landmark?: string } };

/** One parcel at the office: where it is, its next step at the counter, who it's from and for, the goods, the money, and its history. */
export default async function AgentParcelPage({ params }: PageProps<"/[locale]/portal/parcels/[waybill]">) {
  const { locale, waybill } = await params;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("agent.workspace")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const a = t.agent;
  const r = await agentParcel(user, decodeURIComponent(waybill)).catch((e) => {
    if (e instanceof DomainError && e.status === 404) return null;
    throw e;
  });
  if (!r) notFound();
  const p = r.parcel;
  const shipper = p.shipper as Party;
  const consignee = p.consignee as Party;
  const label = (x: { en: string; sw: string }) => (locale === "sw" ? x.sw : x.en);
  // The sender pays a parcel they prepay; otherwise the receiver at handover.
  const payerPhone = p.paymentTerms === "prepaid" ? shipper.phone : consignee.phone;
  const evts = [...p.events].reverse();

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: `/${locale}/portal/parcels`, label: a.parcel.back }}
        eyebrow={
          <span className="flex flex-wrap gap-x-3">
            <span className="text-parcel">{t.service[p.serviceLevel ?? ""] ?? "Parcel"}</span>
            <span>{p.deliveryMode === "wakala_collect" ? fmt(a.parcel.collectAt, { place: p.collectAt ?? "—" }) : a.parcel.door}</span>
          </span>
        }
        title={<span className="font-mono">{p.waybill}</span>}
        badge={<StateBadge state={p.state} label={t.states[p.state]} className="text-sm" />}
        description={dateTime(p.createdAt, locale)}
      >
        {r.canDispatch && (
          <Button asChild>
            <Link href={`/${locale}/portal/manifests/new?waybill=${encodeURIComponent(p.waybill)}`}>
              <Send /> {a.parcel.dispatch}
            </Link>
          </Button>
        )}
      </PageHeader>

      {(p.needsPrice || p.awaitingPayment || p.bookedAhead) && (
        <p className="border-warn/40 bg-warn/10 flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm">
          <Info className="text-warn size-4 shrink-0" />
          {p.needsPrice ? a.parcel.needsPrice : p.awaitingPayment ? a.parcel.awaitingPayment : a.parcel.bookedAhead}
        </p>
      )}

      <Panel banner title={a.parcel.actions}>
        <div className="p-4">
          <AgentParcelActions
            waybill={p.waybill}
            moves={r.moves}
            needsPrice={p.needsPrice}
            awaitingPayment={p.awaitingPayment}
            payerPhone={payerPhone ?? null}
            receiverName={consignee.name}
            due={{ total: p.toCollect.total, collected: p.toCollect.collected, methods: p.toCollect.methods ?? [] }}
            failReasons={r.failReasons.map((x) => ({ code: x.code, label: label(x) }))}
            canCancel={r.canCancel}
            cancelReasons={r.cancelReasons.map((x) => ({ code: x.code, label: label(x) }))}
            canPrint={user.permissions.has("label.print") && !p.needsPrice}
          />
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title={a.parcel.timeline}>
          <ol className="px-4 py-4">
            {evts.map((e, i) => {
              const first = i === 0;
              const color = stateColor(e.state);
              return (
                <li key={`${e.type}-${String(e.at)}-${i}`} className="relative grid grid-cols-[30px_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
                  {i < evts.length - 1 && <span aria-hidden className="absolute top-8 bottom-1 left-[14px] w-0.5 rounded-full opacity-40" style={{ background: color }} />}
                  <span
                    aria-hidden
                    className="relative grid size-[30px] place-items-center rounded-full"
                    style={first ? { background: color, color: "white" } : { background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
                  >
                    <StateIcon state={e.state} solid={first} className="size-[15px]" />
                  </span>
                  <div className="min-w-0 pt-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className={cn("font-medium", first && "text-[15px]")} style={first ? { color } : undefined}>
                        {e.state ? t.states[e.state] : e.type.replace(/[._]/g, " ")}
                      </span>
                      <time className="text-muted-foreground tabular text-xs">{dateTime(e.at, locale)}</time>
                    </div>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 text-[13px]">
                      {e.place && <span>{e.place}</span>}
                      {(e.reasonEn || e.reasonSw) && <span>{locale === "sw" ? e.reasonSw : e.reasonEn}</span>}
                    </div>
                    {e.note && <p className="mt-1 text-[13px]">{e.note}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>

        <div className="space-y-6">
          <Panel title={a.parcel.sender}>
            <PartyBlock party={shipper} labels={a.parcel} />
          </Panel>
          <Panel title={a.parcel.receiver}>
            <PartyBlock party={consignee} labels={a.parcel} instructions={p.instructions} />
          </Panel>
          <Panel title={`${a.parcel.goods} · ${p.pieces} ${t.shipments.pieces.toLowerCase()}`}>
            <dl className="grid grid-cols-2 gap-3 px-4 py-3 text-sm">
              <div className="col-span-2">
                <dt className="text-muted-foreground text-xs">{a.parcel.goods}</dt>
                <dd>{p.goods}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">{a.parcel.weight}</dt>
                <dd className="tabular">{p.weightKg ? `${p.weightKg} kg` : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">{a.parcel.declared}</dt>
                <dd className="tabular">{p.declaredValue ? money(p.declaredValue, locale) : "—"}</dd>
              </div>
              {p.specialHandling.length > 0 && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground text-xs">{a.parcel.handling}</dt>
                  <dd className="capitalize">{p.specialHandling.join(", ").replace(/_/g, " ")}</dd>
                </div>
              )}
            </dl>
          </Panel>
          <Panel title={a.parcel.payment}>
            <div className="space-y-2 px-4 py-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{t.payment[p.paymentTerms] ?? p.paymentTerms}</span>
                <span className="tabular font-semibold">{p.total ? money(p.total, locale) : "—"}</span>
              </div>
              {(p.extras as { label: string; amount: number }[] | null)?.map((x) => (
                <div key={x.label} className="text-muted-foreground flex justify-between gap-3 text-xs">
                  <span>{x.label}</span>
                  <span className="tabular">{money(x.amount, locale)}</span>
                </div>
              ))}
              <p className={cn("text-xs", p.paidAt ? "text-ok" : "text-muted-foreground")}>
                {p.paidAt
                  ? [p.paidWith ? fmt(a.parcel.paidWith, { method: t.pay.methods[p.paidWith] ?? p.paidWith }) : null, fmt(a.parcel.paidOn, { at: dateTime(p.paidAt, locale) })].filter(Boolean).join(" · ")
                  : a.parcel.notPaid}
              </p>
              {p.toCollect.total > 0 && (
                <div className="flex justify-between gap-3 border-t pt-2">
                  <span>{a.parcel.toCollect}</span>
                  <span className={cn("tabular font-semibold", p.toCollect.collected && "text-ok")}>
                    {money(p.toCollect.total, locale)}
                    {p.toCollect.collected && ` · ${a.parcel.collected}`}
                  </span>
                </div>
              )}
              {p.invoice && <p className="text-muted-foreground text-xs">{fmt(a.parcel.invoice, { number: p.invoice.number })}</p>}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function PartyBlock({ party, labels, instructions }: { party: Party; labels: { company: string; instructions: string }; instructions?: string | null }) {
  return (
    <div className="space-y-1 px-4 py-3 text-sm">
      <p className="font-medium">{party.name}</p>
      <p className="tabular">
        <a href={`tel:${party.phone}`} className="underline-offset-4 hover:underline">
          {party.phone}
        </a>
      </p>
      {party.company?.tin && (
        <p className="text-muted-foreground text-xs">
          {labels.company} · TIN {party.company.tin}
          {party.company.contactName ? ` · ${party.company.contactName}` : ""}
        </p>
      )}
      <p className="text-muted-foreground text-xs">{[party.address.street, party.address.landmark, party.address.district, party.address.region].filter(Boolean).join(", ")}</p>
      {instructions && (
        <p className="text-muted-foreground text-xs">
          {labels.instructions}: {instructions}
        </p>
      )}
    </div>
  );
}
