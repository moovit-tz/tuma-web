import { ShieldAlert } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { getCase } from "@/server/services/admin/risk";
import { fmt, getDict } from "@/i18n";
import { dateTime } from "@/lib/format";
import { PageHeader, Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { Badge } from "@/components/ui/badge";
import { ActionForm } from "@/components/admin/kit";
import { caseNoteAction, closeCaseAction, freezeAction } from "@/app/actions/admin";

export const instant = false;

/** One risk case: its alerts, the notes, freezes on the subject, and closing it with an outcome. */
export default async function RiskCasePage({ params }: PageProps<"/[locale]/portal/admin/risk/[id]">) {
  const { locale, id } = await params;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("risk.view")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const r = t.staff.risk;
  const { case: c, alerts, holds, can } = await getCase(user, id);
  const open = c.status === "open";
  const frozen = holds.some((h) => !h.releasedAt);
  return (
    <>
      <PageHeader
        title={`${c.ref} · ${c.subjectLabel}`}
        description={c.title}
        icon={ShieldAlert}
        back={{ href: `/${locale}/portal/admin/risk`, label: r.title }}
        badge={<Badge variant={open ? "default" : "secondary"}>{c.outcome ? r.outcomes[c.outcome] : r.caseStatus[c.status]}</Badge>}
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title={r.case.alerts}>
            <ul className="divide-y">
              {alerts.map((a) => (
                <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm">
                  <span>
                    <span className="font-medium">{r.ruleNames[a.rule] ?? a.rule}</span>
                    <span className="text-muted-foreground block text-xs">
                      {Object.entries(a.details)
                        .filter(([, v]) => v != null)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {a.score} · {dateTime(a.createdAt, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title={r.case.notes}>
            {c.notes.length > 0 && (
              <ul className="divide-y">
                {c.notes.map((n, i) => (
                  <li key={i} className="px-4 py-3 text-sm">
                    <p className="whitespace-pre-wrap">{n.text}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {n.name} · {dateTime(n.at, locale)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {open && can.manage && (
              <div className="border-t p-4">
                <ActionForm columns={1} action={caseNoteAction.bind(null, c.id)} submit={r.case.addNote} done={r.case.noted} fields={[{ name: "text", label: r.case.note, type: "textarea", required: true, min: 3 }]} />
              </div>
            )}
          </Panel>
        </div>
        <div className="flex flex-col gap-5">
          <Panel title={r.case.holds}>
            {holds.length === 0 ? (
              <p className="text-muted-foreground p-4 text-sm">{r.noHolds}</p>
            ) : (
              <ul className="divide-y">
                {holds.map((h) => (
                  <li key={h.id} className="px-4 py-3 text-sm">
                    {h.reason}
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {dateTime(h.placedAt, locale)}
                      {h.releasedAt && ` · ${fmt(r.case.released, { at: dateTime(h.releasedAt, locale) })}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {open && can.freeze && !frozen && (c.subjectType === "user" || c.subjectType === "account") && !c.subjectId.startsWith("phone:") && (
              <div className="border-t p-4">
                <ActionForm
                  columns={1}
                  action={async (v) => {
                    "use server";
                    return freezeAction({ ...v, subjectType: c.subjectType, subjectId: c.subjectId, caseId: c.id });
                  }}
                  submit={r.freeze}
                  done={r.frozen}
                  fields={[{ name: "reason", label: r.reason, type: "textarea", required: true, min: 10 }]}
                />
              </div>
            )}
          </Panel>
          {open && can.manage && (
            <Panel title={r.case.close}>
              <ActionForm
                className="p-4"
                columns={1}
                action={closeCaseAction.bind(null, c.id)}
                submit={r.case.close}
                done={r.case.closed}
                fields={[
                  { name: "outcome", label: r.case.outcome, type: "select", options: ["fraud", "not_fraud", "inconclusive"].map((v) => ({ value: v, label: r.outcomes[v] })) },
                  { name: "note", label: r.case.summary, type: "textarea", required: true, min: 10 },
                ]}
              />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
