"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Pencil } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { BUSINESS_TYPES, WORKFLOW_PRESETS, WORKFLOW_STEPS, formatTin, normaliseTin, type WorkflowStep } from "@/domain/agents";
import { TZ_REGIONS } from "@/domain/pricing";
import { TZ_DISTRICTS } from "@/domain/tz-districts";
import { submitOnboardingAction } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BusinessNameField, type PickedRegistration } from "./business-name-field";

type Initial = {
  businessName: string;
  businessType: string;
  tin: string;
  licenceNumber: string | null;
  registration?: PickedRegistration | null;
  office: { region: string; district: string; street: string; landmark?: string; phone: string; hours?: string };
  contact: { name: string; phone: string; email?: string; role?: string };
  workflow: string[];
} | null;

type Values = Record<
  | "businessName" | "businessType" | "tin" | "licenceNumber"
  | "region" | "district" | "street" | "landmark" | "officePhone" | "hours"
  | "contactName" | "contactPhone" | "contactEmail" | "contactRole",
  string
>;

/** Which step each field lives on, and the server's name for it (so a server-side error opens the right step). */
const FIELDS: { key: keyof Values; step: number; path: string; required?: boolean }[] = [
  { key: "businessName", step: 0, path: "businessName", required: true },
  { key: "businessType", step: 0, path: "businessType", required: true },
  { key: "tin", step: 0, path: "tin", required: true },
  { key: "licenceNumber", step: 0, path: "licenceNumber" },
  { key: "region", step: 1, path: "office.region", required: true },
  { key: "district", step: 1, path: "office.district", required: true },
  { key: "street", step: 1, path: "office.street", required: true },
  { key: "landmark", step: 1, path: "office.landmark" },
  { key: "officePhone", step: 1, path: "office.phone", required: true },
  { key: "hours", step: 1, path: "office.hours" },
  { key: "contactName", step: 2, path: "contact.name", required: true },
  { key: "contactPhone", step: 2, path: "contact.phone", required: true },
  { key: "contactEmail", step: 2, path: "contact.email" },
  { key: "contactRole", step: 2, path: "contact.role" },
];

const isTzMobile = (v: string) => /^(?:\+?255|0)?[67]\d{8}$/.test(v.replace(/[\s-]/g, ""));
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const inputCls =
  "bg-background focus-visible:border-ring aria-[invalid=true]:border-destructive h-11 w-full rounded-md border px-3 text-[15px] outline-none";

/**
 * Parcel-agent application (KYB) as a five-step wizard, the same steps as the Tuma app:
 * Business → Office → Contact → Operations → Review. It goes to ComplyOS for review.
 */
