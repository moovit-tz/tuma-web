import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/server/db/client";
import { accounts } from "@/server/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { getSetting } from "@/server/settings";
import { momoEnabled } from "@/server/services/agent-payments";
import { getDict } from "@/i18n";
import { TZ_REGIONS } from "@/domain/pricing";
import { PACKAGING_TYPES } from "@/domain/parcel-types";
import { PageHeader } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { CounterBookingForm } from "@/components/agent/counter-booking-form";

export const instant = false;

/** Book a parcel over the counter, from a desk: the app's counter form on one page. */
export default async function BookAtCounter({ params }: PageProps<"/[locale]/portal/parcels/new">) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  if (!user.permissions.has("agent.workspace") || !user.permissions.has("shipment.create") || !user.accountId) return <NoAccess locale={locale} />;
  const t = getDict(locale);
  const lang = (x: { en: string; sw: string; fr?: string }) => (locale === "sw" ? x.sw : locale === "fr" ? (x.fr ?? x.en) : x.en);
  const [goodsTypes, momo, [acct]] = await Promise.all([
    getSetting("goodsTypes"),
    momoEnabled(user.accountId),
    db.select({ pod: accounts.payOnDelivery }).from(accounts).where(eq(accounts.id, user.accountId)),
  ]);

  return (
    <div>
      <Link href={`/${locale}/portal/parcels`} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" /> {t.agent.parcel.back}
      </Link>
      <div className="mt-3">
        <PageHeader title={t.agent.book.title} description={t.agent.book.sub} />
      </div>
      <CounterBookingForm
        regions={TZ_REGIONS}
        goodsTypes={goodsTypes.map((g) => ({ key: g.key, label: lang(g) }))}
        packaging={PACKAGING_TYPES.map((x) => ({ key: x.key, label: lang(x) }))}
        momo={momo}
        payOnDelivery={!!acct?.pod}
      />
    </div>
  );
}
