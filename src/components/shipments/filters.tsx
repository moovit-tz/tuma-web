import Link from "next/link";
import { Search } from "lucide-react";
import { getDict } from "@/i18n";
import { cn } from "@/lib/utils";

const STATES = ["OPEN", "AWAITING_HANDOVER", "AT_HUB", "OUT_FOR_DELIVERY", "ATTEMPT_FAILED", "DELIVERED", "CANCELLED"];

export function ShipmentFilters({ locale, basePath, q, state, atRisk }: { locale: string; basePath: string; q?: string; state?: string; atRisk?: boolean }) {
  const t = getDict(locale);
  const href = (s?: string, risk?: boolean) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (s) sp.set("state", s);
    if (risk) sp.set("risk", "1");
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const chip = (active: boolean) =>
    cn("rounded-full border px-3 py-1 text-[13px] whitespace-nowrap transition-colors", active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:border-foreground/30");
  return (
    <div className="flex flex-col gap-3 border-b p-3 sm:p-4">
      <form action={basePath} className="relative max-w-md">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden />
        {state && <input type="hidden" name="state" value={state} />}
        <input
          name="q"
          defaultValue={q}
          placeholder={t.shipments.searchPlaceholder}
          aria-label={t.common.search}
          className="bg-background focus-visible:border-ring h-10 w-full rounded-md border pr-3 pl-9 text-sm outline-none"
        />
      </form>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
        <Link href={href()} className={chip(!state && !atRisk)}>
          {t.common.all}
        </Link>
        <Link href={href(undefined, true)} className={chip(Boolean(atRisk))}>
          {t.shipments.atRiskOnly}
        </Link>
        {STATES.map((s) => (
          <Link key={s} href={href(s)} className={chip(state === s)}>
            {t.states[s]}
          </Link>
        ))}
      </div>
    </div>
  );
}
