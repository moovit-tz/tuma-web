import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { listGrants } from "@/server/services/admin/grants";
import { getDict } from "@/i18n";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader, Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { EmptyState } from "@/components/shell/empty-state";
import { Badge } from "@/components/ui/badge";
import { ActionForm } from "@/components/admin/kit";
import { grantChangeAction } from "@/app/actions/admin";

export const instant = false;

/** Each staff role's grants with their scope and money limit; changing one asks a second person. */
export default async function GrantsPage({ params, searchParams }: PageProps<"/[locale]/portal/admin/grants">) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("roles.manage")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const g = t.staff.grants;
  const roles = await listGrants(user);
  const key = typeof sp.role === "string" ? sp.role : roles[0]?.key;
  const role = roles.find((r) => r.key === key);
  const edit = typeof sp.edit === "string" ? sp.edit : null;
  const base = `/${locale}/portal/admin/grants`;
  return (
    <>
      <PageHeader title={g.title} description={g.sub} icon={SlidersHorizontal} />
      {roles.length === 0 ? (
        <Panel>
          <EmptyState icon={SlidersHorizontal} title={g.empty.title} body={g.empty.body} />
        </Panel>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <Panel title={g.role}>
            <ul className="divide-y">
              {roles.map((r) => (
                <li key={r.key}>
                  <Link href={`${base}?role=${r.key}`} className={cn("hover:bg-muted/50 flex items-center justify-between gap-2 px-4 py-2.5 text-sm", r.key === key && "bg-muted font-semibold")}>
                    <span className="truncate">{r.name}</span>
                    <span className="text-muted-foreground tabular text-xs">{r.grants.length}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
          {role && (
            <Panel title={role.name} description={role.active ? role.key : `${role.key} · ${g.inactive}`}>
              <div className="table-scroll">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="h-10 text-left">
                      <th className="px-4">{g.permission}</th>
                      <th className="px-3">{g.scope}</th>
                      <th className="px-3 text-right">{g.limit}</th>
                      <th className="px-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {role.grants.map((p) => (
                      <tr key={p.permission} className="align-top">
                        <td className="px-4 py-2.5">
                          <div className="font-medium">{p.label}</div>
                          <div className="text-muted-foreground font-mono text-[11px]">{p.permission}</div>
                          {edit === p.permission && (
                            <div className="mt-3 max-w-xl rounded-md border p-4">
                              <ActionForm
                                action={grantChangeAction.bind(null, role.key, p.permission)}
                                submit={g.send}
                                done={g.sent}
                                fields={[
                                  { name: "scope", label: g.scopeLabel, hint: g.scopeHint, defaultValue: p.scope, wide: true },
                                  { name: "maxAmount", label: g.limitLabel, type: "number", hint: g.limitHint, defaultValue: p.max === null ? "" : String(p.max) },
                                  { name: "reason", label: g.reason, type: "textarea", hint: g.reasonHint, required: true, min: 10 },
                                ]}
                              />
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">{p.scope === "all" ? <span className="text-muted-foreground">{g.everywhere}</span> : <Badge variant="outline">{p.scope}</Badge>}</td>
                        <td className="tabular px-3 py-2.5 text-right whitespace-nowrap">{p.max === null ? <span className="text-muted-foreground">{g.noLimit}</span> : money(p.max, locale)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <Link href={`${base}?role=${role.key}&edit=${encodeURIComponent(p.permission)}`} className="text-muted-foreground hover:text-foreground text-[13px] font-medium">
                            {g.edit}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </div>
      )}
    </>
  );
}
