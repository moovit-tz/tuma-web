/** Light, dark, or follow the device. Kept per browser (a viewer's convenience), applied to <html data-theme>. */
export type ThemePref = "light" | "dark" | "system";
export const THEME_KEY = "tuma.theme";

/**
 * Runs in <head> before the page paints, so a dark choice never flashes light: reads the choice, resolves "system"
 * from the device, sets data-theme, and keeps following the device while the choice is "system".
 */
export const THEME_SCRIPT = `(function(){try{var k="${THEME_KEY}",d=document.documentElement,m=matchMedia("(prefers-color-scheme: dark)");function a(){var p=null;try{p=localStorage.getItem(k)}catch(e){}if(p!=="light"&&p!=="dark")p=m.matches?"dark":"light";d.dataset.theme=p;d.style.colorScheme=p}a();m.addEventListener("change",a);window.__tumaTheme=a}catch(e){}})();`;

const listeners = new Set<() => void>();
let memory: ThemePref = "system";

export const themeStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    window.addEventListener("storage", cb);
    return () => {
      listeners.delete(cb);
      window.removeEventListener("storage", cb);
    };
  },
  get(): ThemePref {
    try {
      const v = localStorage.getItem(THEME_KEY);
      return v === "light" || v === "dark" ? v : "system";
    } catch {
      return memory;
    }
  },
  server: (): ThemePref => "system",
  set(p: ThemePref) {
    memory = p;
    try {
      if (p === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, p);
    } catch {}
    const w = window as unknown as { __tumaTheme?: () => void };
    if (w.__tumaTheme) w.__tumaTheme();
    else {
      const dark = p === "dark" || (p === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    }
    listeners.forEach((l) => l());
  },
};

/** What's showing now (system resolved). */
export function resolvedTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}
