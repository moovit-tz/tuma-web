"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/app/actions/shipments";

/**
 * Small building blocks for the admin console's work screens: a form whose fields are described as data and a button
 * that runs one server action. Both take the server action as a prop, show its error or a success toast, and leave
 * refreshing the page to the action.
 */

export type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "select" | "datetime-local";
  options?: { value: string; label: string }[];
  hint?: string;
  placeholder?: string;
  required?: boolean;
  /** Fewest characters (text and textarea). */
  min?: number;
  defaultValue?: string;
  /** Spans both columns on wide screens. */
  wide?: boolean;
};

export function ActionForm({
  fields,
  action,
  submit,
  done,
  className,
  columns = 2,
  reset = true,
}: {
  fields: Field[];
  action: (values: Record<string, string>) => Promise<ActionResult<unknown>>;
  submit: string;
  /** Toast after it worked. */
  done: string;
  className?: string;
  columns?: 1 | 2;
  reset?: boolean;
}) {
  const initial = () => Object.fromEntries(fields.map((f) => [f.name, f.defaultValue ?? (f.type === "select" ? (f.options?.[0]?.value ?? "") : "")]));
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [pending, start] = useTransition();
  const valid = fields.every((f) => {
    const v = (values[f.name] ?? "").trim();
    if (f.required && !v) return false;
    if (f.min && v && v.length < f.min) return false;
    if (f.type === "number" && v && !Number.isFinite(Number(v.replace(/[,\s]/g, "")))) return false;
    return true;
  });
  return (
    <form
      className={cn("grid gap-4", columns === 2 && "sm:grid-cols-2", className)}
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const clean = Object.fromEntries(fields.map((f) => [f.name, f.type === "number" ? (values[f.name] ?? "").replace(/[,\s]/g, "") : (values[f.name] ?? "").trim()]));
          const r = await action(clean);
          if (!r.ok) return void toast.error(r.error);
          toast.success(r.message ?? done);
          if (reset) setValues(initial());
        });
      }}
    >
      {fields.map((f) => {
        const id = `f-${f.name}`;
        const set = (v: string) => setValues((s) => ({ ...s, [f.name]: v }));
        return (
          <div key={f.name} className={cn("grid content-start gap-1.5", (f.wide || f.type === "textarea") && "sm:col-span-2")}>
            <Label htmlFor={id}>{f.label}</Label>
            {f.type === "textarea" ? (
              <Textarea id={id} rows={3} maxLength={1000} value={values[f.name]} placeholder={f.placeholder} onChange={(e) => set(e.target.value)} />
            ) : f.type === "select" ? (
              <select
                id={id}
                value={values[f.name]}
                onChange={(e) => set(e.target.value)}
                className="border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
              >
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id={id}
                type={f.type === "datetime-local" ? "datetime-local" : "text"}
                inputMode={f.type === "number" ? "decimal" : undefined}
                value={values[f.name]}
                placeholder={f.placeholder}
                onChange={(e) => set(e.target.value)}
              />
            )}
            {f.hint && <p className="text-muted-foreground text-xs">{f.hint}</p>}
          </div>
        );
      })}
      <div className={cn("flex justify-end", columns === 2 && "sm:col-span-2")}>
        <Button type="submit" disabled={!valid || pending}>
          {submit}
        </Button>
      </div>
    </form>
  );
}

/** One click, one server action (already bound to its record). */
export function ActionButton({
  action,
  label,
  done,
  variant = "outline",
  size = "sm",
  confirm,
}: {
  action: () => Promise<ActionResult<unknown>>;
  label: string;
  done: string;
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost";
  size?: "sm" | "default";
  /** Ask once more before running (shown inline, no browser dialog). */
  confirm?: string;
}) {
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState(false);
  const go = () =>
    start(async () => {
      const r = await action();
      setAsking(false);
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message ?? done);
    });
  if (asking)
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">{confirm}</span>
        <Button size={size} variant={variant === "outline" ? "default" : variant} disabled={pending} onClick={go}>
          {label}
        </Button>
        <Button size={size} variant="ghost" disabled={pending} onClick={() => setAsking(false)}>
          ✕
        </Button>
      </span>
    );
  return (
    <Button size={size} variant={variant} disabled={pending} onClick={() => (confirm ? setAsking(true) : go())}>
      {label}
    </Button>
  );
}
