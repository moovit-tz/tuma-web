import { NextResponse, type NextRequest } from "next/server";
import { ondi, pkceChallenge, randomToken } from "@/server/adapters/ondi";

/** Starts the Ondi OIDC authorization code flow with PKCE (FR-IDN-01). */
export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get("locale") === "sw" ? "sw" : "en";
  const next = req.nextUrl.searchParams.get("next") ?? "";
  const state = randomToken(16);
  const verifier = randomToken(32);
  const redirectUri = new URL("/api/auth/callback", process.env.APP_URL).toString();
  const url = ondi().authorizeUrl({ state, codeChallenge: await pkceChallenge(verifier), redirectUri });

  const res = NextResponse.redirect(url);
  const opts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/api/auth", maxAge: 600 };
  res.cookies.set("tuma_oidc", JSON.stringify({ state, verifier, locale, next: next.startsWith("/") ? next : "" }), opts);
  return res;
}
