"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bike, Bus, Check, DoorOpen, Loader2, MapPin, MapPinOff, PackageOpen, Search, User, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Wizard, type WizardStep } from "@/components/shell/wizard";
import { EmptyState } from "@/components/shell/empty-state";
import { StateBadge } from "@/components/shipments/state-badge";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { createManifestAction, tumaPointsAction } from "@/app/actions/agent";
import { cn } from "@/lib/utils";

type Parcel = { waybill: string; state: string; deliveryMode: string; to: { name: string; phone: string; region?: string; district?: string }; goods: string; pieces: number };
type Courier = { id: string; name: string | null; phone: string | null; you: boolean };
type Dispatcher = { id: string; name: string; phone: string; plate: string; status: string; trips: number };
type Point = Awaited<ReturnType<typeof tumaPointsAction>>[number];
type Mode = "door" | "point";
type Kind = "staff" | "tuma" | "transporter";

/** Which parcels can go on each run (the same rule the server applies). */
const fits = (p: Parcel, mode: Mode) => (mode === "door" ? p.deliveryMode === "door" && ["RECEIVED", "AT_HUB", "ATTEMPT_FAILED"].includes(p.state) : ["RECEIVED", "AT_HUB"].includes(p.state));

/**
 * The send-on form: the run (to the receivers' doors, or to a Tuma point), the parcels in hand that fit it, the point
 * (searched), who carries them (our own person, a Tuma courier for door runs, or a transporter for point runs) and a
 * note. Sends one manifest and opens it.
 */
