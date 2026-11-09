import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { riskOverview } from "@/server/services/admin/risk";
import { fmt, getDict } from "@/i18n";
import { dateTime, num } from "@/lib/format";
import { PageHeader, Panel, Stat } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { EmptyState } from "@/components/shell/empty-state";
import { Badge } from "@/components/ui/badge";
import { ActionButton, ActionForm } from "@/components/admin/kit";
import { dismissAlertAction, freezeAction, openCaseAction, releaseAction, ruleAction, runRiskAction } from "@/app/actions/admin";

export const instant = false;

const detailText = (d: Record<string, unknown>) =>
  Object.entries(d)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join(" · ");

/** Alerts from the rules, cases, who's frozen, and the rules' thresholds. */
export default async function RiskPage({ params }: PageProps<"/[locale]/portal/admin/risk">) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("risk.view")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const r = t.staff.risk;
  const o = await riskOverview(user);
  const base = `/${locale}/portal/admin/risk`;
  return (
    <>
      <PageHeader title={r.title} description={r.sub} icon={ShieldAlert}>
        {o.can.manage && <ActionButton action={runRiskAction.bind(null, r.ran)} label={r.run} done={r.ran} variant="default" size="default" />}
      </PageHeader>
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={r.kpiOpen} value={num(o.kpis.open, locale)} tone={o.kpis.open ? "warn" : undefined} />
        <Stat label={r.kpiWeek} value={num(o.kpis.week, locale)} />
        <Stat label={r.kpiFraud} value={num(o.kpis.fraud, locale)} tone={o.kpis.fraud ? "bad" : undefined} />
        <Stat label={r.kpiFp} value={`${o.kpis.falsePositive}%`} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title={r.alerts}>
            {o.alerts.length === 0 ? (
              <EmptyState icon={ShieldAlert} title={r.noAlerts.title} body={r.noAlerts.body} />
            ) : (
              <div className="table-scroll">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="h-10 text-left">
                      <th className="px-4">{r.rule}</th>
                      <th className="px-3">{r.subject}</th>
                      <th className="px-3 text-right">{r.score}</th>
                      <th className="px-3">{r.found}</th>
                      <th className="px-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {o.alerts.map((a) => (
                      <tr key={a.id} className="align-top">
                        <td className="px-4 py-3">
                          <div className="font-medium">{r.ruleNames[a.rule] ?? a.rule}</div>
                          <div className="text-muted-foreground mt-0.5 max-w-sm text-xs">{detailText(a.details)}</div>
                        </td>
                        <td className="px-3 py-3">
                          {a.subjectLabel}
                          <div className="text-muted-foreground font-mono text-[11px]">{a.subjectId}</div>
                        </td>
                        <td className="tabular px-3 py-3 text-right">
                          <Badge variant={a.score >= 70 ? "destructive" : "outline"}>{a.score}</Badge>
                        </td>
                        <td className="text-muted-foreground px-3 py-3 text-xs whitespace-nowrap">{dateTime(a.createdAt, locale)}</td>
                        <td className="px-4 py-3">
                          {o.can.manage && (
                            <div className="flex justify-end gap-2">
                              <ActionButton action={openCaseAction.bind(null, a.id)} label={r.openCase} done={r.caseOpened} variant="default" />
                              <ActionButton action={dismissAlertAction.bind(null, a.id)} label={r.dismiss} done={r.dismissed} variant="ghost" />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
          <Panel title={r.cases}>
            {o.cases.length === 0 ? (
              <p className="text-muted-foreground p-4 text-sm">{r.noCases}</p>
            ) : (
              <ul className="divide-y">
                {o.cases.map((c) => (
                  <li key={c.id}>
                    <Link href={`${base}/${c.id}`} className="hover:bg-muted/40 flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                      <span className="min-w-0">
                        <span className="font-mono text-[13px] font-semibold">{c.ref}</span> <span className="capitalize">{c.title}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {c.outcome && <Badge variant={c.outcome === "fraud" ? "destructive" : "outline"}>{r.outcomes[c.outcome]}</Badge>}
                        <Badge variant={c.status === "open" ? "default" : "secondary"}>{r.caseStatus[c.status]}</Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
        <div className="flex flex-col gap-5">
          <Panel title={r.holds}>
            {o.holds.length === 0 ? (
              <p className="text-muted-foreground p-4 text-sm">{r.noHolds}</p>
            ) : (
              <ul className="divide-y">
                {o.holds.map((h) => (
                  <li key={h.id} className="px-4 py-3 text-sm">
                    <div className="font-medium">
                      {h.subjectLabel} <span className="text-muted-foreground text-xs">· {r.types[h.subjectType]}</span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {h.reason} · {r.since} {dateTime(h.placedAt, locale)}
                    </p>
                    {o.can.freeze && (
                      <ActionForm className="mt-3" columns={1} action={releaseAction.bind(null, h.id)} submit={r.release} done={r.releaseSent} fields={[{ name: "reason", label: r.releaseReason, required: true, min: 10 }]} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {o.can.freeze && (
            <Panel title={r.freezeTitle}>
              <ActionForm
                className="p-4"
                columns={1}
                action={freezeAction}
                submit={r.freeze}
                done={r.frozen}
                fields={[
                  { name: "subjectType", label: r.subjectType, type: "select", options: ["user", "account"].map((v) => ({ value: v, label: r.types[v] })) },
                  { name: "subjectId", label: r.subjectId, required: true, placeholder: "ondi|… / acc_…" },
                  { name: "reason", label: r.reason, type: "textarea", required: true, min: 10 },
                ]}
              />
            </Panel>
          )}
          <Panel title={r.rules}>
            <ul className="divide-y">
              {o.rules.map((rule) => (
                <li key={rule.key} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{r.ruleNames[rule.key] ?? rule.name}</span>
                    <Badge variant={rule.enabled ? "outline" : "secondary"}>{rule.enabled ? r.enabled : r.disabled}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">{rule.description}</p>
                  {o.can.manage ? (
                    <ActionForm
                      className="mt-3"
                      reset={false}
                      action={ruleAction.bind(null, rule.key)}
                      submit={r.save}
                      done={r.saved}
                      fields={[
                        ...Object.entries(rule.params).map(([k, v]) => ({ name: k, label: r.params[k] ?? k, type: "number" as const, defaultValue: String(v) })),
                        { name: "enabled", label: r.enabled, type: "select" as const, defaultValue: rule.enabled ? "on" : "off", options: [{ value: "on", label: r.enabled }, { value: "off", label: r.disabled }] },
                      ]}
                    />
                  ) : (
                    <p className="text-muted-foreground mt-1 text-xs">{fmt(Object.entries(rule.params).map(([k, v]) => `${r.params[k] ?? k}: ${v}`).join(" · "), {})}</p>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
