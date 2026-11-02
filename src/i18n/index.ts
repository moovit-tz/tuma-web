import en, { type Dict } from "./en";
import sw from "./sw";
import fr from "./fr";
import { DEFAULT_LOCALE, isLocale, type AppLocale } from "@/domain/types";

const DICTS: Record<AppLocale, Dict> = { en, sw, fr };

export function getDict(locale: string): Dict {
  return DICTS[isLocale(locale) ? locale : DEFAULT_LOCALE];
}

export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export type { Dict };
