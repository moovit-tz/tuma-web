import { AppLocale } from "@/domain/types";
import { PublicFooter, PublicHeader } from "./public-header";
import { MapBackdrop } from "@/components/map/map-backdrop";
import { cn } from "@/lib/utils";

/**
 * The Terms-page layout, shared by Terms, Privacy, Track, Contact and Report lost item:
 *  navbar · dark title band with the trade-corridor map cropped on the right · fixed sidebar · scrolling main column · footer.
 * On large screens the page itself never scrolls; only the main column does (with a hidden scrollbar). On phones the
 * whole page scrolls as one (a nested scroll area traps the thumb).
 */
export function BandLayout({
  locale,
  eyebrow,
  title,
  sub,
  meta,
  bandAside,
  country,
  sidebar,
  sidebarOnMobile = true,
  scrollId = "band-scroll",
  children,
}: {
  locale: AppLocale;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  meta?: React.ReactNode;
  /** Shown on the right of the band (e.g. "Track another"). */
  bandAside?: React.ReactNode;
  country?: string;
  sidebar?: React.ReactNode;
  sidebarOnMobile?: boolean;
  scrollId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <PublicHeader locale={locale} />
      <PageBand
        locale={locale}
        eyebrow={eyebrow}
        title={title}
        sub={sub}
        meta={meta}
        aside={bandAside}
        country={country}
      />
      <div
        className={cn(
          "mx-auto grid w-full max-w-6xl flex-1 lg:min-h-0",
          sidebar && "lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12",
        )}
      >
        {sidebar && (
          <aside
            className={cn(
              "order-2 min-h-0 flex-col px-4 pb-8 sm:px-6 lg:order-1 lg:flex lg:py-6 lg:pr-0 lg:pl-6",
              sidebarOnMobile ? "flex" : "hidden",
            )}
          >
            {sidebar}
          </aside>
        )}
        <div
          id={scrollId}
          className={cn(
            "no-scrollbar order-1 px-4 py-6 sm:px-6 lg:order-2 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain",
            sidebar && "lg:pl-0",
          )}
        >
          {children}
        </div>
      </div>
      <PublicFooter locale={locale} />
    </div>
  );
}

export function PageBand({
  locale,
  eyebrow,
  title,
  sub,
  meta,
  aside,
  country,
}: {
  locale: AppLocale;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  meta?: React.ReactNode;
  aside?: React.ReactNode;
  country?: string;
}) {
  return (
    <div className="theme-dark relative shrink-0 overflow-hidden border-b">
      <MapBackdrop locale={locale} side="band" country={country} className="hidden lg:block" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:flex-row lg:items-end lg:justify-between [@media(max-height:760px)]:py-5">
        <div className="min-w-0">
          {eyebrow && (
            <div className="text-brand-red mb-2 font-mono text-[11px] tracking-[0.14em] uppercase">
              {eyebrow}
            </div>
          )}
          <h1 className="font-display max-w-3xl text-[clamp(28px,min(4.4vw,6vh),46px)] leading-[1.02] font-bold tracking-[-0.03em] text-balance">
            {title}
          </h1>
          {sub && (
            <p className="text-muted-foreground mt-2 max-w-2xl text-[15px] leading-relaxed">
              {sub}
            </p>
          )}
          {meta && (
            <div className="text-muted-foreground mt-2 font-mono text-[11.5px] tracking-[0.1em] uppercase">
              {meta}
            </div>
          )}
        </div>
        {aside && <div className="shrink-0 lg:w-[340px]">{aside}</div>}
      </div>
    </div>
  );
}

/** Sidebar card used across band pages. */
export function SideCard({
  title,
  children,
  footer,
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="bg-card flex min-h-0 flex-col rounded-xl border">
      {title && <div className="eyebrow border-b px-4 py-2.5">{title}</div>}
      <div className="min-h-0 p-4">{children}</div>
      {footer && (
        <div className="text-muted-foreground border-t px-4 py-3 text-[12.5px]">
          {footer}
        </div>
      )}
    </div>
  );
}
