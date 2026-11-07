"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { offloadAction } from "@/app/actions/agent";

/**
 * Checking a manifest in at this office: a barcode scanner types the waybill and presses Enter, so the box keeps focus
 * and takes one label after another. Rows on the list can be checked in with a tap when a label won't read.
 */
export function ManifestCheckIn({ id }: { id: string }) {
  const { dict: t } = useI18n();
  const m = t.agent.mf;
  const router = useRouter();
  const [wb, setWb] = useState("");
  const [pending, start] = useTransition();
  const box = useRef<HTMLInputElement>(null);
  const submit = (value: string) =>
    start(async () => {
      const r = await offloadAction(id, value.trim());
      setWb("");
      box.current?.focus();
      if (!r.ok) return void toast.error(r.error);
      toast.success(fmt(m.checkedIn, { waybill: r.data!.waybill, state: t.states[r.data!.state] ?? r.data!.state }), { description: r.data!.receiver });
      if (r.data!.done) toast.success(m.allIn);
      router.refresh();
    });
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (wb.trim()) submit(wb);
      }}
    >
      <div className="relative flex-1">
        <ScanLine aria-hidden className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input ref={box} autoFocus value={wb} onChange={(e) => setWb(e.target.value.toUpperCase())} placeholder={m.checkInPlaceholder} aria-label={m.checkInPlaceholder} className="pl-8 font-mono" disabled={pending} />
      </div>
      <Button type="submit" disabled={pending || !wb.trim()}>
        {m.checkIn}
      </Button>
    </form>
  );
}

/** Check one row in (when its label won't scan). */
export function CheckInRow({ id, waybill }: { id: string; waybill: string }) {
  const { dict: t } = useI18n();
  const m = t.agent.mf;
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await offloadAction(id, waybill);
          if (!r.ok) return void toast.error(r.error);
          toast.success(fmt(m.checkedIn, { waybill, state: t.states[r.data!.state] ?? r.data!.state }));
          if (r.data!.done) toast.success(m.allIn);
          router.refresh();
        })
      }
    >
      {m.checkIn}
    </Button>
  );
}
