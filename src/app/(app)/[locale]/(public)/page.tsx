import { AppLocale, asLocale } from "@/domain/types";
import { Suspense } from "react";
import { PublicFooter, PublicHeader } from "@/components/brand/public-header";
import { Hero } from "@/components/landing/hero";
import { detectCountry } from "@/server/country";
import { DEFAULT_COUNTRY, getCountry } from "@/domain/countries";

/** One-screen landing: header, location-aware hero filling the remaining height, legal footer. */
export default async function Landing({ params, searchParams }: PageProps<"/[locale]">) {
  const { locale: raw } = await params;
  const locale = asLocale(raw);
  return (
    <div className="bg-sidebar text-sidebar-foreground flex min-h-dvh flex-col lg:h-dvh lg:min-h-[600px] lg:overflow-hidden">
      <PublicHeader locale={locale} />
      {/* The shell prerenders with the default country; the visitor's country streams in. */}
      <Suspense fallback={<Hero locale={locale} country={getCountry(DEFAULT_COUNTRY)!} source="default" />}>
        <LocatedHero locale={locale} searchParams={searchParams} />
      </Suspense>
      <PublicFooter locale={locale} />
    </div>
  );
}

async function LocatedHero({ locale, searchParams }: { locale: AppLocale; searchParams: PageProps<"/[locale]">["searchParams"] }) {
  const sp = await searchParams;
  const { country, source } = await detectCountry(typeof sp.c === "string" ? sp.c : undefined);
  return <Hero locale={locale} country={country} source={source} />;
}
