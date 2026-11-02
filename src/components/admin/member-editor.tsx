"use client";
import { useState, useTransition } from "react";
import { Ban, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { setMemberActiveAction, updateMemberAction } from "@/app/actions/roles";
import { cn } from "@/lib/utils";

const inputCls = "bg-background h-10 w-full rounded-md border px-3 text-[15px] outline-none focus-visible:border-ring aria-[invalid=true]:border-destructive disabled:opacity-60";

type Profile = { name: string; phone: string; locale: string; branchId: string };

/** Edit a team member's profile: name, phone and portal language. */
export function MemberProfileForm({ id, initial, email, branches = [], branchLocked }: { id: string; initial: Profile; email: string | null; branches?: { id: string; name: string; code: string }[]; branchLocked?: boolean }) {
  const { dict } = useI18n();
  const t = dict.team;
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const changed = JSON.stringify(v) !== JSON.stringify(initial);

  function save(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await updateMemberAction(id, v);
      if (r.ok) {
        setErrors({});
        toast.success(t.saved);
      } else {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error);
      }
    });
  }

  const field = (name: keyof Profile, label: string, input: React.ReactNode) => (
    <div className="grid gap-1.5">
      <label htmlFor={`m-${name}`} className="text-sm font-medium">
        {label}
      </label>
      {input}
      {errors[name] && <p className="text-destructive text-[12.5px]">{errors[name]}</p>}
    </div>
  );

  return (
    <form onSubmit={save} className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
      {field("name", t.name, <input id="m-name" className={inputCls} value={v.name} aria-invalid={!!errors.name} onChange={(e) => setV({ ...v, name: e.target.value })} />)}
      <div className="grid gap-1.5">
        <label htmlFor="m-email" className="text-sm font-medium">
          {t.email}
        </label>
        <input id="m-email" className={inputCls} value={email ?? ""} disabled />
        <p className="text-muted-foreground text-[12.5px]">{t.ondiNote}</p>
      </div>
      {field("phone", t.phone, <input id="m-phone" type="tel" className={cn(inputCls, "font-mono")} value={v.phone} placeholder="+255 712 345 678" aria-invalid={!!errors.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />)}
      {field(
        "locale",
        t.language,
        <select id="m-locale" className={inputCls} value={v.locale} onChange={(e) => setV({ ...v, locale: e.target.value })}>
          <option value="en">English</option>
          <option value="sw">Kiswahili</option>
          <option value="fr">Français</option>
        </select>,
      )}
      {branches.length > 0 && (
        <div className="grid gap-1.5 sm:col-span-2">
          <label htmlFor="m-branch" className="text-sm font-medium">
            {dict.branches.branch}
          </label>
          <select id="m-branch" className={inputCls} value={v.branchId} disabled={branchLocked} aria-invalid={!!errors.branchId} onChange={(e) => setV({ ...v, branchId: e.target.value })}>
            <option value="">{dict.branches.wholeCompany}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} · {b.name}
              </option>
            ))}
          </select>
          <p className={cn("text-[12.5px]", errors.branchId ? "text-destructive" : "text-muted-foreground")}>{errors.branchId ?? dict.branches.memberHint}</p>
        </div>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending || !changed}>
          {pending ? dict.common.saving : dict.common.save}
        </Button>
        {changed && (
          <Button type="button" variant="ghost" onClick={() => setV(initial)}>
            {dict.common.cancel}
          </Button>
        )}
      </div>
    </form>
  );
}

/** Suspend or restore someone's access. */
export function MemberActiveToggle({ id, active, self }: { id: string; active: boolean; self: boolean }) {
  const { dict } = useI18n();
  const t = dict.team;
  const [pending, start] = useTransition();
  if (self) return null;
  return (
    <Button
      variant={active ? "outline" : "default"}
      className={active ? "text-destructive" : undefined}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await setMemberActiveAction(id, !active);
          if (r.ok) toast.success(t.saved);
          else toast.error(r.error);
        })
      }
    >
      {active ? <Ban /> : <RotateCcw />} {active ? t.suspend : t.restore}
    </Button>
  );
}
