"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bike, Bus, Check, DoorOpen, MapPin, Search, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/shell/page-header";
import { StateBadge } from "@/components/shipments/state-badge";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { createManifestAction, tumaPointsAction } from "@/app/actions/agent";
import { cn } from "@/lib/utils";

type Parcel = { waybill: string; state: string; deliveryMode: string; to: { name: string; phone: string; region?: string; district?: string }; goods: string; pieces: number };
type Courier = { id: string; name: string | null; phone: string | null; you: boolean };
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
export function NewManifestForm({ locale, parcels, couriers, tumaCourier, region }: { locale: string; parcels: Parcel[]; couriers: Courier[]; tumaCourier: boolean; region?: string }) {
  const { dict: t } = useI18n();
  const m = t.agent.mf;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<Mode>("door");
  const [picked, setPicked] = useState<Set<string>>(new Set());
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
  // A Tuma courier only goes to doors, a transporter only to a point: switching the run moves an impossible choice back to our own person.
  const carrier: Kind = (mode === "point" && kind === "tuma") || (mode === "door" && kind === "transporter") ? "staff" : kind;
  const missing = [!chosen.length && m.need.parcels, mode === "point" && !point && m.need.point, ((carrier === "staff" && !staffId) || (carrier === "transporter" && tr.name.trim().length < 2)) && m.need.carrier].filter(Boolean) as string[];

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
    { k: "tuma", label: m.tuma, icon: Bike, show: mode === "door", hint: tumaCourier ? m.tumaHint : m.tumaOff },
    { k: "transporter", label: m.transporter, icon: Bus, show: mode === "point" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Panel title={m.mode}>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {(
              [
                ["door", m.door, DoorOpen],
                ["point", m.point, MapPin],
              ] as const
            ).map(([k, label, Icon]) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setMode(k);
                  setPicked(new Set());
                }}
                className={cn("flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors", mode === k ? "border-primary bg-primary/5 ring-primary/30 ring-2" : "hover:bg-muted/50")}
              >
                <Icon className="size-5 shrink-0" />
                <span className="font-medium">{label}</span>
                {mode === k && <Check className="text-primary ml-auto size-4" />}
              </button>
            ))}
          </div>
        </Panel>

        <Panel
          title={`${m.choose} · ${list.length}`}
          description={m.chooseHint}
          action={
            list.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setPicked(allOn ? new Set() : new Set(list.map((p) => p.waybill)))}>
                {allOn ? m.clearAll : m.selectAll}
              </Button>
            )
          }
        >
          {list.length === 0 ? (
            <p className="text-muted-foreground px-4 py-12 text-center text-sm">{m.noneHere}</p>
          ) : (
            <ul className="max-h-[480px] divide-y overflow-y-auto">
              {list.map((p) => {
                const on = picked.has(p.waybill);
                return (
                  <li key={p.waybill}>
                    <label className={cn("flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm", on && "bg-primary/5")}>
                      <input type="checkbox" checked={on} onChange={() => toggle(p.waybill)} className="accent-primary size-4" />
                      <span className="w-36 shrink-0 font-mono text-[13px] font-medium">{p.waybill}</span>
                      <span className="min-w-0 flex-1 truncate">
                        {p.to.name}
                        <span className="text-muted-foreground block truncate text-xs">{[p.to.district, p.to.region].filter(Boolean).join(", ")} · {p.goods}</span>
                      </span>
                      <StateBadge state={p.state as never} label={t.states[p.state as keyof typeof t.states]} />
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {mode === "point" && (
          <Panel title={m.where}>
            <div className="space-y-3 p-4">
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  search();
                }}
              >
                <div className="relative flex-1">
                  <Search aria-hidden className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.pointSearch} aria-label={m.pointSearch} className="pl-8" />
                </div>
                <Button type="submit" variant="outline" disabled={searching}>
                  {t.common.search}
                </Button>
              </form>
              {point && (
                <div className="border-primary bg-primary/5 flex items-center gap-3 rounded-lg border p-3 text-sm">
                  <MapPin className="text-primary size-4" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{point.business ? `${point.business} · ${point.name}` : point.name}</p>
                    <p className="text-muted-foreground text-xs">{[point.district, point.region].filter(Boolean).join(", ")}</p>
                  </div>
                  <Check className="text-primary size-4" />
                </div>
              )}
              {points && points.length === 0 && <p className="text-muted-foreground text-sm">{m.noPoints}</p>}
              {points && points.length > 0 && (
                <ul className="max-h-64 divide-y overflow-y-auto rounded-lg border">
                  {points.map((x) => (
                    <li key={x.id}>
                      <button type="button" onClick={() => setPoint(x)} className={cn("hover:bg-muted/50 flex w-full items-center gap-3 px-3 py-2 text-left text-sm", point?.id === x.id && "bg-primary/5")}>
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
              {!points && !point && <p className="text-muted-foreground text-xs">{m.pickPoint}</p>}
            </div>
          </Panel>
        )}

        <Panel title={m.who}>
          <div className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {carriers
                .filter((c) => c.show)
                .map((c) => (
                  <button
                    key={c.k}
                    type="button"
                    disabled={c.k === "tuma" && !tumaCourier}
                    onClick={() => setKind(c.k)}
                    className={cn("flex items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors disabled:opacity-50", carrier === c.k ? "border-primary bg-primary/5 ring-primary/30 ring-2" : "hover:bg-muted/50")}
                  >
                    <c.icon className="mt-0.5 size-5 shrink-0" />
                    <span>
                      <span className="block font-medium">{c.label}</span>
                      {c.hint && <span className="text-muted-foreground block text-xs">{c.hint}</span>}
                    </span>
                  </button>
                ))}
            </div>
            {carrier === "staff" && (
              <div className="space-y-1.5">
                <Label htmlFor="mf-staff">{m.staff}</Label>
                <select id="mf-staff" value={staffId} onChange={(e) => setStaffId(e.target.value)} className="bg-background h-9 w-full rounded-md border px-2 text-sm">
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {[c.name ?? c.phone, c.you ? `(${m.you})` : null].filter(Boolean).join(" ")}
                    </option>
                  ))}
                </select>
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
                    <Input id={`mf-${k}`} value={tr[k]} onChange={(e) => setTr((s) => ({ ...s, [k]: e.target.value }))} inputMode={k === "phone" ? "tel" : undefined} className={cn(k === "plate" && "font-mono uppercase")} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

        <Panel title={m.note}>
          <div className="p-4">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={m.noteHint} aria-label={m.note} maxLength={300} rows={3} />
          </div>
        </Panel>
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <Panel title={m.newTitle}>
          <div className="space-y-3 p-4 text-sm">
            <Row label={m.mode} value={mode === "door" ? m.door : m.point} />
            <Row label={m.parcels} value={fmt(m.selected, { n: chosen.length })} />
            {mode === "point" && <Row label={m.where} value={point ? (point.business ?? point.name) : "—"} />}
            <Row label={m.carrier} value={carriers.find((c) => c.k === carrier)!.label} />
            {missing.length > 0 && (
              <p className="text-muted-foreground text-xs">
                {m.missing}: {missing.join(", ")}
              </p>
            )}
            <Button className="w-full" disabled={pending || missing.length > 0} onClick={submit}>
              {fmt(m.submit, { n: chosen.length })}
            </Button>
          </div>
        </Panel>
      </div>
    </div>
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
