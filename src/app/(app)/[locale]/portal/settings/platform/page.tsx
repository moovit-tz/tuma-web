import { getCurrentUser } from "@/server/auth/current-user";
import { getSetting, settingMeta } from "@/server/settings";
import { fmt, getDict } from "@/i18n";
import { PageHeader, Panel } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { PendingAllowanceForm } from "@/components/settings/pending-allowance-form";
import { SupportContactsForm } from "@/components/settings/support-contacts-form";

export const instant = false;

/** Platform settings Tuma staff change without a deploy (settings.manage). */
export default async function PlatformSettingsPage({ params }: PageProps<"/[locale]/portal/settings/platform">) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("settings.manage")) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const s = t.platformSettings;
  const [allowance, meta, contacts] = await Promise.all([getSetting("pendingParcelAllowance"), settingMeta("pendingParcelAllowance"), getSetting("supportContacts")]);
  const when = meta?.updatedAt.toLocaleDateString(locale === "sw" ? "sw-TZ" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  return (
    <>
      <PageHeader eyebrow={t.nav.settings} title={s.title} description={s.sub} />
      <Panel title={s.allowanceTitle} description={s.allowanceSub}>
        <div className="p-4">
          <PendingAllowanceForm value={allowance} />
          <p className="text-muted-foreground mt-4 text-xs">{meta ? fmt(s.lastChanged, { date: when ?? "" }) : s.defaultValue}</p>
        </div>
      </Panel>
      <Panel title={s.supportTitle} description={s.supportSub}>
        <div className="p-4">
          <SupportContactsForm value={contacts} />
        </div>
      </Panel>
    </>
  );
}
