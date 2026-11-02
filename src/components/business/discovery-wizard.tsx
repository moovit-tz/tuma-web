"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { submitSupportAction } from "@/app/actions/support";
import {
  BUSINESS_TYPES,
  COLLECT,
  EMPTY_ANSWERS,
  GOODS,
  PAYMENTS,
  SPEEDS,
  SYSTEMS,
  VOLUMES,
  recommend,
  type Answers,
} from "@/domain/discovery";
import { cn } from "@/lib/utils";

type CountryOpt = { iso2: string; name: string; live: boolean; wallets: string[] };
const STEPS = ["businessType", "goods", "markets", "volume", "payments", "systems"] as const;
type Step = (typeof STEPS)[number];

export function DiscoveryWizard({ countries, defaultOrigin }: { countries: CountryOpt[]; defaultOrigin: string }) {
  const { dict } = useI18n();
  const t = dict.discovery;
  const [a, setA] = useState<Answers>({ ...EMPTY_ANSWERS, origin: defaultOrigin, collect: ["cash", "mobile_money"] });
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const step: Step = STEPS[i];
  const name = (iso: string) => countries.find((c) => c.iso2 === iso)?.name ?? iso;

  const answered: Record<Step, boolean> = {
    businessType: !!a.businessType,
    goods: a.goods.length > 0,
    markets: a.markets.length > 0,
    volume: !!a.volume,
    payments: a.payments.length > 0,
    systems: a.systems.length > 0,
  };

  const go = (n: number) => {
    setI(n);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const next = () => (i < STEPS.length - 1 ? go(i + 1) : (setDone(true), top.current?.scrollIntoView({ behavior: "smooth", block: "start" })));
  const toggle = <K extends keyof Answers>(k: K, v: string) =>
    setA((prev) => {
      const list = prev[k] as string[];
      return { ...prev, [k]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] };
    });

  if (done) return <Result answers={a} countries={countries} onEdit={(n) => (setDone(false), go(n))} onRestart={() => (setA({ ...EMPTY_ANSWERS, origin: defaultOrigin, collect: ["cash", "mobile_money"] }), setDone(false), go(0))} refEl={top} />;

  return (
    <div ref={top} className="bg-card scroll-mt-24 overflow-hidden rounded-xl border">
      {/* Progress */}
      <div className="border-b px-5 py-4 sm:px-7">
        <div className="flex items-center justify-between gap-4">
          <span className="eyebrow">{fmt(t.step, { n: i + 1, total: STEPS.length })}</span>
          <span className="text-muted-foreground text-xs">{t.title}</span>
        </div>
        <div className="mt-3 grid grid-cols-6 gap-1.5" aria-hidden>
          {STEPS.map((s, k) => (
            <span key={s} className={cn("h-1 rounded-full", k < i ? "bg-primary" : k === i ? "bg-parcel" : "bg-sunken")} />
          ))}
        </div>
      </div>

      <div className="px-5 py-6 sm:px-7 sm:py-8">
        <h3 className="font-display text-[22px] leading-tight font-semibold tracking-tight sm:text-[26px]">{t.q[step]}</h3>

        {step === "businessType" && (
          <Tiles single options={BUSINESS_TYPES.map((k) => [k, t.businessType[k]])} value={[a.businessType]} onPick={(v) => (setA({ ...a, businessType: v as Answers["businessType"] }), setTimeout(() => go(1), 120))} />
        )}

        {step === "goods" && (
          <>
            <Hint>{t.selectAny}</Hint>
            <Tiles options={GOODS.map((k) => [k, t.goods[k]])} value={a.goods} onPick={(v) => toggle("goods", v)} />
          </>
        )}

        {step === "markets" && (
          <div className="mt-5 space-y-5">
            <label className="block max-w-sm">
              <span className="text-sm font-medium">{t.origin}</span>
              <select
                value={a.origin}
                onChange={(e) => setA({ ...a, origin: e.target.value, markets: a.markets.filter((m) => m !== e.target.value) })}
                className="bg-background focus-visible:border-ring mt-1.5 h-11 w-full rounded-md border px-3 outline-none"
              >
                {countries.map((c) => (
                  <option key={c.iso2} value={c.iso2}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <div className="text-sm font-medium">{t.markets}</div>
              <Hint>{t.selectAny}</Hint>
              <div className="mt-2 flex flex-wrap gap-2">
                <Chip on={a.markets.includes(a.origin)} onClick={() => toggle("markets", a.origin)}>
                  {fmt(t.domestic, { country: name(a.origin) })}
                </Chip>
                {countries
                  .filter((c) => c.iso2 !== a.origin)
                  .map((c) => (
                    <Chip key={c.iso2} on={a.markets.includes(c.iso2)} onClick={() => toggle("markets", c.iso2)}>
                      <span aria-hidden className={cn("size-1.5 rounded-full", c.live ? "bg-parcel" : "border-muted-foreground border")} />
                      {c.name}
                    </Chip>
                  ))}
              </div>
            </div>
          </div>
        )}

        {step === "volume" && (
          <>
            <Tiles single options={VOLUMES.map((k) => [k, t.volume[k]])} value={[a.volume]} onPick={(v) => setA({ ...a, volume: v as Answers["volume"] })} />
            <div className="mt-6">
              <div className="text-sm font-medium">{t.speed}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {SPEEDS.map((k) => (
                  <Chip key={k} on={a.speeds.includes(k)} onClick={() => toggle("speeds", k)}>
                    {t.speeds[k]}
                  </Chip>
                ))}
              </div>
            </div>
          </>
        )}

        {step === "payments" && (
          <>
            <Hint>{t.selectAny}</Hint>
            <Tiles options={PAYMENTS.map((k) => [k, t.payments[k]])} value={a.payments} onPick={(v) => toggle("payments", v)} />
            {(a.payments.includes("pay_on_delivery") || a.payments.includes("cod")) && (
              <div className="mt-6">
                <div className="text-sm font-medium">{t.collect}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COLLECT.map((k) => (
                    <Chip key={k} on={a.collect.includes(k)} onClick={() => toggle("collect", k)}>
                      {t.collectOpts[k]}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {step === "systems" && (
          <>
            <Hint>{t.selectAny}</Hint>
            <Tiles options={SYSTEMS.map((k) => [k, t.systems[k]])} value={a.systems} onPick={(v) => toggle("systems", v)} />
          </>
        )}
      </div>

      <div className="bg-sunken/50 flex items-center justify-between gap-3 border-t px-5 py-4 sm:px-7">
        {i > 0 ? (
          <Button variant="ghost" onClick={() => go(i - 1)}>
            <ArrowLeft /> {t.back}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          {!answered[step] && step !== "businessType" && (
            <Button variant="ghost" onClick={next}>
              {t.skip}
            </Button>
          )}
          <Button onClick={next} disabled={!answered[step]}>
            {i === STEPS.length - 1 ? t.see : t.next} <ArrowRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground mt-1 text-sm">{children}</p>;
}

function Tiles({ options, value, onPick, single }: { options: [string, string][]; value: string[]; onPick: (v: string) => void; single?: boolean }) {
  return (
    <div role={single ? "radiogroup" : "group"} className="mt-5 grid gap-2.5 sm:grid-cols-2">
      {options.map(([k, label]) => {
        const on = value.includes(k);
        return (
          <button
            key={k}
            type="button"
            role={single ? "radio" : "checkbox"}
            aria-checked={on}
            onClick={() => onPick(k)}
            className={cn(
              "flex min-h-[56px] items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-[15px] transition-colors",
              on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-foreground/40",
            )}
          >
            {label}
            <span aria-hidden className={cn("grid size-5 shrink-0 place-items-center border", single ? "rounded-full" : "rounded", on ? "border-primary-foreground" : "border-input")}>
              {on && <Check className="size-3.5" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors",
        on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-foreground/40",
      )}
    >
      {children}
    </button>
  );
}

function Result({
  answers: a,
  countries,
  onEdit,
  onRestart,
  refEl,
}: {
  answers: Answers;
  countries: CountryOpt[];
  onEdit: (step: number) => void;
  onRestart: () => void;
  refEl: React.RefObject<HTMLDivElement | null>;
}) {
  const { dict, locale } = useI18n();
  const t = dict.discovery;
  const r = useMemo(() => recommend(a), [a]);
  const name = (iso: string) => countries.find((c) => c.iso2 === iso)?.name ?? iso;
  const [pending, start] = useTransition();
  const [ref, setRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tag = (av: string) =>
    cn(
      "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10.5px] tracking-wider uppercase",
      av === "available" ? "border-ok/40 text-ok" : av === "rolling_out" ? "border-warn/40 text-warn" : "border-border text-muted-foreground",
    );

  const detail = (d: string) => {
    const [kind, v] = d.split(":");
    if (kind === "method") return t.collectOpts[v];
    if (kind === "speed") return t.speeds[v];
    return v; // wallet names
  };

  const summary = [
    [0, a.businessType ? t.businessType[a.businessType] : "—"],
    [1, a.goods.map((g) => t.goods[g]).join(", ") || "—"],
    [2, `${name(a.origin)} → ${a.markets.map(name).join(", ") || "—"}`],
    [3, a.volume ? t.volume[a.volume] : "—"],
    [4, a.payments.map((p) => t.payments[p]).join(", ") || "—"],
    [5, a.systems.map((s) => t.systems[s]).join(", ") || "—"],
  ] as [number, string][];

  return (
    <div ref={refEl} className="scroll-mt-24 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="bg-card overflow-hidden rounded-xl border">
        <div className="bg-sidebar text-sidebar-foreground px-5 py-6 sm:px-7">
          <div className="text-brand-red font-mono text-[11px] tracking-[0.14em] uppercase">{t.resultTitle}</div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3">
            <span className="font-display text-3xl font-bold tracking-tight">Tuma {t.plan[r.plan]}</span>
            <span className="text-sidebar-muted text-sm">{t.planNote[r.plan]}</span>
          </div>
        </div>
        <ul className="divide-y">
          {r.modules.map((m) => {
            const [title, body] = t.modules[m.key];
            return (
              <li key={m.key} className="flex items-start justify-between gap-4 px-5 py-4 sm:px-7">
                <div className="min-w-0">
                  <div className="font-medium">{title}</div>
                  <p className="text-muted-foreground text-sm">{body}</p>
                  {m.detail && m.detail.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.detail.map((d) => (
                        <span key={d} className="bg-sunken rounded px-2 py-0.5 text-xs">
                          {detail(d)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className={tag(m.availability)}>{t.availability[m.availability]}</span>
              </li>
            );
          })}
        </ul>
        <div className="border-t px-5 py-4 text-sm sm:px-7">
          <div className="font-medium">{t.coverage}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {r.liveMarkets.map((m) => (
              <span key={m} className="border-ok/40 text-ok rounded-full border px-2.5 py-0.5 text-xs">
                {t.liveIn} · {name(m)}
              </span>
            ))}
            {r.soonMarkets.map((m) => (
              <span key={m} className="border-warn/40 text-warn rounded-full border px-2.5 py-0.5 text-xs">
                {t.soonIn} · {name(m)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="bg-card rounded-xl border p-5">
          <dl className="space-y-2.5 text-sm">
            {summary.map(([n, v]) => (
              <div key={n} className="flex items-start justify-between gap-3">
                <dd className="min-w-0">
                  <span className="text-muted-foreground block text-xs">{t.q[STEPS[n]]}</span>
                  {v}
                </dd>
                <button className="text-muted-foreground hover:text-foreground shrink-0 text-xs underline underline-offset-4" onClick={() => onEdit(n)}>
                  {dict.common.edit}
                </button>
              </div>
            ))}
          </dl>
          <Button variant="ghost" size="sm" className="mt-3 -ml-2" onClick={onRestart}>
            <RotateCcw /> {t.restart}
          </Button>
        </div>

        <div className="bg-card rounded-xl border p-5">
          {ref ? (
            <div className="text-center" role="status">
              <CheckCircle2 className="text-ok mx-auto size-8" />
              <p className="mt-2 font-medium">{dict.forms.thanks}</p>
              <p className="text-muted-foreground mt-3 text-xs uppercase tracking-wider">{dict.forms.reference}</p>
              <p className="font-mono text-xl font-semibold tracking-wider">{ref}</p>
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const services = [
                  ...(r.modules.some((m) => m.key === "parcel") ? ["parcel"] : []),
                  ...(r.modules.some((m) => m.key === "cargo") ? ["cargo"] : []),
                  ...(r.modules.some((m) => m.key === "collect") ? ["cod"] : []),
                  ...(r.integration === "api" || r.integration === "erp" ? ["api"] : []),
                ];
                start(async () => {
                  const res = await submitSupportAction(
                    "business",
                    {
                      company: fd.get("company"),
                      name: fd.get("name"),
                      email: fd.get("email"),
                      phone: fd.get("phone"),
                      website: fd.get("website"),
                      monthlyVolume: a.volume || "lt_100",
                      services,
                      discovery: { answers: a, recommendation: r },
                    },
                    locale,
                  );
                  if (res.ok) setRef(res.ref);
                  else setError(res.error === "limited" ? dict.forms.limited : res.error === "server" ? dict.forms.server : dict.forms.invalid);
                });
              }}
            >
              <div>
                <h3 className="font-semibold">{t.contactTitle}</h3>
                <p className="text-muted-foreground text-sm">{t.contactSub}</p>
              </div>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
              {(
                [
                  ["company", dict.businessPage.company, "text", "organization"],
                  ["name", dict.forms.name, "text", "name"],
                  ["email", dict.forms.email, "email", "email"],
                  ["phone", dict.forms.phone, "tel", "tel"],
                ] as const
              ).map(([n, label, type, ac]) => (
                <label key={n} className="block">
                  <span className="text-sm font-medium">{label}</span>
                  <input name={n} type={type} required autoComplete={ac} className="bg-background focus-visible:border-ring mt-1 h-10 w-full rounded-md border px-3 outline-none" />
                </label>
              ))}
              {error && (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : null} {dict.businessPage.cta}
              </Button>
            </form>
          )}
        </div>
      </aside>
    </div>
  );
}
