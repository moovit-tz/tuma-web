import { NextResponse, type NextRequest } from "next/server";
import { COUNTRIES, COUNTRY_COOKIE } from "@/domain/countries";
import { IDLE_SECONDS, SESSION_COOKIE, signSession, verifySession } from "@/server/auth/session-token";

const LOCALES = ["en", "sw", "fr"];
const COUNTRY_CODES = new Set(COUNTRIES.map((x) => x.iso2));
export const LOCALE_COOKIE = "tuma_locale";

/**
 * 1. Paths without a locale are redirected to the user's language (cookie, then browser, then English).
 * 2. Optimistic auth check for /portal. Real authorization happens next to the data.
 * 3. Sliding idle timeout: an active session is re-issued for another 30 minutes (NFR-12).
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const first = pathname.split("/")[1];

  if (!LOCALES.includes(first)) {
    const cookie = req.cookies.get(LOCALE_COOKIE)?.value;
    const accept = req.headers.get("accept-language") ?? "";
    const locale = cookie && LOCALES.includes(cookie) ? cookie : /^sw\b/i.test(accept) ? "sw" : /^fr\b/i.test(accept) ? "fr" : "en";
    return NextResponse.redirect(new URL(`/${locale}${pathname === "/" ? "" : pathname}${search}`, req.url));
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  const area = pathname.split("/")[2];

  if (!session && area === "portal") {
    const url = new URL(`/${first}/signin`, req.url);
    url.searchParams.set("next", pathname + search);
    const res = NextResponse.redirect(url);
    if (token) res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  const res = NextResponse.next();
  // Remember an explicit country choice (?c=ke) for the next visit.
  const c = req.nextUrl.searchParams.get("c")?.toUpperCase();
  if (c && COUNTRY_CODES.has(c)) res.cookies.set(COUNTRY_COOKIE, c, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  if (session) {
    const { sat, ...claims } = session;
    res.cookies.set(SESSION_COOKIE, await signSession(claims, sat), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: IDLE_SECONDS,
    });
  }
  return res;
}

export const config = {
  // Everything except API routes, the stub IdP, Next internals and files with an extension.
  matcher: ["/((?!api|dev|_next/static|_next/image|.*\\..*).*)"],
};
