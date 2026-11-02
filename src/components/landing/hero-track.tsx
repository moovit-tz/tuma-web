"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageSearch } from "lucide-react";
import { useI18n } from "@/i18n/client";

/** Hero tracking box. Sending is not offered on the landing page yet. */
export function HeroTrack() {
  const { dict: t, locale } = useI18n();
  const router = useRouter();
  const [wb, setWb] = useState("");
  return (
    <form
      className="border-sidebar-border w-full max-w-[520px] rounded-xl border bg-[#0e0e0e]/85 p-3 shadow-2xl backdrop-blur"
      onSubmit={(e) => {
        e.preventDefault();
        if (wb.trim()) router.push(`/${locale}/track?wb=${encodeURIComponent(wb.trim())}`);
      }}
    >
      <label htmlFor="hero-wb" className="text-sidebar-muted mb-2 flex items-center gap-2 px-1 font-mono text-[11px] tracking-[0.14em] uppercase">
        <PackageSearch className="text-brand-red size-4" aria-hidden /> {t.nav.track}
      </label>
      <div className="flex gap-2">
        <input
          id="hero-wb"
          value={wb}
          onChange={(e) => setWb(e.target.value)}
          placeholder={t.landing.trackPlaceholder}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="border-sidebar-border focus-visible:border-brand-red text-sidebar-foreground h-12 min-w-0 flex-1 rounded-md border bg-black/60 px-3 font-mono text-[16px] uppercase outline-none placeholder:normal-case"
        />
        <button className="bg-brand-red h-12 rounded-md px-6 font-medium text-black">{t.landing.trackCta}</button>
      </div>
    </form>
  );
}
