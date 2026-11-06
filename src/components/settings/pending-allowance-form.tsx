"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { savePendingAllowanceAction } from "@/app/actions/settings";

/** The number of parcels a business under review may handle, with quick picks. */
export function PendingAllowanceForm({ value }: { value: number }) {
  const { dict } = useI18n();
  const t = dict.platformSettings;
  const [v, setV] = useState(String(value));
  const [pending, start] = useTransition();
  const n = Number(v);
  const valid = v.trim() !== "" && Number.isInteger(n) && n >= 0 && n <= 10_000;
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        start(async () => {
          const r = await savePendingAllowanceAction(n);
          if (r.ok) toast.success(t.saved);
          else toast.error(r.error);
        });
      }}
    >
      <label htmlFor="allowance" className="text-sm font-medium">
        {t.allowanceLabel}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="allowance"
          inputMode="numeric"
          value={v}
          onChange={(e) => setV(e.target.value.replace(/\D/g, ""))}
          aria-invalid={!valid}
          className="bg-background focus-visible:border-ring aria-[invalid=true]:border-destructive h-10 w-28 rounded-md border px-3 font-mono text-[15px] outline-none"
        />
        <span className="text-muted-foreground text-sm">{t.parcels}</span>
        <div className="flex gap-1.5">
          {[0, 10, 20, 50].map((q) => (
            <Button key={q} type="button" size="sm" variant={n === q ? "secondary" : "outline"} onClick={() => setV(String(q))}>
              {q}
            </Button>
          ))}
        </div>
      </div>
      <p className="text-muted-foreground text-xs">{n === 0 ? t.zeroHint : t.allowanceHint}</p>
      <div>
        <Button type="submit" disabled={pending || !valid || n === value}>
          {pending && <Loader2 className="animate-spin" />} {t.save}
        </Button>
      </div>
    </form>
  );
}
