"use client";
import { useRouter } from "next/navigation";
import { ChevronDown, Globe } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/client";
import type { AppLocale } from "@/domain/types";
import { cn } from "@/lib/utils";

const LANGS: { code: AppLocale; short: string; name: string }[] = [
  { code: "en", short: "EN", name: "English" },
  { code: "sw", short: "SW", name: "Kiswahili" },
  { code: "fr", short: "FR", name: "Français" },
];

function rememberLocale(l: string) {
  document.cookie = `tuma_locale=${l}; path=/; max-age=31536000; samesite=lax`;
}

/** Globe button showing the current language; opens a menu of EN, SW and FR. `dark` for black headers. */
export function LocaleSwitch({ className, dark }: { className?: string; dark?: boolean }) {
  const { locale, dict } = useI18n();
  const router = useRouter();
  const current = LANGS.find((l) => l.code === locale) ?? LANGS[0];
  const go = (l: AppLocale) => {
    if (l === locale) return;
    rememberLocale(l);
    router.push(window.location.pathname.replace(/^\/(en|sw|fr)(?=\/|$)/, `/${l}`) + window.location.search);
  };
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={`${dict.common.language}: ${current.name}`}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium transition-colors outline-none focus-visible:ring-2",
          dark ? "text-sidebar-foreground hover:bg-sidebar-foreground/[0.08] data-[state=open]:bg-sidebar-foreground/[0.08]" : "hover:bg-muted data-[state=open]:bg-muted",
          className,
        )}
      >
        <Globe className="size-[17px]" aria-hidden />
        <span className="font-mono text-[12px] tracking-wider">{current.short}</span>
        <ChevronDown className="size-3.5 opacity-60" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-44">
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">{dict.common.language}</DropdownMenuLabel>
        {LANGS.map((l) => (
          <DropdownMenuItem key={l.code} onSelect={() => go(l.code)} lang={l.code} aria-current={l.code === locale ? "true" : undefined} className="flex items-center gap-3 aria-[current]:font-semibold">
            <span className="text-muted-foreground w-6 font-mono text-[11px]">{l.short}</span>
            <span className="flex-1">{l.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
