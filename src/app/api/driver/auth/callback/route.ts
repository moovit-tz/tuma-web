import { NextResponse, type NextRequest } from "next/server";
import { ondi } from "@/server/adapters/ondi";
import { finishDriverLogin } from "@/server/services/drivers";
import { DomainError } from "@/server/services/shipments";

/**
 * Tuma-X sign-in, step 2. Ondi returns here; we exchange its code, refresh the user and send the app a one-time
 * code on its redirect URI (with the app's state). Errors go back to the app too, as ?error=.
 */
export async function GET(req: NextRequest) {
  const raw = req.cookies.get("tumax_oidc")?.value;
  let flow: { state: string; verifier: string; appRedirect: string; appState: string; appChallenge: string } | null = null;
  try {
    flow = raw ? JSON.parse(raw) : null;
  } catch {}
  if (!flow) return new NextResponse("Sign-in expired. Go back to Tuma-X and try again.", { status: 400 });

  const back = (q: Record<string, string>) => {
    const u = new URL(flow!.appRedirect);
    for (const [k, v] of Object.entries({ ...q, state: flow!.appState })) u.searchParams.set(k, v);
    const res = NextResponse.redirect(u.toString());
    res.cookies.delete({ name: "tumax_oidc", path: "/api/driver/auth" });
    return res;
  };
  const sp = req.nextUrl.searchParams;
  if (sp.get("error")) return back({ error: sp.get("error")! });
  if (!sp.get("code") || sp.get("state") !== flow.state) return back({ error: "state" });

  try {
    const claims = await ondi().exchangeCode({ code: sp.get("code")!, codeVerifier: flow.verifier, state: flow.state, redirectUri: new URL("/api/driver/auth/callback", process.env.APP_URL).toString() });
    return back({ code: await finishDriverLogin(claims, flow.appChallenge) });
  } catch (e) {
    return back({ error: e instanceof DomainError ? e.code.toLowerCase() : "exchange" });
  }
}
