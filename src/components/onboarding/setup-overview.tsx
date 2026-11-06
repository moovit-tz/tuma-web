import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { ArrowRight, Boxes, Building, Clock, Contact, Lock, Package, PackagePlus, ShieldCheck, Users } from "lucide-react";
import { db } from "@/server/db/client";
import { accounts, branches, kybApplications, teamInvites, users } from "@/server/db/schema";
import type { CurrentUser } from "@/server/auth/current-user";
import { fmt, getDict } from "@/i18n";
import { PageHeader } from "@/components/shell/page-header";

/**
 * The portal home for a business that is still being reviewed: what they can set up now (team, offices, roles,
 * customers), each card shown only if their permissions allow it, and what opens on approval.
 */
export async function SetupOverview({ user, locale }: { user: CurrentUser; locale: string }) {
  const t = getDict(locale).setup;
  const acc = user.accountId!;
  const [[acct], [app], [{ members }], [{ invites }], [{ offices }]] = await Promise.all([
    db.select({ name: accounts.name }).from(accounts).where(eq(accounts.id, acc)),
    db.select({ ref: kybApplications.ref }).from(kybApplications).where(eq(kybApplications.accountId, acc)),
    db.select({ members: count() }).from(users).where(and(eq(users.accountId, acc), eq(users.active, true))),
    db.select({ invites: count() }).from(teamInvites).where(and(eq(teamInvites.accountId, acc), eq(teamInvites.status, "pending"))),
    db.select({ offices: count() }).from(branches).where(and(eq(branches.accountId, acc), eq(branches.active, true))),
  ]);
  const base = `/${locale}/portal`;
  const trial = user.trial;
  const can = (p: Parameters<typeof user.permissions.has>[0]) => user.permissions.has(p);
  const cards = [
    can("team.manage") && { href: `${base}/settings/users`, icon: Users, title: t.team, sub: t.teamSub, meta: fmt(t.teamCount, { members, invites }) },
    can("partner.branches.manage") && { href: `${base}/branches`, icon: Building, title: t.offices, sub: t.officesSub, meta: fmt(t.officesCount, { n: offices }) },
    can("team.manage") && { href: `${base}/settings/roles`, icon: ShieldCheck, title: t.roles, sub: t.rolesSub, meta: null },
    can("partner.clients.manage") && { href: `${base}/clients`, icon: Contact, title: t.clients, sub: t.clientsSub, meta: null },
  ].filter(Boolean) as { href: string; icon: typeof Users; title: string; sub: string; meta: string | null }[];

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={fmt(t.title, { business: acct?.name ?? "" })} description={fmt(t.lead, { ref: app?.ref ?? "" })} />
      <div className="bg-warn/10 border-warn/25 mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-4 py-3.5">
        <Clock className="text-warn size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t.review}</p>
          <p className="text-muted-foreground text-sm">{t.reviewSub}</p>
        </div>
        {app && (
          <Link href={`/${locale}/portal/application`} className="text-sm font-medium underline underline-offset-4">
            {t.viewApplication}
          </Link>
        )}
      </div>
      {trial && (trial.allowance > 0 || trial.used > 0) && (
        <section className="bg-card mb-6 rounded-lg border p-5 shadow-sm">
          <div className="flex flex-wrap items-start gap-4">
            <span className="bg-brand-red/10 text-brand-red grid size-11 shrink-0 place-items-center rounded-lg">
              <Package className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">{trial.remaining > 0 ? fmt(t.trialTitle, { n: trial.remaining }) : t.trialUsedUp}</h2>
              <p className="text-muted-foreground mt-1 text-sm">{trial.remaining > 0 ? fmt(t.trialSub, { allowance: trial.allowance }) : t.trialUsedUpSub}</p>
              <div className="bg-muted mt-3 h-1.5 overflow-hidden rounded-full" role="progressbar" aria-valuemin={0} aria-valuemax={trial.allowance} aria-valuenow={Math.min(trial.used, trial.allowance)}>
                <div className="bg-brand-red h-full" style={{ width: `${trial.allowance ? Math.min(100, (trial.used / trial.allowance) * 100) : 100}%` }} />
              </div>
              <p className="text-muted-foreground mt-1.5 text-xs">{fmt(t.trialUsed, { used: trial.used, allowance: trial.allowance })}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {can("shipment.create") && (
              <Link href={`${base}/shipments/new`} className="bg-primary text-primary-foreground inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium">
                <PackagePlus className="size-4" /> {t.bookParcel}
              </Link>
            )}
            {can("partner.cargo.read") && (
              <Link href={`${base}/cargo`} className="hover:bg-muted inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium">
                <Boxes className="size-4" /> {t.parcelsInHand}
              </Link>
            )}
          </div>
        </section>
      )}
      <ul className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <li key={c.href}>
            <Link href={c.href} className="bg-card hover:border-foreground/30 group flex h-full gap-4 rounded-lg border p-5 shadow-sm transition-colors">
              <span className="bg-brand-red/10 text-brand-red grid size-11 shrink-0 place-items-center rounded-lg">
                <c.icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2 font-semibold">
                  {c.title}
                  <ArrowRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="text-muted-foreground mt-1 block text-sm leading-snug">{c.sub}</span>
                {c.meta && <span className="bg-muted mt-3 inline-block rounded-full px-2.5 py-1 text-xs font-medium">{c.meta}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="text-muted-foreground mt-6 flex items-start gap-3 rounded-lg border border-dashed px-4 py-3.5 text-sm">
        <Lock className="mt-0.5 size-4 shrink-0" />
        <p>
          <span className="text-foreground font-medium">{t.unlock}: </span>
          {t.unlockItems}
        </p>
      </div>
    </>
  );
}
