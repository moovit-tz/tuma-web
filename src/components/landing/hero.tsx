import { AppLocale } from "@/domain/types";
import { COUNTRIES, dms, type Country } from "@/domain/countries";
import { MapHover, type HoverCountry } from "@/components/map/map-hover";
import { getDict } from "@/i18n";
import type { CountrySource } from "@/server/country";
import { RegionMap } from "@/components/map/region-map";
import { CountrySwitcher } from "./country-switcher";
import { HeroTrack } from "./hero-track";

/** Location-aware hero: copy, cities, status and map all follow the selected country. */
export function Hero({ locale, country, source }: { locale: AppLocale; country: Country; source: CountrySource }) {
  const t = getDict(locale);
  const name = country.name[locale];
  const [before, after] = t.hero.headline.split("{country}");
  const hoverData: Record<string, HoverCountry> = Object.fromEntries(
    COUNTRIES.map((c) => [
      c.iso2,
      { iso2: c.iso2, name: c.name[locale], blocs: c.blocs, cities: c.cities.map((x) => x.name), currency: c.currency, dial: c.dial, coords: dms(c.cities[0].lat, c.cities[0].lon) },
    ]),
  );

  return (
    <section className="relative grid min-h-0 flex-1 content-center lg:content-stretch lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
      {/* Map: its own column on large screens (hover for country details). Not shown on phones and tablets,
          where the copy and the tracking box are the whole page. */}
      <div className="relative order-2 hidden lg:block">
        <MapHover countries={hoverData}>
          <RegionMap selected={country} locale={locale} corridors="all" simulate className="absolute inset-0 h-full w-full" />
        </MapHover>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black to-transparent" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-col justify-center gap-[clamp(14px,2.6vh,26px)] py-[clamp(24px,5vh,48px)] pr-4 pl-[max(1rem,calc((100vw-72rem)/2+1.5rem))] sm:pr-8 lg:order-1 lg:py-[clamp(20px,4vh,48px)]">
        <CountrySwitcher selected={country} locale={locale} sourceLabel={t.hero.detected[source]} />

        <h1 className="font-display max-w-[19ch] text-[clamp(32px,min(3.9vw,6.4vh),56px)] leading-[1.02] font-bold tracking-[-0.03em] text-balance">
          {keepHyphens(before)}
          <span className="text-brand-red">{name}</span>
          {keepHyphens(after)}
        </h1>

        <p className="text-sidebar-muted max-w-[34rem] text-[clamp(15px,min(1.3vw,2.1vh),18px)] leading-relaxed">{t.hero.sub}</p>

        <HeroTrack />

      </div>
    </section>
  );
}

/** Never break a hyphenated word ("Cross-Border") across lines. */
function keepHyphens(text: string) {
  return text.split(/(\S+-\S+)/).map((part, i) =>
    /\S+-\S+/.test(part) ? (
      <span key={i} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
