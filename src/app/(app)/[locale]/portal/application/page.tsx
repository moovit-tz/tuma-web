import { redirect } from "next/navigation";
import { asLocale } from "@/domain/types";
import { getDict } from "@/i18n";
import { getCurrentUser } from "@/server/auth/current-user";
import { myKyb } from "@/server/services/kyb";
import { PageHeader } from "@/components/shell/page-header";
import { KybForm } from "@/components/onboarding/kyb-form";
import { KybStatus } from "@/components/onboarding/kyb-status";

export const instant = false;

/** The business's application, inside the workspace: where it stands, its history, and changes when asked for. */
export default async function ApplicationPage({ params, searchParams }: PageProps<"/[locale]/portal/application">) {
  const { locale: raw } = await params;
  const locale = asLocale(raw);
  const o = getDict(locale).onboarding;
  const user = (await getCurrentUser())!;
  const app = await myKyb({ user, driver: null });
  if (!app) redirect(`/${locale}/portal`);
  const base = `/${locale}/portal/application`;
  const editing = (await searchParams).edit === "1" && app.canEdit;
  return (
    <>
      <PageHeader eyebrow={o.eyebrow} title={editing ? o.title : o.statusTitle} description={editing ? o.lead : o.statusLead} />
      <div className="max-w-3xl">
        {editing ? <KybForm initial={app.application} contactName={user.name} done={base} /> : <KybStatus app={app} locale={locale} base={base} />}
      </div>
    </>
  );
}
