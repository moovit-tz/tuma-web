"use client";
import { useEffect, useRef } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { cn } from "@/lib/utils";

export type WizardStep = {
  key: string;
  title: string;
  /** One line under the title on the step itself: what to do here. */
  hint?: string;
  /** Can move on from this step. */
  ready: boolean;
  /** Said under Next when it can't move on yet (what's still needed). */
  missing?: string;
};

/**
 * A task in steps, the way the app does it: where you are (numbered steps on wide screens, "Step 2 of 4" with a bar
 * on phones), the step's own content, a running summary beside it (folded away on phones), and Back / Next at the
 * bottom, kept in reach while the page scrolls. Done steps can be revisited; later ones open once the earlier are
 * ready. The last step's button submits.
 */
export function Wizard({
  steps,
  step,
  onStep,
  onSubmit,
  submitLabel,
  pending,
  summary,
  summaryTitle,
  children,
}: {
  steps: WizardStep[];
  step: number;
  onStep: (i: number) => void;
  onSubmit: () => void;
  submitLabel: string;
  pending?: boolean;
  summary?: React.ReactNode;
  summaryTitle?: string;
  children: React.ReactNode;
}) {
  const { dict: t } = useI18n();
  const w = t.shell.wizard;
  const cur = steps[step];
  const last = step === steps.length - 1;
  // A later step opens once every step before it is ready.
  const reachable = (i: number) => steps.slice(0, i).every((s) => s.ready);
  const top = useRef<HTMLDivElement>(null);
  // Each step starts at its top.
  useEffect(() => {
    top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [step]);

  return (
    <div ref={top} className="scroll-mt-24">
      {/* Phones: step n of N, the title and a bar */}
      <div className="mb-5 sm:hidden">
        <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
          <span>{fmt(w.stepOf, { n: step + 1, total: steps.length })}</span>
          {!last && <span>{fmt(w.next, { title: steps[step + 1].title })}</span>}
        </div>
        <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
          <div className="bg-brand-red h-full rounded-full transition-[width] duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      {/* Wider: numbered steps */}
      <ol className="mb-6 hidden items-center gap-2 sm:flex" aria-label={w.steps}>
        {steps.map((s, i) => {
          const done = i < step && s.ready;
          const on = i === step;
          const open = reachable(i);
          return (
            <li key={s.key} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none">
              <button
                type="button"
                disabled={!open || on}
                onClick={() => onStep(i)}
                aria-current={on ? "step" : undefined}
                className={cn("group flex min-w-0 items-center gap-2.5 rounded-md py-1 pr-2 text-left outline-none focus-visible:ring-2 disabled:cursor-default", !open && "opacity-50")}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full border text-[13px] font-semibold transition-colors",
                    on ? "bg-sidebar border-sidebar text-white" : done ? "bg-brand-red border-brand-red text-black" : "bg-card text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-4" aria-hidden /> : i + 1}
                </span>
                <span className={cn("truncate text-sm", on ? "font-semibold" : "text-muted-foreground group-enabled:group-hover:text-foreground")}>{s.title}</span>
              </button>
              {i < steps.length - 1 && <span aria-hidden className={cn("h-px min-w-4 flex-1", i < step ? "bg-brand-red/60" : "bg-border")} />}
            </li>
          );
        })}
      </ol>

      <div className={cn("grid gap-6", summary && "lg:grid-cols-[minmax(0,1fr)_320px]")}>
        <div className="min-w-0">
          <div className="mb-4">
            <h3 className="font-display text-xl font-semibold tracking-tight">{cur.title}</h3>
            {cur.hint && <p className="text-muted-foreground mt-1 text-sm">{cur.hint}</p>}
          </div>
          <div className="space-y-5">{children}</div>
        </div>
        {summary && (
          <aside className="hidden lg:block">
            <div className="bg-card sticky top-24 rounded-lg border shadow-sm">
              <div className="border-b px-4 py-3 text-[15px] font-semibold">{summaryTitle ?? w.summary}</div>
              <div className="p-4 text-sm">{summary}</div>
            </div>
          </aside>
        )}
      </div>

      {/* Back / Next, kept in reach; on phones the summary folds out above it */}
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky bottom-0 z-10 -mx-4 mt-8 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6">
        {summary && (
          <details className="group mb-3 lg:hidden">
            <summary className="text-muted-foreground flex cursor-pointer list-none items-center justify-between text-sm font-medium">
              {summaryTitle ?? w.summary}
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="mt-3 max-h-[40dvh] overflow-y-auto text-sm">{summary}</div>
          </details>
        )}
        <div className="flex items-center gap-3">
          {!cur.ready && cur.missing && <p className="text-muted-foreground hidden min-w-0 flex-1 truncate text-sm sm:block">{cur.missing}</p>}
          <div className="ml-auto flex w-full gap-2 sm:w-auto">
            {step > 0 && (
              <Button type="button" variant="outline" className="h-11 flex-1 sm:flex-none" onClick={() => onStep(step - 1)} disabled={pending}>
                <ChevronLeft aria-hidden /> {w.back}
              </Button>
            )}
            {last ? (
              <Button type="button" className="h-11 flex-[2] sm:min-w-44 sm:flex-none" onClick={onSubmit} disabled={pending || !cur.ready}>
                {pending && <Loader2 className="animate-spin" aria-hidden />} {submitLabel}
              </Button>
            ) : (
              <Button type="button" className="h-11 flex-[2] sm:min-w-36 sm:flex-none" onClick={() => onStep(step + 1)} disabled={!cur.ready}>
                {w.continue} <ChevronRight aria-hidden />
              </Button>
            )}
          </div>
        </div>
        {!cur.ready && cur.missing && <p className="text-muted-foreground mt-2 text-xs sm:hidden">{cur.missing}</p>}
      </div>
    </div>
  );
}
