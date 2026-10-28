import { useTranslations } from "next-intl";
import { Mail, Phone, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ContactSupport() {
  const t = useTranslations("support.contact");

  return (
    <section className="py-12">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold mb-4">{t("title")}</h2>
        <p className="text-lg text-muted-foreground mb-8">
          {t("description")}
        </p>
        
        <div className="grid gap-6 md:grid-cols-3">
          <Button variant="outline" className="gap-2">
            <Mail className="h-4 w-4" />
            {t("email")}
          </Button>
          <Button variant="outline" className="gap-2">
            <Phone className="h-4 w-4" />
            {t("phone")}
          </Button>
          <Button variant="outline" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </Button>
        </div>
      </div>
    </section>
  );
}