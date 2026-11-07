import { Suspense } from "react";
import { connection } from "next/server";
import { asLocale } from "@/domain/types";
import { fmt, getDict } from "@/i18n";
import { BandLayout } from "@/components/brand/band-layout";
import { RateForm } from "@/components/rating/rate-form";
import { Skeleton } from "@/components/ui/skeleton";
import { ratingByToken } from "@/server/services/ratings";

export const metadata = { title: "Rate", robots: { index: false } };

type Params = Promise<{ locale: string; token: string }>;

/** The receiver's rating link from the delivery SMS: rate the Tuma point that handed the parcel over. */
export default async function RatePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<Loading />}>
      <Rate params={params} />
    </Suspense>
  );
}

function Loading() {
  return (
    <BandLayout locale="en" title={<Skeleton className="h-10 w-72" />}>
      <Skeleton className="mx-auto h-64 max-w-md" />
    </BandLayout>
  );
}

async function Rate({ params }: { params: Params }) {
  const { locale: raw, token } = await params;
  const locale = asLocale(raw);
  await connection(); // the link's state (open, rated, expired) is read at request time
  const t = getDict(locale).rate;
  const r = await ratingByToken(decodeURIComponent(token));
  const closed = r.status === "not_found" ? t.notFound : r.status === "expired" ? t.expired : r.status === "rated" ? t.rated : null;
  const sub = r.status === "not_found" ? undefined : fmt(r.point ? t.subPoint : t.sub, { business: r.business, point: r.point ?? "", waybill: r.waybill });
  return (
    <BandLayout locale={locale} title={t.title} sub={sub}>
      <div className="mx-auto max-w-md rounded-xl border p-6">
        {closed ? <p className="text-muted-foreground py-6 text-center">{closed}</p> : <RateForm token={decodeURIComponent(token)} />}
      </div>
    </BandLayout>
  );
}
