import { Suspense } from "react";
import Link from "next/link";
import { PublicNavLinks } from "./public-nav-links";
import { TumaWordmark } from "./logo";
import { LocaleSwitch } from "@/components/shell/locale-switch";
import { AccountCorner, PublicAccount } from "./public-account";
import { getDict } from "@/i18n";

export function publicNav(locale: string) {
  const t = getDict(locale);
  return [
    { href: `/${locale}/track`, label: t.site.track },
    { href: `/${locale}/contact`, label: t.site.contact },
  ];
}

export function PublicHeader({ locale }: { locale: string }) {
  const t = getDict(locale);
  const nav = publicNav(locale);
  return (
    <header className="bg-sidebar/95 text-sidebar-foreground border-sidebar-border/60 sticky top-0 z-40 shrink-0 border-b backdrop-blur supports-[backdrop-filter]:bg-sidebar/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link suppressHydrationWarning href={`/${locale}`} aria-label="Tuma" className="shrink-0">
          <TumaWordmark by={t.brand.by} />
        </Link>
        <nav aria-label={t.common.mainNav} className="hidden items-center gap-1 md:flex">
          {/* usePathname needs a Suspense boundary under Cache Components; the fallback is the same links, unmarked. */}
          <Suspense
            fallback={nav.map((n) => (
              <Link suppressHydrationWarning key={n.href} href={n.href} className="text-sidebar-foreground/70 rounded-md px-3 py-2 text-[14px]">
                {n.label}
              </Link>
            ))}
          >
            <PublicNavLinks items={nav} />
          </Suspense>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <LocaleSwitch dark className="hidden sm:inline-flex" />
          {/* The session is a dynamic hole: pages stay static and show Sign in until it's read. */}
          <Suspense fallback={<AccountCorner locale={locale} nav={nav} user={null} />}>
            <PublicAccount locale={locale} nav={nav} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter({ locale, className }: { locale: string; className?: string }) {
  const t = getDict(locale);
  const links = [
    { href: `/${locale}/terms`, label: t.site.terms },
    { href: `/${locale}/privacy`, label: t.site.privacy },
    { href: `/${locale}/report-lost-item`, label: t.site.lostItem },
  ];
  return (
    <footer className={"border-sidebar-border bg-sidebar text-sidebar-muted shrink-0 border-t " + (className ?? "")}>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] text-[14px] sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-6 sm:pt-4 sm:pb-4 sm:pr-40 sm:text-[13px]">
        <nav aria-label={t.common.legalNav} className="grid grid-cols-2 gap-x-4 sm:flex sm:flex-wrap sm:gap-x-5 sm:gap-y-1">
          {links.map((l) => (
            <Link suppressHydrationWarning key={l.href} href={l.href} className="hover:text-sidebar-foreground py-2 transition-colors sm:py-0">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="font-mono text-[11px] tracking-wide">© 2026 {t.site.rights}</p>
      </div>
    </footer>
  );
}

export function TrackForm({ locale, defaultValue, big }: { locale: string; defaultValue?: string; big?: boolean }) {
  const t = getDict(locale);
  return (
    <form action={`/${locale}/track`} className="flex w-full max-w-xl gap-2">
      <label className="sr-only" htmlFor="wb">
        {t.landing.trackLabel}
      </label>
      <input
        id="wb"
        name="wb"
        required
        defaultValue={defaultValue}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder={t.landing.trackPlaceholder}
        className={
          "min-w-0 flex-1 rounded-md border font-mono uppercase outline-none placeholder:normal-case " +
          (big ? "border-sidebar-border bg-[#0E0E0E]/90 text-sidebar-foreground focus-visible:border-brand-red h-12 px-4 text-[16px]" : "bg-card h-11 px-3 text-[15px]")
        }
      />
      <button className={"rounded-md px-5 font-medium " + (big ? "bg-brand-red h-12 text-black" : "bg-primary text-primary-foreground h-11")}>{t.landing.trackCta}</button>
    </form>
  );
}
