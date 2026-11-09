import { Siren } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { MAX_HOURS, elevatableRoles, listElevations } from "@/server/services/admin/breakglass";
import { fmt, getDict } from "@/i18n";
import { dateTime } from "@/lib/format";
import { PageHeader, Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { EmptyState } from "@/components/shell/empty-state";
import { Badge } from "@/components/ui/badge";
import { ActionButton, ActionForm } from "@/components/admin/kit";
import { breakglassAction, endBreakglassAction, reviewBreakglassAction } from "@/app/actions/admin";

export const instant = false;

/** Take a staff role for a few hours in an emergency; reviewers see and sign off every one. */
export default async function BreakglassPage({ params }: PageProps<"/[locale]/portal/admin/breakglass">) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  const canTake = user.permissions.has("breakglass.request");
  if (!canTake && !user.permissions.has("access.review")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const b = t.staff.breakglass;
  const [roles, rows] = await Promise.all([canTake ? elevatableRoles() : Promise.resolve([]), listElevations(user)]);
  const unreviewed = rows.filter((r) => r.canReview).length;
  return (
    <>
      <PageHeader title={b.title} description={fmt(b.sub, { hours: MAX_HOURS })} icon={Siren} badge={unreviewed ? <Badge variant="destructive">{fmt(b.unreviewed, { n: unreviewed })}</Badge> : undefined} />
      <div className="grid gap-5 xl:grid-cols-[400px_minmax(0,1fr)]">
        {canTake && (
          <Panel title={b.take} className="self-start">
            {user.elevated?.map((e) => (
              <p key={e.roleKey} className="border-b bg-amber-500/10 px-4 py-2.5 text-sm">
                {fmt(b.youHold, { role: e.roleKey, until: dateTime(e.expiresAt, locale) })}
              </p>
            ))}
            {roles.length === 0 ? (
              <p className="text-muted-foreground p-4 text-sm">{b.none}</p>
            ) : (
              <ActionForm
                className="p-4"
                columns={1}
                action={breakglassAction}
                submit={b.start}
                done={b.started}
                fields={[
                  { name: "roleKey", label: b.role, type: "select", options: roles.map((r) => ({ value: r.key, label: r.name })) },
                  {
                    name: "hours",
                    label: b.hours,
                    type: "select",
                    defaultValue: "2",
                    options: Array.from({ length: MAX_HOURS }, (_, i) => ({ value: String(i + 1), label: i === 0 ? b.hour1 : fmt(b.hoursN, { n: i + 1 }) })),
                  },
                  { name: "reason", label: b.reason, type: "textarea", hint: b.reasonHint, required: true, min: 15 },
                ]}
              />
            )}
          </Panel>
        )}
        <Panel className={canTake ? "" : "xl:col-span-2"}>
          {rows.length === 0 ? (
            <EmptyState icon={Siren} title={b.empty.title} body={b.empty.body} />
          ) : (
            <div className="table-scroll">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="h-10 text-left">
                    <th className="px-4">{b.who}</th>
                    <th className="px-3">{b.when}</th>
                    <th className="px-3">{b.until}</th>
                    <th className="px-3">{b.status}</th>
                    <th className="px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r) => (
                    <tr key={r.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {r.name} · <span className="font-normal">{r.role}</span>
                        </div>
                        <div className="text-muted-foreground mt-0.5 max-w-md text-xs">{r.reason}</div>
                      </td>
                      <td className="text-muted-foreground px-3 py-3 text-xs whitespace-nowrap">{dateTime(r.startedAt, locale)}</td>
                      <td className="text-muted-foreground px-3 py-3 text-xs whitespace-nowrap">{dateTime(r.endedAt ?? r.expiresAt, locale)}</td>
                      <td className="px-3 py-3 text-xs">
                        <Badge variant={r.active ? "destructive" : "outline"}>{r.active ? b.active : r.endedAt ? b.ended : b.expired}</Badge>
                        <div className="text-muted-foreground mt-1">{r.reviewedBy ? fmt(b.reviewed, { name: r.reviewedBy }) : b.notReviewed}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {r.canEnd && <ActionButton action={endBreakglassAction.bind(null, r.id)} label={b.end} done={b.endDone} />}
                          {r.canReview && <ActionButton action={reviewBreakglassAction.bind(null, r.id)} label={b.review} done={b.reviewDone} />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
