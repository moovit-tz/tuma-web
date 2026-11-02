import { asLocale } from "@/domain/types";
import { getDict } from "@/i18n";
import { BandLayout, SideCard } from "@/components/brand/band-layout";
import { StepperForm } from "@/components/brand/stepper-form";

export const metadata = { title: "Report a lost item" };

export default async function LostItemPage({ params }: PageProps<"/[locale]/report-lost-item">) {
  const { locale: raw } = await params;
  const locale = asLocale(raw);
  const t = getDict(locale);
  const l = t.lostPage;
  return (
    <BandLayout
      locale={locale}
      eyebrow={t.site.lostItem}
      title={l.title}
      sub={l.sub}
      sidebar={
        <SideCard title={l.how}>
          <ol className="border-border relative space-y-4 border-l pl-4">
            {l.steps.map((s, i) => (
              <li key={i} className="relative text-sm">
                <span className="bg-background border-border absolute top-0 -left-[25px] grid size-[18px] place-items-center rounded-full border font-mono text-[10px]">{i + 1}</span>
                <span className="text-muted-foreground leading-snug">{s}</span>
              </li>
            ))}
          </ol>
        </SideCard>
      }
    >
      <div className="max-w-2xl">
        <StepperForm
          kind="lost_item"
          steps={[
            {
              title: l.stepItem,
              fields: [
                { name: "waybill", label: t.forms.waybill, hint: t.forms.waybillHint, mono: true },
                { name: "itemDescription", label: l.item, type: "textarea", required: true, hint: l.itemHint, rows: 4 },
              ],
            },
            {
              title: l.stepWhere,
              fields: [
                { name: "lastSeen", label: l.lastSeen, hint: l.lastSeenHint },
                { name: "lostOn", label: l.lostOn, type: "date", half: true },
              ],
            },
            {
              title: l.stepYou,
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
