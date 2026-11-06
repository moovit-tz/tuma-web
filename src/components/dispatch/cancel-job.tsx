"use client";
import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/client";
import { cancelJobAction } from "@/app/actions/dispatch";

export function CancelJobButton({ id, jobRef }: { id: string; jobRef: string }) {
  const { dict } = useI18n();
  const j = dict.dispatch;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label={`${j.cancel} ${jobRef}`}>
          <X /> {j.cancel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {j.cancel} · <span className="font-mono">{jobRef}</span>
          </DialogTitle>
        </DialogHeader>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">{j.cancelReason}</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="bg-background focus-visible:border-ring rounded-md border px-3 py-2 text-[15px] outline-none" />
        </label>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {dict.common.back}
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await cancelJobAction(id, reason);
                if (r.ok) {
                  toast.success(j.cancelled);
                  setOpen(false);
                } else toast.error(r.error);
              })
            }
          >
            {j.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
