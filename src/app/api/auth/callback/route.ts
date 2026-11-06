import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { ondi } from "@/server/adapters/ondi";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { effectivePermissions } from "@/server/rbac";
import { IDLE_SECONDS, SESSION_COOKIE, signSession } from "@/server/auth/session-token";
import { canSetUp, canUseConsole, canUsePartner, canUsePortal } from "@/domain/roles";

/** Ondi redirects here with ?code&state. Verify, refresh the identity snapshot, start a Tuma session. */
export async function GET(req: NextRequest) {
  const raw = req.cookies.get("tuma_oidc")?.value;
  const flow = raw ? (JSON.parse(raw) as { state: string; verifier: string; locale: string; next: string }) : null;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const locale = flow?.locale ?? "en";
  const fail = (reason: string) => NextResponse.redirect(new URL(`/${locale}/signin?error=${reason}`, process.env.APP_URL));

  if (!flow || !code || state !== flow.state) return fail("state");

  let claims;
  try {
    claims = await ondi().exchangeCode({ code, codeVerifier: flow.verifier, state: flow.state, redirectUri: new URL("/api/auth/callback", process.env.APP_URL).toString() });
  } catch {
    return fail("exchange");
  }

  // Refresh the identity snapshot. In stub mode role keys live on the user row (assigned in the console),
  // so only profile fields are taken from the claim; with real Ondi, roles come from the claim too.
  const [existing] = await db.select().from(users).where(eq(users.id, claims.sub));
  // Roles Tuma granted itself (driver registration, KYB approval) survive a fresh claim.
  const roleKeys = process.env.ONDI_MODE === "stub" && existing ? existing.roles : [...new Set([...claims.roles, ...(existing?.grantedRoles ?? [])])];
  if (existing && !existing.active) return fail("inactive");
  await db
    .insert(users)
    .values({ id: claims.sub, name: claims.name, email: claims.email, phone: claims.phone, avatarUrl: claims.picture ?? null, accountId: claims.accountId ?? null, roles: roleKeys, locale: claims.locale ?? locale, lastSeenAt: new Date() })
    .onConflictDoUpdate({
      target: users.id,
      set: { name: claims.name, email: claims.email, roles: roleKeys, lastSeenAt: new Date(), ...(claims.phone ? { phone: claims.phone } : {}), ...(claims.picture ? { avatarUrl: claims.picture } : {}) },
    });

  const { permissions: perms } = await effectivePermissions(roleKeys, existing?.accountId ?? claims.accountId ?? null);
  // One portal for every group; what the user sees inside it follows their permissions.
  const area = canUseConsole(perms) || canUsePartner(perms) || canUsePortal(perms) || canSetUp(perms) ? "portal" : null;

  const userLocale = existing?.locale ?? locale;
  // No Tuma role yet: sign them in anyway and let them set up their business. They can't transact until ComplyOS
  // approves the application, which grants the role (roles are re-read on every request, so no new sign-in).
  // A team invitation link always comes back to itself, so the person can accept.
  const joining = /^\/(en|sw|fr)\/join\/[A-Za-z0-9_-]+$/.test(flow.next);
  const dest = joining ? flow.next : !area ? `/${userLocale}/onboarding` : flow.next && flow.next.split("/")[2] === area ? flow.next : `/${userLocale}/${area}`;
  const res = NextResponse.redirect(new URL(dest, process.env.APP_URL));
  res.cookies.set(SESSION_COOKIE, await signSession({ sub: claims.sub, name: claims.name, accountId: claims.accountId ?? null, roles: roleKeys, locale: userLocale }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: IDLE_SECONDS,
  });
  res.cookies.delete({ name: "tuma_oidc", path: "/api/auth" });
  return res;
}
