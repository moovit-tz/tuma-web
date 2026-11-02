import { AppLocale } from "@/domain/types";
import { getDict } from "@/i18n";
import { SUPPORT } from "@/config/support";
import { BandLayout } from "./band-layout";
import { LegalToc } from "./legal-toc";

export type LegalSection = { h: string; p: string[] };

/** Terms and Privacy: band title, fixed sidebar, document column scrolls (scrollbar hidden). */
export function LegalDoc({ locale, title, updated, sections }: { locale: AppLocale; title: string; updated: string; sections: LegalSection[] }) {
  const t = getDict(locale);
  const L = (en: string, sw: string, fr: string) => (locale === "sw" ? sw : locale === "fr" ? fr : en);
  const scrollId = "legal-scroll";
  return (
    <BandLayout
      locale={locale}
      title={title}
      meta={
        <>
          {t.site.updated}: {updated}
          {locale !== "en" && L("", " · Toleo kamili la Kiswahili linaandaliwa", " · Version française complète en préparation")}
        </>
      }
      scrollId={scrollId}
      sidebarOnMobile={false}
      sidebar={
        <LegalToc
          docTitle={title}
          updated={updated}
          sections={sections.map((s) => s.h)}
          scrollId={scrollId}
          locale={locale}
          email={SUPPORT.email}
          labels={{
            document: L("Document", "Hati", "Document"),
            updated: L("Updated", "Imesasishwa", "Mis à jour le"),
            onThisPage: L("On this page", "Kwenye ukurasa huu", "Sur cette page"),
            read: L("Read", "Umesoma", "Lu"),
            print: L("Print or save as PDF", "Chapisha au hifadhi PDF", "Imprimer ou enregistrer en PDF"),
            questions: L("Questions?", "Maswali?", "Des questions ?"),
            contact: t.site.contact,
          }}
        />
      }
    >
      <article className="max-w-[68ch] pb-16">
        {sections.map((s, i) => (
          <section key={s.h} id={`s${i + 1}`} className="scroll-mt-4 border-b py-6 first:pt-0 last:border-0">
            <h2 className="font-display flex items-baseline gap-3 text-xl font-semibold tracking-tight">
              <span className="text-muted-foreground font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
              {s.h}
            </h2>
            {s.p.map((para, j) => (
              <p key={j} className="mt-3 leading-relaxed">
                {para}
              </p>
            ))}
          </section>
        ))}
      </article>
    </BandLayout>
  );
}
