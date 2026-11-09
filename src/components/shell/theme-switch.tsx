"use client";
import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/client";
import { themeStore, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function useThemePref() {
  return useSyncExternalStore(themeStore.subscribe, themeStore.get, themeStore.server);
}

const ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

/** Top-bar theme button: light, dark, or follow the device. The icon shows the current choice. */
export function ThemeSwitch({ className }: { className?: string }) {
  const { dict: t } = useI18n();
  const pref = useThemePref();
  const Icon = ICONS[pref];
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={t.shell.theme}
        title={t.shell.theme}
        className={cn("hover:bg-muted data-[state=open]:bg-muted grid size-10 shrink-0 place-items-center rounded-md border outline-none focus-visible:ring-2", className)}
      >
        <Icon className="size-[18px]" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-48">
        <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">{t.shell.theme}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={pref} onValueChange={(v) => themeStore.set(v as ThemePref)}>
          {(["light", "dark", "system"] as const).map((k) => {
            const I = ICONS[k];
            return (
              <DropdownMenuRadioItem key={k} value={k} className="gap-2.5">
                <I className="size-4" aria-hidden /> {t.shell.themes[k]}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The same choice as three segments, for the phone menu (on the dark sidebar). */
export function ThemeSegments() {
  const { dict: t } = useI18n();
  const pref = useThemePref();
  return (
    <div role="radiogroup" aria-label={t.shell.theme} className="grid grid-cols-3 gap-1 rounded-md bg-sidebar-foreground/[0.06] p-1">
      {(["light", "dark", "system"] as const).map((k) => {
        const I = ICONS[k];
        const on = pref === k;
        return (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => themeStore.set(k)}
            className={cn("flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium outline-none focus-visible:ring-2", on ? "bg-sidebar-foreground/[0.14] text-sidebar-foreground" : "text-sidebar-foreground/60 hover:text-sidebar-foreground")}
          >
            <I className="size-3.5" aria-hidden /> {t.shell.themes[k]}
          </button>
        );
      })}
    </div>
  );
}
