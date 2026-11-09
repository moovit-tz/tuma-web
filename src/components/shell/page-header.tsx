import Link from "next/link";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The top of a page, as a Tuma header: the brand's black band with the region map fading in from the right (the same
 * header as the app and the public pages). An optional way back, a small eyebrow, the title with an optional badge,
 * a line on what the page is for, and its actions. The band always uses the dark palette (`theme-dark`), so buttons
 * and text inside keep AA contrast in light and dark mode. On phones the actions drop below the title and share the
 * width; on wider screens they sit to the right.
 */
export function PageHeader({
  eyebrow,
  title,
  children,
  description,
  back,
  badge,
  icon: Icon,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  back?: { href: string; label: string };
  badge?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <header className="theme-dark relative mb-6 overflow-hidden rounded-xl border print:border-0 print:bg-transparent print:text-black">
      {/* eslint-disable-next-line @next/next/no-img-element -- a decorative SVG, no optimisation needed */}
      <img
        src="/maps/region-base.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-0 h-[260%] w-auto max-w-none -translate-y-[38%] opacity-70 select-none [mask-image:linear-gradient(to_right,transparent_0%,black_45%)] max-sm:opacity-35 print:hidden"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(0,0,0,0.85),transparent_60%)] print:hidden" />
      <div className="relative px-5 py-5 sm:px-7 sm:py-6">
        {back && (
          <Link href={back.href} className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm outline-none focus-visible:underline print:hidden">
            <ChevronLeft className="size-4" aria-hidden /> {back.label}
          </Link>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            {Icon && (
              <span aria-hidden className="bg-brand-red/15 text-brand-ink mt-1 hidden size-11 shrink-0 place-items-center rounded-lg border border-white/10 sm:grid">
                <Icon className="size-5" />
              </span>
            )}
            <div className="min-w-0">
              {eyebrow && <div className="text-brand-tan mb-1 font-mono text-[11px] tracking-[0.14em] uppercase">{eyebrow}</div>}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h2 className="font-display min-w-0 text-[24px] leading-tight font-bold tracking-[-0.02em] break-words sm:text-[30px]">{title}</h2>
                {badge}
              </div>
              {description && <p className="text-muted-foreground mt-1.5 max-w-2xl text-sm text-pretty">{description}</p>}
            </div>
          </div>
          {children && <div className="flex flex-wrap items-center gap-2 *:max-sm:flex-1 print:hidden">{children}</div>}
        </div>
      </div>
    </header>
  );
}

/**
 * A figure on a light card: the label with a small icon, the number, and a line on what it counts. `tone` marks a
 * figure that needs attention with a coloured dot beside the label; the number stays in the text colour.
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
      <div className="flex items-start justify-between gap-3">
        <div className="text-muted-foreground flex min-w-0 items-center gap-2 text-[13px] font-medium">
          <span className="line-clamp-2 leading-snug">{label}</span>
          {tone && <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", tone === "bad" ? "bg-brand-red" : tone === "warn" ? "bg-amber-500" : "bg-emerald-500")} />}
        </div>
        {Icon && (
          <span aria-hidden className="bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-md">
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <div className="font-display tabular mt-2 text-[clamp(20px,5.6vw,28px)] leading-tight font-semibold tracking-tight break-words">{value}</div>
      {hint && <div className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-snug">{hint}</div>}
    </>
  );
  const cls = "bg-card text-card-foreground relative block h-full rounded-lg border p-4 shadow-xs sm:p-5";
  return href ? (
    <Link href={href} className={cn(cls, "hover:border-foreground/25 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/**
 * Card with an optional header row: title, description and an action at the right. With `banner` the header also shows
 * the panel's icon.
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
      {(title || action) && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            {banner && Icon && <Icon aria-hidden className="text-muted-foreground size-4 shrink-0" />}
            <div className="min-w-0">
              <h3 className="text-[15px] leading-tight font-semibold">{title}</h3>
              {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      {fill ? <div className="panel-fill min-h-0 flex-1 overflow-auto">{children}</div> : children}
      {footer && <div className="shrink-0 border-t">{footer}</div>}
    </section>
  );
}

/** "View all" link in a panel header: quiet, so it doesn't compete with the page's main action. */
export function BannerLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded text-[13px] font-medium outline-none focus-visible:ring-2">
      {children}
      <ChevronRight className="size-3.5" aria-hidden />
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
              <span className={cn("tabular rounded-full px-1.5 text-[11px] leading-[18px]", i.active ? "bg-brand-red text-black" : "bg-muted")}>{i.count}</span>
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
            <span className={cn(btn, "text-muted-foreground border border-dashed cursor-not-allowed")}>← {labels.previous}</span>
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
            <span className={cn(btn, "text-muted-foreground border border-dashed cursor-not-allowed")}>{labels.next} →</span>
          )}
        </div>
      )}
    </nav>
  );
}
