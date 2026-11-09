import { AppLocale, asLocale } from "@/domain/types";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getDict, fmt } from "@/i18n";
import { COUNTRIES, DEFAULT_COUNTRY, getCountry, type Country } from "@/domain/countries";
import { detectCountry } from "@/server/country";
import { PublicFooter, PublicHeader } from "@/components/brand/public-header";
import { DiscoveryWizard } from "@/components/business/discovery-wizard";

export const metadata = { title: "Tuma for Business" };

/**
 * PARKED: this folder starts with "_" so Next.js does not route it. Rename it back to "business" and
 * re-add the navbar link in public-header.tsx to bring the page back.
 */
type BizProps = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

type L = AppLocale;

export default async function BusinessPage({ params, searchParams }: BizProps) {
  const { locale: raw } = await params;
  const locale: L = asLocale(raw);
  const t = getDict(locale);
  const b = t.businessPage;
  const fallback = getCountry(DEFAULT_COUNTRY)!;

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader locale={locale} />

      {/* Hero */}
      <section className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-12 sm:px-6 sm:pt-20 sm:pb-16">
          <div className="text-brand-ink font-mono text-[11px] tracking-[0.14em] uppercase">{b.eyebrow}</div>
          <h1 className="font-display mt-3 max-w-[20ch] text-[clamp(34px,5.2vw,60px)] leading-[1.02] font-bold tracking-[-0.03em] text-balance">{b.title}</h1>
          <p className="text-sidebar-muted mt-5 max-w-2xl text-[17px] leading-relaxed">{b.sub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#discover" className="bg-brand-red inline-flex h-11 items-center gap-2 rounded-md px-5 font-medium text-black">
              {b.ctaDiscover} <ArrowRight className="size-4" />
            </a>
            <Link href={`/${locale}/signin`} className="border-sidebar-border hover:border-sidebar-foreground/40 inline-flex h-11 items-center rounded-md border px-5 font-medium">
              {b.signIn}
            </Link>
          </div>
          <ul className="border-sidebar-border mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-[#2e2e2e] sm:grid-cols-4">
            {b.proof.map((p) => (
              <li key={p} className="bg-sidebar px-4 py-3 font-mono text-[11.5px] tracking-[0.1em] uppercase">
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <main className="flex-1">
        {/* Capabilities */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="eyebrow">{b.capTitle}</h2>
          <div className="mt-6 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {b.caps.map(([title, line, points], i) => (
              <div key={title} className="border-t pt-5">
                <div className="text-muted-foreground font-mono text-xs">{String(i + 1).padStart(2, "0")}</div>
                <h3 className="font-display mt-2 text-2xl font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-[15px] leading-snug">{line}</p>
                <ul className="text-muted-foreground mt-3 space-y-1.5 text-sm">
                  {points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span aria-hidden className="bg-parcel mt-2 size-1 shrink-0 rounded-full" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Payments */}
        <section className="bg-card border-y">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight">{b.payTitle}</h2>
              <p className="text-muted-foreground mt-3 max-w-md">{b.paySub}</p>
              <Suspense fallback={<Wallets locale={locale} country={fallback} />}>
                <LocatedWallets locale={locale} searchParams={searchParams} />
              </Suspense>
            </div>
            <dl className="divide-y border-y">
              {b.payRows.map(([key, title, body]) => (
                <div key={key} className="grid gap-1 py-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-6">
                  <dt className="font-semibold">{title}</dt>
                  <dd className="text-muted-foreground text-[15px]">{body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Steps */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="eyebrow">{b.stepsTitle}</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {b.steps.map(([title, body], i) => (
              <li key={title} className="flex gap-4">
                <span className="bg-primary text-primary-foreground grid size-8 shrink-0 place-items-center rounded-full font-mono text-xs">{i + 1}</span>
                <div>
                  <div className="font-semibold">{title}</div>
                  <p className="text-muted-foreground mt-0.5 text-sm">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Discovery */}
        <section id="discover" className="bg-sunken/60 scroll-mt-16 border-t">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="mb-8 max-w-2xl">
              <h2 className="font-display text-3xl font-bold tracking-tight">{t.discovery.title}</h2>
              <p className="text-muted-foreground mt-2">{t.discovery.sub}</p>
            </div>
            <Suspense fallback={<Wizard locale={locale} origin={fallback.iso2} />}>
              <LocatedWizard locale={locale} searchParams={searchParams} />
            </Suspense>
          </div>
        </section>
      </main>
      <PublicFooter locale={locale} />
    </div>
  );
}

type SP = BizProps["searchParams"];

async function located(searchParams: SP) {
  const sp = await searchParams;
  return (await detectCountry(typeof sp.c === "string" ? sp.c : undefined)).country;
}

async function LocatedWallets({ locale, searchParams }: { locale: L; searchParams: SP }) {
  return <Wallets locale={locale} country={await located(searchParams)} />;
}

async function LocatedWizard({ locale, searchParams }: { locale: L; searchParams: SP }) {
  return <Wizard locale={locale} origin={(await located(searchParams)).iso2} />;
}

function Wallets({ locale, country }: { locale: L; country: Country }) {
  const b = getDict(locale).businessPage;
  const p = getDict(locale).pay.methods;
  return (
    <div className="mt-8">
      <div className="text-sm font-medium">{fmt(b.walletsIn, { country: country.name[locale] })}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[p.cash, ...(country.wallets ?? [p.mobile_money]), p.card, p.bank_transfer].map((w) => (
          <span key={w} className="bg-background rounded-md border px-2.5 py-1 text-sm">
            {w}
          </span>
        ))}
      </div>
      {country.wallets && <p className="text-muted-foreground mt-2 text-xs">{b.walletsConfirm}</p>}
    </div>
  );
}

function Wizard({ locale, origin }: { locale: L; origin: string }) {
  return <DiscoveryWizard defaultOrigin={origin} countries={COUNTRIES.map((c) => ({ iso2: c.iso2, name: c.name[locale], live: c.status === "live", wallets: c.wallets ?? [] }))} />;
}
