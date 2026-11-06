import { NextResponse, type NextRequest } from "next/server";
import { ondi, pkceChallenge, randomToken } from "@/server/adapters/ondi";
import { allowedAppRedirect } from "@/server/services/drivers";
import { apiError } from "@/server/http/driver-api";

/**
 * Tuma-X sign-in, step 1. The app opens this in its secure browser tab with its own redirect_uri, state and
 * code_challenge (S256). We start Ondi's authorization code + PKCE flow and remember the app's side in a cookie.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const appRedirect = allowedAppRedirect(sp.get("redirect_uri"));
  const appState = sp.get("state") ?? "";
  const appChallenge = sp.get("code_challenge") ?? "";
  if (!appRedirect) return apiError("BAD_REDIRECT", "Unknown redirect_uri.", 400);
  if (!/^[\w-]{16,128}$/.test(appState) || !/^[\w-]{43}$/.test(appChallenge) || (sp.get("code_challenge_method") ?? "S256") !== "S256") {
    return apiError("BAD_REQUEST", "state and an S256 code_challenge are required.", 400);
  }
  const state = randomToken(16);
  const verifier = randomToken(32);
  const url = await ondi().authorizeUrl({ state, codeChallenge: await pkceChallenge(verifier), redirectUri: new URL("/api/driver/auth/callback", process.env.APP_URL).toString() });
  const res = NextResponse.redirect(url);
  res.cookies.set("tumax_oidc", JSON.stringify({ state, verifier, appRedirect, appState, appChallenge }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/driver/auth",
    maxAge: 600,
  });
  return res;
}
