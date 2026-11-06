import { AppLocale, asLocale } from "@/domain/types";
import { Suspense } from "react";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { CheckCircle2, MapPin, Package, ShieldCheck, LifeBuoy, PackageSearch } from "lucide-react";
import { getDict } from "@/i18n";
import { dateOnly, dateTime } from "@/lib/format";
import { allowLookup, devReceiverCode, isTrackingVerified, publicTracking } from "@/server/services/tracking";
import { TrackForm } from "@/components/brand/public-header";
import { BandLayout, SideCard } from "@/components/brand/band-layout";
import { TrackVerify } from "@/components/shipments/track-verify";
import { TrackAnother } from "@/components/shipments/track-another";
import { PARCEL_MAIN_LINE, type ShipmentState } from "@/domain/states";
import { normaliseWaybill } from "@/domain/waybill-number";
import { DEFAULT_COUNTRY } from "@/domain/countries";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { StateIcon, stateColor } from "@/components/shipments/state-icon";

export const metadata = { robots: { index: false } };

type L = AppLocale;

export default async function TrackResult({ params }: PageProps<"/[locale]/track/[waybill]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Result params={params} />
    </Suspense>
  );
}

function Loading() {
  return (
    <BandLayout locale="en" title={<Skeleton className="h-10 w-72" />}>
      <Skeleton className="h-64 max-w-2xl" />
    </BandLayout>
  );
}

