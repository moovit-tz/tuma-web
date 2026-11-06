import { AppLocale, asLocale } from "@/domain/types";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getDict } from "@/i18n";
import { normaliseWaybill } from "@/domain/waybill-number";
import { DEFAULT_COUNTRY } from "@/domain/countries";
import { detectCountry } from "@/server/country";
import { TrackForm } from "@/components/brand/public-header";
import { BandLayout, SideCard } from "@/components/brand/band-layout";
import { WhereToFind } from "@/components/shipments/where-to-find";

export const metadata = { title: "Track a parcel" };

/** Example used in the hints: a well-formed reference, so copying it gives "not found", not "invalid". */
const EXAMPLE = "AAB204";

type L = AppLocale;
type SP = PageProps<"/[locale]/track">["searchParams"];

export default async function TrackSearch({ params, searchParams }: PageProps<"/[locale]/track">) {
  const { locale: raw } = await params;
  const locale: L = asLocale(raw);
  // The band map shows the country the visitor tracks from; the shell renders with the default first.
  return (
    <Suspense fallback={<TrackPage locale={locale} country={DEFAULT_COUNTRY} form={<TrackForm locale={locale} />} />}>
      <Located locale={locale} searchParams={searchParams} />
    </Suspense>
  );
}

async function Located({ locale, searchParams }: { locale: L; searchParams: SP }) {
  const sp = await searchParams;
  const wb = typeof sp.wb === "string" ? sp.wb : "";
  if (wb) redirect(`/${locale}/track/${encodeURIComponent(normaliseWaybill(wb).waybill)}`);
  const { country } = await detectCountry();
  return <TrackPage locale={locale} country={country.iso2} form={<TrackForm locale={locale} />} />;
}

function TrackPage({ locale, country, form }: { locale: L; country: string; form: React.ReactNode }) {
  const t = getDict(locale);
  return (
    <BandLayout
      locale={locale}
      country={country}
      eyebrow={`Tuma · ${t.track.waybillLabel}`}
      title={t.track.title}
      sub={t.track.enter}
      sidebar={
        <SideCard title={t.track.where}>
          <WhereToFind locale={locale} example={EXAMPLE} />
        </SideCard>
      }
    >
      <section className="bg-card max-w-2xl rounded-xl border p-5 sm:p-6">
        <label htmlFor="wb" className="text-sm font-medium">
          {t.landing.trackLabel}
        </label>
        <div className="mt-2">{form}</div>
        <p className="text-muted-foreground mt-2.5 font-mono text-[11px] tracking-wide">
          {t.track.format}: ABC123
        </p>
      </section>
    </BandLayout>
  );
}
