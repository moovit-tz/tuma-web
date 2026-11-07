"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, PackagePlus, Search, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { TZ_DISTRICTS } from "@/domain/tz-districts";
import { SPECIAL_HANDLING } from "@/domain/order-schema";
import { agentBookAction, agentCollectionPointsAction, agentCustomerSearchAction } from "@/app/actions/agent";
import { cn } from "@/lib/utils";

type Kind = "individual" | "company";
type Party = { kind: Kind; phone: string; name: string; email: string; tin: string; regNo: string; contactName: string };
type Customer = Awaited<ReturnType<typeof agentCustomerSearchAction>>[number];
type Points = Awaited<ReturnType<typeof agentCollectionPointsAction>>;

const empty: Party = { kind: "individual", phone: "", name: "", email: "", tin: "", regNo: "", contactName: "" };
const digits = (v: string) => v.replace(/\D/g, "");
const amount = (v: string) => Number(digits(v)) || 0;
const grouped = (v: string) => (amount(v) ? amount(v).toLocaleString("en-US") : "");
/** A Tanzanian mobile number, typed any way: 0712…, 712…, +255712…, 255712…. */
const phoneOk = (v: string) => /^(?:\+?255|0)?[67]\d{8}$/.test(v.replace(/[\s-]/g, ""));
const selectCls = "bg-background h-9 w-full rounded-md border px-2 text-sm";

export type CounterBookingProps = {
  regions: readonly string[];
  goodsTypes: { key: string; label: string }[];
  packaging: { key: string; label: string }[];
  momo: boolean;
  payOnDelivery: boolean;
};

/**
 * The counter's booking form at a desk, one page: the sender and the receiver (phone first: a saved customer fills in
 * the rest), where it goes (the door, or one of the business's offices or a Tuma point), the parcel, the extras, the
 * price and how it's paid, with a running summary. Books through the app's own counter service.
 */
