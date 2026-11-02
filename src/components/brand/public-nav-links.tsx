"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Main navigation with the current page marked (aria-current + red underline). */
export function PublicNavLinks({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <>
      {items.map((n) => {
        const active = pathname === n.href || pathname.startsWith(n.href + "/");
        return (
          <Link
            key={n.href}
            href={n.href}
            suppressHydrationWarning
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative rounded-md px-3 py-2 text-[14px] transition-colors",
              active ? "text-sidebar-foreground font-medium" : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
            )}
          >
            {n.label}
            <span aria-hidden className={cn("bg-brand-red absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full transition-opacity", active ? "opacity-100" : "opacity-0")} />
          </Link>
        );
      })}
    </>
  );
}
