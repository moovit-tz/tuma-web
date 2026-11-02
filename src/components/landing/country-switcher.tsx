import { AppLocale } from "@/domain/types";
import { ChevronDown, MapPin } from "lucide-react";
import { COUNTRIES, type Country } from "@/domain/countries";
import { getDict } from "@/i18n";

/** Uber-style location pill. A <details> dropdown of plain links, so it works before any JS loads. */
export function CountrySwitcher({ selected, locale, sourceLabel }: { selected: Country; locale: AppLocale; sourceLabel: string }) {
  const t = getDict(locale);
  const groups: [string, Country[]][] = [
    ["EAC", COUNTRIES.filter((c) => c.blocs.includes("EAC"))],
    ["SADC", COUNTRIES.filter((c) => !c.blocs.includes("EAC"))],
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <details className="group relative">
        <summary
          className="border-sidebar-border hover:border-sidebar-foreground/40 flex cursor-pointer list-none items-center gap-2 rounded-full border bg-[#0e0e0e]/80 py-1.5 pr-3 pl-2.5 text-sm backdrop-blur transition-colors [&::-webkit-details-marker]:hidden"
          aria-label={t.hero.change}
        >
          <MapPin className="text-brand-red size-4" aria-hidden />
          <span className="font-medium">{selected.name[locale]}</span>
          <span className="text-sidebar-muted font-mono text-[11px]">{selected.iso2}</span>
          <ChevronDown className="text-sidebar-muted size-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="border-sidebar-border absolute top-full left-0 z-40 mt-2 max-h-[min(70vh,460px)] w-72 overflow-y-auto rounded-lg border bg-[#0e0e0e] p-1.5 shadow-2xl">
          {groups.map(([label, list]) => (
            <div key={label} className="py-1">
              <div className="text-sidebar-muted px-2.5 pt-1.5 pb-1 font-mono text-[10.5px] tracking-[0.14em] uppercase">{label}</div>
              {list.map((c) => (
                <a suppressHydrationWarning
                  key={c.iso2}
                  href={`/${locale}?c=${c.iso2.toLowerCase()}`}
                  aria-current={c.iso2 === selected.iso2 ? "true" : undefined}
                  className="hover:bg-sidebar-accent aria-[current]:bg-sidebar-accent flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm"
                >
                  {c.name[locale]}
                  <span className="text-sidebar-muted ml-auto font-mono text-[10.5px]">{c.currency}</span>
                </a>
              ))}
            </div>
          ))}
        </div>
      </details>
      <span className="text-sidebar-muted text-xs">{sourceLabel}</span>
    </div>
  );
}
