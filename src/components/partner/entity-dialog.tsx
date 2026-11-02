"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

export type DialogField =
  | { name: string; label: string; type?: "text" | "tel" | "email" | "number" | "date"; required?: boolean; half?: boolean; mono?: boolean }
  | { name: string; label: string; type: "select"; options: [string, string][]; half?: boolean };

/** Add/edit dialog for partner records (vehicles, clients). The server action validates and returns field errors. */
export function EntityDialog({
  trigger,
  title,
  fields,
  initial,
  submit,
  savedMessage,
}: {
  trigger: React.ReactNode;
  title: string;
  fields: DialogField[];
  initial: Record<string, string>;
  submit: (values: Record<string, string>) => Promise<{ ok: true } | { ok: false; error: string; fields?: Record<string, string> }>;
  savedMessage: string;
}) {
  const { dict } = useI18n();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const input = "bg-background focus-visible:border-ring aria-[invalid=true]:border-destructive h-10 w-full rounded-md border px-3 text-[15px] outline-none";
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setV(initial);
          setErrors({});
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          id="entity-form"
          className="grid grid-cols-2 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await submit(v);
              if (r.ok) {
                toast.success(savedMessage);
                setOpen(false);
              } else {
                setErrors(r.fields ?? {});
                toast.error(r.error);
              }
            });
          }}
        >
          {fields.map((f) => (
            <label key={f.name} className={cn("grid gap-1.5", !f.half && "col-span-2")}>
              <span className="text-sm font-medium">{f.label}</span>
              {f.type === "select" ? (
                <select className={input} value={v[f.name] ?? ""} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} aria-invalid={!!errors[f.name]}>
                  {f.options.map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type ?? "text"}
                  required={"required" in f && f.required}
                  value={v[f.name] ?? ""}
                  onChange={(e) => setV({ ...v, [f.name]: e.target.value })}
                  aria-invalid={!!errors[f.name]}
                  className={cn(input, "mono" in f && f.mono && "font-mono uppercase")}
                />
              )}
              {errors[f.name] && <span className="text-destructive text-[12.5px]">{errors[f.name]}</span>}
            </label>
          ))}
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {dict.common.cancel}
          </Button>
          <Button type="submit" form="entity-form" disabled={pending}>
            {pending ? dict.common.saving : dict.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
