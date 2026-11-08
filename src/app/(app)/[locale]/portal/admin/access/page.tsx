import { UserCheck } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { staffForReview } from "@/server/services/admin/access-reviews";
import { fmt, getDict } from "@/i18n";
import { dateOnly, dateTime } from "@/lib/format";
import { PageHeader, Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { EmptyState } from "@/components/shell/empty-state";
import { Badge } from "@/components/ui/badge";
import { AccessReviewButtons } from "@/components/admin/access-review-buttons";

export const instant = false;

/** Everyone holding a staff role, due ones first, with what they did lately; keep or revoke. */
export default async function AccessReviewsPage({ params }: PageProps<"/[locale]/portal/admin/access">) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("access.review")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const a = t.admin.access;
  const { staff, reviewDays } = await staffForReview(user);
  const due = staff.filter((s) => s.due).length;
  return (
    <>
      <PageHeader title={a.title} description={fmt(a.sub, { days: reviewDays })} icon={UserCheck} badge={due ? <Badge variant="destructive">{fmt(a.dueCount, { n: due })}</Badge> : undefined} />
      <Panel>
        {staff.length === 0 ? (
          <EmptyState icon={UserCheck} title={a.empty.title} body={a.empty.body} />
        ) : (
          <div className="table-scroll">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="text-muted-foreground h-10 border-b text-left text-xs">
                  <th className="px-4 font-medium">{a.person}</th>
                  <th className="px-3 font-medium">{a.staffRoles}</th>
                  <th className="px-3 font-medium">{a.lastSeen}</th>
                  <th className="px-3 text-right font-medium">{a.reveals}</th>
                  <th className="px-3 font-medium">{a.lastReview}</th>
                  <th className="px-4" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/40 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-muted-foreground text-xs">{s.email ?? "—"}</div>
                      {!s.active && <Badge variant="secondary" className="mt-1">{a.inactive}</Badge>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.staffRoles.map((r) => (
                          <span key={r} className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]">
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-muted-foreground px-3 py-3 text-xs whitespace-nowrap">{s.lastSeenAt ? dateTime(s.lastSeenAt, locale) : a.never}</td>
                    <td className="tabular px-3 py-3 text-right">{s.reveals30d}</td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      {s.lastReview ? `${a.decision[s.lastReview.decision] ?? s.lastReview.decision} · ${dateOnly(s.lastReview.at, locale)}` : a.never}
                      <div className="mt-1">{s.due ? <Badge variant="destructive">{a.due}</Badge> : <Badge variant="outline">{a.upToDate}</Badge>}</div>
                    </td>
                    <td className="px-4 py-3">
                      {s.me ? <span className="text-muted-foreground text-xs">{a.you}</span> : <AccessReviewButtons userId={s.id} name={s.name} roles={s.staffRoles.join(", ")} days={reviewDays} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
