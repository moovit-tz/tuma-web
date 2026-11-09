"use client";
import { useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { createJobAction } from "@/app/actions/dispatch";
import { cn } from "@/lib/utils";

export type ReadyWaybill = { waybill: string; name: string; place: string; kg: number; state: string; cod: boolean };

const VEHICLES = { parcel: ["boda", "bajaji", "van"], cargo: ["pickup", "lorry", "trailer"] } as const;

/**
 * New job: tick waybills in the order the driver should deliver them, pick the run type, pickup and (optionally)
 * vehicle and payout. The server checks the load fits and the vehicle may work in the pickup's area.
 */
export function JobBuilder({ ready, pickups }: { ready: ReadyWaybill[]; pickups: { id: string; label: string }[] }) {
  const { dict } = useI18n();
  const j = dict.dispatch;
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [kind, setKind] = useState<"parcel" | "cargo">("parcel");
  const [pickup, setPickup] = useState(pickups[0]?.id ?? "sender");
  const [vehicle, setVehicle] = useState("");
  const [payout, setPayout] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const kg = useMemo(() => Math.round(picked.reduce((a, w) => a + (ready.find((r) => r.waybill === w)?.kg ?? 0), 0) * 10) / 10, [picked, ready]);
  const input = "bg-background focus-visible:border-ring h-10 w-full rounded-md border px-3 text-[15px] outline-none";

  const toggle = (w: string) => setPicked((p) => (p.includes(w) ? p.filter((x) => x !== w) : [...p, w]));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setPicked([]);
          setVehicle("");
          setPayout("");
          setNote("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus /> {j.newJob}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{j.newJob}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="mb-1.5 text-sm font-medium">{j.kind}</legend>
            {(["parcel", "cargo"] as const).map((k) => (
              <label key={k} className={cn("cursor-pointer rounded-md border px-3 py-2.5 text-sm", kind === k ? "border-foreground bg-muted" : "hover:bg-muted/50")}>
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => {
                    setKind(k);
                    setVehicle("");
                  }}
                  className="sr-only"
                />
                <span className="block font-medium">{j.kinds[k]}</span>
                <span className="text-muted-foreground text-xs">{j.kindHint[k]}</span>
              </label>
            ))}
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium">{j.pickup}</span>
              <select value={pickup} onChange={(e) => setPickup(e.target.value)} className={input}>
                {pickups.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
                <option value="sender">{j.sender}</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">{j.vehicle}</span>
              <select value={vehicle} onChange={(e) => setVehicle(e.target.value)} className={input}>
                <option value="">{j.anyVehicle}</option>
                {VEHICLES[kind].map((v) => (
                  <option key={v} value={v}>
                    {dict.drivers.vehicles[v]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">{j.payout} (TZS)</span>
              <input inputMode="numeric" value={payout} onChange={(e) => setPayout(e.target.value.replace(/\D/g, ""))} placeholder={j.payoutHint} className={input} />
            </label>
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{j.waybills}</span>
              <span className="text-muted-foreground tabular text-xs">{fmt(j.selected, { n: picked.length, kg })}</span>
            </div>
            <p className="text-muted-foreground mb-2 text-xs">{j.chooseWaybills}</p>
            {ready.length === 0 ? (
              <p className="text-muted-foreground rounded-md border px-3 py-8 text-center text-sm">{j.noneReady}</p>
            ) : (
              <ul className="max-h-64 divide-y overflow-auto rounded-md border">
                {ready.map((r) => {
                  const at = picked.indexOf(r.waybill);
                  return (
                    <li key={r.waybill}>
                      <label className={cn("flex cursor-pointer items-center gap-3 px-3 py-2 text-sm", at >= 0 ? "bg-muted/60" : "hover:bg-muted/40")}>
                        <input type="checkbox" checked={at >= 0} onChange={() => toggle(r.waybill)} className="size-4 accent-current" />
                        <span className={cn("tabular grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold", at >= 0 ? "bg-foreground text-background" : "text-transparent")}>{at >= 0 ? at + 1 : "·"}</span>
                        <span className="w-36 shrink-0 font-mono text-[13px] font-medium">{r.waybill}</span>
                        <span className="min-w-0 flex-1 truncate">
                          {r.name} <span className="text-muted-foreground">· {r.place}</span>
                        </span>
                        {r.cod && <span className="bg-muted rounded px-1.5 text-[11px] font-medium">COD</span>}
                        <span className="text-muted-foreground tabular w-14 shrink-0 text-right text-xs">{r.kg} kg</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">{j.note}</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className={input} />
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {dict.common.cancel}
          </Button>
          <Button
            disabled={pending || picked.length === 0}
            onClick={() =>
              start(async () => {
                const r = await createJobAction({ waybills: picked, kind, pickup, requiredVehicle: vehicle as never, payout: payout ? Number(payout) : undefined, note: note || undefined });
                if (r.ok && r.data) {
                  toast.success(fmt(j.created, { ref: r.data.ref, payout: r.data.payout.toLocaleString("en") }));
                  setOpen(false);
                } else if (!r.ok) toast.error(r.error);
              })
            }
          >
            {j.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