export function KybForm({ initial, contactName, done }: { initial: Initial; contactName: string; /** Where to go once sent. */ done?: string }) {
  const { dict, locale } = useI18n();
  const o = dict.onboarding;
  const router = useRouter();
  const top = useRef<HTMLDivElement>(null);
  const [pending, start] = useTransition();
  const [i, setI] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [declared, setDeclared] = useState(false);
  const [registration, setRegistration] = useState<PickedRegistration | null>(initial?.registration ?? null);
  const [workflow, setWorkflow] = useState<WorkflowStep[]>((initial?.workflow as WorkflowStep[]) ?? WORKFLOW_PRESETS.full);
  const [v, setV] = useState<Values>({
    businessName: initial?.businessName ?? "",
    businessType: initial?.businessType ?? "sole_trader",
    tin: initial?.tin ? formatTin(initial.tin) : "",
    licenceNumber: initial?.licenceNumber ?? "",
    region: initial?.office.region ?? "",
    district: initial?.office.district ?? "",
    street: initial?.office.street ?? "",
    landmark: initial?.office.landmark ?? "",
    officePhone: initial?.office.phone ?? "",
    hours: initial?.office.hours ?? "",
    contactName: initial?.contact.name ?? contactName,
    contactPhone: initial?.contact.phone ?? "",
    contactEmail: initial?.contact.email ?? "",
    contactRole: initial?.contact.role ?? "",
  });

  const steps = [o.stepBusiness, o.stepOffice, o.stepContact, o.stepOps, o.stepReview];
  const last = i === steps.length - 1;
  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setV((p) => ({ ...p, [k]: e.target.value }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };
  const districts = TZ_DISTRICTS[v.region] ?? [];
  // "Other" is for a district the list doesn't have yet; it opens a text box.
  const [districtOther, setDistrictOther] = useState(() => !!v.district && !districts.includes(v.district));
  const pickRegion = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const region = e.target.value;
    const list = TZ_DISTRICTS[region] ?? [];
    setV((p) => ({ ...p, region, district: list.includes(p.district) ? p.district : list.length === 1 ? list[0] : "" }));
    setDistrictOther(false);
    setErrors((p) => ({ ...p, region: undefined }));
    // Move straight on to the district.
    requestAnimationFrame(() => document.getElementById("kyb-district")?.focus());
  };
  const pickDistrict = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "__other") {
      setDistrictOther(true);
      setV((p) => ({ ...p, district: "" }));
      requestAnimationFrame(() => document.getElementById("kyb-district-other")?.focus());
    } else {
      setDistrictOther(false);
      setV((p) => ({ ...p, district: val }));
    }
    if (errors.district) setErrors((p) => ({ ...p, district: undefined }));
  };
  const go = (n: number) => {
    setError(null);
    setI(n);
    top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  /** Check one step's fields before moving on (the server checks everything again). */
  function check(step: number) {
    const e: Partial<Record<keyof Values, string>> = {};
    for (const f of FIELDS.filter((f) => f.step === step)) {
      const val = v[f.key].trim();
      if (f.required && !val) e[f.key] = o.required;
    }
    if (step === 0 && v.tin.trim() && !normaliseTin(v.tin)) e.tin = o.tinHint;
    if (step === 1 && v.officePhone.trim() && !isTzMobile(v.officePhone)) e.officePhone = o.badPhone;
    if (step === 2 && v.contactPhone.trim() && !isTzMobile(v.contactPhone)) e.contactPhone = o.badPhone;
    if (step === 2 && v.contactEmail.trim() && !isEmail(v.contactEmail.trim())) e.contactEmail = o.badEmail;
    setErrors((p) => ({ ...p, ...e }));
    return Object.keys(e).length === 0;
  }

  function submit() {
    setError(null);
    start(async () => {
      const r = await submitOnboardingAction({
        businessName: v.businessName,
        businessType: v.businessType,
        tin: v.tin,
        licenceNumber: v.licenceNumber,
        registration,
        office: { region: v.region, district: v.district, street: v.street, landmark: v.landmark, phone: v.officePhone, hours: v.hours },
        contact: { name: v.contactName, phone: v.contactPhone, email: v.contactEmail, role: v.contactRole },
        workflow,
        declaration: declared,
      });
      if (r.ok) {
        router.replace(done ?? `/${locale}/onboarding`);
        router.refresh();
        return;
      }
      if (r.error === "invalid") {
        // Open the first step with a problem and mark the fields.
        const bad = FIELDS.filter((f) => r.fields?.includes(f.path));
        setErrors(Object.fromEntries(bad.map((f) => [f.key, o.checkField])));
        if (bad.length) go(Math.min(...bad.map((f) => f.step)));
        setError(o.fixErrors);
      } else if (r.error === "has_account") setError(o.hasAccount);
      else if (r.error === "signed_out") router.replace(`/api/auth/login?locale=${locale}&next=/${locale}/onboarding`);
      else setError(o.failed);
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (last) return submit();
    if (i < 3 && !check(i)) return;
    go(i + 1);
  }

  const text = (k: keyof Values, label: string, opts: { type?: string; mode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; ph?: string; auto?: string; mono?: boolean; hint?: string; half?: boolean } = {}) => {
    const f = FIELDS.find((x) => x.key === k)!;
    const id = `kyb-${k}`;
    return (
      <div className={cn("grid content-start gap-1.5", !opts.half && "sm:col-span-2")}>
        <label htmlFor={id} className="text-sm font-medium">
          {label}
          {!f.required && <span className="text-muted-foreground ml-1 font-normal">({o.optional})</span>}
        </label>
        <input
          id={id}
          value={v[k]}
          onChange={set(k)}
          type={opts.type ?? "text"}
          inputMode={opts.mode}
          placeholder={opts.ph}
          autoComplete={opts.auto}
          aria-invalid={!!errors[k]}
          className={cn(inputCls, opts.mono && "font-mono tracking-wider")}
        />
        {errors[k] ? <p className="text-destructive text-[13px]">{errors[k]}</p> : opts.hint ? <p className="text-muted-foreground text-[12.5px]">{opts.hint}</p> : null}
      </div>
    );
  };

  const preset = Object.entries(WORKFLOW_PRESETS).find(([, s]) => s.length === workflow.length && s.every((x) => workflow.includes(x)))?.[0];
  const toggle = (s: WorkflowStep) =>
    setWorkflow((w) => (w.includes(s) ? (w.length > 1 ? w.filter((x) => x !== s) : w) : WORKFLOW_STEPS.filter((x) => x === s || w.includes(x))));

  const review: { step: number; title: string; rows: [string, string][] }[] = [
    {
      step: 0,
      title: o.stepBusiness,
      rows: [
        [o.businessName, v.businessName],
        [o.businessType, o.types[v.businessType as keyof typeof o.types] ?? v.businessType],
        [o.tin, normaliseTin(v.tin) ? formatTin(normaliseTin(v.tin)!) : v.tin],
        ...(v.licenceNumber ? ([[o.licence, v.licenceNumber]] as [string, string][]) : []),
      ],
    },
    {
      step: 1,
      title: o.stepOffice,
      rows: [
        [o.street, [v.street, v.landmark, v.district, v.region].filter(Boolean).join(", ")],
        [o.officePhone, v.officePhone],
        ...(v.hours ? ([[o.hours, v.hours]] as [string, string][]) : []),
      ],
    },
    {
      step: 2,
      title: o.stepContact,
      rows: [
        [o.contactName, [v.contactName, v.contactRole].filter(Boolean).join(" · ")],
        [o.contactPhone, v.contactPhone],
        ...(v.contactEmail ? ([[o.contactEmail, v.contactEmail]] as [string, string][]) : []),
      ],
    },
    { step: 3, title: o.stepOps, rows: [[o.workflow, workflow.map((s) => o.steps[s]).join("  ›  ")]] },
  ];

  return (
    <form onSubmit={onSubmit} noValidate className="bg-card flex flex-col overflow-hidden rounded-xl border shadow-sm">
      <div ref={top} className="scroll-mt-24 border-b px-5 pt-3.5 pb-3 sm:px-7">
        <p className="text-muted-foreground mb-2.5 font-mono text-[11px] tracking-[0.14em] uppercase sm:hidden">
          {o.stepOf.replace("{n}", String(i + 1)).replace("{total}", String(steps.length))} · {steps[i]}
        </p>
        <ol className="flex items-center gap-2" aria-label={o.stepOf.replace("{n}", String(i + 1)).replace("{total}", String(steps.length))}>
          {steps.map((s, k) => (
            <li key={s} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none">
              <button
                type="button"
                disabled={k > i}
                onClick={() => go(k)}
                aria-current={k === i ? "step" : undefined}
                aria-label={s}
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[11px] disabled:cursor-default",
                  k < i ? "border-foreground bg-foreground text-background" : k === i ? "border-brand-red text-brand-ink" : "text-muted-foreground",
                )}
              >
                {k < i ? <Check className="size-3.5" /> : k + 1}
              </button>
              <span className={cn("hidden truncate text-[13px] lg:block", k === i ? "font-medium" : "text-muted-foreground")}>{s}</span>
              {k < steps.length - 1 && <span aria-hidden className={cn("h-px flex-1", k < i ? "bg-foreground/60" : "bg-border")} />}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid content-start gap-4 px-5 py-5 sm:grid-cols-2 sm:px-7 sm:py-6">
        <div className="sm:col-span-2">
          <h2 className="font-display text-xl font-semibold tracking-tight">{[o.bizTitle, o.officeTitle, o.contactTitle, o.opsTitle, o.reviewTitle][i]}</h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{[o.bizBody, o.officeBody, o.contactBody, o.workflowLead, o.reviewBody][i]}</p>
        </div>

        {i === 0 && (
          <>
            <BusinessNameField
              value={v.businessName}
              onChange={(val) => {
                setV((p) => ({ ...p, businessName: val }));
                if (errors.businessName) setErrors((p) => ({ ...p, businessName: undefined }));
              }}
              error={errors.businessName}
              inputClassName={inputCls}
              picked={registration}
              onClear={() => setRegistration(null)}
              onPick={(r) => {
                setRegistration({ source: "brela", number: r.number, name: r.name, kind: r.kind, subtype: r.subtype, status: r.status, registeredOn: r.registeredOn, address: r.address });
                // Fill the name and type; the office only where it's still empty (the person may have typed it).
                setV((p) => {
                  const region = p.region || r.office.region || "";
                  const district = p.district || (region === r.office.region ? r.office.district : undefined) || "";
                  return { ...p, businessName: r.name, businessType: r.businessType, region, district, street: p.street || r.office.street || "" };
                });
                setErrors((p) => ({ ...p, businessName: undefined, businessType: undefined }));
                setDistrictOther(false);
              }}
            />
            <div className="grid content-start gap-1.5">
              <label htmlFor="kyb-businessType" className="text-sm font-medium">
                {o.businessType}
              </label>
              <select id="kyb-businessType" value={v.businessType} onChange={set("businessType")} className={inputCls}>
                {BUSINESS_TYPES.map((b) => (
                  <option key={b} value={b}>
                    {o.types[b]}
                  </option>
                ))}
              </select>
            </div>
            {text("tin", o.tin, { mode: "numeric", ph: "123-456-789", mono: true, hint: o.tinHint, half: true })}
            {text("licenceNumber", o.licence, { mono: true })}
          </>
        )}

        {i === 1 && (
          <>
            <div className="grid content-start gap-1.5">
              <label htmlFor="kyb-region" className="text-sm font-medium">
                {o.region}
              </label>
              <select id="kyb-region" value={v.region} onChange={pickRegion} aria-invalid={!!errors.region} className={inputCls}>
                <option value="" disabled>
                  {o.chooseRegion}
                </option>
                {TZ_REGIONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              {errors.region && <p className="text-destructive text-[13px]">{errors.region}</p>}
            </div>
            <div className="grid content-start gap-1.5">
              <label htmlFor="kyb-district" className="text-sm font-medium">
                {o.district}
              </label>
              <select
                id="kyb-district"
                value={districtOther ? "__other" : v.district}
                onChange={pickDistrict}
                disabled={!v.region}
                aria-invalid={!!errors.district}
                className={cn(inputCls, !v.region && "opacity-60")}
              >
                <option value="" disabled>
                  {v.region ? o.chooseDistrict : o.chooseRegionFirst}
                </option>
                {districts.map((d) => (
                  <option key={d}>{d}</option>
                ))}
                <option value="__other">{o.districtOther}</option>
              </select>
              {districtOther && (
                <input
                  id="kyb-district-other"
                  value={v.district}
                  onChange={set("district")}
                  placeholder={o.districtOtherHint}
                  aria-label={o.district}
                  aria-invalid={!!errors.district}
                  className={inputCls}
                />
              )}
              {errors.district && <p className="text-destructive text-[13px]">{errors.district}</p>}
            </div>
            {text("street", o.street, { auto: "street-address" })}
            {text("landmark", o.landmark)}
            {text("officePhone", o.officePhone, { type: "tel", mode: "tel", ph: "07XX XXX XXX", half: true })}
            {text("hours", o.hours, { ph: o.hoursHint, half: true })}
          </>
        )}

        {i === 2 && (
          <>
            {text("contactName", o.contactName, { auto: "name", half: true })}
            {text("contactRole", o.contactRole, { auto: "organization-title", half: true })}
            {text("contactPhone", o.contactPhone, { type: "tel", mode: "tel", ph: "07XX XXX XXX", auto: "tel", half: true })}
            {text("contactEmail", o.contactEmail, { type: "email", mode: "email", auto: "email", half: true })}
          </>
        )}

        {i === 3 && (
          <>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              {Object.keys(WORKFLOW_PRESETS).map((k) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setWorkflow(WORKFLOW_PRESETS[k])}
                  aria-pressed={preset === k}
                  className={cn("h-9 rounded-full border px-4 text-sm font-medium transition-colors", preset === k ? "bg-foreground border-foreground text-background" : "hover:bg-muted")}
                >
                  {o.presets[k as keyof typeof o.presets]}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:col-span-2 sm:grid-cols-4">
              {WORKFLOW_STEPS.map((s, n) => (
                <label key={s} className={cn("flex h-12 cursor-pointer items-center gap-2.5 rounded-md border px-3 text-sm", workflow.includes(s) && "border-brand-red bg-brand-red/5")}>
                  <input type="checkbox" checked={workflow.includes(s)} onChange={() => toggle(s)} className="accent-brand-red size-4" />
                  <span className="text-muted-foreground font-mono text-xs">{n + 1}</span>
                  <span className="font-medium">{o.steps[s]}</span>
                </label>
              ))}
            </div>
          </>
        )}

        {i === 4 && (
          <>
            <div className="divide-y rounded-lg border sm:col-span-2">
              {review.map((sec) => (
                <section key={sec.step} className="px-4 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="eyebrow">{sec.title}</h3>
                    <button type="button" onClick={() => go(sec.step)} className="text-brand-ink inline-flex items-center gap-1 text-[13px] font-medium hover:underline">
                      <Pencil className="size-3.5" aria-hidden /> {o.editStep}
                    </button>
                  </div>
                  <dl className="mt-2 space-y-1.5 text-sm">
                    {sec.rows.map(([k, val]) => (
                      <div key={k} className="grid gap-x-4 sm:grid-cols-[10rem_1fr]">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="break-words">{val}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
            <label className="flex cursor-pointer gap-3 rounded-lg border p-4 text-[15px] leading-snug sm:col-span-2">
              <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} className="accent-brand-red mt-0.5 size-5 shrink-0" />
              {o.declaration}
            </label>
          </>
        )}

        {error && (
          <p role="alert" className="text-destructive text-sm font-medium sm:col-span-2">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t px-5 py-3 sm:px-7">
        {/* No Back on the first step: there is nothing to go back to. */}
        {i > 0 ? (
          <Button type="button" variant="outline" onClick={() => go(i - 1)}>
            <ArrowLeft /> {dict.discovery.back}
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={pending || (last && !declared)} className="bg-brand-red hover:bg-brand-red/90 text-black">
          {pending ? <Loader2 className="animate-spin" /> : null}
          {last ? (pending ? o.submitting : initial ? o.resubmit : o.submit) : dict.discovery.next}
          {!last && <ArrowRight />}
        </Button>
      </div>
    </form>
  );
}
