"use client";
import { AppLocale } from "@/domain/types";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { createParcelAction, quoteAction } from "@/app/actions/shipments";
import { TZ_REGIONS, type Quote } from "@/domain/pricing";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

type Piece = { weightKg: string; lengthCm: string; widthCm: string; heightCm: string };
type Addr = { region: string; district: string; ward: string; street: string; landmark: string; lat: string; lng: string };
type Party = { name: string; phone: string; email: string; language: AppLocale; address: Addr };

const emptyAddr = (region = ""): Addr => ({ region, district: "", ward: "", street: "", landmark: "", lat: "", lng: "" });
const emptyPiece = (): Piece => ({ weightKg: "", lengthCm: "", widthCm: "", heightCm: "" });

const inputCls = "bg-background h-10 w-full rounded-md border px-3 text-[15px] outline-none focus-visible:border-ring aria-[invalid=true]:border-destructive";

export function NewParcelForm({
  locale,
  wakala,
  allowedServiceLevels,
  shipperDefaults,
}: {
  locale: string;
  wakala: { id: string; name: string; region: string }[];
  allowedServiceLevels: string[];
  shipperDefaults: { name: string; region: string };
}) {
  const { dict: t } = useI18n();
  const router = useRouter();
  const [shipper, setShipper] = useState<Party>({ name: shipperDefaults.name, phone: "", email: "", language: "en", address: emptyAddr(shipperDefaults.region) });
  const [consignee, setConsignee] = useState<Party>({ name: "", phone: "", email: "", language: "sw", address: emptyAddr() });
  const [pieces, setPieces] = useState<Piece[]>([emptyPiece()]);
  const [o, setO] = useState({
    merchantRef: "",
    serviceLevel: allowedServiceLevels.includes("next_day") ? "next_day" : allowedServiceLevels[0],
    paymentTerms: "pay_on_delivery",
    handoverMode: "wakala_dropoff",
    deliveryMode: "door",
    pickupLocationId: "",
    deliveryLocationId: "",
    deliveryInstructions: "",
    goodsDescription: "",
    goodsCategory: "general",
    declaredValue: "",
    codAmount: "",
    codOn: false,
    prepayMethod: "mobile_money",
    collectMethods: ["cash", "mobile_money"] as string[],
    specialHandling: [] as string[],
    prohibitedDeclared: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [pending, start] = useTransition();

  const payload = useMemo(
    () => ({
      ...o,
      pickupLocationId: o.pickupLocationId || undefined,
      deliveryLocationId: o.deliveryLocationId || undefined,
      declaredValue: o.declaredValue || undefined,
      codAmount: o.codOn ? o.codAmount || undefined : undefined,
      prepayMethod: o.paymentTerms === "prepaid" ? o.prepayMethod : undefined,
      codOn: undefined,
      deliveryInstructions: o.deliveryInstructions || undefined,
      shipper,
      consignee,
      pieces,
    }),
    [o, shipper, consignee, pieces],
  );

  // Live price (FR-PCL-03). Quote with a relaxed copy so the price shows before every field is filled.
  const seq = useRef(0);
  const ready = Boolean(shipper.address.region && consignee.address.region && pieces.every((p) => Number(p.weightKg) > 0 && Number(p.lengthCm) > 0 && Number(p.widthCm) > 0 && Number(p.heightCm) > 0));
  const shownQuote = ready ? quote : null;
  useEffect(() => {
    if (!ready) return;
    const id = ++seq.current;
    const handle = setTimeout(async () => {
      setQuoting(true);
      const filler = { name: "x x", phone: "0712345678", language: "en", address: { district: "xx", landmark: "x" } };
      const q = await quoteAction({
        ...payload,
        prohibitedDeclared: true,
        goodsDescription: "quote",
        paymentTerms: o.paymentTerms,
        codAmount: o.codOn ? o.codAmount || 1 : undefined,
        deliveryLocationId: o.deliveryMode === "wakala_collect" ? "x" : undefined,
        pickupLocationId: o.handoverMode === "wakala_dropoff" ? "x" : undefined,
        shipper: { ...filler, address: { ...filler.address, region: shipper.address.region } },
        consignee: { ...filler, address: { ...filler.address, region: consignee.address.region } },
      });
      if (id === seq.current) {
        setQuote(q);
        setQuoting(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [ready, payload, shipper.address.region, consignee.address.region, pieces, o.paymentTerms, o.codAmount, o.codOn, o.deliveryMode, o.handoverMode]);

  const err = (path: string) => errors[path];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await createParcelAction(payload);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error);
        const first = Object.keys(r.fieldErrors ?? {})[0];
        if (first) document.getElementById(first)?.focus();
        return;
      }
      toast.success(`${t.form.created}: ${r.data!.waybill}`, { description: r.data!.duplicateRef ? t.form.duplicateRef : undefined });
      router.push(`/${locale}/portal/shipments/${r.data!.waybill}`);
    });
  }

  const partyFields = (who: "shipper" | "consignee", p: Party, set: (p: Party) => void) => {
    const a = (k: keyof Addr, v: string) => set({ ...p, address: { ...p.address, [k]: v } });
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${who}.name`} label={t.form.name} error={err(`${who}.name`)}>
          <input id={`${who}.name`} className={inputCls} value={p.name} onChange={(e) => set({ ...p, name: e.target.value })} aria-invalid={!!err(`${who}.name`)} autoComplete="name" />
        </Field>
        <Field id={`${who}.phone`} label={t.form.phone} hint={t.form.phoneHint} error={err(`${who}.phone`)}>
          <input id={`${who}.phone`} type="tel" inputMode="tel" className={inputCls} value={p.phone} onChange={(e) => set({ ...p, phone: e.target.value })} aria-invalid={!!err(`${who}.phone`)} autoComplete="tel" />
        </Field>
        <Field id={`${who}.address.region`} label={t.form.region} error={err(`${who}.address.region`)}>
          <select id={`${who}.address.region`} className={inputCls} value={p.address.region} onChange={(e) => a("region", e.target.value)} aria-invalid={!!err(`${who}.address.region`)}>
            <option value="">{t.form.choose}</option>
            {TZ_REGIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field id={`${who}.address.district`} label={t.form.district} error={err(`${who}.address.district`)}>
          <input id={`${who}.address.district`} className={inputCls} value={p.address.district} onChange={(e) => a("district", e.target.value)} aria-invalid={!!err(`${who}.address.district`)} />
        </Field>
        <Field id={`${who}.address.ward`} label={t.form.ward} optional={t.common.optional}>
          <input id={`${who}.address.ward`} className={inputCls} value={p.address.ward} onChange={(e) => a("ward", e.target.value)} />
        </Field>
        <Field id={`${who}.address.street`} label={t.form.street} optional={t.common.optional}>
          <input id={`${who}.address.street`} className={inputCls} value={p.address.street} onChange={(e) => a("street", e.target.value)} />
        </Field>
        <Field id={`${who}.address.landmark`} label={t.form.landmark} hint={who === "consignee" ? t.form.landmarkHint : undefined} error={err(`${who}.address.landmark`)} className="sm:col-span-2">
          <input id={`${who}.address.landmark`} className={inputCls} value={p.address.landmark} onChange={(e) => a("landmark", e.target.value)} aria-invalid={!!err(`${who}.address.landmark`)} />
        </Field>
        {who === "consignee" && (
          <>
            <Field id="consignee.language" label={t.form.language}>
              <select id="consignee.language" className={inputCls} value={p.language} onChange={(e) => set({ ...p, language: e.target.value as AppLocale })}>
                <option value="sw">Kiswahili</option>
                <option value="en">English</option>
              </select>
            </Field>
            <Field id="consignee.email" label={t.form.email} optional={t.common.optional} error={err("consignee.email")}>
              <input id="consignee.email" type="email" className={inputCls} value={p.email} onChange={(e) => set({ ...p, email: e.target.value })} />
            </Field>
          </>
        )}
      </div>
    );
  };

  const radio = (name: keyof typeof o, values: string[], labels: Record<string, string>) => (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {values.map((v) => (
        <label key={v} className={cn("cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors", o[name] === v ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-foreground/30")}>
          <input type="radio" className="sr-only" name={name} value={v} checked={o[name] === v} onChange={() => setO({ ...o, [name]: v })} />
          {labels[v]}
        </label>
      ))}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <Section title={t.form.sectionReceiver} n={1}>
          {partyFields("consignee", consignee, setConsignee)}
        </Section>

        <Section title={t.form.sectionGoods} n={2}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="goodsDescription" label={t.form.goodsDescription} error={err("goodsDescription")}>
              <input id="goodsDescription" className={inputCls} value={o.goodsDescription} onChange={(e) => setO({ ...o, goodsDescription: e.target.value })} aria-invalid={!!err("goodsDescription")} />
            </Field>
            <Field id="goodsCategory" label={t.form.goodsCategory}>
              <select id="goodsCategory" className={inputCls} value={o.goodsCategory} onChange={(e) => setO({ ...o, goodsCategory: e.target.value })}>
                {["general", "apparel", "electronics", "beauty", "books", "home", "accessories", "documents"].map((c) => (
                  <option key={c} value={c}>
                    {c[0].toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-5 space-y-3">
            {pieces.map((p, i) => (
              <fieldset key={i} className="bg-sunken/60 rounded-md border p-3">
                <legend className="px-1 text-sm font-medium">
                  {t.form.piece} {i + 1}
                </legend>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.3fr_1fr_1fr_1fr_auto]">
                  {(["weightKg", "lengthCm", "widthCm", "heightCm"] as const).map((k) => (
                    <Field key={k} id={`pieces.${i}.${k}`} label={t.form[k]} error={err(`pieces.${i}.${k}`)}>
                      <input
                        id={`pieces.${i}.${k}`}
                        inputMode="decimal"
                        className={inputCls + " tabular"}
                        value={p[k]}
                        onChange={(e) => setPieces(pieces.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))}
                        aria-invalid={!!err(`pieces.${i}.${k}`)}
                      />
                    </Field>
                  ))}
                  {pieces.length > 1 && (
                    <button type="button" className="text-muted-foreground hover:text-destructive self-end p-2" onClick={() => setPieces(pieces.filter((_, j) => j !== i))} aria-label={`${t.form.removePiece} ${i + 1}`}>
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </fieldset>
            ))}
            {pieces.length < 20 && (
              <Button type="button" variant="outline" size="sm" onClick={() => setPieces([...pieces, emptyPiece()])}>
                <Plus /> {t.form.addPiece}
              </Button>
            )}
          </div>
          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-medium">{t.form.special}</legend>
            <div className="flex flex-wrap gap-4">
              {(["fragile", "perishable", "liquid", "oversize"] as const).map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={o.specialHandling.includes(k)}
                    onChange={(e) => setO({ ...o, specialHandling: e.target.checked ? [...o.specialHandling, k] : o.specialHandling.filter((x) => x !== k) })}
                  />
                  {t.form[k]}
                </label>
              ))}
            </div>
          </fieldset>
          <Field id="declaredValue" label={t.form.declaredValue} optional={t.common.optional} className="mt-5 max-w-xs">
            <input id="declaredValue" inputMode="numeric" className={inputCls + " tabular"} value={o.declaredValue} onChange={(e) => setO({ ...o, declaredValue: e.target.value.replace(/\D/g, "") })} />
          </Field>
        </Section>

        <Section title={t.form.sectionService} n={3}>
          <div className="space-y-5">
            <div>
              <div className="mb-2 text-sm font-medium">{t.form.serviceLevel}</div>
              {radio("serviceLevel", allowedServiceLevels, t.service)}
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">{t.form.deliveryMode}</div>
              {radio("deliveryMode", ["door", "wakala_collect"], t.delivery)}
              {o.deliveryMode === "wakala_collect" && (
                <Field id="deliveryLocationId" label={t.form.wakalaCollect} error={err("deliveryLocationId")} className="mt-3 max-w-md">
                  <select id="deliveryLocationId" className={inputCls} value={o.deliveryLocationId} onChange={(e) => setO({ ...o, deliveryLocationId: e.target.value })} aria-invalid={!!err("deliveryLocationId")}>
                    <option value="">{t.form.choose}</option>
                    {wakala
                      .filter((w) => !consignee.address.region || w.region === consignee.address.region)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                  </select>
                </Field>
              )}
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">{t.form.handoverMode}</div>
              {radio("handoverMode", ["wakala_dropoff", "pickup", "hub_bulk"], t.handover)}
              {o.handoverMode === "wakala_dropoff" && (
                <Field id="pickupLocationId" label={t.form.wakalaDropoff} error={err("pickupLocationId")} className="mt-3 max-w-md">
                  <select id="pickupLocationId" className={inputCls} value={o.pickupLocationId} onChange={(e) => setO({ ...o, pickupLocationId: e.target.value })} aria-invalid={!!err("pickupLocationId")}>
                    <option value="">{t.form.choose}</option>
                    {wakala.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-medium">{t.pay.whoPays}</legend>
              {radio("paymentTerms", ["pay_on_delivery", "prepaid", "account"], t.payment)}
              {err("paymentTerms") && <p className="text-destructive text-sm">{err("paymentTerms")}</p>}
              {o.paymentTerms === "pay_on_delivery" && <p className="text-muted-foreground text-[13px]">{t.pay.podNote}</p>}
              {o.paymentTerms === "prepaid" && (
                <div>
                  <div className="text-muted-foreground mb-1.5 text-[13px]">{t.pay.prepayWith}</div>
                  <div className="flex flex-wrap gap-2">
                    {(["mobile_money", "card", "bank_transfer"] as const).map((m) => (
                      <label key={m} className={cn("cursor-pointer rounded-md border px-3 py-1.5 text-sm", o.prepayMethod === m ? "border-primary bg-primary/5 font-medium" : "bg-background")}>
                        <input type="radio" className="sr-only" name="prepayMethod" checked={o.prepayMethod === m} onChange={() => setO({ ...o, prepayMethod: m })} />
                        {t.pay.methods[m]}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </fieldset>
            <fieldset className="space-y-3 rounded-md border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" className="size-4" checked={o.codOn} onChange={(e) => setO({ ...o, codOn: e.target.checked })} />
                {t.pay.collectGoods}
              </label>
              {o.codOn && (
                <Field id="codAmount" label={`${t.pay.goodsAmount} (TZS)`} error={err("codAmount")} className="max-w-xs">
                  <input id="codAmount" inputMode="numeric" className={inputCls + " tabular"} value={o.codAmount} onChange={(e) => setO({ ...o, codAmount: e.target.value.replace(/\D/g, "") })} aria-invalid={!!err("codAmount")} />
                </Field>
              )}
              {(o.codOn || o.paymentTerms === "pay_on_delivery") && (
                <div>
                  <div className="text-muted-foreground mb-1.5 text-[13px]">{t.pay.receiverPays}</div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {(["cash", "mobile_money", "card"] as const).map((m) => (
                      <label key={m} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="size-4"
                          checked={o.collectMethods.includes(m)}
                          onChange={(e) => setO({ ...o, collectMethods: e.target.checked ? [...o.collectMethods, m] : o.collectMethods.filter((x) => x !== m) })}
                        />
                        {t.pay.methods[m]}
                      </label>
                    ))}
                  </div>
                  {err("collectMethods") && <p className="text-destructive mt-1 text-sm">{err("collectMethods")}</p>}
                </div>
              )}
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="merchantRef" label={t.form.merchantRef} hint={t.form.merchantRefHint} optional={t.common.optional}>
                <input id="merchantRef" className={inputCls} value={o.merchantRef} onChange={(e) => setO({ ...o, merchantRef: e.target.value })} />
              </Field>
              <Field id="deliveryInstructions" label={t.form.instructions} optional={t.common.optional}>
                <input id="deliveryInstructions" className={inputCls} value={o.deliveryInstructions} onChange={(e) => setO({ ...o, deliveryInstructions: e.target.value })} />
              </Field>
            </div>
          </div>
        </Section>

        <Section title={t.form.sectionSender} n={4}>
          {partyFields("shipper", shipper, setShipper)}
        </Section>
      </div>

      {/* Sticky summary with live price */}
      <aside className="xl:sticky xl:top-20 xl:self-start">
        <div className="bg-card rounded-lg border">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold">{t.form.quoteTitle}</h2>
            {quoting && ready && <Loader2 className="text-muted-foreground size-4 animate-spin" aria-label={t.common.loading} />}
          </div>
          <div className="px-4 py-3 text-sm" aria-live="polite">
            {!shownQuote && <p className="text-muted-foreground">{t.form.quoteHint}</p>}
            {shownQuote && !shownQuote.ok && <p className="text-destructive">{shownQuote.message}</p>}
            {shownQuote && shownQuote.ok && (
              <dl>
                {shownQuote.lines.map((l) => (
                  <div key={l.code} className="flex justify-between gap-3 py-0.5">
                    <dt className="text-muted-foreground">{l.label}</dt>
                    <dd className="tabular">{money(l.amount, locale)}</dd>
                  </div>
                ))}
                <div className="mt-1 flex justify-between gap-3 border-t pt-2">
                  <dt className="text-muted-foreground">{t.detail.vat}</dt>
                  <dd className="tabular">{money(shownQuote.tax, locale)}</dd>
                </div>
                <div className="font-display mt-1 flex items-baseline justify-between gap-3 text-[22px] font-semibold">
                  <dt className="text-base">{t.detail.total}</dt>
                  <dd className="tabular">{money(shownQuote.total, locale)}</dd>
                </div>
                {(o.paymentTerms === "pay_on_delivery" || o.codOn) && (
                  <div className="bg-sunken mt-3 rounded-md px-3 py-2">
                    <div className="text-muted-foreground text-xs">{t.pay.dueAtDoor}</div>
                    <div className="tabular font-semibold">
                      {money((o.codOn ? Number(o.codAmount || 0) : 0) + (o.paymentTerms === "pay_on_delivery" ? shownQuote.total : 0), locale)}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {[o.codOn && `${t.pay.goods} ${money(Number(o.codAmount || 0), locale)}`, o.paymentTerms === "pay_on_delivery" && `${t.pay.deliveryFee} ${money(shownQuote.total, locale)}`].filter(Boolean).join(" + ")}
                    </div>
                  </div>
                )}
                <p className="text-muted-foreground mt-2 text-xs">
                  {t.form.chargeableWeight}: {shownQuote.chargeableKg} kg · {t.form.zone}: {shownQuote.zone}
                </p>
              </dl>
            )}
          </div>
          <div className="border-t px-4 py-4">
            <label className={cn("flex items-start gap-2 text-[13px] leading-snug", err("prohibitedDeclared") && "text-destructive")}>
              <input id="prohibitedDeclared" type="checkbox" className="mt-0.5 size-4 shrink-0" checked={o.prohibitedDeclared} onChange={(e) => setO({ ...o, prohibitedDeclared: e.target.checked })} />
              {t.form.prohibited}
            </label>
            <Button type="submit" size="lg" className="mt-4 w-full" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" /> {t.form.submitting}
                </>
              ) : (
                t.form.submit
              )}
            </Button>
          </div>
        </div>
      </aside>
    </form>
  );
}

function Section({ title, n, children }: { title: string; n: number; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-lg border p-4 sm:p-5">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <span className="bg-primary text-primary-foreground grid size-6 place-items-center rounded-full font-mono text-xs">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ id, label, hint, error, optional, className, children }: { id: string; label: string; hint?: string; error?: string; optional?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {optional && <span className="text-muted-foreground ml-1 font-normal">({optional.toLowerCase()})</span>}
      </label>
      {children}
      {error ? (
        <p className="text-destructive text-[13px]">{error}</p>
      ) : (
        hint && <p className="text-muted-foreground text-[12.5px]">{hint}</p>
      )}
    </div>
  );
}
