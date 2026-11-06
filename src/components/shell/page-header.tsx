import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, children, description }: { eyebrow?: string; title: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h2 className="font-display text-[26px] leading-tight font-bold tracking-[-0.02em] text-balance sm:text-[30px]">{title}</h2>
        {description && <p className="text-muted-foreground mt-1 max-w-2xl text-sm">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/**
 * KPI card from the parcel portal: dark surface, white figure, the icon as a faint watermark.
 * Every card uses the same brand red for its icon. `tone` marks a figure that needs attention with a dot;
 * the figure itself stays white.
 */
export function Stat({
  label,
  value,
  hint,
  tone,
  href,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "warn" | "bad" | "ok";
  href?: string;
  icon?: LucideIcon;
}) {
  const body = (
    <>
      {Icon && <Icon aria-hidden strokeWidth={1.5} className="text-brand-red pointer-events-none absolute -right-4 -bottom-4 size-24 rotate-12 opacity-[0.08]" />}
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sidebar-foreground/60 flex min-w-0 items-center gap-2 text-sm font-medium">
            <span className="line-clamp-2 leading-snug sm:truncate">{label}</span>
            {(tone === "bad" || tone === "warn") && <span aria-hidden className={cn("size-2 shrink-0 rounded-full", tone === "bad" ? "bg-brand-red" : "bg-amber-400")} />}
          </div>
          {Icon && (
            <span className="hidden size-10 shrink-0 place-items-center rounded-md bg-white/[0.07] sm:grid">
              <Icon aria-hidden className="text-brand-red size-5" />
            </span>
          )}
        </div>
        <div className="font-display tabular mt-3 text-[clamp(22px,6.4vw,32px)] leading-none font-semibold tracking-tight break-words text-white">{value}</div>
        {hint && <div className="mt-2.5 truncate text-[13px] text-white/45" title={hint}>{hint}</div>}
      </div>
    </>
  );
  const cls = "bg-sidebar text-sidebar-foreground relative block h-full overflow-hidden rounded-lg p-5 shadow-sm dark:ring-1 dark:ring-white/[0.07]";
  return href ? (
    <Link href={href} className={cn(cls, "hover:bg-sidebar/90 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/**
 * Card. With `banner`, the header is the parcel portal's dark banner (title, description, action, icon watermark);
 * otherwise a plain header row.
 */
export function Panel({
  title,
  description,
  action,
  children,
  className,
  banner,
  icon: Icon,
  fill,
  footer,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  banner?: boolean;
  icon?: LucideIcon;
  /** Take the height the layout gives it and scroll the body inside (dashboard). */
  fill?: boolean;
  /** Stays at the bottom of the card, outside the scrolling body (e.g. pagination). */
  footer?: React.ReactNode;
}) {
  return (
    <section className={cn("bg-card overflow-hidden rounded-lg border shadow-sm", fill && "flex min-h-0 flex-col", className)}>
      {(title || action) &&
        (banner ? (
          <div className="bg-sidebar text-sidebar-foreground relative shrink-0 overflow-hidden px-5 py-4">
            {Icon && <Icon aria-hidden strokeWidth={1.25} className="pointer-events-none absolute top-1/2 right-6 size-20 -translate-y-1/2 opacity-[0.07]" />}
            <div className="relative flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-bold">{title}</h3>
                {description && <p className="text-sidebar-foreground/50 mt-0.5 text-[13px]">{description}</p>}
              </div>
              {action}
            </div>
          </div>
        ) : (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
            <h3 className="text-[15px] font-semibold">{title}</h3>
            {action}
          </div>
        ))}
      {fill ? <div className="panel-fill min-h-0 flex-1 overflow-auto">{children}</div> : children}
      {footer && <div className="shrink-0 border-t">{footer}</div>}
    </section>
  );
}

/** "View all" style link for a banner panel. */
export function BannerLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="bg-brand-red hover:bg-brand-red/90 inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-[13px] font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-white/60">
      {children}
    </Link>
  );
}

/**
 * Tab bar that stays under the top bar while the page scrolls (parcel portal "sticky tabs").
 * Tabs are links, so each view has its own URL. `aside` sits at the right of the bar (e.g. a search box).
 */
export function PageTabs({ label, items, aside, className }: { label: string; items: { href: string; label: React.ReactNode; active: boolean; count?: number }[]; aside?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("portal-sticky-tabs mb-5 flex flex-col gap-3 border-b sm:flex-row sm:items-end sm:justify-between", className)}>
      <nav aria-label={label} className="no-scrollbar -mb-px flex overflow-x-auto">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={i.active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm whitespace-nowrap outline-none transition-colors focus-visible:bg-muted",
              i.active ? "border-brand-red text-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:border-foreground/25 border-transparent",
            )}
          >
            {i.label}
            {i.count !== undefined && (
              <span className={cn("tabular rounded-full px-1.5 text-[11px] leading-[18px]", i.active ? "bg-brand-red text-white" : "bg-muted")}>{i.count}</span>
            )}
          </Link>
        ))}
      </nav>
      {aside && <div className="pb-2.5">{aside}</div>}
    </div>
  );
}

/**
 * Pagination bar: "Showing 26–50 of 213", previous/next, and a short run of page numbers with the first and last.
 * `hrefFor(page)` builds each link so the page keeps its other filters.
 */
export function Pager({
  page,
  pages,
  total,
  size,
  hrefFor,
  labels,
}: {
  page: number;
  pages: number;
  total: number;
  size: number;
  hrefFor: (page: number) => string;
  labels: { showing: string; previous: string; next: string; page: string };
}) {
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(total, page * size);
  const near = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const list = [...near].sort((a, b) => a - b);
  const btn = "inline-grid h-8 min-w-8 place-items-center rounded-md px-2 text-[13px] font-medium outline-none focus-visible:ring-2";
  return (
    <nav aria-label={labels.page} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
      <p className="text-muted-foreground tabular text-[13px]">{labels.showing.replace("{from}", String(from)).replace("{to}", String(to)).replace("{total}", String(total))}</p>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} className={cn(btn, "hover:bg-muted border")} rel="prev">
              ← {labels.previous}
            </Link>
          ) : (
            <span className={cn(btn, "text-muted-foreground/50 border")}>← {labels.previous}</span>
          )}
          {list.map((n, i) => (
            <span key={n} className="flex items-center gap-1">
              {i > 0 && n - list[i - 1] > 1 && <span className="text-muted-foreground px-1">…</span>}
              <Link href={hrefFor(n)} aria-current={n === page ? "page" : undefined} className={cn(btn, "tabular", n === page ? "bg-sidebar text-white" : "hover:bg-muted")}>
                {n}
              </Link>
            </span>
          ))}
          {page < pages ? (
            <Link href={hrefFor(page + 1)} className={cn(btn, "hover:bg-muted border")} rel="next">
              {labels.next} →
            </Link>
          ) : (
            <span className={cn(btn, "text-muted-foreground/50 border")}>{labels.next} →</span>
          )}
        </div>
      )}
    </nav>
  );
}
