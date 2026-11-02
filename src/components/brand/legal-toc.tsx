"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Printer, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

type Labels = { document: string; updated: string; onThisPage: string; read: string; print: string; questions: string; contact: string };

/**
 * Legal sidebar: document details, reading progress, an "On this page" rail that follows the reader,
 * and actions. Never scrolls itself; only the document column does.
 */
export function LegalToc({
  docTitle,
  updated,
  sections,
  scrollId,
  locale,
  email,
  labels,
}: {
  docTitle: string;
  updated: string;
  sections: string[];
  scrollId: string;
  locale: string;
  email: string;
  labels: Labels;
}) {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const root = document.getElementById(scrollId);
    if (!root) return;
    const onScroll = () => {
      const top = root.getBoundingClientRect().top;
      let current = 0;
      sections.forEach((_, i) => {
        const el = document.getElementById(`s${i + 1}`);
        if (el && el.getBoundingClientRect().top - top < 120) current = i;
      });
      const max = root.scrollHeight - root.clientHeight;
      if (max > 0 && root.scrollTop >= max - 4) current = sections.length - 1;
      setActive(current);
      setProgress(max > 0 ? Math.min(1, root.scrollTop / max) : 1);
    };
    onScroll();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [scrollId, sections]);

  return (
    <div className="flex min-h-0 flex-col gap-5">
      {/* Document */}
      <div>
        <div className="eyebrow">{labels.document}</div>
        <div className="mt-1 font-semibold">{docTitle}</div>
        <div className="text-muted-foreground text-[12.5px]">
          {labels.updated} {updated}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="bg-border h-[3px] flex-1 overflow-hidden rounded-full" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={labels.read}>
            <div className="bg-parcel h-full rounded-full transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
          </div>
          <span className="text-muted-foreground w-9 text-right font-mono text-[11px] tabular-nums">{Math.round(progress * 100)}%</span>
        </div>
      </div>

      {/* On this page */}
      <nav aria-label={labels.onThisPage} className="min-h-0">
        <div className="eyebrow mb-2">{labels.onThisPage}</div>
        <ol className="border-border relative border-l">
          {sections.map((h, i) => {
            const on = active === i;
            return (
              <li key={h}>
                <a
                  href={`#s${i + 1}`}
                  aria-current={on ? "location" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(`s${i + 1}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={cn(
                    "relative -ml-px flex gap-2.5 rounded-none border-l-2 py-[5px] pl-3.5 text-[13px] leading-snug transition-colors [@media(max-height:720px)]:py-[3px]",
                    on ? "border-parcel text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:border-foreground/30 border-transparent",
                  )}
                >
                  <span className="w-4 shrink-0 font-mono text-[10.5px] leading-[1.9] opacity-60">{String(i + 1).padStart(2, "0")}</span>
                  {h}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Actions */}
      <div className="flex flex-col gap-2 border-t pt-4 text-[13px] [@media(max-height:760px)]:hidden">
        <button type="button" onClick={() => window.print()} className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-left">
          <Printer className="size-3.5" /> {labels.print}
        </button>
        <a href={`mailto:${email}`} className="text-muted-foreground hover:text-foreground flex items-center gap-2">
          <Mail className="size-3.5" /> {email}
        </a>
        <p className="text-muted-foreground">
          {labels.questions}{" "}
          <Link href={`/${locale}/contact`} className="text-foreground underline underline-offset-4">
            {labels.contact}
          </Link>
        </p>
      </div>
    </div>
  );
}
