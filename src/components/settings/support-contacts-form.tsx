"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { saveSupportContactsAction } from "@/app/actions/settings";

type Contacts = { phone: string; whatsapp: string; email: string; hours: { en: string; sw: string } };

const input =
  "bg-background focus-visible:border-ring aria-[invalid=true]:border-destructive h-10 w-full rounded-md border px-3 text-[15px] outline-none";

/** The support phone, WhatsApp, email and hours the app's Help screen shows. */
export function SupportContactsForm({ value }: { value: Contacts }) {
  const { dict } = useI18n();
  const t = dict.platformSettings;
  const [v, setV] = useState<Contacts>(value);
  const [pending, start] = useTransition();
  const phoneOk = (x: string) => /^\+?[0-9][0-9 ]{6,18}$/.test(x.trim());
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim());
  const valid = phoneOk(v.phone) && phoneOk(v.whatsapp) && emailOk && v.hours.en.trim().length > 1 && v.hours.sw.trim().length > 1;
  const changed = JSON.stringify(v) !== JSON.stringify(value);
  const field = (id: string, label: string, val: string, set: (x: string) => void, ok = true, type = "text") => (
    <label htmlFor={id} className="grid gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input id={id} type={type} value={val} onChange={(e) => set(e.target.value)} aria-invalid={!ok} className={input} />
    </label>
  );
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        start(async () => {
          const r = await saveSupportContactsAction(v);
          if (r.ok) toast.success(t.saved);
          else toast.error(r.error);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {field("sc-phone", t.supportPhone, v.phone, (x) => setV({ ...v, phone: x }), phoneOk(v.phone), "tel")}
        {field("sc-wa", t.supportWhatsapp, v.whatsapp, (x) => setV({ ...v, whatsapp: x }), phoneOk(v.whatsapp), "tel")}
        {field("sc-email", t.supportEmail, v.email, (x) => setV({ ...v, email: x }), emailOk, "email")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("sc-hours-en", t.supportHoursEn, v.hours.en, (x) => setV({ ...v, hours: { ...v.hours, en: x } }))}
        {field("sc-hours-sw", t.supportHoursSw, v.hours.sw, (x) => setV({ ...v, hours: { ...v.hours, sw: x } }))}
      </div>
      <p className="text-muted-foreground text-xs">{t.supportHint}</p>
      <div>
        <Button type="submit" disabled={pending || !valid || !changed}>
          {pending && <Loader2 className="animate-spin" />} {t.save}
        </Button>
      </div>
    </form>
  );
}
