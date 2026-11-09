import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Clock3 } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { getShipment, listReasonCodes, type ShipmentDetail } from "@/server/services/shipments";
import { getDict, type Dict } from "@/i18n";
import { dateOnly, dateTime, kg, money } from "@/lib/format";
import { canTransition, consigneeEditable, isBeforeHandover, nextStates, type ShipmentState } from "@/domain/states";
import { pieceLabel } from "@/domain/waybill-number";
import { maskPhone } from "@/domain/phone";
import { Panel } from "@/components/shell/page-header";
import { StateBadge } from "@/components/shipments/state-badge";
import { StateIcon, stateColor } from "@/components/shipments/state-icon";
import { MerchantActions, StaffActions, ResolveException } from "@/components/shipments/shipment-actions";
import { cn } from "@/lib/utils";

export async function ShipmentDetailPage({ locale, waybill }: { locale: string; waybill: string }) {
  const user = (await getCurrentUser())!;
  const s = await getShipment(user, decodeURIComponent(waybill));
  if (!s) notFound();
  const t = getDict(locale);
  const perms = user.permissions;
  const state = s.state as ShipmentState;

  const operator = perms.has("shipment.read.all") || perms.has("partner.cargo.operate") || perms.has("shipment.override");
  const reasonCodes = operator ? await listReasonCodes() : [];
  const allowedNext = nextStates(state).filter((to) => canTransition(state, to, perms).ok);
  const base = perms.has("partner.cargo.read") && !perms.has("shipment.read.all") ? `/${locale}/portal/cargo` : `/${locale}/portal/shipments`;

  return (
    <div className="space-y-6">
      <div>
        <Link href={base} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="size-4" /> {t.shipments.title}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="eyebrow flex flex-wrap gap-x-3">
              <span className="text-parcel">{t.detail.parcel}</span>
              {s.merchantRef && <span>{s.merchantRef}</span>}
              {perms.has("shipment.read.all") && <span>{s.accountName}</span>}
            </div>
            <h1 className="mt-1 font-mono text-[26px] font-semibold tracking-tight sm:text-[30px]">{s.waybill}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <StateBadge state={s.state} label={t.states[s.state]} exception={s.exception} exceptionLabel={t.states.EXCEPTION} className="text-sm" />
              {s.promisedAt && !s.deliveredAt && (
                <span className="text-muted-foreground inline-flex items-center gap-1 text-sm">
                  <Clock3 className="size-4" /> {t.detail.promised} {dateOnly(s.promisedAt, locale)}
                </span>
              )}
              {s.deliveredAt && <span className="text-ok text-sm">{t.detail.delivered} {dateTime(s.deliveredAt, locale)}</span>}
            </div>
            {(s.returnOf || s.returnWaybill) && (
              <p className="mt-2 text-sm">
                {s.returnOf ? t.detail.returnOf : t.detail.returnedAs}{" "}
                <Link className="font-mono underline underline-offset-4" href={`${base}/${s.returnOf ?? s.returnWaybill}`}>
                  {s.returnOf ?? s.returnWaybill}
                </Link>
              </p>
            )}
          </div>
          <MerchantActions
            waybill={s.waybill}
            canPrint={perms.has("label.print")}
            canCancel={perms.has("shipment.cancel") && canTransition(state, "CANCELLED", perms).ok}
            cancelFree={isBeforeHandover(state)}
            canEdit={perms.has("shipment.edit_consignee") && consigneeEditable(state)}
            consignee={{ name: s.consignee.name, phone: s.consignee.phone, landmark: s.consignee.address.landmark ?? "", instructions: s.deliveryInstructions ?? "" }}
          />
        </div>
      </div>

      {operator && (perms.has("shipment.override") || perms.has("dev.simulate") || perms.has("exception.manage") || allowedNext.length > 0) && (
        <StaffActions
          waybill={s.waybill}
          nextStates={allowedNext}
          reasonCodes={reasonCodes.map((r) => ({ code: r.code, label: locale === "sw" ? r.labelSw : r.labelEn, kind: r.kind }))}
          canSimulate={perms.has("dev.simulate")}
          collectMethods={s.cod && s.cod.amountDue + s.cod.feeDue > 0 ? s.collectMethods : []}
          canException={perms.has("exception.manage")}
        />
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Timeline s={s} t={t} locale={locale} />
          {s.exceptions.length > 0 && (
            <Panel title={t.detail.exceptionsTitle}>
              <ul className="divide-y">
                {s.exceptions.map((ex) => (
                  <li key={ex.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
                    <div>
                      <span className="bg-muted mr-2 rounded px-1.5 py-0.5 font-mono text-xs">{ex.reasonCode}</span>
                      {ex.note}
                      <div className="text-muted-foreground mt-1 text-xs">
                        {ex.status} · {dateTime(ex.openedAt, locale)}
                        {ex.resolution && ` · ${ex.resolution}`}
                      </div>
                    </div>
                    {ex.status !== "resolved" && perms.has("exception.manage") && <ResolveException id={ex.id} />}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Parties s={s} t={t} mask={false} />
          <Panel title={t.detail.charges}>
            {s.charges ? (
              <dl className="px-4 py-3 text-sm">
                {s.charges.lines.map((l) => (
                  <div key={l.code} className="flex justify-between gap-3 py-1">
                    <dt className="text-muted-foreground">{l.label}</dt>
                    <dd className="tabular">{money(l.amount, locale)}</dd>
                  </div>
                ))}
                <div className="mt-1 flex justify-between gap-3 border-t pt-2">
                  <dt className="text-muted-foreground">{t.detail.vat}</dt>
                  <dd className="tabular">{money(s.charges.tax, locale)}</dd>
                </div>
                <div className="flex justify-between gap-3 pt-1 font-semibold">
                  <dt>{t.detail.total}</dt>
                  <dd className="tabular">{money(s.charges.total, locale)}</dd>
                </div>
                <div className="text-muted-foreground mt-2 text-xs">
                  {t.service[s.serviceLevel ?? ""]} · {t.payment[s.paymentTerms]} · v{s.charges.version}
                </div>
              </dl>
            ) : (
              <p className="text-muted-foreground p-4 text-sm">—</p>
            )}
          </Panel>
          <Panel title={t.pay.title}>
            <div className="px-4 py-3 text-sm">
              <div className="font-medium">{t.payment[s.paymentTerms]}</div>
              {s.prepayMethod && <div className="text-muted-foreground text-xs">{t.pay.prepayWith}: {t.pay.methods[s.prepayMethod]}</div>}
              {s.cod && (
                <dl className="mt-3 grid grid-cols-3 gap-2 border-t pt-3">
                  <div>
                    <dt className="text-muted-foreground text-xs">{t.pay.goods}</dt>
                    <dd className="tabular font-medium">{money(s.cod.amountDue, locale)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">{t.pay.deliveryFee}</dt>
                    <dd className="tabular font-medium">{money(s.cod.feeDue, locale)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">{t.pay.dueAtDoor}</dt>
                    <dd className="tabular font-semibold">{money(s.cod.amountDue + s.cod.feeDue, locale)}</dd>
                  </div>
                  <div className="col-span-3 flex flex-wrap justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">
                      {t.pay.receiverPays}: {s.collectMethods.map((m) => t.pay.methods[m]).join(", ")}
                    </span>
                    <span className="font-medium capitalize">
                      {s.cod.status}
                      {s.cod.method && ` · ${t.pay.methods[s.cod.method]}`}
                    </span>
                  </div>
                </dl>
              )}
            </div>
          </Panel>
          <Panel title={`${t.detail.goods} · ${s.piecesCount} ${t.shipments.pieces.toLowerCase()}`}>
            <div className="px-4 py-3 text-sm">
              <p>{s.goodsDescription}</p>
              <p className="text-muted-foreground text-xs capitalize">{s.goodsCategory}{s.specialHandling.length ? ` · ${s.specialHandling.join(", ")}` : ""}</p>
              <dl className="mt-3 grid grid-cols-3 gap-2">
                <div>
                  <dt className="text-muted-foreground text-xs">{t.detail.actual}</dt>
                  <dd className="tabular">{kg(s.actualWeightG, locale)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">{t.detail.volumetric}</dt>
                  <dd className="tabular">{kg(s.volumetricWeightG, locale)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">{t.detail.chargeable}</dt>
                  <dd className="tabular font-medium">{kg(s.chargeableWeightG, locale)}</dd>
                </div>
              </dl>
              <ul className="mt-3 space-y-1 border-t pt-3">
                {s.pieces.map((p) => (
                  <li key={p.seq} className="flex justify-between gap-3 font-mono text-xs">
                    <span>{pieceLabel(s.waybill, p.seq, s.piecesCount)}</span>
                    <span className="text-muted-foreground">
                      {kg(p.weightG, locale)} · {p.lengthCm}×{p.widthCm}×{p.heightCm}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground mt-3 text-xs">
                {t.detail.labelPrints}: {s.labelPrints} · {t.detail.attempts}: {s.attempts}
              </p>
            </div>
          </Panel>
          {s.notifications.length > 0 && (
            <Panel title={t.detail.notifications}>
              <ul className="divide-y text-sm">
                {s.notifications.slice(0, 8).map((n) => (
                  <li key={n.id} className="flex justify-between gap-3 px-4 py-2">
                    <span className="font-mono text-xs">{n.template}</span>
                    <span className="text-muted-foreground text-xs">
                      {n.channel} · {n.language} · {n.recipientMasked} · {n.status}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function Timeline({ s, t, locale }: { s: ShipmentDetail; t: Dict; locale: string }) {
  const evts = [...s.events].reverse();
  return (
    <Panel title={t.detail.timeline}>
      <ol className="px-4 py-4">
        {evts.map((e, i) => {
          const label = e.stateAfter ? t.states[e.stateAfter] : e.type.replace(/[._]/g, " ");
          const first = i === 0;
          return (
            <li key={e.id} className="relative grid grid-cols-[30px_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
              {i < evts.length - 1 && (
                <span aria-hidden className="absolute top-8 bottom-1 left-[14px] w-0.5 rounded-full opacity-40" style={{ background: stateColor(e.stateAfter) }} />
              )}
              <span
                aria-hidden
                className={cn("relative grid size-[30px] place-items-center rounded-full", e.estimated && "border-muted-foreground border border-dashed")}
                style={
                  e.estimated
                    ? { color: "var(--muted-foreground)" }
                    : first
                      ? { background: stateColor(e.stateAfter), color: "white" }
                      : { background: `color-mix(in srgb, ${stateColor(e.stateAfter)} 14%, transparent)`, color: stateColor(e.stateAfter) }
                }
              >
                <StateIcon state={e.stateAfter} solid={first && !e.estimated} className="size-[15px]" />
              </span>
              <div className="min-w-0 pt-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className={cn("font-medium", first && "text-[15px]")} style={first && !e.estimated ? { color: stateColor(e.stateAfter) } : undefined}>
                    {label}
                  </span>
                  <time className="text-muted-foreground tabular text-xs" dateTime={e.occurredAt.toISOString()}>
                    {dateTime(e.occurredAt, locale)}
                  </time>
                </div>
                <div className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 text-[13px]">
                  {e.locationName && <span>{e.locationName}</span>}
                  {e.reasonCode && (
                    <span>
                      {e.reasonCode} · {locale === "sw" ? e.reasonSw : e.reasonEn}
                    </span>
                  )}
                  <span className="font-mono text-[11px] opacity-80">{e.source}</span>
                  {e.estimated && <span className="italic">{t.detail.estimatedNote}</span>}
                </div>
                {e.note && <p className="mt-1 text-[13px]">{e.note}</p>}
                {e.clockSkew && (
                  <p className="text-warn mt-1 inline-flex items-center gap-1 text-xs">
                    <AlertTriangle className="size-3.5" /> {t.detail.clockSkew}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

function Parties({ s, t, mask }: { s: ShipmentDetail; t: Dict; mask: boolean }) {
  const party = (title: string, p: ShipmentDetail["consignee"], extra?: React.ReactNode) => (
    <div className="px-4 py-3">
      <div className="eyebrow mb-1">{title}</div>
      <div className="font-medium">{p.name}</div>
      <div className="font-mono text-[13px]">{mask ? maskPhone(p.phone) : p.phone}</div>
      <div className="text-muted-foreground mt-1 text-[13px]">
        {[p.address.street, p.address.ward, p.address.district, p.address.region].filter(Boolean).join(", ")}
      </div>
      {p.address.landmark && <div className="mt-0.5 text-[13px]">📍 {p.address.landmark}</div>}
      {extra}
    </div>
  );
  return (
    <Panel title={t.detail.parties}>
      <div className="divide-y">
        {party(t.detail.sender, s.shipper, s.pickupLocation && <div className="text-muted-foreground mt-1 text-xs">{t.detail.handover}: {s.pickupLocation.name}</div>)}
        {party(
          t.detail.receiver,
          s.consignee,
          <>
            {s.deliveryLocation && <div className="text-muted-foreground mt-1 text-xs">{t.delivery.wakala_collect}: {s.deliveryLocation.name}</div>}
            {s.deliveryInstructions && <div className="text-muted-foreground mt-1 text-xs">{t.detail.instructions}: {s.deliveryInstructions}</div>}
          </>,
        )}
      </div>
    </Panel>
  );
}