async function Result({ params }: { params: PageProps<"/[locale]/track/[waybill]">["params"] }) {
  const { locale: raw, waybill: rawWb } = await params;
  const locale: L = asLocale(raw);
  await connection(); // rate limiting reads the clock, so render at request time
  const t = getDict(locale);
  const { waybill } = normaliseWaybill(decodeURIComponent(rawWb));
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowLookup(ip)) return <Message title={t.track.rateLimited} locale={locale} waybill={waybill} />;

  const proof = (await cookies()).get(`tuma_trk_${waybill}`)?.value;
  const r = await publicTracking(waybill, await isTrackingVerified(waybill, proof));
  if (r.status === "invalid") return <Message title={t.track.invalid} locale={locale} waybill={waybill} />;
  if (r.status === "not_found") return <Message title={t.track.notFound} locale={locale} waybill={waybill} />;

  const state = r.state as ShipmentState;
  const reached = new Set(r.timeline.map((e) => e.stateAfter));
  const offLine = !PARCEL_MAIN_LINE.includes(state as never);
  const addr = r.consignee.address as { ward?: string; district: string; region: string };
  const when = r.deliveredAt
    ? `${t.track.deliveredOn} ${dateTime(r.deliveredAt, locale)}`
    : r.promisedAt && state !== "CANCELLED"
      ? `${t.track.expected} ${dateOnly(r.promisedAt, locale)}`
      : null;

  return (
    <BandLayout
      locale={locale}
      country={DEFAULT_COUNTRY /* shipments currently originate in Tanzania */}
      eyebrow={<span className="font-mono tracking-[0.1em]">{r.waybill}</span>}
      title={
        <span className="inline-flex items-center gap-3" style={{ color: stateColor(state) }}>
          <StateIcon state={state} solid className="size-8 sm:size-9" />
          {t.states[r.state]}
        </span>
      }
      meta={when}
      bandAside={<TrackAnother current={r.waybill} />}
      sidebar={
        <div className="flex flex-col">
          <SideCard
            title={t.detail.receiver}
            footer={
              <div className="space-y-1.5">
                <div>{t.track.problem}</div>
                <Link href={`/${locale}/report-lost-item`} className="hover:text-foreground flex items-center gap-2">
                  <PackageSearch className="size-3.5" /> {t.track.reportLost}
                </Link>
                <Link href={`/${locale}/contact`} className="hover:text-foreground flex items-center gap-2">
                  <LifeBuoy className="size-3.5" /> {t.track.contactUs}
                </Link>
              </div>
            }
          >
            <div className="font-medium">{r.consignee.name}</div>
            <div className="font-mono text-[13px]">{r.consignee.phone}</div>
            <div className="text-muted-foreground text-[13px]">{[addr.ward, addr.district, addr.region].filter(Boolean).join(", ")}</div>
            {r.verified ? (
              <p className="text-ok mt-3 inline-flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="size-4" /> {t.track.verifyTitle}
              </p>
            ) : (
              <div className="mt-4 border-t pt-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="size-4" aria-hidden /> {t.track.verifyTitle}
                </div>
                <TrackVerify waybill={r.waybill} maskedPhone={r.consignee.phone} devCode={await devReceiverCode(r.waybill)} />
              </div>
            )}
          </SideCard>
        </div>
      }
    >
      <div className="max-w-2xl space-y-5 pb-10">
        {/* Progress */}
        <section className="bg-card rounded-xl border p-5 sm:p-6">
          {!offLine && (
            <ol className="grid grid-cols-6 gap-1.5" aria-label={t.detail.timeline}>
              {PARCEL_MAIN_LINE.map((s) => {
                const done = reached.has(s) || (s === "CREATED" && reached.size > 0) || s === state;
                const current = s === state;
                return (
                  <li key={s} className="min-w-0" aria-current={current ? "step" : undefined}>
                    <span
                      className={cn("mb-2 grid size-7 place-items-center rounded-full sm:size-8", !done && "bg-muted text-muted-foreground")}
                      style={done ? (current ? { background: stateColor(s), color: "white" } : { background: `color-mix(in srgb, ${stateColor(s)} 14%, transparent)`, color: stateColor(s) }) : undefined}
                    >
                      <StateIcon state={s} solid={current} className="size-3.5 sm:size-4" />
                    </span>
                    <span className="block h-1.5 rounded-full" style={{ background: done ? stateColor(state) : "var(--border)" }} />
                    <span className={cn("mt-2 block truncate text-[11px] sm:text-xs", current ? "font-semibold" : done ? "" : "text-muted-foreground")} style={current ? { color: stateColor(s) } : undefined}>
                      {t.states[s]}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          <dl className={cn("grid grid-cols-3 gap-4 text-sm", !offLine && "mt-6 border-t pt-5")}>
            <div>
              <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <MapPin className="size-3.5" /> {t.track.from}
              </dt>
              <dd className="mt-1 font-medium">{r.origin}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <MapPin className="text-parcel size-3.5" /> {t.track.to}
              </dt>
              <dd className="mt-1 font-medium">{r.destination}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Package className="size-3.5" /> {t.track.pieces}
              </dt>
              <dd className="mt-1 font-medium">{r.piecesCount}</dd>
            </div>
          </dl>
        </section>

        {/* Timeline */}
        <section className="bg-card rounded-xl border p-5 sm:p-6">
          <h2 className="font-semibold">{t.detail.timeline}</h2>
          <ol className="mt-5">
            {[...r.timeline].reverse().map((e, i, all) => (
              <li key={i} className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
                {i < all.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-9 bottom-1 left-[15px] w-0.5 rounded-full"
                    style={{ background: `linear-gradient(${stateColor(e.stateAfter)}, color-mix(in srgb, ${stateColor(all[i + 1].stateAfter)} 40%, transparent))`, opacity: 0.45 }}
                  />
                )}
                <span
                  aria-hidden
                  className={cn("relative grid size-8 place-items-center rounded-full", e.estimated && "border-muted-foreground border border-dashed")}
                  style={
                    e.estimated
                      ? { color: "var(--muted-foreground)" }
                      : i === 0
                        ? { background: stateColor(e.stateAfter), color: "white", boxShadow: `0 0 0 4px color-mix(in srgb, ${stateColor(e.stateAfter)} 18%, transparent)` }
                        : { background: `color-mix(in srgb, ${stateColor(e.stateAfter)} 14%, transparent)`, color: stateColor(e.stateAfter) }
                  }
                >
                  <StateIcon state={e.stateAfter} solid={i === 0 && !e.estimated} />
                </span>
                <div className="min-w-0 pt-1">
                  <div className="flex flex-wrap justify-between gap-x-3">
                    <span className={cn(i === 0 && "font-semibold", e.estimated && "text-muted-foreground italic")} style={i === 0 && !e.estimated ? { color: stateColor(e.stateAfter) } : undefined}>
                      {e.stateAfter ? t.states[e.stateAfter] : (t.track.milestones[e.type] ?? e.type)}
                    </span>
                    <time className="text-muted-foreground tabular text-[12.5px]">{dateTime(e.occurredAt, locale)}</time>
                  </div>
                  <div className="text-muted-foreground text-[13px]">
                    {[e.locationName, locale === "sw" ? e.reasonSw : e.reasonEn, e.estimated ? t.track.estimatedNote : null].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </BandLayout>
  );
}

function Message({ title, locale, waybill }: { title: string; locale: L; waybill: string }) {
  const t = getDict(locale);
  return (
    <BandLayout locale={locale} eyebrow={<span className="font-mono tracking-[0.1em]">{waybill}</span>} title={title}>
      <section className="bg-card max-w-2xl rounded-xl border p-5 sm:p-6">
        <TrackForm locale={locale} defaultValue={waybill} />
        <p className="text-muted-foreground mt-4 text-sm">
          {t.track.problem}{" "}
          <Link href={`/${locale}/contact`} className="text-foreground underline underline-offset-4">
            {t.track.contactUs}
          </Link>
        </p>
      </section>
    </BandLayout>
  );
}
