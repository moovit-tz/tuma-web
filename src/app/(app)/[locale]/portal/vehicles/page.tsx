import { Truck, User, ShieldAlert } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current-user";
import { listVehicles } from "@/server/services/partner";
import { branchOptions, effectiveBranch } from "@/server/services/branches";
import { BranchFilter } from "@/components/partner/branch-filter";
import { fmt, getDict } from "@/i18n";
import { dateOnly, nowMs, num } from "@/lib/format";
import { PageHeader, PageTabs } from "@/components/shell/page-header";
import { VehicleDialog } from "@/components/partner/vehicle-dialog";
import { cn } from "@/lib/utils";

export const instant = false;

const TONE: Record<string, string> = {
  available: "border-ok/30 bg-ok/10 text-ok",
  on_trip: "border-primary/30 bg-primary/10",
  maintenance: "border-warn/30 bg-warn/10 text-warn",
  inactive: "border-border text-muted-foreground",
};

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function VehiclesPage({ params, searchParams }: PageProps<"/[locale]/portal/vehicles">) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  const t = getDict(locale);
  const v = t.partner.vehicles;
  const sp = await searchParams;
  const statusFilter = typeof sp.status === "string" ? sp.status : undefined;
  const branch = await effectiveBranch(user, typeof sp.branch === "string" ? sp.branch : null);
  const [all, branches] = await Promise.all([listVehicles(user, branch), branchOptions(user)]);
  const branchOpts = branches.map((b) => [b.id, `${b.code} · ${b.name}`] as [string, string]);
  const canManage = user.permissions.has("partner.vehicles.manage");
  const now = nowMs();
  const expiry = (d: Date | null) => (!d ? null : d.getTime() < now ? "expired" : d.getTime() - now < 30 * 86400_000 ? "soon" : "ok");
  // ?status= from search or the tabs: expired (documents expired or expiring), or a vehicle status.
  const docsDue = ({ v: veh }: (typeof all)[number]) => [expiry(veh.insuranceExpiry), expiry(veh.inspectionExpiry)].some((x) => x === "expired" || x === "soon");
  const match = (f: string | undefined) => (row: (typeof all)[number]) => (!f ? true : f === "expired" ? docsDue(row) : row.v.status === f);
  const rows = all.filter(match(statusFilter));
  const base = `/${locale}/portal/vehicles`;
  const tabs = [undefined, "available", "on_trip", "maintenance", "expired"] as const;

  return (
    <>
      <PageHeader title={v.title}>
        <BranchFilter options={branches} value={branch} locked={Boolean(user.branchId)} />
        {canManage && <VehicleDialog branches={branchOpts} initial={branch ? { kind: "truck", status: "available", branchId: branch } : undefined} />}
      </PageHeader>
      <PageTabs
        label={v.title}
        items={tabs.map((f) => ({
          href: `${base}?${new URLSearchParams({ ...(f ? { status: f } : {}), ...(branch && !user.branchId ? { branch } : {}) })}`,
          label: !f ? t.common.all : f === "expired" ? t.search.filters.expired : v.statuses[f],
          active: f === statusFilter,
          count: all.filter(match(f)).length,
        }))}
      />
      {rows.length === 0 ? (
        <p className="bg-card text-muted-foreground rounded-lg border px-4 py-14 text-center text-sm">{v.empty}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const { v: veh, loadCount, loadKg } = row;
            const pct = Math.min(100, Math.round((Number(loadKg) / veh.capacityKg) * 100));
            const ins = expiry(veh.insuranceExpiry);
            const insp = expiry(veh.inspectionExpiry);
            return (
              <li key={veh.id} className="bg-card flex flex-col rounded-xl border">
                <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-muted grid size-9 place-items-center rounded-lg">
                      <Truck className="size-4.5" aria-hidden />
                    </span>
                    <div>
                      <div className="font-mono font-semibold tracking-wide">{veh.plate}</div>
                      <div className="text-muted-foreground text-xs">
                        {row.branchCode && <span className="font-mono">{row.branchCode} · </span>}
                        {v.kinds[veh.kind] ?? veh.kind}
                        {veh.make ? ` · ${veh.make}` : ""}
                      </div>
                    </div>
                  </div>
                  <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", TONE[veh.status])}>{v.statuses[veh.status]}</span>
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
                    <div className="text-muted-foreground mt-1 text-xs">
                      {fmt(v.loadOf, { kg: num(Math.round(Number(loadKg)), locale), cap: num(veh.capacityKg, locale), n: loadCount })}
                    </div>
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
          })}
        </ul>
      )}
    </>
  );
}
