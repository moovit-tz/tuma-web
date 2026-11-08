"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/client";

/**
 * A button that opens a short confirmation with an optional (or required) note, then runs `onConfirm`. Used for
 * approve/reject, keep/revoke and reveal: each is a decision someone should pause on and can explain.
 */
export function ConfirmNote({
  trigger,
  title,
  body,
  noteLabel,
  notePlaceholder,
  noteRequired = 0,
  confirmLabel,
  destructive,
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  body?: React.ReactNode;
  noteLabel: string;
  notePlaceholder?: string;
  /** Minimum note length; 0 = optional. */
  noteRequired?: number;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: (note: string) => Promise<boolean>;
}) {
  const { dict: t } = useI18n();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const ok = note.trim().length >= noteRequired;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setNote("");
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {body && <DialogDescription>{body}</DialogDescription>}
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="confirm-note">{noteLabel}</Label>
          <Textarea id="confirm-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={notePlaceholder} rows={3} maxLength={500} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={!ok || pending}
            onClick={() =>
              start(async () => {
                if (await onConfirm(note.trim())) setOpen(false);
              })
            }
          >
            {pending ? t.common.saving : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
