"use client";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type HoverCountry = {
  iso2: string;
  name: string;
  blocs: string[];
  cities: string[];
  currency: string;
  dial: string;
  coords: string;
};

/**
 * Wraps the server-rendered region map. Hovering or focusing a member state (any element with
 * data-iso) highlights it and shows its name beside the cursor.
 */
export function MapHover({ countries, children }: { countries: Record<string, HoverCountry>; children: React.ReactNode }) {
  const [iso, setIso] = useState<string | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; flip: boolean } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const active = useRef<Element | null>(null);

  const pick = useCallback((target: EventTarget | null) => {
    const el = (target as Element | null)?.closest?.("[data-iso]") ?? null;
    if (el === active.current) return el;
    active.current?.removeAttribute("data-active");
    el?.setAttribute("data-active", "");
    active.current = el;
    setIso(el?.getAttribute("data-iso") ?? null);
    return el;
  }, []);


  return (
    <div
      ref={box}
      className="absolute inset-0"
      onPointerMove={(e) => {
        const el = pick(e.target);
        const r = box.current!.getBoundingClientRect();
        const x = e.clientX - r.left;
        setTip(el ? { x, y: e.clientY - r.top, flip: x > r.width * 0.5 } : null);
      }}
      onPointerLeave={() => {
        pick(null);
        setTip(null);
      }}
      onFocus={(e) => pick(e.target)}
      onBlur={() => pick(null)}
    >
      {children}

      {/* Name label next to the cursor */}
      {tip && iso && (
        <div
          className={cn(
            "pointer-events-none absolute z-10 -translate-y-full rounded-md border border-white/15 bg-black/85 px-2.5 py-1 font-mono text-[11px] tracking-[0.08em] whitespace-nowrap text-[#f2f0ea] uppercase backdrop-blur",
            tip.flip && "-translate-x-full",
          )}
          data-tip
          style={{ left: tip.flip ? tip.x - 14 : tip.x + 14, top: tip.y - 8 }}
        >
          {countries[iso].name}
          <span className="text-sidebar-muted ml-2">{countries[iso].blocs.join(" + ")}</span>

        </div>
      )}

    </div>
  );
}
