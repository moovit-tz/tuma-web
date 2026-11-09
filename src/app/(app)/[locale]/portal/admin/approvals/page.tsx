import { ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { listApprovals } from "@/server/services/admin/approvals";
import { fmt, getDict } from "@/i18n";
import { dateTime, money } from "@/lib/format";
import { PageHeader, PageTabs, Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { EmptyState } from "@/components/shell/empty-state";
import { Badge } from "@/components/ui/badge";
import { ApprovalButtons } from "@/components/admin/approval-buttons";

export const instant = false;

/** Four-eyes approvals: staff role grants and wallet adjustments wait here for a second person. */
export default async function ApprovalsPage({ params, searchParams }: PageProps<"/[locale]/portal/admin/approvals">) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  const p = user.permissions;
  if (!p.has("approvals.decide") && !p.has("users.manage") && !p.has("finance.reconcile")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const a = t.admin.approvals;
  const tab = sp.tab === "decided" ? "decided" : "pending";
  const rows = await listApprovals(user, tab);
  const base = `/${locale}/portal/admin/approvals`;
  const change = (r: (typeof rows)[number]) => {
    const pl = r.payload as { roles?: string[]; amount?: number; accountId?: string; permission?: string; scope?: string; maxAmount?: number | null; summary?: string };
    if (r.kind === "role_grant") return fmt(a.roles, { roles: (pl.roles ?? []).join(", ") || t.common.none });
    if (r.kind === "grant_limit")
      return `${pl.permission} @ ${pl.scope === "all" ? t.staff.grants.everywhere : pl.scope} · ${pl.maxAmount == null ? t.staff.grants.noLimit : `≤ ${money(pl.maxAmount, locale)}`}`;
    // Other kinds describe themselves (payouts, releases, settlements, price changes).
    if (pl.summary) return pl.amount ? `${pl.summary} · ${money(Math.abs(pl.amount), locale)}` : pl.summary;
    const amt = money(Math.abs(pl.amount ?? 0), locale);
    return `${fmt((pl.amount ?? 0) > 0 ? a.credit : a.debit, { amount: amt })}${pl.accountId ? ` (${a.company})` : ""}`;
  };
  const empty = tab === "pending" ? a.empty : a.emptyDecided;
  return (
    <>
      <PageHeader title={a.title} description={a.sub} icon={ShieldCheck} />
      <PageTabs
        label={a.title}
        items={[
          { href: base, label: a.pending, active: tab === "pending", count: tab === "pending" ? rows.length : undefined },
          { href: `${base}?tab=decided`, label: a.decided, active: tab === "decided" },
        ]}
      />
      <Panel>
        {rows.length === 0 ? (
          <EmptyState icon={ShieldCheck} title={empty.title} body={empty.body} />
        ) : (
          <ul className="divide-y">
            {rows.map((r) => {
              const name = r.subjectName ?? r.subjectId;
              const kind = a.kinds[r.kind] ?? r.kind;
              return (
                <li key={r.id} className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{kind}</Badge>
                      <span className="font-semibold">{name}</span>
                      {tab === "decided" && <Badge variant={r.status === "approved" ? "default" : "secondary"}>{a.status[r.status] ?? r.status}</Badge>}
                    </div>
                    <p className="text-sm">{change(r)}</p>
                    <p className="text-muted-foreground text-[13px]">
                      <span className="font-medium">{a.reason}:</span> {r.reason}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {a.requestedBy} {r.requestedByName} · {dateTime(r.requestedAt, locale)}
                      {r.decidedByName && r.decidedAt && ` · ${fmt(a.decidedBy, { name: r.decidedByName, at: dateTime(r.decidedAt, locale) })}`}
                      {r.decisionNote && ` · “${r.decisionNote}”`}
                    </p>
                  </div>
                  {tab === "pending" && (
                    <div className="shrink-0">
                      {r.mine && <p className="text-muted-foreground mb-2 text-xs">{a.yours}</p>}
                      <ApprovalButtons id={r.id} canDecide={r.canDecide} mine={r.mine} kind={kind} name={name} change={change(r)} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
