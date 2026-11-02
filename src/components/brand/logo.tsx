import { cn } from "@/lib/utils";

/** Tuma mark from the SRS: red stroke for Parcel, tan stroke for Cargo, on black. */
export function TumaMark({ className, framed = true }: { className?: string; framed?: boolean }) {
  return (
    <svg viewBox="0 0 1080 1011" role="img" aria-label="Tuma" className={cn("block", className)}>
      {framed && <rect width="1080" height="1011" rx="120" fill="#000" />}
      <line x1="152" y1="787" x2="680" y2="215" stroke="#FF4545" strokeWidth="162" strokeLinecap="round" />
      <line x1="620" y1="787" x2="928" y2="455" stroke="#A59B87" strokeWidth="162" strokeLinecap="round" />
    </svg>
  );
}

export function TumaWordmark({ by, className }: { by?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <TumaMark className="size-9 shrink-0" />
      <div className="leading-none">
        <div className="font-display text-[22px] font-bold tracking-[-0.02em]">Tuma</div>
        {by && <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] opacity-60">{by}</div>}
      </div>
    </div>
  );
}
