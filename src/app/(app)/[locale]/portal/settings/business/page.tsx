import { getCurrentUser } from "@/server/auth/current-user";
import { workflowFor } from "@/server/services/agent-settings";
import { getDict } from "@/i18n";
import { PageHeader } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { WorkflowForm } from "@/components/agent/workflow-form";

export const instant = false;

/** Business settings for a parcel agent: what the office does with parcels. */
export default async function BusinessSettingsPage({ params }: PageProps<"/[locale]/portal/settings/business">) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("agent.workspace") || !user.accountId) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const w = await workflowFor(user);
  return (
    <div>
      <PageHeader title={t.agent.biz.title} description={t.agent.biz.sub} />
      <WorkflowForm initial={w.workflow} canManage={w.canManage} approved={w.approved} />
    </div>
  );
}
