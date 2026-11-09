import "server-only";
import { cookies, headers } from "next/headers";
import { localizeError } from "@/i18n/errors-sw";
import { LOCALE_COOKIE } from "@/proxy";

/** The language of the portal page a server action was called from: its URL (/sw/…), else the saved choice. */
async function actionLocale(): Promise<string> {
  const ref = (await headers()).get("referer");
  if (ref) {
    try {
      const seg = new URL(ref).pathname.split("/")[1];
      if (seg === "sw" || seg === "en" || seg === "fr") return seg;
    } catch {
      // Not a URL: fall through.
    }
  }
  return (await cookies()).get(LOCALE_COOKIE)?.value ?? "en";
}

/** A server message (thrown in English) in the language of the page that asked. */
export async function tErr(message: string): Promise<string> {
  return localizeError(message, await actionLocale());
}
