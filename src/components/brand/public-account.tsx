import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current-user";
import { getDict } from "@/i18n";
import { canSetUp, canUseConsole, canUsePartner, canUsePortal } from "@/domain/roles";
import { PublicMobileMenu } from "./public-mobile-menu";

type NavItem = { href: string; label: string };

const pill =
  "group bg-sidebar-foreground hidden h-9 items-center gap-2 rounded-full pr-1 pl-4 text-sm font-medium text-black transition-colors hover:bg-white sm:inline-flex";

/** The header's right corner: Sign in, or, once signed in, a way back into their workspace. Reads the session. */
export async function PublicAccount({ locale, nav }: { locale: string; nav: NavItem[] }) {
  const user = await getCurrentUser();
  // No workspace yet (a first application, or not applied): their application page is where they belong.
  const works = !!user && (canUseConsole(user.permissions) || canUsePartner(user.permissions) || canUsePortal(user.permissions) || canSetUp(user.permissions));
  return <AccountCorner locale={locale} nav={nav} user={user ? { name: user.name, works } : null} />;
}

/** Also the signed-out fallback while the session is read, so static pages render without waiting on it. */
export function AccountCorner({ locale, nav, user }: { locale: string; nav: NavItem[]; user: { name: string; works: boolean } | null }) {
  const t = getDict(locale);
  const item = !user
    ? { href: `/${locale}/signin`, label: t.common.signIn }
    : user.works
      ? { href: `/${locale}/portal`, label: t.site.openPortal }
      : { href: `/${locale}/onboarding`, label: t.site.yourApplication };
  const initials = user?.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <>
      <Link suppressHydrationWarning href={item.href} className={pill}>
        {item.label}
        {user ? (
          <span className="bg-brand-red grid size-7 place-items-center rounded-full text-[11px] font-semibold text-black" aria-hidden>
            {initials}
          </span>
        ) : (
          <span className="grid size-7 place-items-center rounded-full bg-black text-white transition-transform group-hover:translate-x-0.5">
            <ArrowRight className="size-3.5" aria-hidden />
          </span>
        )}
      </Link>
      <PublicMobileMenu items={[...nav, item]} menuLabel={t.site.menu} by={t.brand.by} />
    </>
  );
}
