"use client";
import { createContext, use } from "react";
import type { Dict } from "./en";
import type { AppLocale } from "@/domain/types";

const Ctx = createContext<{ dict: Dict; locale: AppLocale } | null>(null);

export function I18nProvider({ dict, locale, children }: { dict: Dict; locale: AppLocale; children: React.ReactNode }) {
  return <Ctx value={{ dict, locale }}>{children}</Ctx>;
}

export function useI18n() {
  const v = use(Ctx);
  if (!v) throw new Error("useI18n must be used inside I18nProvider");
  return v;
}

/** The dictionary when one is provided, else null: for shared UI that also renders outside the provider. */
export function useI18nMaybe() {
  return use(Ctx);
}
