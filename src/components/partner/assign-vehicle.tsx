"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { assignVehicleAction } from "@/app/actions/partner";
import { useI18n } from "@/i18n/client";

/** Inline select to load a shipment onto one of the partner's vehicles. */
export function AssignVehicle({ waybill, current, options, disabled }: { waybill: string; current: string | null; options: { id: string; plate: string; status: string }[]; disabled?: boolean }) {
  const { dict } = useI18n();
  const t = dict.partner;
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-1.5">
      <select
        aria-label={`${t.cargo.vehicle} ${waybill}`}
        value={current ?? ""}
        disabled={disabled || pending}
        onChange={(e) =>
          start(async () => {
            const r = await assignVehicleAction(waybill, e.target.value || null);
            if (!r.ok) toast.error(r.error);
          })
        }
        className="bg-background h-8 max-w-[150px] rounded-md border px-2 font-mono text-xs disabled:opacity-60"
      >
        <option value="">{t.cargo.unassigned}</option>
        {options.map((v) => (
          <option key={v.id} value={v.id} disabled={v.status === "maintenance" || v.status === "inactive"}>
            {v.plate}
            {v.status !== "available" && v.status !== "on_trip" ? ` · ${t.vehicles.statuses[v.status]}` : ""}
          </option>
        ))}
      </select>
      {pending && <Loader2 className="text-muted-foreground size-3.5 animate-spin" />}
    </span>
  );
}
