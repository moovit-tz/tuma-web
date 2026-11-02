import { asLocale } from "@/domain/types";
import { getDict } from "@/i18n";
import { LegalDoc } from "@/components/brand/legal-doc";

export const metadata = { title: "Terms of service" };

/** DRAFT structure for legal to complete. Liability limits and claims depend on open question Q10. */
export default async function TermsPage({ params }: PageProps<"/[locale]/terms">) {
  const { locale: raw } = await params;
  const locale = asLocale(raw);
  return (
    <LegalDoc
      locale={locale}
      title={getDict(locale).site.terms}
      updated="1 November 2026"
      sections={[
        { h: "Who we are", p: ["Tuma is a parcel and cargo service operated by Moovit in the United Republic of Tanzania. These terms apply when you send, receive or track goods with Tuma, or use the Tuma website, merchant portal or API."] },
        { h: "The waybill", p: ["Every shipment travels on one waybill number. The waybill records the sender, the receiver, the goods, the service and the charges, and is the reference for tracking, billing and claims."] },
        { h: "What you may send", p: ["You must describe the goods accurately and confirm they contain no prohibited items, including weapons, illegal drugs, flammable or explosive materials, cash and live animals. We may open, hold or refuse any item we reasonably believe breaks these rules or the law."] },
        { h: "Prices and payment", p: ["We quote the price before you confirm an order, based on the route, chargeable weight, service level and any cash-on-delivery or cover options. If the weight or size measured at handover differs from what you declared, we may re-price the shipment and will tell you."] },
        { h: "Cash on delivery", p: ["When you choose cash on delivery we collect the stated amount from the receiver and remit it to you under your account agreement, less agreed fees."] },
        { h: "Delivery, failed attempts and returns", p: ["We will try to deliver up to three times or hold the parcel at a Wakala point for collection. If delivery is not possible, the parcel is returned to the sender under a linked return waybill and return charges may apply."] },
        { h: "Cancellation", p: ["You can cancel without a fee until the parcel is first handed over to us. After that, a cancellation fee applies."] },
        { h: "Loss, damage and claims", p: ["Report loss or damage as soon as possible, and within the claim period stated in your agreement. Our liability limits and declared-value cover are set out in the schedule to these terms."] },
        { h: "Changes and contact", p: ["We may update these terms and will publish the date of the latest version here. Questions: support@tuma.co.tz."] },
      ]}
    />
  );
}
