import { asLocale } from "@/domain/types";
import { getDict } from "@/i18n";
import { LegalDoc } from "@/components/brand/legal-doc";
import { TERMS } from "@/content/legal";

export const metadata = { title: "Terms of service" };

/** DRAFT structure for legal to complete. Liability limits and claims depend on open question Q10. */
export default async function TermsPage({ params }: PageProps<"/[locale]/terms">) {
  const { locale: raw } = await params;
  const locale = asLocale(raw);
  return (
    <LegalDoc
      locale={locale}
      title={getDict(locale).site.terms}
      updated={TERMS.updated}
      sections={TERMS.sections}
    />
  );
}
