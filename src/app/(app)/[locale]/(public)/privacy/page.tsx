import { asLocale } from "@/domain/types";
import { getDict } from "@/i18n";
import { LegalDoc } from "@/components/brand/legal-doc";
import { PRIVACY } from "@/content/legal";

export const metadata = { title: "Privacy policy" };

/** DRAFT based on SRS 10.2–10.3 and the Personal Data Protection Act, 2022. Legal to review. */
export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  const { locale: raw } = await params;
  const locale = asLocale(raw);
  return (
    <LegalDoc
      locale={locale}
      title={getDict(locale).site.privacy}
      updated={PRIVACY.updated}
      sections={PRIVACY.sections}
    />
  );
}
