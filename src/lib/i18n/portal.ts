"use client"

import { useLocale } from "next-intl"
import sw from "@/messages/portal/sw.json"

/*
 * Portal translations. The English text is the key: tr("Search agents…")
 * shows the Swahili from messages/portal/sw.json when the portal is in
 * Swahili, and the English itself when a line isn't translated yet, so
 * nothing ever shows a raw key. Values can be filled in: tr("{n} parcels", { n }).
 */
const DICTIONARIES: Record<string, Record<string, string>> = { sw }

export type TrValues = Record<string, string | number | null | undefined>
export type Tr = (text: string, values?: TrValues) => string

export function translate(locale: string, text: string, values?: TrValues): string {
    const out = DICTIONARIES[locale]?.[text] ?? text
    if (!values) return out
    return out.replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key] ?? "") : match))
}

/** Translator for the current portal language (reads context only, so it's safe anywhere in render) */
export function useTr(): Tr {
    const locale = useLocale()
    return (text, values) => translate(locale, text, values)
}
