import { TIME_ZONE } from "@/domain/types";

/** Request-time clock for server components (kept out of render bodies for the purity lint). */
export function nowMs() {
  return Date.now();
}

const tag = (locale: string) => (locale === "sw" ? "sw-TZ" : locale === "fr" ? "fr" : "en-TZ");

/** TZS has no minor unit in practice. */
export function money(amount: number | null | undefined, locale = "en") {
  if (amount === null || amount === undefined) return "—";
  return `${locale === "sw" ? "TSh" : "TZS"} ${new Intl.NumberFormat(tag(locale), { maximumFractionDigits: 0 }).format(amount)}`;
}

export function num(n: number, locale = "en") {
  return new Intl.NumberFormat(tag(locale)).format(n);
}

export function kg(grams: number, locale = "en") {
  return `${new Intl.NumberFormat(tag(locale), { maximumFractionDigits: 1 }).format(grams / 1000)} kg`;
}

/** FR-PLT-06: display in Africa/Dar_es_Salaam. */
export function dateTime(d: Date | string | null | undefined, locale = "en") {
  if (!d) return "—";
  return new Intl.DateTimeFormat(tag(locale), { timeZone: TIME_ZONE, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(d));
}

export function dateOnly(d: Date | string | null | undefined, locale = "en") {
  if (!d) return "—";
  return new Intl.DateTimeFormat(tag(locale), { timeZone: TIME_ZONE, weekday: "short", day: "numeric", month: "short" }).format(new Date(d));
}

export function percent(x: number | null, locale = "en") {
  if (x === null) return "—";
  return new Intl.NumberFormat(tag(locale), { style: "percent", maximumFractionDigits: 1 }).format(x);
}

export function relative(d: Date | string, locale = "en", now = Date.now()) {
  const diff = (new Date(d).getTime() - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat(tag(locale), { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}
