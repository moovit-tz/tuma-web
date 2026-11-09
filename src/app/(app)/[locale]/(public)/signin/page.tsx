import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Building2, PackageSearch, PackageX, ShieldCheck, Store, Users } from "lucide-react";
import { getDict } from "@/i18n";
import { OndiButton } from "@/components/auth/ondi-button";
import { TumaMark, TumaWordmark } from "@/components/brand/logo";
import { LocaleSwitch } from "@/components/shell/locale-switch";
import { ThemeSwitch } from "@/components/shell/theme-switch";


const POINT_ICONS = [Store, Building2, Users];

/**
 * Sign-in: a brand panel on the left (what the portal is for, by who uses it) and a focused sign-in panel on the right
 * that follows the light or dark theme. On a phone only the sign-in panel shows.
 */
export default async function SignIn({ params, searchParams }: PageProps<"/[locale]/signin">) {
  const { locale } = await params;
  const t = getDict(locale);
  const s = t.signin;
  return (
    <div className="bg-background grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-black text-[#f2f0ea] lg:flex lg:flex-col">
        <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-24 size-[520px] opacity-[0.08]"><TumaMark framed={false} className="size-full" /></div>
        <div className="relative flex flex-1 flex-col justify-between p-12 xl:p-16">
          <Link href={`/${locale}`} className="w-fit outline-none">
            <TumaWordmark by={t.brand.by} />
          </Link>
          <div className="max-w-lg">
            <p className="text-brand-ink font-mono text-xs tracking-[0.16em] uppercase">{s.kicker}</p>
            <h2 className="font-display mt-4 text-[clamp(30px,3.2vw,44px)] leading-[1.08] font-bold tracking-[-0.02em] text-balance">{s.headline}</h2>
            <ul className="mt-10 grid gap-5">
              {s.points.map(([title, body], i) => {
                const Icon = POINT_ICONS[i] ?? Store;
                return (
                  <li key={title} className="flex gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-white/12 bg-white/[0.04]">
                      <Icon className="size-[18px] text-[#d9cfbb]" aria-hidden />
                    </span>
                    <div>
                      <p className="font-semibold">{title}</p>
                      <p className="mt-0.5 text-sm text-[#a59b87]">{body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="font-mono text-[11px] tracking-[0.08em] text-[#7d7668]">MOOVIT · TUMA.HUDUMIKA.TZ</p>
        </div>
      </aside>

      {/* Sign-in panel */}
      <main className="flex min-h-dvh flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link href={`/${locale}`} className="outline-none lg:invisible">
            <TumaWordmark by={t.brand.by} />
          </Link>
          <div className="flex items-center gap-2">
            <LocaleSwitch />
            <ThemeSwitch />
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <TumaMark className="hidden size-11 lg:block" />
          <h1 className="font-display mt-6 text-[28px] leading-tight font-bold tracking-[-0.02em]">{s.title}</h1>
          <p className="text-muted-foreground mt-2 text-[15px] leading-relaxed">{s.body}</p>
          <Suspense fallback={<div className="bg-muted mt-8 h-12 rounded-md" />}>
            <SignInButton locale={locale} searchParams={searchParams} />
          </Suspense>
          <p className="text-muted-foreground mt-4 flex items-center gap-2 text-xs">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
            {s.secure}
          </p>
          {process.env.ONDI_MODE === "stub" && <p className="bg-muted text-muted-foreground mt-6 rounded-md px-3 py-2.5 text-xs">{s.stubNote}</p>}

          {/* Without signing in: the same two cards as the app's welcome screen. */}
          <p className="text-muted-foreground mt-10 mb-3 font-mono text-[11px] tracking-[0.14em] uppercase">{s.orWithout}</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: `/${locale}/track`, Icon: PackageSearch, title: s.track, sub: s.trackSub },
              { href: `/${locale}/report-lost-item`, Icon: PackageX, title: s.lost, sub: s.lostSub },
            ].map(({ href, Icon, title, sub }) => (
              <Link
                key={href}
                href={href}
                className="bg-card group hover:border-foreground/30 focus-visible:ring-ring flex flex-col rounded-lg border p-4 shadow-sm transition-colors outline-none focus-visible:ring-2"
              >
                <Icon className="text-brand-ink size-6" aria-hidden />
                <span className="mt-4 text-[15px] leading-tight font-semibold">{title}</span>
                <span className="text-muted-foreground mt-1 text-[12.5px] leading-snug">{sub}</span>
              </Link>
            ))}
          </div>
          <p className="text-muted-foreground mt-6 text-sm">
            {s.newHere}{" "}
            <Link href={`/${locale}/onboarding`} className="text-foreground inline-flex items-center gap-1 font-semibold hover:underline">
              {s.openBusiness}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </p>
        </div>

        <nav className="text-muted-foreground flex flex-nowrap items-center justify-center gap-x-5 text-xs whitespace-nowrap">
          <Link href={`/${locale}/terms`} className="hover:text-foreground">
            {t.site.terms}
          </Link>
          <Link href={`/${locale}/privacy`} className="hover:text-foreground">
            {t.site.privacy}
          </Link>
          <Link href={`/${locale}/contact`} className="hover:text-foreground">
            {s.help}
          </Link>
        </nav>
      </main>
    </div>
  );
}

async function SignInButton({ locale, searchParams }: { locale: string; searchParams: PageProps<"/[locale]/signin">["searchParams"] }) {
  const t = getDict(locale);
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
  const error = typeof sp.error === "string" ? sp.error : "";
  const href = `/api/auth/login?locale=${locale}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
  return (
    <>
      {error && (
        <p role="alert" className="border-destructive/30 bg-destructive/10 text-destructive mt-6 rounded-md border px-3 py-2 text-sm">
          {error === "no_role" ? t.signin.noAccess : ((t.signin.errors as Record<string, string>)[error] ?? t.signin.errors.failed)}
        </p>
      )}
      <OndiButton href={href} className="mt-8 w-full">
        {t.signin.cta}
      </OndiButton>
    </>
  );
}
