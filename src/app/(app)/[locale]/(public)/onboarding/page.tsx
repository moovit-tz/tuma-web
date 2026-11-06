import { redirect } from "next/navigation";
import { asLocale } from "@/domain/types";
import { getDict } from "@/i18n";
import { BandLayout, SideCard } from "@/components/brand/band-layout";
import { getCurrentUser } from "@/server/auth/current-user";
import { myKyb } from "@/server/services/kyb";
import { canSetUp, canUseConsole, canUsePartner, canUsePortal } from "@/domain/roles";
import { invitesFor } from "@/server/services/team-invites";
import { InviteCards } from "@/components/team/invite-cards";
import Link from "next/link";
import { ArrowRight, PackageSearch, SearchX } from "lucide-react";
import { KybForm } from "@/components/onboarding/kyb-form";
import { KybStatus } from "@/components/onboarding/kyb-status";

export const metadata = { title: "Set up your business" };

/** Per-person page: reads the session and the application on every request. */
export const instant = false;

/**
 * Self-onboarding for people who signed in with Ondi but have no Tuma role yet: apply as a parcel agent (KYB goes
 * to ComplyOS), then follow the application here. Transacting opens only when ComplyOS approves and Tuma grants
 * the role; until then the portal sends them back here.
 */
export default async function OnboardingPage({ params, searchParams }: PageProps<"/[locale]/onboarding">) {
  const { locale: raw } = await params;
  const locale = asLocale(raw);
  const t = getDict(locale);
  const o = t.onboarding;
  const user = await getCurrentUser();
  if (!user) redirect(`/api/auth/login?locale=${locale}&next=/${locale}/onboarding`);
  const app = await myKyb({ user, driver: null });
  // Once there's a workspace, the application lives inside it (with the portal's own header), not on the public site.
  if (app && user.accountId) redirect(`/${locale}/portal/application${(await searchParams).edit === "1" ? "?edit=1" : ""}`);
  const canWork = canUseConsole(user.permissions) || canUsePartner(user.permissions) || canUsePortal(user.permissions);
  if (canWork && !app) redirect(`/${locale}/portal`);
  const editing = (await searchParams).edit === "1" && app?.canEdit;
  // Under review but able to set up (team, offices): point them at it. Not in a business yet: any invitations.
  const settingUp = user.accountStatus === "pending" && canSetUp(user.permissions);
  const invites = user.accountId ? [] : await invitesFor(user);
  const s = t.setup;

  return (
    <BandLayout
      locale={locale}
      eyebrow={o.eyebrow}
      title={app && !editing ? o.statusTitle : o.title}
      sub={app && !editing ? o.statusLead : o.lead}
      sidebar={
        <SideCard title={o.signedInAs.replace("{name}", user.name)} footer={
            <form action={`/api/auth/logout?locale=${locale}`} method="post">
              <button className="hover:text-foreground underline underline-offset-2">{t.common.signOut}</button>
            </form>
          }>
          <ol className="border-border relative space-y-4 border-l pl-4">
            {(["submitted", "in_review", "approved"] as const).map((s, i) => (
              <li key={s} className="relative text-sm">
                <span className="bg-background border-border absolute top-0 -left-[25px] grid size-[18px] place-items-center rounded-full border font-mono text-[10px]">{i + 1}</span>
                <span className="font-medium">{o.status[s]}</span>
                <span className="text-muted-foreground block leading-snug">{o.next[s]}</span>
              </li>
            ))}
          </ol>
        </SideCard>
      }
      sidebarOnMobile={false}
    >
      <div className="max-w-2xl">
        {!editing && <InviteCards invites={invites} locale={locale} />}
        {settingUp && !editing && (
          <Link
            href={`/${locale}/portal`}
            className="bg-sidebar text-sidebar-foreground group mb-6 flex items-center gap-4 rounded-lg p-5 shadow-sm"
          >
            <span className="min-w-0 flex-1">
              <span className="text-brand-red block text-xs font-semibold tracking-wide uppercase">{s.whileYouWait}</span>
              <span className="mt-1 block text-lg font-bold">{s.goSetup}</span>
              <span className="mt-1 block text-sm text-white/70">{s.teamSub} {s.officesSub}</span>
            </span>
            <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
          </Link>
        )}
        {app && !editing ? (
          <KybStatus app={app} locale={locale} />
        ) : user.accountId && !app ? (
          settingUp ? null : <p className="bg-card rounded-lg border p-6 text-sm">{user.accountStatus === "pending" ? s.reviewSub : o.hasAccount}</p>
        ) : (
          <KybForm initial={editing ? app!.application : null} contactName={user.name} />
        )}
        {/* Sending or waiting for a parcel of their own? That doesn't wait for the business. */}
        <section className="bg-card mt-6 rounded-lg border p-5 shadow-sm">
          <h2 className="font-semibold">{o.parcelHelpTitle}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{o.parcelHelpSub}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              { href: `/${locale}/track`, icon: PackageSearch, label: o.trackParcel },
              { href: `/${locale}/report-lost-item`, icon: SearchX, label: o.reportLostParcel },
            ].map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href} className="hover:bg-muted flex items-center gap-3 rounded-md border px-4 py-3 text-sm font-medium">
                <Icon className="text-brand-red size-5" /> <span className="flex-1">{label}</span>
                <ArrowRight className="text-muted-foreground size-4" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </BandLayout>
  );
}
