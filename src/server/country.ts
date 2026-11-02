import "server-only";
import { cookies, headers } from "next/headers";
import { COUNTRY_COOKIE, DEFAULT_COUNTRY, getCountry, type Country } from "@/domain/countries";

export type CountrySource = "chosen" | "location" | "language" | "default";

/**
 * Which country to show, Uber-style: an explicit choice (?c= or the saved cookie) wins, then the
 * visitor's location from the CDN/edge geo header, then the region in their browser language, then Tanzania.
 */
export async function detectCountry(param?: string): Promise<{ country: Country; source: CountrySource }> {
  const chosen = getCountry(param) ?? getCountry((await cookies()).get(COUNTRY_COOKIE)?.value);
  if (chosen) return { country: chosen, source: "chosen" };

  const h = await headers();
  const geo = getCountry(h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? h.get("cloudfront-viewer-country") ?? h.get("x-country-code"));
  if (geo) return { country: geo, source: "location" };

  for (const part of (h.get("accept-language") ?? "").split(",")) {
    const region = part.split(";")[0].trim().split("-")[1];
    const byLang = getCountry(region);
    if (byLang) return { country: byLang, source: "language" };
  }
  return { country: getCountry(DEFAULT_COUNTRY)!, source: "default" };
}
