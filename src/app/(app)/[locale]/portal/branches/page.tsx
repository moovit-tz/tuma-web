import Link from "next/link";
import { Building, MapPin, Phone } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { listBranches } from "@/server/services/branches";
import { getDict } from "@/i18n";
import { num } from "@/lib/format";
import { PageHeader } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { BranchDialog } from "@/components/partner/branch-dialog";
import { cn } from "@/lib/utils";

export const instant = false;

/** The company's branches with live figures. Branch staff see only their own branch. */
export default async function BranchesPage({ params }: PageProps<"/[locale]/portal/branches">) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("partner.cargo.read") && !user.permissions.has("partner.branches.manage")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const b = t.branches;
  const rows = await listBranches(user);
  const canManage = user.permissions.has("partner.branches.manage") && !user.branchId;
  return (
    <>
      <PageHeader title={b.title}>{canManage && <BranchDialog />}</PageHeader>
      {rows.length === 0 ? (
        <p className="bg-card text-muted-foreground rounded-lg border px-4 py-14 text-center text-sm">{b.empty}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ b: br, openCargo, vehicles, staff }) => (
            <li key={br.id} className={cn("bg-card flex flex-col overflow-hidden rounded-lg border shadow-sm", !br.active && "opacity-70")}>
              <div className="bg-sidebar text-sidebar-foreground flex items-start justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-white/60">{br.code}</span>
                    {br.isHead && <span className="bg-brand-red rounded px-1.5 py-0.5 text-[10.5px] font-semibold text-white">{b.head}</span>}
                    {!br.active && <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10.5px] font-semibold">{b.closed}</span>}
                  </div>
                  <h3 className="mt-1 truncate text-base font-bold">{br.name}</h3>
                </div>
                <Building className="text-brand-red mt-1 size-5 shrink-0" aria-hidden />
              </div>
              <dl className="grid grid-cols-3 divide-x border-b">
                {(
                  [
                    [b.openCargo, openCargo, `/${locale}/portal/cargo?tab=all&branch=${br.id}`],
                    [b.vehicles, vehicles, `/${locale}/portal/vehicles?branch=${br.id}`],
                    [b.staff, staff, null],
                  ] as const
                ).map(([label, n, href]) => {
                  const body = (
                    <>
                      <dd className="font-display tabular text-xl font-semibold">{num(Number(n), locale)}</dd>
                      <dt className="text-muted-foreground text-xs">{label}</dt>
                    </>
                  );
                  return href ? (
                    <Link key={label} href={href} className="hover:bg-muted/50 flex flex-col-reverse items-center py-3 text-center">
                      {body}
                    </Link>
                  ) : (
                    <div key={label} className="flex flex-col-reverse items-center py-3 text-center">
                      {body}
                    </div>
                  );
                })}
              </dl>
              <div className="flex-1 space-y-1.5 px-5 py-3.5 text-sm">
                <p className="flex gap-2">
                  <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>{[br.address, br.district, br.region].filter(Boolean).join(", ")}</span>
                </p>
                {br.phone && (
                  <p className="flex gap-2">
                    <Phone className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
                    <a href={`tel:${br.phone}`} className="font-mono text-[13px] underline-offset-4 hover:underline">
                      {br.phone}
                    </a>
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
                <Link href={`/${locale}/portal/cargo?tab=all&branch=${br.id}`} className="px-2 text-sm font-medium underline-offset-4 hover:underline">
                  {b.viewCargo} →
                </Link>
                {canManage && (
                  <BranchDialog
                    initial={{ id: br.id, name: br.name, code: br.code, region: br.region, district: br.district ?? "", address: br.address ?? "", phone: br.phone ?? "", active: String(br.active) }}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
