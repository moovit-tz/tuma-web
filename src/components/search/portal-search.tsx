"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Boxes,
  Building2,
  CornerDownLeft,
  FileText,
  HandCoins,
  Loader2,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useI18n } from "@/i18n/client";
import { searchAction } from "@/app/actions/search";
import type { SearchResult } from "@/server/services/search";

const GROUP_ICON: Record<string, typeof Package> = {
  shipments: Package,
  clients: Building2,
  invoices: FileText,
  payments: HandCoins,
  vehicles: Truck,
  people: Users,
  roles: ShieldCheck,
};

/**
 * Top-bar search for the whole portal (⌘K / Ctrl K). Understands plain-language questions in English,
 * Swahili and French and only returns what the signed-in user is allowed to see.
 */
export function PortalSearch() {
  const { dict, locale } = useI18n();
  const t = dict.search;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (!query) return;
    const id = ++seq.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      const r = await searchAction(query, locale);
      if (id === seq.current) {
        setRes(r);
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [q, locale]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  const shown = q.trim() ? res : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-muted/60 hover:bg-muted text-muted-foreground flex h-10 w-10 items-center justify-center gap-2 rounded-md border text-left text-sm transition-colors md:w-full md:justify-start md:px-3"
        aria-label={t.shortcut}
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="hidden min-w-0 flex-1 truncate md:block">{t.placeholder}</span>
        <kbd className="bg-background hidden rounded border px-1.5 font-mono text-[10.5px] md:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t.shortcut}
        description={t.placeholder}
        className="top-[12vh] sm:max-w-2xl"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={q}
            onValueChange={(v) => {
              setQ(v);
              if (!v.trim()) setRes(null);
            }}
            placeholder={t.placeholder}
          />
          <CommandList className="max-h-[min(70vh,520px)]">
            {!q.trim() && (
              <CommandGroup heading={t.tryAsking}>
                {t.examples.map((ex) => (
                  <CommandItem
                    key={ex}
                    value={`ex-${ex}`}
                    onSelect={() => setQ(ex)}
                  >
                    <Sparkles className="text-parcel" />
                    {ex}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {q.trim() && loading && !shown && (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
                <Loader2 className="size-4 animate-spin" /> {t.searching}
              </div>
            )}

            {shown && shown.understood.length > 0 && (
              <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 px-3 pt-3 pb-1 text-xs">
                <span>{t.understood}:</span>
                {shown.understood.map((u) => (
                  <span
                    key={u}
                    className="bg-muted text-foreground rounded px-1.5 py-0.5"
                  >
                    {u}
                  </span>
                ))}
                {loading && <Loader2 className="size-3 animate-spin" />}
              </div>
            )}

            {shown && shown.suggestions.length > 0 && (
              <CommandGroup heading={t.suggestions}>
                {shown.suggestions.map((s) => (
                  <CommandItem
                    key={s.href + s.label}
                    value={`s-${s.href}-${s.label}`}
                    onSelect={() => go(s.href)}
                  >
                    {s.kind === "action" ? (
                      <Zap className="text-parcel" />
                    ) : (
                      <Boxes />
                    )}
                    <span className="flex-1">{s.label}</span>
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      {s.hint} <ArrowRight className="size-3" />
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {shown?.groups.map((g, gi) => {
              const Icon = GROUP_ICON[g.type] ?? Package;
              return (
                <div key={g.type}>
                  {(gi > 0 || shown.suggestions.length > 0) && (
                    <CommandSeparator />
                  )}
                  <CommandGroup heading={g.label}>
                    {g.items.map((h) => (
                      <CommandItem
                        key={g.type + h.href + h.title}
                        value={`${g.type}-${h.title}-${h.subtitle}`}
                        onSelect={() => go(h.href)}
                      >
                        <Icon />
                        <span className="min-w-0 flex-1">
                          <span
                            className={
                              g.type === "shipments" ||
                              g.type === "invoices" ||
                              g.type === "vehicles"
                                ? "font-mono text-[13px]"
                                : ""
                            }
                          >
                            {h.title}
                          </span>
                          {h.subtitle && (
                            <span className="text-muted-foreground block truncate text-xs">
                              {h.subtitle}
                            </span>
                          )}
                        </span>
                        {h.badge && (
                          <span className="bg-muted rounded px-1.5 py-0.5 text-[11px]">
                            {h.badge}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </div>
              );
            })}

            {shown &&
              !loading &&
              shown.suggestions.length === 0 &&
              shown.groups.length === 0 && (
                <CommandEmpty>{t.empty}</CommandEmpty>
              )}
          </CommandList>
          <div className="text-muted-foreground flex items-center justify-end gap-3 border-t px-3 py-2 text-[11px]">
            <span className="flex items-center gap-1">
              <CornerDownLeft className="size-3" /> {t.openView}
            </span>
            <span>esc</span>
          </div>
        </Command>
      </CommandDialog>
    </>
  );
}
