import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { listRoles, roleScope } from "@/server/services/roles";
import { getDict, fmt } from "@/i18n";
import { PARTNER_GRANTABLE, PERMISSIONS } from "@/domain/roles";
import { PageHeader, Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { Button } from "@/components/ui/button";

export default async function RolesPage({ params }: PageProps<"/[locale]/portal/settings/roles">) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  const scope = roleScope(user);
  if (!scope) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const roles = await listRoles(user);
  const catalogSize = scope.kind === "platform" ? PERMISSIONS.length : PARTNER_GRANTABLE.length;
  const base = `/${locale}/portal/settings/roles`;
  const surfaces = ["portal", "console", "partner", "field", "api"];
  return (
    <>
      <PageHeader eyebrow={t.nav.settings} title={t.roles.title} description={t.roles.sub}>
        <Button asChild>
          <Link href={`${base}/new`}>
            <Plus /> {t.roles.newRole}
          </Link>
        </Button>
      </PageHeader>
      <div className="space-y-6">
        {surfaces.map((surface) => {
          const group = roles.filter((r) => r.surface === surface);
          if (!group.length) return null;
          return (
            <Panel key={surface} title={t.roles.surfaces[surface]}>
              <ul className="divide-y">
                {group.map((r) => (
                  <li key={r.key}>
                    <Link href={`${base}/${r.key}`} className="hover:bg-muted/50 grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_180px_90px] sm:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{r.name}</span>
                          <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]">{r.key}</span>
                          <span className="text-muted-foreground text-xs">{r.system ? t.roles.system : r.accountId ? t.roles.yourCompany : t.roles.custom}</span>
                          {!r.editable && <span className="text-muted-foreground text-xs">· {t.roles.managedByTuma}</span>}
                          {!r.active && <span className="text-warn text-xs font-medium">{t.roles.inactive}</span>}
                        </div>
                        <p className="text-muted-foreground truncate text-[13px]">{r.description}</p>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1 text-xs">{fmt(t.roles.grantedCount, { n: r.permissions.length, total: catalogSize })}</div>
                        <div className="bg-sunken h-1.5 overflow-hidden rounded-full">
                          <div className="bg-primary h-full" style={{ width: `${Math.min(100, (r.permissions.length / catalogSize) * 100)}%` }} />
                        </div>
                      </div>
                      <div className="text-muted-foreground text-[13px] sm:text-right">
                        {r.userCount} {t.roles.users.toLowerCase()}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          );
        })}
      </div>
    </>
  );
}

/** See the area layout: authenticated pages render per request. */
export const instant = false;
