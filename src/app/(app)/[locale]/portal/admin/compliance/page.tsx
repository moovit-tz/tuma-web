import { Scale } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { KYC_TIERS, amlOverview, complianceCounts, kycQueue, listDsr } from "@/server/services/admin/compliance";
import { fmt, getDict } from "@/i18n";
import { dateOnly, dateTime, money, num } from "@/lib/format";
import { PageHeader, PageTabs, Panel, Stat } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { EmptyState } from "@/components/shell/empty-state";
import { Badge } from "@/components/ui/badge";
import { ActionButton, ActionForm } from "@/components/admin/kit";
import { closeDsrAction, openDsrAction, reviewKycAction, reviewScreeningAction, screenAction, submitKycAction, watchlistAction } from "@/app/actions/admin";

export const instant = false;

/** Compliance: KYC checks and tiers, AML screening and the watchlist, data-subject requests. */
export default async function CompliancePage({ params, searchParams }: PageProps<"/[locale]/portal/admin/compliance">) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  const p = user.permissions;
  const tabs = (["kyc", "aml", "dsr"] as const).filter((k) => p.has(k === "kyc" ? "kyc.review" : k === "aml" ? "aml.screen" : "dsr.handle"));
  if (!tabs.length) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const c = t.staff.compliance;
  const tab = tabs.includes(sp.tab as never) ? (sp.tab as (typeof tabs)[number]) : tabs[0];
  const counts = await complianceCounts();
  const base = `/${locale}/portal/admin/compliance`;
  const badge = { kyc: counts.kyc, aml: counts.aml, dsr: counts.dsr };
  return (
    <>
      <PageHeader title={c.title} description={c.sub} icon={Scale} />
      <PageTabs label={c.title} items={tabs.map((k) => ({ href: `${base}?tab=${k}`, label: c.tabs[k], active: tab === k, count: badge[k] || undefined }))} />
      {tab === "kyc" && <Kyc locale={locale} />}
      {tab === "aml" && <Aml locale={locale} />}
      {tab === "dsr" && <Dsr locale={locale} overdue={counts.overdue} />}
    </>
  );

  async function Kyc({ locale }: { locale: string }) {
    const k = c.kyc;
    const { rows, tiers } = await kycQueue(user);
    const count = [tiers.t0, tiers.t1, tiers.t2, tiers.t3];
    return (
      <>
        <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {KYC_TIERS.map((tr) => (
            <Stat key={tr.tier} label={fmt(k.tierN, { n: tr.tier })} value={num(count[tr.tier] ?? 0, locale)} hint={tr.maxBalance === null ? k.unlimited : fmt(k.tierLimits, { amount: money(tr.maxBalance, locale) })} />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Panel>
            {rows.length === 0 ? (
              <EmptyState icon={Scale} title={k.empty.title} body={k.empty.body} />
            ) : (
              <div className="table-scroll">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="h-10 text-left">
                      <th className="px-4">{k.person}</th>
                      <th className="px-3">{k.id}</th>
                      <th className="px-3">{k.tier}</th>
                      <th className="px-3">{k.status}</th>
                      <th className="px-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((r) => (
                      <tr key={r.id} className="align-top">
                        <td className="px-4 py-3">
                          <div className="font-medium">{r.fullName}</div>
                          <div className="text-muted-foreground text-xs">
                            {r.name} · {r.phone ?? "—"} · {dateOnly(r.submittedAt, locale)}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {k.idTypes[r.idType] ?? r.idType} <span className="text-muted-foreground font-mono text-xs">••••{r.idLast4}</span>
                        </td>
                        <td className="px-3 py-3">
                          {r.current} → {r.tier}
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={r.status === "pending" ? "default" : "outline"}>{k.statuses[r.status]}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {r.canReview ? (
                            <div className="flex justify-end gap-2">
                              <ActionButton action={reviewKycAction.bind(null, r.id, true)} label={k.approve} done={k.approved} variant="default" />
                              <ActionButton action={reviewKycAction.bind(null, r.id, false)} label={k.reject} done={k.rejectedDone} />
                            </div>
                          ) : (
                            r.status === "pending" && <span className="text-muted-foreground text-xs">{k.ownCheck}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
          <Panel title={k.record} className="self-start">
            <ActionForm
              className="p-4"
              columns={1}
              action={submitKycAction}
              submit={k.submit}
              done={k.submitted}
              fields={[
                { name: "phone", label: k.phone, required: true, placeholder: "07XX XXX XXX" },
                { name: "fullName", label: k.fullName, required: true, min: 3 },
                { name: "idType", label: k.idType, type: "select", options: Object.entries(k.idTypes).map(([value, label]) => ({ value, label })) },
                { name: "idNumber", label: k.idNumber, required: true, min: 5, hint: k.idHint },
                { name: "tier", label: k.tier, type: "select", options: [1, 2].map((n) => ({ value: String(n), label: fmt(k.tierN, { n }) })) },
                { name: "note", label: k.note, type: "textarea" },
              ]}
            />
          </Panel>
        </div>
      </>
    );
  }

  async function Aml({ locale }: { locale: string }) {
    const a = c.aml;
    const { screenings, watchlist } = await amlOverview(user);
    return (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title={a.results}>
            {screenings.length === 0 ? (
              <EmptyState icon={Scale} title={a.empty.title} body={a.empty.body} />
            ) : (
              <ul className="divide-y">
                {screenings.map((s) => (
                  <li key={s.id} className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{s.name}</span>
                      <Badge variant={s.result === "possible_match" || s.result === "confirmed" ? "destructive" : "outline"}>{a.results_[s.result] ?? s.result}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {dateTime(s.screenedAt, locale)}
                      {s.matches.length > 0 && ` · ${a.matches}: ${s.matches.map((m) => `${m.name} (${a.kinds[m.kind] ?? m.kind}, ${m.score}%)`).join("; ")}`}
                      {s.note && ` · ${s.note}`}
                    </p>
                    {s.canReview && (
                      <ActionForm
                        className="mt-3"
                        action={reviewScreeningAction.bind(null, s.id)}
                        submit={a.reviewed}
                        done={a.reviewed}
                        fields={[
                          { name: "verdict", label: a.result, type: "select", options: [{ value: "false_positive", label: a.falsePositive }, { value: "confirmed", label: a.confirm }] },
                          { name: "note", label: a.verdictNote, required: true, min: 10 },
                        ]}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title={a.watchlist} description={`${watchlist.length}`}>
            {watchlist.length === 0 ? (
              <p className="text-muted-foreground p-4 text-sm">{a.emptyList}</p>
            ) : (
              <ul className="divide-y">
                {watchlist.map((w) => (
                  <li key={w.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5 text-sm">
                    <span>{w.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {a.kinds[w.kind] ?? w.kind}
                      {w.country && ` · ${w.country}`} · {w.source}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
        <div className="flex flex-col gap-5">
          <Panel title={a.screen}>
            <ActionForm className="p-4" columns={1} action={screenAction} submit={a.run} done={a.reviewed} fields={[{ name: "name", label: a.name, required: true, min: 3 }]} />
          </Panel>
          <Panel title={a.addEntry}>
            <ActionForm
              className="p-4"
              columns={1}
              action={watchlistAction}
              submit={a.add}
              done={a.added}
              fields={[
                { name: "name", label: a.name, required: true, min: 3 },
                { name: "kind", label: a.kind, type: "select", options: Object.entries(a.kinds).map(([value, label]) => ({ value, label })) },
                { name: "country", label: a.country, placeholder: "TZ" },
                { name: "source", label: a.source, required: true, min: 2 },
              ]}
            />
          </Panel>
        </div>
      </div>
    );
  }

  async function Dsr({ locale, overdue }: { locale: string; overdue: number }) {
    const d = c.dsr;
    const rows = await listDsr(user);
    return (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel description={overdue ? `${d.overdue}: ${overdue}` : undefined} title={c.tabs.dsr}>
          {rows.length === 0 ? (
            <EmptyState icon={Scale} title={d.empty.title} body={d.empty.body} />
          ) : (
            <ul className="divide-y">
              {rows.map((r) => (
                <li key={r.id} className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <span className="font-mono text-[13px] font-semibold">{r.ref}</span> · {r.name} · {d.kinds[r.kind]}
                    </span>
                    <span className="flex items-center gap-2">
                      {r.overdue && <Badge variant="destructive">{d.overdue}</Badge>}
                      <Badge variant={r.status === "open" ? "default" : "outline"}>{d.statuses[r.status]}</Badge>
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {r.phone} · {d.due} {dateOnly(r.dueAt, locale)}
                    {r.detail && ` · ${r.detail}`}
                    {r.response && ` · ${r.response}`}
                  </p>
                  {r.status === "open" && (
                    <div className="mt-3 grid gap-3">
                      <a href={`/api/admin/dsr/${r.id}`} className="text-foreground w-fit text-[13px] font-medium underline-offset-2 hover:underline">
                        {d.export}
                      </a>
                      {r.kind === "erasure" && <p className="text-xs text-amber-700 dark:text-amber-400">{d.erasureNote}</p>}
                      <ActionForm
                        action={closeDsrAction.bind(null, r.id)}
                        submit={d.close}
                        done={d.closed}
                        fields={[
                          { name: "outcome", label: d.outcome, type: "select", options: Object.entries(d.outcomes).map(([value, label]) => ({ value, label })) },
                          { name: "response", label: d.response, required: true, min: 10 },
                        ]}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={d.new} className="self-start">
          <ActionForm
            className="p-4"
            columns={1}
            action={openDsrAction}
            submit={d.log}
            done={d.logged}
            fields={[
              { name: "name", label: d.name, required: true, min: 2 },
              { name: "phone", label: d.phone, required: true, placeholder: "07XX XXX XXX" },
              { name: "kind", label: d.kind, type: "select", options: Object.entries(d.kinds).map(([value, label]) => ({ value, label })) },
              { name: "detail", label: d.detail, type: "textarea" },
            ]}
          />
        </Panel>
      </div>
    );
  }
}
