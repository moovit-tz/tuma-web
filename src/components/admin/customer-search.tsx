"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Search, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/client";
import { searchCustomersAction } from "@/app/actions/admin";
import { cn } from "@/lib/utils";

export type CustomerHit = { key: string; name: string | null; phone: string | null; kind: "user" | "party"; note: string | null };

/**
 * Search by phone, name, email or waybill. The term goes to a server action, never into the URL; results link to the
 * customer 360 by an opaque key. With `onPick`, picking returns the hit instead (wallet adjustment).
 */
export function CustomerSearch({ locale, onPick, usersOnly, className }: { locale: string; onPick?: (h: CustomerHit) => void; usersOnly?: boolean; className?: string }) {
  const { dict: t } = useI18n();
  const s = t.admin.support;
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<CustomerHit[] | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) return;
    const id = setTimeout(
      () =>
        start(async () => {
          const r = await searchCustomersAction(term);
          setHits(r.ok ? (r.data ?? []).filter((h) => !usersOnly || h.kind === "user") : []);
        }),
      300,
    );
    return () => clearTimeout(id);
  }, [q, usersOnly]);
  const show = q.trim().length >= 3 ? hits : null;
  return (
    <div className={cn("relative", className)}>
      <Search aria-hidden className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={s.searchHint} aria-label={s.search} className="pl-9" autoComplete="off" />
      {show && (
        <div className="bg-popover absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-md border p-1 shadow-lg">
          {pending && !show.length ? (
            <p className="text-muted-foreground px-3 py-2 text-sm">{s.searching}</p>
          ) : show.length === 0 ? (
            <p className="text-muted-foreground px-3 py-2 text-sm">{s.searchNone}</p>
          ) : (
            show.map((h) => {
              const inner = (
                <>
                  <UserRound aria-hidden className="text-muted-foreground size-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{h.name ?? "—"}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {[h.phone, h.note].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="text-muted-foreground shrink-0 text-[11px]">{h.kind === "user" ? s.onTuma : s.notOnTuma}</span>
                </>
              );
              const cls = "hover:bg-muted flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm";
              return onPick ? (
                <button
                  key={h.key}
                  type="button"
                  className={cls}
                  onClick={() => {
                    onPick(h);
                    setQ("");
                    setHits(null);
                  }}
                >
                  {inner}
                </button>
              ) : (
                <Link key={h.key} href={`/${locale}/portal/admin/support/customer?key=${encodeURIComponent(h.key)}`} className={cls}>
                  {inner}
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
