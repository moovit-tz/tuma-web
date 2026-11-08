import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current-user";
import { supportCase } from "@/server/services/admin/support-desk";
import { DomainError } from "@/server/services/shipments";
import { notFound } from "next/navigation";
import { fmt, getDict } from "@/i18n";
import { dateTime } from "@/lib/format";
import { PageHeader, Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CaseUpdateForm } from "@/components/admin/case-update-form";

export const instant = false;

export default async function SupportCasePage({ params }: PageProps<"/[locale]/portal/admin/support/[id]">) {
  const { locale, id } = await params;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("support.view")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const s = t.admin.support;
  const c = await supportCase(user, id).catch((e) => {
    if (e instanceof DomainError && e.status === 404) notFound();
    throw e;
  });
  const base = `/${locale}/portal/admin/support`;
  return (
    <>
      <PageHeader
        back={{ href: base, label: s.back }}
        eyebrow={s.kinds[c.kind] ?? c.kind}
        title={fmt(s.caseTitle, { ref: c.ref })}
        badge={<Badge variant="outline">{s.statuses[c.status] ?? c.status}</Badge>}
        description={`${c.name ?? "—"} · ${c.phone ?? c.email ?? "—"} · ${dateTime(c.createdAt, locale)}`}
      >
        {c.customerKey && (
          <Button variant="outline" asChild>
            <Link href={`${base}/customer?key=${encodeURIComponent(c.customerKey)}`}>{s.openCustomer}</Link>
          </Button>
        )}
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <Panel title={s.details}>
            <dl className="divide-y text-sm">
              {c.waybill && (
                <div className="grid grid-cols-[10rem_1fr] gap-3 px-4 py-2.5">
                  <dt className="text-muted-foreground">{t.admin.tower.waybill}</dt>
                  <dd className="font-mono">{c.waybill}</dd>
                </div>
              )}
              {Object.entries(c.body).map(([k, v]) => (
                <div key={k} className="grid grid-cols-[10rem_1fr] gap-3 px-4 py-2.5">
                  <dt className="text-muted-foreground break-words">{k}</dt>
                  <dd className="break-words whitespace-pre-wrap">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title={s.history}>
            <ol className="divide-y">
              {c.updates.map((u, i) => (
                <li key={i} className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{s.statuses[u.status] ?? u.status}</Badge>
                    <span className="text-muted-foreground text-xs">
                      {s.source[u.source] ?? u.source} · {dateTime(u.at, locale)}
                    </span>
                  </div>
                  {u.note && <p className="mt-1.5">{u.note}</p>}
                </li>
              ))}
            </ol>
          </Panel>
        </div>
        <Panel title={s.update}>
          <CaseUpdateForm id={c.id} status={c.status} />
        </Panel>
      </div>
    </>
  );
}