export function CounterBookingForm(p: CounterBookingProps) {
  const { dict: t, locale } = useI18n();
  const b = t.agent.book;
  const router = useRouter();
  const [sender, setSender] = useState<Party>(empty);
  const [receiver, setReceiver] = useState<Party>(empty);
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [landmark, setLandmark] = useState("");
  const [mode, setMode] = useState<"door" | "wakala_collect">("door");
  const [collect, setCollect] = useState<{ kind: "office" | "point"; id: string } | null>(null);
  const [points, setPoints] = useState<Points | null>(null);
  const [goods, setGoods] = useState("");
  const [category, setCategory] = useState(p.goodsTypes[0]?.key ?? "general");
  const [weight, setWeight] = useState("");
  const [size, setSize] = useState<"small" | "medium" | "large">("small");
  const [declared, setDeclared] = useState("");
  const [handling, setHandling] = useState<string[]>([]);
  const [service, setService] = useState<"same_day" | "next_day" | "standard">("next_day");
  const [insurance, setInsurance] = useState("");
  const [packType, setPackType] = useState("");
  const [packAmount, setPackAmount] = useState("");
  const [price, setPrice] = useState("");
  const [payer, setPayer] = useState<"sender" | "receiver">("sender");
  const [chosenMethod, setPaidWith] = useState<"cash" | "mobile_money" | "invoice">("cash");
  const [inHand, setInHand] = useState(true);
  const [noProhibited, setNoProhibited] = useState(false);
  const [pending, start] = useTransition();

  // Collection points for the receiver's region.
  useEffect(() => {
    if (mode !== "wakala_collect" || !region) return;
    let live = true;
    agentCollectionPointsAction(region, district || undefined).then((r) => live && setPoints(r));
    return () => {
      live = false;
    };
  }, [mode, region, district]);

  // Company-only choices fall back when the parties change.
  const receiverPays = payer === "receiver" && (receiver.kind === "company" || p.payOnDelivery);
  // On the company's invoice only while the sender is a company.
  const paidWith = chosenMethod === "invoice" && sender.kind !== "company" ? "cash" : chosenMethod;

  const kg = Number(weight.replace(",", "."));
  const extrasTotal = amount(insurance) + (packType ? amount(packAmount) : 0);
  const total = amount(price) + extrasTotal;
  const missing = [
    !phoneOk(sender.phone) && b.need.senderPhone,
    sender.name.trim().length < 2 && b.need.senderName,
    sender.kind === "company" && sender.tin && digits(sender.tin).length !== 9 && b.need.senderTin,
    !phoneOk(receiver.phone) && b.need.receiverPhone,
    receiver.name.trim().length < 2 && b.need.receiverName,
    !region && b.need.region,
    district.trim().length < 2 && b.need.district,
    mode === "wakala_collect" && !collect && b.need.collect,
    goods.trim().length < 3 && b.need.goods,
    !(kg > 0 && kg <= 30) && b.need.weight,
    amount(declared) < 1 && b.need.declared,
    weight && price === "" && b.need.price,
    !noProhibited && b.need.prohibited,
  ].filter(Boolean) as string[];

  const party = (x: Party) => ({
    kind: x.kind,
    name: x.name.trim(),
    phone: x.phone.trim(),
    email: x.email.trim(),
    ...(x.kind === "company" ? { tin: x.tin || undefined, regNo: x.regNo.trim() || undefined, contactName: x.contactName.trim() || undefined } : {}),
  });

  const submit = () =>
    start(async () => {
      const r = await agentBookAction({
        sender: party(sender),
        receiver: { ...party(receiver), region, district: district.trim(), landmark: landmark.trim() || undefined },
        deliveryMode: mode,
        ...(mode === "wakala_collect" && collect ? (collect.kind === "office" ? { collectOfficeId: collect.id } : { deliveryLocationId: collect.id }) : {}),
        goods: goods.trim(),
        category,
        weightKg: kg,
        size,
        fragile: handling.includes("fragile"),
        handling,
        declaredValue: amount(declared),
        extras: {
          ...(amount(insurance) ? { insurance: amount(insurance) } : {}),
          ...(packType ? { packaging: { type: packType, amount: amount(packAmount) } } : {}),
        },
        serviceLevel: service,
        price: amount(price),
        payer: receiverPays ? "receiver" : "sender",
        paidWith,
        noProhibited: true,
        inHand,
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success(fmt(b.booked, { waybill: r.data!.waybill }), { description: r.data!.awaitingPayment ? b.payNext : undefined });
      router.push(`/${locale}/portal/parcels/${r.data!.waybill}`);
    });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <PartyCard title={b.sender} value={sender} onChange={setSender} contactLabel={b.contactName} />
          <PartyCard
            title={b.receiver}
            value={receiver}
            onChange={setReceiver}
            contactLabel={b.contactNameReceiver}
            onPicked={(c) => {
              if (c.region && p.regions.includes(c.region)) setRegion(c.region);
              if (c.district) setDistrict(c.district);
              if (c.landmark) setLandmark(c.landmark);
            }}
          />
        </div>

        <Card title={b.delivery}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={b.region}>
              <select
                className={selectCls}
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  setDistrict("");
                  setCollect(null);
                }}
              >
                <option value="">{t.agent.choose}</option>
                {p.regions.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label={b.district}>
              <Input list="districts" value={district} onChange={(e) => setDistrict(e.target.value)} disabled={!region} />
              <datalist id="districts">
                {(TZ_DISTRICTS[region] ?? []).map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </Field>
          </div>
          <Segmented
            value={mode}
            onChange={(v) => {
              setMode(v);
              setCollect(null);
            }}
            items={[
              ["door", b.door],
              ["wakala_collect", b.collect],
            ]}
          />
          {mode === "door" ? (
            <Field label={b.landmark}>
              <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} />
            </Field>
          ) : !region ? (
            <p className="text-muted-foreground text-sm">{b.pickRegionFirst}</p>
          ) : (
            <CollectPicker points={points} value={collect} onChange={setCollect} labels={b} />
          )}
        </Card>

        <Card title={b.parcel}>
          <Field label={b.goods}>
            <Input value={goods} onChange={(e) => setGoods(e.target.value)} placeholder={b.goodsHint} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={b.category}>
              <select className={selectCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                {p.goodsTypes.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={b.weight}>
              <Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="2" />
            </Field>
            <Field label={b.declared}>
              <Input inputMode="numeric" value={declared} onChange={(e) => setDeclared(grouped(e.target.value))} placeholder="50,000" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={b.size}>
              <Segmented
                value={size}
                onChange={setSize}
                items={[
                  ["small", b.small],
                  ["medium", b.medium],
                  ["large", b.large],
                ]}
              />
            </Field>
            <Field label={b.service}>
              <Segmented
                value={service}
                onChange={setService}
                items={[
                  ["same_day", t.service.same_day],
                  ["next_day", t.service.next_day],
                  ["standard", t.service.standard],
                ]}
              />
            </Field>
          </div>
          <Field label={b.handling}>
            <div className="flex flex-wrap gap-2">
              {SPECIAL_HANDLING.map((h) => {
                const on = handling.includes(h);
                return (
                  <button
                    key={h}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setHandling(on ? handling.filter((x) => x !== h) : [...handling, h])}
                    className={cn("rounded-full border px-3 py-1 text-[13px]", on ? "border-brand-red bg-brand-red/5 font-medium" : "hover:bg-muted")}
                  >
                    {on && <Check className="mr-1 inline size-3.5" />}
                    {t.agent.handlingKinds[h] ?? h}
                  </button>
                );
              })}
            </div>
          </Field>
        </Card>

        <Card title={b.extras}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={b.insurance}>
              <Input inputMode="numeric" value={insurance} onChange={(e) => setInsurance(grouped(e.target.value))} placeholder="0" />
            </Field>
            <Field label={b.packaging}>
              <select className={selectCls} value={packType} onChange={(e) => setPackType(e.target.value)}>
                <option value="">{b.packagingNone}</option>
                {p.packaging.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={b.packagingAmount}>
              <Input inputMode="numeric" value={packAmount} onChange={(e) => setPackAmount(grouped(e.target.value))} disabled={!packType} placeholder="0" />
            </Field>
          </div>
        </Card>

        <Card title={b.money}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={b.price}>
              <Input inputMode="numeric" value={price} onChange={(e) => setPrice(grouped(e.target.value))} placeholder="5,000" className="text-base font-semibold" />
            </Field>
            <Field label={b.payer}>
              <Segmented
                value={payer}
                onChange={setPayer}
                items={[
                  ["sender", b.payerSender],
                  ["receiver", b.payerReceiver],
                ]}
              />
              {payer === "receiver" && !receiverPays && <p className="text-warn mt-1 text-xs">{b.podOff}</p>}
            </Field>
          </div>
          {!receiverPays && (
            <Field label={b.paidWith}>
              <Segmented
                value={paidWith}
                onChange={setPaidWith}
                items={[
                  ["cash", b.cash],
                  ...(p.momo ? ([["mobile_money", b.momo]] as const) : []),
                  ...(sender.kind === "company" ? ([["invoice", b.invoice]] as const) : []),
                ]}
              />
              {!p.momo && <p className="text-muted-foreground mt-1 text-xs">{b.momoOff}</p>}
            </Field>
          )}
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5 size-4" checked={inHand} onChange={(e) => setInHand(e.target.checked)} />
            <span>
              <span className="font-medium">{b.inHand}</span>
              <span className="text-muted-foreground block text-xs">{b.inHandHint}</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5 size-4" checked={noProhibited} onChange={(e) => setNoProhibited(e.target.checked)} />
            <span>{b.prohibited}</span>
          </label>
        </Card>
      </div>

      <aside className="xl:sticky xl:top-4 xl:self-start">
        <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
          <div className="bg-sidebar text-sidebar-foreground px-5 py-4">
            <h3 className="text-base font-bold">{b.summary}</h3>
          </div>
          <dl className="space-y-2 px-5 py-4 text-sm">
            <Line k={b.sender} v={sender.name || "—"} />
            <Line k={b.receiver} v={receiver.name || "—"} />
            <Line k={b.delivery} v={[mode === "door" ? b.door : b.collect, district, region].filter(Boolean).join(" · ") || "—"} />
            <Line k={b.weight} v={kg > 0 ? `${kg} kg` : "—"} />
            <div className="border-t pt-2" />
            <Line k={b.price} v={`TZS ${amount(price).toLocaleString("en-US")}`} />
            {extrasTotal > 0 && <Line k={b.extras} v={`TZS ${extrasTotal.toLocaleString("en-US")}`} />}
            <div className="flex justify-between gap-3 border-t pt-2 text-base font-semibold">
              <dt>{b.total}</dt>
              <dd className="tabular">TZS {total.toLocaleString("en-US")}</dd>
            </div>
            <p className="text-muted-foreground text-xs">{receiverPays ? b.payerReceiver : `${b.payerSender} · ${paidWith === "cash" ? b.cash : paidWith === "mobile_money" ? b.momo : b.invoice}`}</p>
          </dl>
          <div className="border-t px-5 py-4">
            {missing.length > 0 && (
              <p className="text-muted-foreground mb-3 text-xs">
                <span className="font-medium">{b.missing}:</span> {missing.join(", ")}
              </p>
            )}
            <Button className="w-full" size="lg" disabled={pending || missing.length > 0} onClick={submit}>
              <PackagePlus /> {pending ? b.submitting : b.submit}
            </Button>
          </div>
        </section>
      </aside>
    </div>
  );
}

/* ---------------------------------------------------------------- pieces */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
      <h3 className="border-b px-4 py-3 text-[15px] font-semibold">{title}</h3>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-[13px]">{label}</Label>
      {children}
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground shrink-0">{k}</dt>
      <dd className="truncate text-right" title={v}>
        {v}
      </dd>
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: readonly (readonly [T, string])[] }) {
  return (
    <div className="bg-muted inline-flex w-full flex-wrap gap-1 rounded-md p-1">
      {items.map(([k, label]) => (
        <button
          key={k}
          type="button"
          aria-pressed={value === k}
          onClick={() => onChange(k)}
          className={cn("min-w-0 flex-1 rounded px-3 py-1.5 text-[13px] font-medium whitespace-nowrap", value === k ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** One end of the parcel: person or company, the phone first (saved customers come up as it's typed), then the rest. */
function PartyCard({ title, value, onChange, contactLabel, onPicked }: { title: string; value: Party; onChange: (v: Party) => void; contactLabel: string; onPicked?: (c: Customer) => void }) {
  const { dict: t } = useI18n();
  const b = t.agent.book;
  const [found, setFound] = useState<Customer[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const seq = useRef(0);
  const set = (patch: Partial<Party>) => onChange({ ...value, ...patch });
  const q = value.phone;

  useEffect(() => {
    const n = ++seq.current;
    if (digits(q).length < 4 || picked === q) return;
    const h = setTimeout(async () => {
      const r = await agentCustomerSearchAction(q, value.kind);
      if (n === seq.current) setFound(r);
    }, 300);
    return () => clearTimeout(h);
  }, [q, value.kind, picked]);

  const use = (c: Customer) => {
    setPicked(c.phone);
    setFound([]);
    onChange({ kind: c.kind, phone: c.phone, name: c.name, email: c.email ?? "", tin: c.tin ?? "", regNo: c.regNo ?? "", contactName: c.contactName ?? "" });
    onPicked?.(c);
  };

  // Shown only while a number is being typed (not once a saved customer was picked).
  const shown = digits(q).length >= 4 && picked !== q ? found : [];
  const exact = useMemo(() => found.find((c) => digits(c.phone).endsWith(digits(q).replace(/^0/, ""))), [found, q]);

  return (
    <Card title={title}>
      <Segmented
        value={value.kind}
        onChange={(k) => set({ kind: k })}
        items={[
          ["individual", b.person],
          ["company", b.company],
        ]}
      />
      <Field label={b.phone}>
        <div className="relative">
          <Search aria-hidden className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input type="tel" value={value.phone} onChange={(e) => set({ phone: e.target.value })} placeholder={b.phoneHint} className="pl-8" autoComplete="off" />
        </div>
      </Field>
      {shown.length > 0 && (
        <div className="rounded-md border">
          <p className="text-muted-foreground border-b px-3 py-1.5 text-xs">{b.saved}</p>
          <ul className="divide-y">
            {shown.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => use(c)} className={cn("hover:bg-muted/50 flex w-full items-center gap-3 px-3 py-2 text-left text-sm", exact?.id === c.id && "bg-brand-red/5")}>
                  {c.kind === "company" ? <Building2 className="text-muted-foreground size-4 shrink-0" /> : <User className="text-muted-foreground size-4 shrink-0" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.name}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {c.phone}
                      {c.district ? ` · ${c.district}` : ""}
                      {c.flagged ? ` · ${b.flagged}` : ""}
                    </span>
                  </span>
                  <span className="text-brand-red text-xs font-semibold">{b.use}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Field label={value.kind === "company" ? b.companyName : b.name}>
        <Input value={value.name} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      {value.kind === "company" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={b.tin}>
            <Input inputMode="numeric" value={value.tin} onChange={(e) => set({ tin: digits(e.target.value).slice(0, 9) })} placeholder="123456789" className="font-mono" />
          </Field>
          <Field label={b.regNo}>
            <Input value={value.regNo} onChange={(e) => set({ regNo: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label={contactLabel}>
              <Input value={value.contactName} onChange={(e) => set({ contactName: e.target.value })} />
            </Field>
          </div>
        </div>
      )}
      <Field label={`${b.email} (${t.common.optional.toLowerCase()})`}>
        <Input type="email" value={value.email} onChange={(e) => set({ email: e.target.value })} />
      </Field>
    </Card>
  );
}

function CollectPicker({
  points,
  value,
  onChange,
  labels,
}: {
  points: Points | null;
  value: { kind: "office" | "point"; id: string } | null;
  onChange: (v: { kind: "office" | "point"; id: string }) => void;
  labels: { collectWhere: string; ourOffices: string; tumaPoints: string; noPoints: string };
}) {
  const { dict: t } = useI18n();
  if (!points) return <p className="text-muted-foreground text-sm">{t.common.loading}</p>;
  if (!points.offices.length && !points.points.length) return <p className="text-muted-foreground text-sm">{labels.noPoints}</p>;
  const group = (title: string, kind: "office" | "point", rows: { id: string; name: string; district: string | null; inDistrict: boolean }[]) =>
    rows.length > 0 && (
      <div>
        <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">{title}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {rows.map((r) => {
            const on = value?.kind === kind && value.id === r.id;
            return (
              <button
                key={r.id}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ kind, id: r.id })}
                className={cn("rounded-md border px-3 py-2 text-left text-sm", on ? "border-brand-red bg-brand-red/5" : "hover:bg-muted")}
              >
                <span className="block truncate font-medium">{r.name}</span>
                <span className="text-muted-foreground block truncate text-xs">{r.district ?? "—"}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{labels.collectWhere}</p>
      {group(labels.ourOffices, "office", points.offices)}
      {group(labels.tumaPoints, "point", points.points)}
    </div>
  );
}
