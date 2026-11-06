import { ShieldAlert, Truck, User } from "lucide-react";
import { fmt, getDict } from "@/i18n";
import { dateOnly, num } from "@/lib/format";
import { VehicleDialog } from "./vehicle-dialog";
import { cn } from "@/lib/utils";
import type { listVehicles } from "@/server/services/partner";

export type VehicleRow = Awaited<ReturnType<typeof listVehicles>>[number];
export type DocState = "expired" | "soon" | "ok" | null;

const DAY = 86400_000;
/** Whether a document date has passed, falls within 30 days, or is fine. */
export const docState = (d: Date | null, now: number): DocState => (!d ? null : d.getTime() < now ? "expired" : d.getTime() - now < 30 * DAY ? "soon" : "ok");
export const docsDue = (row: VehicleRow, now: number) => [docState(row.v.insuranceExpiry, now), docState(row.v.inspectionExpiry, now)].some((x) => x === "expired" || x === "soon");
export const loadPct = (row: VehicleRow) => Math.min(100, Math.round((Number(row.loadKg) / row.v.capacityKg) * 100));

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

/** Single uniform status badge, like the cargo statuses. */
export function VehicleStatus({ status, locale }: { status: string; locale: string }) {
  const v = getDict(locale).partner.vehicles;
  return <span className="bg-muted text-foreground border-border inline-flex shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium">{v.statuses[status] ?? status}</span>;
}

export function VehicleCard({ row, locale, now, canManage, branchOpts }: { row: VehicleRow; locale: string; now: number; canManage: boolean; branchOpts: [string, string][] }) {
  const v = getDict(locale).partner.vehicles;
  const { v: veh, loadCount, loadKg } = row;
  const pct = loadPct(row);
  const ins = docState(veh.insuranceExpiry, now);
  const insp = docState(veh.inspectionExpiry, now);
  return (
    <li className="bg-card flex flex-col rounded-lg border">
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="bg-muted grid size-9 shrink-0 place-items-center rounded-md">
            <Truck className="size-4.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="font-mono font-semibold tracking-wide">{veh.plate}</div>
            <div className="text-muted-foreground truncate text-xs">
              {row.branchCode && <span className="font-mono">{row.branchCode} · </span>}
              {v.kinds[veh.kind] ?? veh.kind}
              {veh.make ? ` · ${veh.make}` : ""}
            </div>
          </div>
        </div>
        <VehicleStatus status={veh.status} locale={locale} />
      </div>
      <div className="space-y-3 px-4 py-3 text-sm">
        <div>
          <div className="text-muted-foreground flex justify-between text-xs">
            <span>{v.load}</span>
            <span className="tabular">{pct}%</span>
          </div>
          <div className="bg-sunken mt-1 h-1.5 overflow-hidden rounded-full">
            <div className={cn("h-full rounded-full", pct > 90 ? "bg-parcel" : "bg-primary")} style={{ width: `${pct}%` }} />
          </div>
          <div className="text-muted-foreground mt-1 text-xs">{fmt(v.loadOf, { kg: num(Math.round(Number(loadKg)), locale), cap: num(veh.capacityKg, locale), n: loadCount })}</div>
        </div>
        <div className="flex items-center gap-2">
          <User className="text-muted-foreground size-4" aria-hidden />
          {veh.driverName ? (
            <span>
              {veh.driverName} <span className="text-muted-foreground font-mono text-xs">{veh.driverPhone}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{v.noDriver}</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {(
            [
              [v.insurance, veh.insuranceExpiry, ins],
              [v.inspection, veh.inspectionExpiry, insp],
            ] as const
          ).map(([label, d, state]) => (
            <div key={label} className={cn("rounded-md border px-2 py-1.5", state === "expired" ? "border-destructive/40 bg-destructive/10" : state === "soon" ? "border-warn/40 bg-warn/10" : "")}>
              <div className="text-muted-foreground">{label}</div>
              <div className={cn("mt-0.5 flex items-center gap-1 font-medium", state === "expired" ? "text-destructive" : state === "soon" ? "text-warn" : "")}>
                {state && state !== "ok" && <ShieldAlert className="size-3.5" aria-hidden />}
                {d ? dateOnly(d, locale) : "—"}
                {state === "expired" ? ` · ${v.expired}` : state === "soon" ? ` · ${v.expiresSoon}` : ""}
              </div>
            </div>
          ))}
        </div>
      </div>
      {canManage && (
        <div className="mt-auto flex justify-end border-t px-2 py-1.5">
          <VehicleDialog
            branches={branchOpts}
            initial={{
              branchId: veh.branchId ?? "",
              id: veh.id,
              plate: veh.plate,
              kind: veh.kind,
              make: veh.make ?? "",
              capacityKg: String(veh.capacityKg),
              volumeM3: veh.volumeM3 ? String(veh.volumeM3) : "",
              status: veh.status,
              driverName: veh.driverName ?? "",
              driverPhone: veh.driverPhone ? "0" + veh.driverPhone.slice(4) : "",
              insuranceExpiry: iso(veh.insuranceExpiry),
              inspectionExpiry: iso(veh.inspectionExpiry),
            }}
          />
        </div>
      )}
    </li>
  );
}
