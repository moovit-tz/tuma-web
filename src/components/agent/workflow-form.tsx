"use client";
import { useState, useTransition } from "react";
import { Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/shell/page-header";
import { useI18n } from "@/i18n/client";
import { WORKFLOW_PRESETS, WORKFLOW_STEPS } from "@/domain/agents";
import { workflowAction } from "@/app/actions/agent";
import { cn } from "@/lib/utils";

/** What the office does: a preset in one tap (drop-off, collection, full service), or the steps one by one. */
export function WorkflowForm({ initial, canManage, approved }: { initial: string[]; canManage: boolean; approved: boolean }) {
  const { dict: t } = useI18n();
  const b = t.agent.biz;
  const o = t.onboarding;
  const [steps, setSteps] = useState<string[]>(initial);
  const [pending, start] = useTransition();
  const ordered = WORKFLOW_STEPS.filter((s) => steps.includes(s));
  const preset = Object.entries(WORKFLOW_PRESETS).find(([, v]) => v.join() === ordered.join())?.[0];
  const changed = ordered.join() !== WORKFLOW_STEPS.filter((s) => initial.includes(s)).join();
  const ro = !canManage;

  return (
    <div className="max-w-3xl space-y-4">
      {ro && (
        <p className="bg-muted text-muted-foreground flex items-center gap-2 rounded-lg px-4 py-3 text-sm">
          <Lock className="size-4 shrink-0" /> {b.readOnly}
        </p>
      )}
      {!approved && <p className="text-muted-foreground text-sm">{b.pending}</p>}
      <Panel title={b.workflow} description={b.workflowBody}>
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(WORKFLOW_PRESETS).map(([k, v]) => (
              <button
                key={k}
                type="button"
                disabled={ro}
                onClick={() => setSteps([...v])}
                className={cn("rounded-full border px-3 py-1.5 text-sm font-medium disabled:opacity-70", preset === k ? "bg-foreground text-background border-foreground" : "hover:bg-muted")}
              >
                {(o.presets as Record<string, string>)[k] ?? k}
              </button>
            ))}
            {!preset && <span className="bg-foreground text-background rounded-full px-3 py-1.5 text-sm font-medium">{b.custom}</span>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {WORKFLOW_STEPS.map((s) => {
              const on = steps.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  disabled={ro}
                  aria-pressed={on}
                  onClick={() => setSteps((x) => (on ? x.filter((y) => y !== s) : [...x, s]))}
                  className={cn("flex items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors disabled:opacity-70", on ? "border-primary bg-primary/5 ring-primary/30 ring-2" : "hover:bg-muted/50")}
                >
                  <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded border", on ? "bg-primary border-primary text-primary-foreground" : "bg-background")}>{on && <Check className="size-3.5" />}</span>
                  <span>
                    <span className="block font-medium">{(o.steps as Record<string, string>)[s] ?? s}</span>
                    <span className="text-muted-foreground block text-xs">{b.stepBody[s]}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Panel>
      {canManage && (
        <div className="flex justify-end">
          <Button
            disabled={pending || !changed || ordered.length === 0}
            onClick={() =>
              start(async () => {
                const r = await workflowAction(ordered);
                if (!r.ok) return void toast.error(r.error);
                toast.success(b.saved);
              })
            }
          >
            {b.save}
          </Button>
        </div>
      )}
    </div>
  );
}
