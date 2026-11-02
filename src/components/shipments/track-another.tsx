"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, PackageSearch } from "lucide-react";
import { useI18n } from "@/i18n/client";

/** Compact "Track another parcel" box for the tracking result band. */
export function TrackAnother({ current }: { current?: string }) {
  const { dict: t, locale } = useI18n();
  const router = useRouter();
  const [wb, setWb] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const v = wb.trim();
        if (v && v.toUpperCase() !== current) router.push(`/${locale}/track?wb=${encodeURIComponent(v)}`);
      }}
      className="w-full max-w-sm rounded-xl border border-white/15 bg-black/70 p-2 backdrop-blur"
    >
      <label htmlFor="track-another" className="text-muted-foreground flex items-center gap-1.5 px-1.5 pb-1.5 font-mono text-[10.5px] tracking-[0.14em] uppercase">
        <PackageSearch className="size-3.5" aria-hidden /> {t.track.another}
      </label>
      <div className="flex gap-1.5">
        <input
          id="track-another"
          value={wb}
          onChange={(e) => setWb(e.target.value)}
          placeholder={t.landing.trackPlaceholder}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="focus-visible:border-ring h-9 min-w-0 flex-1 rounded-md border border-white/15 bg-black/60 px-2.5 font-mono text-sm uppercase outline-none placeholder:normal-case"
        />
        <button className="bg-brand-red grid size-9 shrink-0 place-items-center rounded-md text-black" aria-label={t.landing.trackCta}>
          <ArrowRight className="size-4" />
        </button>
      </div>
    </form>
  );
}
