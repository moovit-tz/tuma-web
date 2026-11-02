import { notFound } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";
import { getRole, roleScope } from "@/server/services/roles";
import { getDict } from "@/i18n";
import { PageHeader } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { RoleEditor } from "@/components/admin/role-editor";

export default async function EditRolePage({ params }: PageProps<"/[locale]/portal/settings/roles/[key]">) {
  const { locale, key } = await params;
  const user = (await getCurrentUser())!;
  const scope = roleScope(user);
  if (!scope) return <NoAccess locale={locale} />;
  const role = await getRole(user, key);
  if (!role) notFound();
  const t = getDict(locale);
  return (
    <>
      <PageHeader eyebrow={t.roles.title} title={role.name} description={`${role.userCount} ${t.roles.users.toLowerCase()} · ${role.system ? t.roles.system : t.roles.custom}`} />
      <RoleEditor
        locale={locale}
        mode="update"
        system={role.system}
        scope={scope.kind}
        readOnly={!role.editable}
        active={role.active}
        userCount={role.userCount}
        initial={{ key: role.key, name: role.name, description: role.description, surface: role.surface, permissions: role.permissions }}
      />
    </>
  );
}

/** See the area layout: authenticated pages render per request. */
export const instant = false;
