"use client";
import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { submitSupportAction } from "@/app/actions/support";
import type { SupportKind } from "@/server/services/support";
import { cn } from "@/lib/utils";

export type StepField =
  | { name: string; label: string; type?: "text" | "tel" | "email" | "date"; required?: boolean; hint?: string; mono?: boolean; autoComplete?: string; half?: boolean }
  | { name: string; label: string; type: "textarea"; required?: boolean; hint?: string; rows?: number }
  | { name: string; label: string; type: "tiles"; options: [string, string][]; required?: boolean };

export type Step = { title: string; fields: StepField[] };

const inputCls = "bg-background focus-visible:border-ring aria-[invalid=true]:border-destructive w-full rounded-md border px-3 text-[15px] outline-none";

/**
 * Multi-step version of the public support forms. Values persist across steps; required fields are
 * checked per step; a server-side validation error jumps back to the step that holds the field.
 */
export function StepperForm({ kind, steps, submitLabel, bare = false }: { kind: SupportKind; steps: Step[]; submitLabel?: string; /** No own card: sits inside a parent panel */ bare?: boolean }) {
  const { dict: t, locale } = useI18n();
  const [i, setI] = useState(0);
  const [v, setV] = useState<Record<string, string>>({});
  const [bad, setBad] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const step = steps[i];
  const last = i === steps.length - 1;

  const missing = step.fields.filter((f) => f.required && !(v[f.name] ?? "").trim()).map((f) => f.name);

  const messageFor = (name: string) => (name === "phone" ? t.forms.fieldPhone : name === "waybill" ? t.forms.fieldWaybill : t.forms.invalid);

  function submit() {
    start(async () => {
      const r = await submitSupportAction(kind, { ...v, website: (document.getElementById("hp-website") as HTMLInputElement | null)?.value }, locale);
      if (r.ok) {
        setRef(r.ref);
        return;
      }
      setBad(r.fields ?? []);
      setError(r.error === "limited" ? t.forms.limited : r.error === "server" ? t.forms.server : t.forms.invalid);
      const at = steps.findIndex((s) => s.fields.some((f) => r.fields?.includes(f.name)));
      if (at >= 0) setI(at);
    });
  }

  if (ref) {
    return (
      <div className={cn("flex h-full flex-col items-center justify-center p-8 text-center", !bare && "bg-card rounded-xl border backdrop-blur")} role="status">
        <CheckCircle2 className="text-ok size-10" />
        <p className="mt-3 text-lg font-medium">{t.forms.thanks}</p>
        <p className="text-muted-foreground mt-5 text-xs tracking-wider uppercase">{t.forms.reference}</p>
        <p className="font-mono text-3xl font-semibold tracking-wider">{ref}</p>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm">{t.forms.referenceHint}</p>
        <Button variant="outline" className="mt-6" onClick={() => (setRef(null), setV({}), setI(0))}>
          {t.forms.again}
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", !bare && "bg-card rounded-xl border shadow-2xl backdrop-blur")}
      onSubmit={(e) => {
        e.preventDefault();
        if (missing.length) {
          setBad(missing);
          setError(t.forms.invalid);
          return;
        }
        setError(null);
        if (last) submit();
        else setI(i + 1);
      }}
    >
      <input id="hp-website" type="text" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      {/* Step header */}
      <div className="border-b px-5 pt-3.5 pb-3 sm:px-7">
        <ol className="flex items-center gap-2" aria-label={fmt(t.discovery.step, { n: i + 1, total: steps.length })}>
          {steps.map((s, k) => (
            <li key={s.title} className="flex min-w-0 flex-1 items-center gap-2">
              <span
                aria-current={k === i ? "step" : undefined}
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[11px]",
                  k < i ? "border-foreground bg-foreground text-background" : k === i ? "border-parcel text-parcel" : "text-muted-foreground",
                )}
              >
                {k < i ? <Check className="size-3.5" /> : k + 1}
              </span>
              <span className={cn("hidden truncate text-[13px] sm:block", k === i ? "font-medium" : "text-muted-foreground")}>{s.title}</span>
              {k < steps.length - 1 && <span aria-hidden className={cn("h-px flex-1", k < i ? "bg-foreground/60" : "bg-border")} />}
            </li>
          ))}
        </ol>
      </div>

      {/* Fields */}
      <div className="grid min-h-0 flex-1 content-start gap-3.5 overflow-y-auto px-5 py-4 sm:grid-cols-2 sm:px-7">
        <h2 className="font-display text-lg font-semibold tracking-tight sm:col-span-2">{step.title}</h2>
        {step.fields.map((f) => {
          const id = `sf-${f.name}`;
          const err = bad.includes(f.name) ? messageFor(f.name) : null;
          const set = (val: string) => {
            setV({ ...v, [f.name]: val });
            if (bad.includes(f.name)) setBad(bad.filter((b) => b !== f.name));
          };
          if (f.type === "tiles") {
            return (
              <fieldset key={f.name} className="sm:col-span-2">
                <legend className="sr-only">{f.label}</legend>
                <div role="radiogroup" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {f.options.map(([k, label]) => {
                    const on = v[f.name] === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => set(k)}
                        className={cn(
                          "flex min-h-[42px] items-center justify-between gap-3 rounded-lg border px-3.5 py-2 text-left text-[14px] transition-colors",
                          on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-foreground/40",
                        )}
                      >
                        {label}
                        <span aria-hidden className={cn("grid size-4 place-items-center rounded-full border", on ? "border-primary-foreground" : "border-input")}>
                          {on && <span className="bg-primary-foreground size-2 rounded-full" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {err && <p className="text-destructive mt-1.5 text-[13px]">{err}</p>}
              </fieldset>
            );
          }
          const half = "half" in f && f.half;
          return (
            <div key={f.name} className={cn("grid content-start gap-1.5", !half && "sm:col-span-2")}>
              <label htmlFor={id} className="text-sm font-medium">
                {f.label}
                {!f.required && <span className="text-muted-foreground ml-1 font-normal">({t.forms.optional})</span>}
              </label>
              {f.type === "textarea" ? (
                <textarea id={id} rows={f.rows ?? 4} value={v[f.name] ?? ""} onChange={(e) => set(e.target.value)} aria-invalid={!!err} className={cn(inputCls, "resize-none py-2.5")} />
              ) : (
                <input
                  id={id}
                  type={f.type ?? "text"}
                  value={v[f.name] ?? ""}
                  onChange={(e) => set(e.target.value)}
                  aria-invalid={!!err}
                  autoComplete={"autoComplete" in f ? f.autoComplete : undefined}
                  inputMode={f.type === "tel" ? "tel" : undefined}
                  className={cn(inputCls, "h-11", "mono" in f && f.mono && "font-mono uppercase placeholder:normal-case")}
                />
              )}
              {err ? <p className="text-destructive text-[13px]">{err}</p> : "hint" in f && f.hint ? <p className="text-muted-foreground text-[12.5px]">{f.hint}</p> : null}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-auto flex shrink-0 items-center justify-between gap-3 border-t px-5 py-3 sm:px-7">
        {/* No Back on the first step: there is nothing to go back to. */}
        {i > 0 ? (
          <Button type="button" variant="ghost" onClick={() => (setError(null), setI(i - 1))}>
            <ArrowLeft /> {t.discovery.back}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          {error && (
            <p role="alert" className="text-destructive hidden text-[13px] sm:block">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {last ? (submitLabel ?? t.forms.send) : t.discovery.next}
            {!last && <ArrowRight />}
          </Button>
        </div>
      </div>
    </form>
  );
}
