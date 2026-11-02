import { getCurrentUser } from "@/server/auth/current-user";
import { listExceptions } from "@/server/services/shipments";
import { getDict } from "@/i18n";
import { PageHeader, Panel } from "@/components/shell/page-header";
import { ExceptionList } from "@/components/shipments/exception-list";
import { NoAccess } from "@/components/shell/no-access";

export default async function ExceptionsPage({ params }: PageProps<"/[locale]/portal/exceptions">) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("exception.manage")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const rows = await listExceptions("open");
  return (
    <>
      <PageHeader title={t.console.exceptionsTitle} description="FR-OPS-02 · sorted by due time" />
      <Panel>
        <ExceptionList rows={rows} locale={locale} />
      </Panel>
    </>
  );
}

/** See the area layout: authenticated pages render per request. */
export const instant = false;
