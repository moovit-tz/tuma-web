import { useTranslations } from "next-intl";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQSection() {
  const t = useTranslations("support.faqs");

  return (
    <section className="py-12">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-bold text-center mb-8">{t("title")}</h2>
        <Accordion type="single" collapsible>
          {/* Add your FAQ items here */}
        </Accordion>
      </div>
    </section>
  );
}