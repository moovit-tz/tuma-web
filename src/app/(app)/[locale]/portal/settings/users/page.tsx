import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current-user";
import { listRoles, listUsers, roleScope } from "@/server/services/roles";
import { db } from "@/server/db/client";
import { accounts } from "@/server/db/schema";
import { getDict } from "@/i18n";
import { PageHeader, Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { UserRoles } from "@/components/admin/user-roles";
import { AddMember } from "@/components/admin/add-member";
import { InviteStaff } from "@/components/team/invite-staff";
import { PendingInvites } from "@/components/team/pending-invites";
import { teamOverview } from "@/server/services/team-invites";

export const instant = false;

/** People and their roles: everyone for Tuma admins; only the user's own company for partner admins. */
export default async function UsersPage({ params }: PageProps<"/[locale]/portal/settings/users">) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  const scope = roleScope(user, "users");
  if (!scope) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const [people, roles, accts] = await Promise.all([listUsers(user), listRoles(user), db.select({ id: accounts.id, name: accounts.name }).from(accounts)]);
  const accountName = new Map(accts.map((a) => [a.id, a.name]));
  const roleOptions = roles.map((r) => ({ key: r.key, name: r.name, active: r.active }));
  const visible = new Set(roles.map((r) => r.key));
  const company = scope.kind === "account" ? accountName.get(scope.accountId) : undefined;
  // Inviting is for a company's own team (a Tuma admin's company is Tuma's internal account).
  const team = user.accountId ? await teamOverview(user) : null;
  return (
    <>
      <PageHeader eyebrow={company ?? t.nav.settings} title={scope.kind === "account" ? t.nav.team : t.roles.assignTitle} description={t.roles.assignSub}>
        <div className="flex flex-wrap gap-2">
          {process.env.ONDI_MODE === "stub" && <AddMember roles={roleOptions.filter((r) => r.active)} />}
          {team && <InviteStaff roles={team.roles} offices={team.branches} business={company ?? accountName.get(user.accountId!) ?? ""} lockedOffice={user.branchId} />}
        </div>
      </PageHeader>
      {team && team.invites.length > 0 && (
        <div className="mb-6">
          <PendingInvites invites={team.invites} locale={locale} />
        </div>
      )}
      <Panel>
        <div className="table-scroll">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="px-4 py-2.5 font-medium">{t.form.name}</th>
                {scope.kind === "platform" && <th className="px-3 py-2.5 font-medium">{t.shipments.account}</th>}
                <th className="px-4 py-2.5 font-medium">{t.roles.assign}</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/${locale}/portal/settings/users/${encodeURIComponent(p.id)}`} className="font-medium underline-offset-4 hover:underline">
                      {p.name}
                    </Link>
                    {!p.active && <span className="border-destructive/30 text-destructive ml-2 rounded border px-1.5 py-0.5 text-[11px]">{t.team.suspended}</span>}
                    <div className="text-muted-foreground text-xs">{p.email ?? p.id}</div>
                  </td>
                  {scope.kind === "platform" && <td className="px-3 py-3">{p.accountId ? accountName.get(p.accountId) : "—"}</td>}
                  <td className="px-4 py-3">
                    <UserRoles userId={p.id} current={p.roles.filter((k) => visible.has(k))} roles={roleOptions} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
