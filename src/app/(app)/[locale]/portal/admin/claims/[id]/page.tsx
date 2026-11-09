import { FileWarning, MapPin } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { LIABLE, getClaim } from "@/server/services/admin/claims";
import { getDict } from "@/i18n";
import { dateTime, money } from "@/lib/format";
import { PageHeader, Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { Badge } from "@/components/ui/badge";
import { ActionForm } from "@/components/admin/kit";
import { addEvidenceAction, decideClaimAction, recoveryAction, setLiabilityAction } from "@/app/actions/admin";

export const instant = false;

/** One claim: the parcel's own evidence, notes, liability, the decision and recoveries. */
export default async function ClaimPage({ params }: PageProps<"/[locale]/portal/admin/claims/[id]">) {
  const { locale, id } = await params;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("claims.handle")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const c = t.staff.claims;
  const d = c.detail;
  const { claim, parcel, scans, pod, canDecide } = await getClaim(user, id);
  const closed = claim.status === "settled" || claim.status === "rejected";
  const figures: [string, number | null][] = [
    [d.claimed, claim.amountClaimed],
    [d.declared, claim.declaredValue],
    [d.proposed, claim.proposedAmount],
    [d.settled, claim.settledAmount],
    [d.recovered, claim.recoveredAmount || null],
  ];
  return (
    <>
      <PageHeader
        title={`${claim.ref} · ${c.kinds[claim.kind] ?? claim.kind}`}
        description={`${claim.waybill} · ${claim.claimantName}${claim.claimantPhone ? ` · ${claim.claimantPhone}` : ""}`}
        icon={FileWarning}
        back={{ href: `/${locale}/portal/admin/claims`, label: c.title }}
        badge={<Badge variant={closed ? "outline" : "default"}>{c.statuses[claim.status]}</Badge>}
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title={c.description}>
            <p className="p-4 text-sm whitespace-pre-wrap">{claim.description}</p>
            <dl className="grid grid-cols-2 gap-px border-t sm:grid-cols-5">
              {figures.map(([label, v]) => (
                <div key={label} className="px-4 py-3">
                  <dt className="text-muted-foreground text-xs">{label}</dt>
                  <dd className="tabular mt-0.5 font-semibold">{v === null ? "—" : money(v, locale)}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title={d.evidence} description={d.fromParcel}>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground mb-2 text-xs font-medium">{d.bookingPhoto}</p>
                {parcel?.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- photo stored by URL
                  <img src={parcel.photo} alt={parcel.goods} className="aspect-[4/3] w-full rounded-md border object-cover" />
                ) : (
                  <p className="bg-muted text-muted-foreground rounded-md p-4 text-sm">{d.noPhoto}</p>
                )}
                {parcel && <p className="mt-2 text-sm">{parcel.goods}</p>}
              </div>
              <div>
                <p className="text-muted-foreground mb-2 text-xs font-medium">{d.pod}</p>
                {pod ? (
                  <div className="rounded-md border p-3 text-sm">
                    <div>{dateTime(pod.at, locale)}</div>
                    {pod.lat != null && (
                      <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                        <MapPin className="size-3.5" /> {pod.lat.toFixed(5)}, {pod.lng?.toFixed(5)}
                      </div>
                    )}
                    {pod.data && <pre className="bg-muted mt-2 max-h-32 overflow-auto rounded p-2 text-[11px]">{JSON.stringify(pod.data, null, 1)}</pre>}
                  </div>
                ) : (
                  <p className="bg-muted text-muted-foreground rounded-md p-4 text-sm">{d.noPod}</p>
                )}
              </div>
            </div>
            <div className="border-t">
              <p className="text-muted-foreground px-4 pt-3 text-xs font-medium">{d.scans}</p>
              <ol className="divide-y">
                {scans.map((e, i) => (
                  <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2 text-sm">
                    <span>
                      <span className="font-medium">{e.state ? (t.states as Record<string, string>)[e.state] ?? e.state : e.type}</span>
                      <span className="text-muted-foreground"> · {e.actor}</span>
                      {e.note && <span className="text-muted-foreground"> · {e.note}</span>}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {dateTime(e.at, locale)}
                      {e.lat != null && ` · ${e.lat.toFixed(4)}, ${e.lng?.toFixed(4)}`}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </Panel>
          <Panel title={d.notes}>
            {claim.evidence.length === 0 ? (
              <p className="text-muted-foreground p-4 text-sm">{d.noNotes}</p>
            ) : (
              <ul className="divide-y">
                {claim.evidence.map((e, i) => (
                  <li key={i} className="px-4 py-3 text-sm">
                    <p className="whitespace-pre-wrap">{e.note}</p>
                    {e.url && (
                      <a href={e.url} target="_blank" rel="noreferrer" className="text-brand-red text-xs break-all hover:underline">
                        {e.url}
                      </a>
                    )}
                    <p className="text-muted-foreground mt-1 text-xs">
                      {e.by} · {dateTime(e.at, locale)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {!closed && (
              <div className="border-t p-4">
                <ActionForm
                  action={addEvidenceAction.bind(null, claim.id)}
                  submit={d.add}
                  done={d.added}
                  fields={[
                    { name: "note", label: d.note, type: "textarea", required: true, min: 3 },
                    { name: "url", label: d.url, placeholder: "https://", wide: true },
                  ]}
                />
              </div>
            )}
          </Panel>
        </div>
        <div className="flex flex-col gap-5">
          <Panel title={d.liability}>
            {closed ? (
              <p className="p-4 text-sm">
                {claim.liableParty ? c.parties[claim.liableParty] : "—"}
                {claim.liableId && <span className="text-muted-foreground font-mono text-xs"> · {claim.liableId}</span>}
              </p>
            ) : (
              <ActionForm
                className="p-4"
                columns={1}
                reset={false}
                action={setLiabilityAction.bind(null, claim.id)}
                submit={d.setLiability}
                done={d.saved}
                fields={[
                  { name: "liableParty", label: d.party, type: "select", defaultValue: claim.liableParty ?? "point", options: LIABLE.map((p) => ({ value: p, label: c.parties[p] })) },
                  { name: "liableId", label: d.partyId, defaultValue: claim.liableId ?? parcel?.handlingPartnerId ?? "" },
                ]}
              />
            )}
          </Panel>
          {canDecide && !closed && claim.status !== "proposed" && (
            <Panel title={d.decide}>
              <ActionForm
                className="p-4"
                columns={1}
                action={decideClaimAction.bind(null, claim.id)}
                submit={d.submit}
                done={d.submitted}
                fields={[
                  {
                    name: "outcome",
                    label: d.outcome,
                    type: "select",
                    options: [
                      { value: "pay", label: d.pay },
                      { value: "reject", label: d.reject },
                    ],
                  },
                  { name: "amount", label: d.payAmount, type: "number", hint: d.payHint, defaultValue: String(Math.min(claim.amountClaimed, claim.declaredValue ?? claim.amountClaimed)) },
                  { name: "note", label: d.decisionNote, type: "textarea", required: true, min: 10 },
                ]}
              />
            </Panel>
          )}
          {claim.status === "proposed" && <p className="bg-muted rounded-lg p-4 text-sm">{t.admin.approvals.sentForApproval}</p>}
          {claim.decisionNote && (
            <Panel title={d.decisionNote}>
              <p className="p-4 text-sm whitespace-pre-wrap">{claim.decisionNote}</p>
            </Panel>
          )}
          {canDecide && claim.status === "settled" && (
            <Panel title={d.recovery}>
              <ActionForm className="p-4" columns={1} action={recoveryAction.bind(null, claim.id)} submit={d.record} done={d.recorded} fields={[{ name: "amount", label: d.recoveryAmount, type: "number", required: true }]} />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
