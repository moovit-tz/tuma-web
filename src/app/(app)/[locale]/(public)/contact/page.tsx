import { asLocale } from "@/domain/types";
import { Mail, MessageCircle, Phone, Clock, MapPin } from "lucide-react";
import { getDict } from "@/i18n";
import { SUPPORT } from "@/config/support";
import { BandLayout, SideCard } from "@/components/brand/band-layout";
import { StepperForm } from "@/components/brand/stepper-form";

export const metadata = { title: "Contact" };

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale: raw } = await params;
  const locale = asLocale(raw);
  const t = getDict(locale);
  const c = t.contactPage;
  const channels = [
    [MessageCircle, t.widget.whatsapp, SUPPORT.whatsapp, SUPPORT.whatsappHref],
    [Phone, t.widget.call, SUPPORT.phone, SUPPORT.phoneHref],
    [Mail, t.widget.email, SUPPORT.email, `mailto:${SUPPORT.email}`],
  ] as const;
  return (
    <BandLayout
      locale={locale}
      eyebrow={t.site.contact}
      title={c.title}
      sub={c.sub}
      sidebar={
        <SideCard title={c.channels}>
          <ul className="space-y-3 text-sm">
            {channels.map(([I, label, value, href]) => (
              <li key={label}>
                <a href={href} className="group flex items-start gap-3">
                  <span className="bg-muted grid size-8 shrink-0 place-items-center rounded-md">
                    <I className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="text-muted-foreground block text-xs">{label}</span>
                    <span className="block truncate font-medium group-hover:underline">{value}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <div className="text-muted-foreground mt-4 space-y-1.5 border-t pt-3 text-[12.5px]">
            <p className="flex items-center gap-2">
              <Clock className="size-3.5" aria-hidden /> {SUPPORT.hours[locale]}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="size-3.5" aria-hidden /> {SUPPORT.address}
            </p>
          </div>
        </SideCard>
      }
    >
      <div className="max-w-2xl">
        <StepperForm
          kind="contact"
          steps={[
            {
              title: c.stepTopic,
              fields: [
                { name: "topic", label: c.topic, type: "tiles", required: true, options: Object.entries(c.topics) },
                { name: "waybill", label: t.forms.waybill, hint: t.forms.waybillHint, mono: true },
              ],
            },
            { title: c.stepMessage, fields: [{ name: "message", label: t.forms.message, type: "textarea", required: true, rows: 7 }] },
            {
              title: c.stepYou,
              fields: [
                { name: "name", label: t.forms.name, required: true, autoComplete: "name" },
                { name: "phone", label: t.forms.phone, type: "tel", required: true, autoComplete: "tel", half: true },
                { name: "email", label: t.forms.email, type: "email", autoComplete: "email", half: true },
              ],
            },
          ]}
        />
      </div>
    </BandLayout>
  );
}
