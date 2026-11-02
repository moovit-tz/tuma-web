"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TumaWordmark } from "./logo";
import { LocaleSwitch } from "@/components/shell/locale-switch";
import { cn } from "@/lib/utils";

export function PublicMobileMenu({ items, menuLabel, by }: { items: { href: string; label: string }[]; menuLabel: string; by: string }) {
  const [open, setOpen] = useState(false);
  // Read the path when the menu opens (usePathname here would need a Suspense boundary in the header).
  const [path, setPath] = useState("");
  const isActive = (href: string) => path === href || path.startsWith(href + "/");
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (o) setPath(window.location.pathname);
        setOpen(o);
      }}
    >
      <SheetTrigger className="hover:bg-sidebar-accent -mr-2 rounded-md p-2 md:hidden" aria-label={menuLabel}>
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="right" className="bg-sidebar text-sidebar-foreground border-sidebar-border w-72 p-5">
        <SheetTitle className="sr-only">{menuLabel}</SheetTitle>
        <TumaWordmark by={by} className="mb-8" />
        <nav className="flex flex-col gap-1">
          {items.map((i) => (
            <Link
              suppressHydrationWarning
              key={i.href}
              href={i.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(i.href) ? "page" : undefined}
              className={cn("hover:bg-sidebar-accent border-l-2 px-3 py-2.5 text-[15px]", isActive(i.href) ? "border-brand-red bg-sidebar-accent rounded-none font-medium" : "rounded-md border-transparent")}
            >
              {i.label}
            </Link>
          ))}
        </nav>
        <LocaleSwitch dark className="mt-8" />
      </SheetContent>
    </Sheet>
  );
}
