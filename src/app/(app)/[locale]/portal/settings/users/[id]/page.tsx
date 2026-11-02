import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, History, ShieldCheck, UserRound } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { getMember, listRoles, roleScope } from "@/server/services/roles";
import { fmt, getDict } from "@/i18n";
import { dateTime } from "@/lib/format";
import { PERMISSIONS } from "@/domain/roles";
import { PageHeader, Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { UserRoles } from "@/components/admin/user-roles";
import { MemberActiveToggle, MemberProfileForm } from "@/components/admin/member-editor";
import { cn } from "@/lib/utils";

export const instant = false;

/** One person on the team: profile (editable), access status, roles, what they can do, and recent activity. */
export default async function MemberPage({ params }: PageProps<"/[locale]/portal/settings/users/[id]">) {
  const { locale, id: raw } = await params;
  const user = (await getCurrentUser())!;
  const scope = roleScope(user, "users");
  if (!scope) return <NoAccess locale={locale} />;
  const id = raw.includes("%") ? decodeURIComponent(raw) : raw;
  const t = getDict(locale);
  const tm = t.team;
  const [data, roles] = await Promise.all([getMember(user, id), listRoles(user)]);
  if (!data) notFound();
  const { m, accountName, permissions, activity } = data;
  const branchName = data.branches.find((b) => b.id === m.branchId)?.name;
  const roleOptions = roles.map((r) => ({ key: r.key, name: r.name, active: r.active }));
  const visible = new Set(roles.map((r) => r.key));
  const self = m.id === user.id;
  const granted = new Set(permissions);
  const groups = new Map<string, string[]>();
  for (const p of PERMISSIONS) if (granted.has(p.key)) groups.set(p.group, [...(groups.get(p.group) ?? []), p.label]);
  const initials = m.name
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <Link href={`/${locale}/portal/settings/users`} className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm">
        <ArrowLeft className="size-4" aria-hidden /> {tm.back}
      </Link>
      <PageHeader
        eyebrow={[accountName ?? t.nav.settings, branchName].filter(Boolean).join(" · ")}
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            <span aria-hidden className="bg-brand-red grid size-11 place-items-center rounded-md text-base font-semibold tracking-normal text-white">
              {initials}
            </span>
            {m.name}
            {self && <span className="bg-muted rounded-md px-2 py-0.5 text-xs font-medium tracking-normal">{tm.you}</span>}
            <span
              className={cn(
                "rounded-md border px-2 py-0.5 text-xs font-medium tracking-normal",
                m.active ? "border-ok/30 bg-ok/10 text-ok" : "border-destructive/30 bg-destructive/10 text-destructive",
              )}
            >
              {m.active ? tm.active : tm.suspended}
            </span>
          </span>
        }
        description={`${m.email ?? m.id} · ${tm.lastSeen}: ${m.lastSeenAt ? dateTime(m.lastSeenAt, locale) : tm.never}`}
      >
        <MemberActiveToggle id={m.id} active={m.active} self={self} />
      </PageHeader>
      {!m.active && <p className="border-destructive/30 bg-destructive/5 text-destructive mb-6 rounded-md border px-4 py-3 text-sm">{tm.suspendedNote}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Panel banner icon={UserRound} title={tm.profile}>
            <MemberProfileForm id={m.id} email={m.email} initial={{ name: m.name, phone: m.phone ?? "", locale: m.locale, branchId: m.branchId ?? "" }} branches={data.branches} branchLocked={Boolean(user.branchId)} />
          </Panel>

          <Panel banner icon={ShieldCheck} title={tm.roles} description={tm.rolesHint}>
            <div className="border-b p-4 sm:p-5">
              <UserRoles userId={m.id} current={m.roles.filter((k) => visible.has(k))} roles={roleOptions} />
            </div>
            <div className="p-4 sm:p-5">
              <h4 className="mb-3 text-sm font-semibold">{fmt(tm.permissions, { n: granted.size })}</h4>
              {groups.size === 0 ? (
                <p className="text-muted-foreground text-sm">{t.common.none}</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[...groups].map(([group, labels]) => (
                    <div key={group}>
                      <div className="eyebrow mb-1.5">{group}</div>
                      <ul className="space-y-1 text-[13.5px]">
                        {labels.map((l) => (
                          <li key={l} className="flex gap-2">
                            <span aria-hidden className="bg-brand-red mt-2 size-1.5 shrink-0 rounded-full" />
                            {l}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        </div>

        <aside>
          <Panel banner icon={History} title={tm.activity}>
            {activity.length === 0 ? (
              <p className="text-muted-foreground px-4 py-10 text-center text-sm">{tm.noActivity}</p>
            ) : (
              <ol className="divide-y text-sm">
                {activity.map((a, i) => (
                  <li key={i} className="px-4 py-3">
                    <div className="font-mono text-[12.5px] font-medium">{a.action}</div>
                    <div className="text-muted-foreground mt-0.5 text-xs">
                      {dateTime(a.at, locale)}
                      {a.actorId !== m.id && ` · ${a.actorId === user.id ? tm.you : a.actorId}`}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </aside>
      </div>
    </>
  );
}
