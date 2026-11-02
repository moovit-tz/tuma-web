import { asLocale } from "@/domain/types";
import { getDict } from "@/i18n";
import { LegalDoc } from "@/components/brand/legal-doc";

export const metadata = { title: "Privacy policy" };

/** DRAFT based on SRS 10.2–10.3 and the Personal Data Protection Act, 2022. Legal to review. */
export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  const { locale: raw } = await params;
  const locale = asLocale(raw);
  return (
    <LegalDoc
      locale={locale}
      title={getDict(locale).site.privacy}
      updated="1 November 2026"
      sections={[
        { h: "Scope", p: ["This policy explains how Moovit handles personal data in Tuma, under the Personal Data Protection Act, 2022 of Tanzania."] },
        { h: "What we collect", p: ["For senders and receivers: name, phone number, email if given, delivery address, landmark or map pin, and language preference. For deliveries: scan events, delivery proof such as a one-time code, signature or photo, and the time and place of handover. For riders and drivers: location while on duty only."] },
        { h: "Why we use it", p: ["To deliver and track shipments, send delivery messages, collect cash on delivery, handle claims and complaints, meet legal and tax duties, and improve the service. We record the purpose and legal basis for processing receiver data."] },
        { h: "Who we share it with", p: ["With the merchant who sent your parcel, the riders, agents and carriers who handle it, and Moovit systems that provide sign-in, customer service, messaging and finance. We do not sell personal data."] },
        { h: "How we protect it", p: ["Phone numbers and names are masked on the public tracking page, in shared links and in logs. Full receiver details on the tracking page need the last four digits of the receiver's phone. Data is encrypted in transit and at rest."] },
        { h: "How long we keep it", p: ["Waybills, events and charges: 7 years. Delivery photos and signatures: 3 years. Detailed GPS history: 13 months. Message logs: 13 months. Receiver personal data on closed waybills is anonymised after 24 months."] },
        { h: "Your rights", p: ["You may ask to see, correct or delete your personal data, subject to legal retention duties. Write to privacy@tuma.co.tz or use the contact page."] },
      ]}
    />
  );
}
