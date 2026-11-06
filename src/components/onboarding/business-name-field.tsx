"use client";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Building2, ChevronRight, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { lookupBusinessAction } from "@/app/actions/onboarding";
import type { RegistryKind, RegistryRecord } from "@/domain/brela";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** What step one keeps of the matched registration (and sends as `registration`). */
export type PickedRegistration = {
  source: "brela";
  number: string;
  name: string;
  kind: RegistryKind;
  subtype?: string | null;
  status?: string | null;
  registeredOn?: string | null;
  address?: string | null;
};

const meta = (r: { number: string; subtype?: string | null; registeredOn?: string | null }, regNo: string) =>
  [`${regNo} ${r.number}`, r.subtype, r.registeredOn?.slice(0, 4)].filter(Boolean).join(" · ");

/**
 * Step one's business name, which looks itself up in the register as it is typed (both registers, 400 ms after the
 * last key, like the Hudumika app's corporate join). Picking a match fills in the rest; no match, and they carry on
 * by hand. Editing the name after a pick drops the match.
 */
export function BusinessNameField({
  value,
  onChange,
  error,
  inputClassName,
  picked,
  onPick,
  onClear,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  inputClassName: string;
  picked: PickedRegistration | null;
  onPick: (r: RegistryRecord) => void;
  onClear: () => void;
}) {
  const { dict } = useI18n();
  const o = dict.onboarding;
  const t = o.nameSearch;
  const [results, setResults] = useState<RegistryRecord[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function changed(text: string) {
    onChange(text);
    if (picked && text.trim() !== picked.name) onClear();
    clearTimeout(timer.current);
    const query = text.trim();
    const n = ++seq.current;
    if (query.length < 3) {
      setPending(false);
      setResults(null);
      setFailed(false);
      return;
    }
    setPending(true);
    timer.current = setTimeout(async () => {
      const r = await lookupBusinessAction({ query });
      if (n !== seq.current) return;
      setPending(false);
      setResults(r.ok ? r.results : null);
      setFailed(!r.ok);
    }, 400);
  }

  function pick(r: RegistryRecord) {
    clearTimeout(timer.current);
    seq.current++;
    setPending(false);
    setResults(null);
    setFailed(false);
    onPick(r);
  }

  const note = (text: string, busy = false) => (
    <p className="text-muted-foreground flex items-center gap-2 text-[12.5px]">
      {busy && <Loader2 className="size-3.5 animate-spin" />}
      {text}
    </p>
  );

  return (
    <div className="grid content-start gap-1.5 sm:col-span-2">
      <label htmlFor="kyb-businessName" className="text-sm font-medium">
        {o.businessName}
      </label>
      <input
        id="kyb-businessName"
        value={value}
        onChange={(e) => changed(e.target.value)}
        autoComplete="organization"
        aria-invalid={!!error}
        aria-describedby="kyb-businessName-note"
        className={inputClassName}
      />
      {error && <p className="text-destructive text-[13px]">{error}</p>}
      <div id="kyb-businessName-note" aria-live="polite" className="grid gap-2">
        {picked ? (
          <div className="flex items-center gap-3 rounded-md border border-emerald-600/30 bg-emerald-600/5 py-2 pr-1 pl-3">
            <BadgeCheck className="size-4.5 shrink-0 text-emerald-700" />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-emerald-700">{t.matched}</div>
              <div className="text-muted-foreground text-xs">{meta(picked, t.regNo)}</div>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={onClear}>
              {t.notThisOne}
            </Button>
          </div>
        ) : pending ? (
          note(t.searching, true)
        ) : failed ? (
          note(t.failed)
        ) : results && results.length === 0 ? (
          note(t.noMatch)
        ) : results ? (
          <>
            <p className="text-muted-foreground text-xs font-medium">{t.matches}</p>
            <ul className="grid gap-2">
              {results.map((r) => (
                <li key={`${r.kind}:${r.number}`}>
                  <button
                    type="button"
                    onClick={() => pick(r)}
                    className="bg-card hover:border-foreground/30 flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left"
                  >
                    <Building2 className="text-muted-foreground size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{r.name}</span>
                      <span className="text-muted-foreground block text-xs">{meta(r, t.regNo)}</span>
                      {r.address && <span className="text-muted-foreground block truncate text-xs">{r.address}</span>}
                      {!r.registered && <span className={cn("block text-xs font-medium text-amber-700")}>{r.status}</span>}
                    </span>
                    <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
            {note(t.notListed)}
          </>
        ) : (
          note(t.hint)
        )}
      </div>
    </div>
  );
}
