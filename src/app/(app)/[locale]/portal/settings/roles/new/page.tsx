import { getCurrentUser } from "@/server/auth/current-user";
import { roleScope } from "@/server/services/roles";
import { getDict } from "@/i18n";
import { PageHeader } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { RoleEditor } from "@/components/admin/role-editor";

export default async function NewRolePage({ params }: PageProps<"/[locale]/portal/settings/roles/new">) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  const scope = roleScope(user);
  if (!scope) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  return (
    <>
      <PageHeader eyebrow={t.roles.title} title={t.roles.newRole} />
      <RoleEditor locale={locale} mode="create" scope={scope.kind} initial={{ key: "", name: "", description: "", surface: scope.kind === "account" ? "partner" : "console", permissions: [] }} />
    </>
  );
}

/** See the area layout: authenticated pages render per request. */
export const instant = false;
