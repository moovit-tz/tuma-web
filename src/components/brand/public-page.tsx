import { PublicFooter, PublicHeader } from "./public-header";

export function PublicPage({ locale, children, eyebrow, title, sub }: { locale: string; children: React.ReactNode; eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader locale={locale} />
      <div className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-10 sm:px-6 sm:pt-14">
          {eyebrow && <div className="text-brand-ink mb-2 font-mono text-[11px] tracking-[0.14em] uppercase">{eyebrow}</div>}
          <h1 className="font-display max-w-3xl text-[clamp(32px,5vw,52px)] leading-[1.02] font-bold tracking-[-0.025em] text-balance">{title}</h1>
          {sub && <p className="text-sidebar-muted mt-4 max-w-2xl text-[16px] leading-relaxed">{sub}</p>}
        </div>
      </div>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">{children}</main>
      <PublicFooter locale={locale} />
    </div>
  );
}