export function NewManifestForm({
  locale,
  parcels,
  couriers,
  tumaCourier,
  region,
  dispatchers = [],
  startWith,
}: {
  locale: string;
  parcels: Parcel[];
  couriers: Courier[];
  tumaCourier: boolean;
  region?: string;
  dispatchers?: Dispatcher[];
  /** Opened from a parcel's Dispatch: that parcel ticked, on the run it fits. */
  startWith?: string;
}) {
  const { dict: t } = useI18n();
  const m = t.agent.mf;
  const router = useRouter();
  const [pending, start] = useTransition();
  const first = parcels.find((p) => p.waybill === startWith);
  const [mode, setMode] = useState<Mode>(first && !fits(first, "door") ? "point" : "door");
  const [picked, setPicked] = useState<Set<string>>(new Set(first ? [first.waybill] : []));
  const [kind, setKind] = useState<Kind>("staff");
  const [staffId, setStaffId] = useState(couriers.find((c) => c.you)?.id ?? couriers[0]?.id ?? "");
  const [tr, setTr] = useState({ name: "", phone: "", plate: "", ref: "" });
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const [points, setPoints] = useState<Point[] | null>(null);
  const [point, setPoint] = useState<Point | null>(null);
  const [searching, startSearch] = useTransition();

  const list = useMemo(() => parcels.filter((p) => fits(p, mode)), [parcels, mode]);
  const chosen = list.filter((p) => picked.has(p.waybill));
  // A Tuma courier only goes to doors: switching to a point run moves that choice back to our own person.
  const carrier: Kind = mode === "point" && kind === "tuma" ? "staff" : kind;
  const missing = [!chosen.length && m.need.parcels, mode === "point" && !point && m.need.point, ((carrier === "staff" && !staffId) || (carrier === "transporter" && (tr.name.trim().length < 2 || tr.phone.replace(/\D/g, "").length < 9 || tr.plate.trim().length < 2))) && m.need.carrier].filter(Boolean) as string[];

  // Changing the run keeps only the ticked parcels that still fit it.
  const switchMode = (k: Mode) => {
    if (k === mode) return;
    setMode(k);
    setPicked((s) => new Set([...s].filter((w) => parcels.some((p) => p.waybill === w && fits(p, k)))));
  };

  const toggle = (wb: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(wb)) n.delete(wb);
      else n.add(wb);
      return n;
    });
  const allOn = list.length > 0 && chosen.length === list.length;
  const search = () => startSearch(async () => setPoints(await tumaPointsAction(q, q.trim() ? undefined : region)));

  const submit = () =>
    start(async () => {
      const r = await createManifestAction({
        waybills: chosen.map((p) => p.waybill),
        mode,
        toBranchId: mode === "point" ? point?.id : undefined,
        carrier:
          carrier === "staff"
            ? { kind: "staff", userId: staffId }
            : carrier === "tuma"
              ? { kind: "tuma" }
              : { kind: "transporter", name: tr.name.trim(), phone: tr.phone.trim() || undefined, plate: tr.plate.trim().toUpperCase() || undefined, ref: tr.ref.trim() || undefined },
        note: note.trim() || undefined,
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success(fmt(m.sent, { ref: r.data!.ref }));
      router.push(`/${locale}/portal/manifests/${r.data!.id}`);
    });

  const carriers: { k: Kind; label: string; icon: typeof User; show: boolean; hint?: string }[] = [
    { k: "staff", label: m.staff, icon: User, show: true },
    { k: "tuma", label: m.tuma, icon: Bike, show: true, hint: tumaCourier ? m.tumaHint : m.tumaOff },
    { k: "transporter", label: m.transporter, icon: Bus, show: true, hint: m.transporterHint },
  ];

  const h = m.stepHints;
  // The order the app uses: who takes them, where they go (the doors or a receiving office), then which parcels.
  const carrierOk = !((carrier === "staff" && !staffId) || (carrier === "transporter" && (tr.name.trim().length < 2 || tr.phone.replace(/\D/g, "").length < 9 || tr.plate.trim().length < 2)));
  const steps: (WizardStep & { show: boolean })[] = [
    { key: "who", title: m.who, hint: h.who, ready: carrierOk, missing: m.need.carrier, show: true },
    { key: "where", title: m.where, hint: h.mode, ready: mode === "door" || !!point, missing: m.need.point, show: true },
    { key: "parcels", title: m.choose, hint: m.chooseHint, ready: missing.length === 0, missing: `${m.missing}: ${missing.join(", ")}`, show: true },
  ];  const shown = steps.filter((x) => x.show);
  const [step, setStep] = useState(0);
  const at = shown[Math.min(step, shown.length - 1)].key;

  const summary = (
    <div className="space-y-3">
      <Row label={m.mode} value={mode === "door" ? m.door : m.point} />
      <Row label={m.parcels} value={fmt(m.selected, { n: chosen.length })} />
      {mode === "point" && <Row label={m.where} value={point ? (point.business ?? point.name) : "—"} />}
      <Row label={m.carrier} value={carriers.find((c) => c.k === carrier)!.label} />
      {chosen.length > 0 && (
        <ul className="text-muted-foreground border-t pt-3 font-mono text-xs leading-6">
          {chosen.slice(0, 8).map((p) => (
            <li key={p.waybill}>{p.waybill}</li>
          ))}
          {chosen.length > 8 && <li className="font-sans">+{chosen.length - 8}</li>}
        </ul>
      )}
    </div>
  );

  return (
    <Wizard
      steps={shown}
      step={Math.min(step, shown.length - 1)}
      onStep={setStep}
      onSubmit={submit}
      submitLabel={fmt(m.submit, { n: chosen.length })}
      pending={pending}
      summary={summary}
      summaryTitle={m.newTitle}
    >
      {at === "where" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["door", m.door, h.door, DoorOpen],
              ["point", m.point, h.point, MapPin],
            ] as const
          ).map(([k, label, sub, Icon]) => (
            <Choice
              key={k}
              on={mode === k}
              icon={Icon}
              label={label}
              // A Tuma courier goes to the doors only.
              sub={k === "point" && kind === "tuma" ? m.tumaDoorOnly : sub}
              disabled={k === "point" && kind === "tuma"}
              onClick={() => switchMode(k)}
            />
          ))}
        </div>
      )}

      {at === "parcels" &&
        (list.length === 0 ? (
          <div className="bg-card rounded-lg border">
            <EmptyState compact icon={PackageOpen} title={m.noneHere} body={h.noneHere} />
          </div>
        ) : (
          <div className="bg-card overflow-hidden rounded-lg border">
            <div className="bg-muted/30 flex items-center justify-between gap-3 border-b px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">{fmt(m.selected, { n: chosen.length })} · {list.length}</span>
              <Button size="sm" variant="outline" onClick={() => setPicked(allOn ? new Set() : new Set(list.map((p) => p.waybill)))}>
                {allOn ? m.clearAll : m.selectAll}
              </Button>
            </div>
            <ul className="max-h-[60dvh] divide-y overflow-y-auto">
              {list.map((p) => {
                const on = picked.has(p.waybill);
                return (
                  <li key={p.waybill}>
                    <label className={cn("flex cursor-pointer items-center gap-3 px-4 py-3 text-sm", on && "bg-primary/5")}>
                      <input type="checkbox" checked={on} onChange={() => toggle(p.waybill)} className="accent-primary size-4 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-[13px] font-medium">{p.waybill}</span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {p.to.name} · {[p.to.district, p.to.region].filter(Boolean).join(", ")} · {p.goods}
                        </span>
                      </span>
                      <StateBadge state={p.state as never} label={t.states[p.state as keyof typeof t.states]} />
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

      {at === "where" && mode === "point" && (
        <div className="space-y-3">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              search();
            }}
          >
            <div className="relative flex-1">
              <Search aria-hidden className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.pointSearch} aria-label={m.pointSearch} className="h-11 pl-8" />
            </div>
            <Button type="submit" variant="outline" className="h-11" disabled={searching}>
              {searching ? <Loader2 className="animate-spin" /> : <Search />} <span className="max-sm:sr-only">{t.common.search}</span>
            </Button>
          </form>
          {point && <Choice on icon={MapPin} label={point.business ? `${point.business} · ${point.name}` : point.name} sub={[point.district, point.region].filter(Boolean).join(", ")} onClick={() => {}} />}
          {points && points.length === 0 && (
            <div className="bg-card rounded-lg border">
              <EmptyState compact icon={MapPinOff} title={m.noPoints} body={h.noPoints} />
            </div>
          )}
          {points && points.length > 0 && (
            <ul className="bg-card max-h-80 divide-y overflow-y-auto rounded-lg border">
              {points.map((x) => (
                <li key={x.id}>
                  <button type="button" onClick={() => setPoint(x)} className={cn("hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-3 text-left text-sm", point?.id === x.id && "bg-primary/5")}>
                    <MapPin className="text-muted-foreground size-4 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">
                      {x.business ? `${x.business} · ${x.name}` : x.name}
                      <span className="text-muted-foreground block text-xs">{[x.district, x.region].filter(Boolean).join(", ")}</span>
                    </span>
                    {point?.id === x.id && <Check className="text-primary size-4" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!points && !point && (
            <Button type="button" variant="ghost" className="text-muted-foreground px-0" onClick={search}>
              <MapPin /> {m.pickPoint}
            </Button>
          )}
        </div>
      )}

      {at === "who" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {carriers
              .filter((c) => c.show)
              .map((c) => (
                <Choice key={c.k} on={carrier === c.k} disabled={c.k === "tuma" && !tumaCourier} icon={c.icon} label={c.label} sub={c.hint} onClick={() => {
                    setKind(c.k);
                    if (c.k === "tuma") switchMode("door");
                  }}
                />
              ))}
          </div>
          {carrier === "staff" && (
            <div className="space-y-1.5">
              <Label htmlFor="mf-staff">{m.staff}</Label>
              <select id="mf-staff" value={staffId} onChange={(e) => setStaffId(e.target.value)} className="bg-background h-11 w-full rounded-md border px-3 text-sm">
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {[c.name ?? c.phone, c.you ? `(${m.you})` : null].filter(Boolean).join(" ")}
                  </option>
                ))}
              </select>
            </div>
          )}
          {carrier === "transporter" && dispatchers.length > 0 && (
            <div className="space-y-2">
              <Label>{m.savedDispatchers}</Label>
              <div className="flex flex-wrap gap-2">
                {dispatchers.map((d) => {
                  const on = tr.phone === d.phone;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setTr({ name: d.name, phone: d.phone, plate: d.plate, ref: "" })}
                      className={cn("rounded-full border px-3 py-1.5 text-left text-xs transition-colors", on ? "border-primary bg-primary/5 ring-primary/30 ring-2" : "hover:bg-muted/50")}
                    >
                      <span className="font-medium">{d.name}</span> <span className="text-muted-foreground font-mono">{d.plate}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {carrier === "transporter" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["name", m.tName],
                  ["phone", m.tPhone],
                  ["plate", m.tPlate],
                  ["ref", m.tRef],
                ] as const
              ).map(([k, label]) => (
                <div key={k} className="space-y-1.5">
                  <Label htmlFor={`mf-${k}`}>{label}</Label>
                  <Input id={`mf-${k}`} value={tr[k]} onChange={(e) => setTr((s) => ({ ...s, [k]: e.target.value }))} inputMode={k === "phone" ? "tel" : undefined} className={cn("h-11", k === "plate" && "font-mono uppercase")} />
                </div>
              ))}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="mf-note">{m.note}</Label>
            <Textarea id="mf-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={m.noteHint} maxLength={300} rows={3} />
          </div>
        </>
      )}
    </Wizard>
  );
}

/** A big choice tile: icon, label and a line under it; ringed when chosen. */
function Choice({ on, icon: Icon, label, sub, onClick, disabled }: { on: boolean; icon: LucideIcon; label: string; sub?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={on}
      className={cn("bg-card flex items-start gap-3 rounded-lg border p-4 text-left text-sm transition-colors disabled:opacity-50", on ? "border-primary bg-primary/5 ring-primary/30 ring-2" : "hover:bg-muted/50")}
    >
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-md", on ? "bg-primary text-primary-foreground" : "bg-muted")}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        {sub && <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">{sub}</span>}
      </span>
      {on && <Check className="text-primary size-4 shrink-0" aria-hidden />}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">{value}</span>
    </div>
  );
}
