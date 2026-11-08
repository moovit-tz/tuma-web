"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/client";
import { updateSupportCaseAction } from "@/app/actions/admin";

const STATUSES = ["new", "in_review", "searching", "found", "not_found", "resolved", "closed"] as const;

export function CaseUpdateForm({ id, status }: { id: string; status: string }) {
  const { dict: t } = useI18n();
  const s = t.admin.support;
  const [next, setNext] = useState(status);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateSupportCaseAction(id, next, note);
          if (r.ok) {
            toast.success(s.saved);
            setNote("");
          } else toast.error(r.error);
        });
      }}
    >
      <p className="text-muted-foreground text-[13px]">{s.updateHint}</p>
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setNext(k)}
            aria-pressed={next === k}
            className={next === k ? "bg-foreground text-background rounded-full border px-3 py-1 text-xs font-medium" : "hover:bg-muted rounded-full border px-3 py-1 text-xs font-medium"}
          >
            {s.statuses[k]}
          </button>
        ))}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="case-note">{s.note}</Label>
        <Textarea id="case-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <Button type="submit" disabled={pending || (next === status && !note.trim())}>
        {pending ? t.common.saving : s.save}
      </Button>
    </form>
  );
}
