"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LifeBuoy, MessageCircle, Phone, Mail, PackageSearch, Send, X, ChevronRight } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { SUPPORT } from "@/config/support";
import { cn } from "@/lib/utils";

/** Floating help button with quick tracking and support channels (public pages only). */
export function SupportWidget() {
  const { dict: t, locale } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [wb, setWb] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const row = "hover:bg-muted flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors";
  return (
    <div className="fixed right-4 bottom-4 z-50 print:hidden sm:right-6 sm:bottom-6">
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t.widget.title}
          className="bg-popover text-popover-foreground animate-in fade-in slide-in-from-bottom-2 absolute right-0 bottom-16 w-[min(92vw,340px)] overflow-hidden rounded-xl border shadow-2xl"
        >
          <div className="bg-sidebar text-sidebar-foreground px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-display text-lg font-semibold">{t.widget.title}</div>
                <div className="text-sidebar-muted mt-0.5 text-xs">
                  {t.widget.hours}: {SUPPORT.hours[locale]}
                </div>
              </div>
              <button onClick={() => setOpen(false)} aria-label={t.widget.close} className="hover:bg-sidebar-accent -mt-1 -mr-1 rounded p-1">
                <X className="size-4" />
              </button>
            </div>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!wb.trim()) return;
                setOpen(false);
                router.push(`/${locale}/track?wb=${encodeURIComponent(wb.trim())}`);
              }}
            >
              <label htmlFor="widget-wb" className="sr-only">
                {t.widget.trackTitle}
              </label>
              <input
                id="widget-wb"
                value={wb}
                onChange={(e) => setWb(e.target.value)}
                placeholder={t.landing.trackPlaceholder}
                autoCapitalize="characters"
                spellCheck={false}
                className="border-sidebar-border focus-visible:border-brand-red h-9 min-w-0 flex-1 rounded-md border bg-field px-3 font-mono text-sm uppercase outline-none placeholder:normal-case"
              />
              <button className="bg-brand-red h-9 rounded-md px-3 text-sm font-medium text-black" aria-label={t.landing.trackCta}>
                <PackageSearch className="size-4" />
              </button>
            </form>
          </div>
          <div className="p-2">
            <a suppressHydrationWarning href={SUPPORT.whatsappHref} target="_blank" rel="noopener" className={row}>
              <MessageCircle className="text-ok size-4" /> {t.widget.whatsapp}
              <span className="text-muted-foreground ml-auto font-mono text-xs">{SUPPORT.whatsapp}</span>
            </a>
            <a suppressHydrationWarning href={SUPPORT.phoneHref} className={row}>
              <Phone className="size-4" /> {t.widget.call}
              <span className="text-muted-foreground ml-auto font-mono text-xs">{SUPPORT.phone}</span>
            </a>
            <a href={`mailto:${SUPPORT.email}`} className={row}>
              <Mail className="size-4" /> {t.widget.email}
              <span className="text-muted-foreground ml-auto text-xs">{SUPPORT.email}</span>
            </a>
            <div className="my-1 border-t" />
            <Link suppressHydrationWarning href={`/${locale}/report-lost-item`} onClick={() => setOpen(false)} className={row}>
              <PackageSearch className="text-parcel size-4" /> {t.widget.lost}
              <ChevronRight className="text-muted-foreground ml-auto size-4" />
            </Link>
            <Link suppressHydrationWarning href={`/${locale}/contact`} onClick={() => setOpen(false)} className={row}>
              <Send className="size-4" /> {t.widget.contact}
              <ChevronRight className="text-muted-foreground ml-auto size-4" />
            </Link>
          </div>
        </div>
      )}
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? t.widget.close : t.widget.title}
        className={cn(
          "bg-brand-red flex h-12 items-center gap-2 rounded-full px-4 font-medium text-black shadow-lg ring-4 ring-black/20 transition-transform hover:scale-[1.03]",
          open && "bg-sidebar text-sidebar-foreground ring-white/10",
        )}
      >
        {open ? <X className="size-5" /> : <LifeBuoy className="size-5" />}
        <span className="text-sm">{t.widget.open}</span>
      </button>
    </div>
  );
}
