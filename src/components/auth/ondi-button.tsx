import { cn } from "@/lib/utils";

/** "Continue with Ondi": Ondi's sign-in button, white with Ondi's mark, the same as in the Tuma app. */
export function OndiButton({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a
      href={href}
      className={cn(
        "flex h-12 items-center justify-center gap-2.5 rounded-md border border-black/15 bg-white px-6 dark:border-white/20 dark:shadow-none text-[15px] font-semibold text-neutral-900 shadow-sm transition-colors hover:bg-neutral-50",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a small static SVG mark */}
      <img src="/ondi-icon.svg" alt="" width={22} height={22} className="size-[22px]" />
      {children}
    </a>
  );
}
