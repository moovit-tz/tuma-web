import { NextResponse, type NextRequest } from "next/server";
import { ondi, pkceChallenge, randomToken } from "@/server/adapters/ondi";
import { ondiRedirectUri } from "@/server/auth/ondi-redirect";

/** Starts the Ondi OIDC authorization code flow with PKCE (FR-IDN-01). */
export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get("locale") === "sw" ? "sw" : "en";
  const next = req.nextUrl.searchParams.get("next") ?? "";
  const state = randomToken(16);
  const verifier = randomToken(32);
  const redirectUri = ondiRedirectUri();
  const url = await ondi().authorizeUrl({ state, codeChallenge: await pkceChallenge(verifier), redirectUri });

  const res = NextResponse.redirect(url);
  const opts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 };
  res.cookies.set("tuma_oidc", JSON.stringify({ state, verifier, locale, next: next.startsWith("/") ? next : "" }), opts);
  return res;
}
