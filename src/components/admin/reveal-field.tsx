"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Eye } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { revealCustomerFieldAction } from "@/app/actions/admin";
import { ConfirmNote } from "./confirm-note";

/** A masked detail with "Reveal": asks why, logs it, then shows the real value in place. */
export function RevealField({ customerKey, field, masked }: { customerKey: string; field: "phone" | "name" | "email"; masked: string | null }) {
  const { dict: t } = useI18n();
  const c = t.admin.c360;
  const [value, setValue] = useState<string | null>(null);
  if (!masked) return <span>—</span>;
  if (value !== null) return <span className="font-medium select-all">{value || "—"}</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span>{masked}</span>
      <ConfirmNote
        trigger={
          <button type="button" className="text-brand-ink inline-flex items-center gap-1 text-xs font-medium hover:underline">
            <Eye className="size-3.5" aria-hidden /> {c.reveal}
          </button>
        }
        title={fmt(c.revealTitle, { field: c.fields[field] })}
        noteLabel={c.revealReason}
        notePlaceholder={c.revealHint}
        noteRequired={5}
        confirmLabel={c.reveal}
        onConfirm={async (reason) => {
          const r = await revealCustomerFieldAction(customerKey, field, reason);
          if (!r.ok) {
            toast.error(r.error);
            return false;
          }
          setValue(r.data?.value ?? "");
          toast.success(c.revealed);
          return true;
        }}
      />
    </span>
  );
}
