import { Handshake, Search, SearchX } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { listPartners, PARTNER_KINDS, PARTNER_STATUSES, type PartnerKind } from "@/server/services/admin/partners";
import { TZ_REGIONS } from "@/domain/pricing";
import { fmt, getDict } from "@/i18n";
import { PageHeader, PageTabs, Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { DataTable } from "@/components/shell/data-table";
import { EmptyState } from "@/components/shell/empty-state";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PartnerDialog } from "@/components/admin/partner-dialog";
import { cn } from "@/lib/utils";

export const instant = false;

/** The platform's partners and suppliers, by kind: packaging, supplies, insurance, fuel, vehicle care, telecoms. */
export default async function PartnersPage({ params, searchParams }: PageProps<"/[locale]/portal/admin/partners">) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("settings.manage") && !user.permissions.has("finance.view")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const g = t.admin.partners;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const kind = (PARTNER_KINDS as readonly string[]).includes(one("kind") ?? "") ? (one("kind") as PartnerKind) : undefined;
  const q = one("q")?.trim().slice(0, 80) || undefined;
  const { partners, activeByKind, canManage } = await listPartners(user, { kind, q });
  const base = `/${locale}/portal/admin/partners`;
  const href = (k?: string) => {
    const u = new URLSearchParams();
    if (k) u.set("kind", k);
    if (q) u.set("q", q);
    const s = u.toString();
    return s ? `${base}?${s}` : base;
  };
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Africa/Dar_es_Salaam" }).format(new Date(iso));
  const dialogProps = { kinds: [...PARTNER_KINDS], statuses: [...PARTNER_STATUSES], regions: TZ_REGIONS };

  return (
    <div>
      <PageHeader icon={Handshake} title={g.title} description={g.sub}>
        {canManage && <PartnerDialog {...dialogProps} defaultKind={kind} />}
      </PageHeader>

      <PageTabs
        label={g.title}
        items={[
          { href: href(), label: g.all, active: !kind },
          ...PARTNER_KINDS.map((k) => ({ href: href(k), label: g.kinds[k], active: kind === k, count: activeByKind[k] || undefined })),
        ]}
        aside={
          <form action={base} className="relative w-full sm:w-64">
            {kind && <input type="hidden" name="kind" value={kind} />}
            <Search aria-hidden className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input name="q" defaultValue={q} placeholder={g.search} aria-label={g.search} className="pl-8" />
          </form>
        }
      />

      <Panel>
        <DataTable
          rows={partners}
          rowKey={(r) => r.id}
          minWidth={980}
          empty={q ? <EmptyState icon={SearchX} title={g.emptySearch} /> : <EmptyState icon={Handshake} title={g.emptyTitle} body={g.emptyBody} />}
          columns={[
            {
              key: "name",
              header: g.name,
              mobile: "title",
              className: "max-w-56",
              cell: (r) => (
                <span className="block min-w-0">
                  <span className="block truncate font-medium">{r.name}</span>
                  {r.website && (
                    <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground block truncate text-xs underline-offset-4 hover:underline">
                      {r.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </span>
              ),
            },
            { key: "kind", header: g.kind, mobile: "subtitle", cell: (r) => g.kinds[r.kind] ?? r.kind },
            {
              key: "contact",
              header: g.contact,
              className: "max-w-52",
              cell: (r) => (
                <span className="block min-w-0 text-sm">
                  {r.contactName && <span className="block truncate">{r.contactName}</span>}
                  {r.phone && (
                    <a href={`tel:${r.phone}`} className="text-muted-foreground block truncate text-xs hover:underline">
                      {r.phone}
                    </a>
                  )}
                  {r.email && (
                    <a href={`mailto:${r.email}`} className="text-muted-foreground block truncate text-xs hover:underline">
                      {r.email}
                    </a>
                  )}
                </span>
              ),
            },
            {
              key: "regions",
              header: g.regions,
              className: "max-w-44",
              cell: (r) => <span className="text-muted-foreground block truncate text-xs" title={r.regions.join(", ")}>{r.regions.length ? r.regions.join(", ") : g.nationwide}</span>,
            },
            {
              key: "offer",
              header: g.offer,
              className: "max-w-64",
              cell: (r) => (
                <span className="line-clamp-2 text-xs" title={r.offer ?? ""}>
                  {r.offer ?? "—"}
                </span>
              ),
            },
            {
              key: "status",
              header: g.status,
              mobile: "aside",
              cell: (r) => (
                <span className="flex flex-col items-start gap-1">
                  <Badge variant={r.status === "active" ? "secondary" : r.status === "paused" ? "outline" : "destructive"}>{g.statuses[r.status] ?? r.status}</Badge>
                  {r.contractEndsAt && (
                    <span className={cn("text-xs whitespace-nowrap", r.renewSoon ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
                      {r.renewSoon ? `${g.renewSoon} · ` : ""}
                      {date(r.contractEndsAt)}
                    </span>
                  )}
                </span>
              ),
            },
            ...(canManage
              ? [
                  {
                    key: "edit",
                    header: "",
                    align: "right" as const,
                    cell: (r: (typeof partners)[number]) => <PartnerDialog {...dialogProps} partner={r} />,
                  },
                ]
              : []),
          ]}
        />
      </Panel>
      {partners.length > 0 && (
        <p className="text-muted-foreground mt-3 text-xs">{fmt(g.activeN, { n: partners.filter((p) => p.status === "active").length })}</p>
      )}
    </div>
  );
}
