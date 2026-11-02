export type ChargeLine = { code: string; label: string; amount: number };

export type AppLocale = "en" | "sw" | "fr";
export const LOCALES: AppLocale[] = ["en", "sw", "fr"];
export const DEFAULT_LOCALE: AppLocale = "en";
export const TIME_ZONE = "Africa/Dar_es_Salaam";

export function isLocale(x: string | undefined | null): x is AppLocale {
  return x === "en" || x === "sw" || x === "fr";
}

/** Route param → supported locale (English when unknown). */
export function asLocale(x: string | undefined | null): AppLocale {
  return isLocale(x) ? x : "en";
}
