import "server-only";
import { SignJWT, jwtVerify } from "jose";

/**
 * Ondi identity adapter (section 9.5, FR-IDN-01/02).
 *
 * The real Ondi uses OIDC authorization code + PKCE. Until its spec and sandbox arrive, ONDI_MODE=stub
 * runs a local stand-in at /dev/ondi that issues the same claim shape. Code outside this file only sees
 * the IdentityProvider interface.
 */
export type OndiClaims = {
  sub: string;
  name: string;
  email?: string;
  accountId?: string | null;
  roles: string[];
  locale?: string;
};

export interface IdentityProvider {
  /** URL to send the browser to. */
  authorizeUrl(params: { state: string; codeChallenge: string; redirectUri: string }): string;
  /** Exchange the authorization code for verified claims. */
  exchangeCode(params: { code: string; codeVerifier: string; redirectUri: string }): Promise<OndiClaims>;
}

const enc = (s: string) => new TextEncoder().encode(s);
const STUB_ISSUER = "ondi-stub";

class OndiStub implements IdentityProvider {
  private key = enc(process.env.ONDI_STUB_SECRET ?? "");

  authorizeUrl({ state, codeChallenge, redirectUri }: { state: string; codeChallenge: string; redirectUri: string }) {
    const u = new URL("/dev/ondi", process.env.APP_URL);
    u.searchParams.set("state", state);
    u.searchParams.set("code_challenge", codeChallenge);
    u.searchParams.set("redirect_uri", redirectUri);
    return u.toString();
  }

  /** Called by the stub sign-in page: the "authorization code" is a short-lived signed JWT. */
  async issueCode(claims: OndiClaims, codeChallenge: string): Promise<string> {
    return new SignJWT({ ...claims, cc: codeChallenge })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(STUB_ISSUER)
      .setIssuedAt()
      .setExpirationTime("60s")
      .sign(this.key);
  }

  async exchangeCode({ code, codeVerifier }: { code: string; codeVerifier: string }): Promise<OndiClaims> {
    const { payload } = await jwtVerify(code, this.key, { issuer: STUB_ISSUER });
    const challenge = await pkceChallenge(codeVerifier);
    if (payload.cc !== challenge) throw new Error("PKCE verification failed");
    return {
      sub: String(payload.sub),
      name: String(payload.name),
      email: payload.email as string | undefined,
      accountId: (payload.accountId as string | null) ?? null,
      roles: (payload.roles as string[]) ?? [],
      locale: payload.locale as string | undefined,
    };
  }
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc(verifier));
  return Buffer.from(digest).toString("base64url");
}

export function randomToken(bytes = 32): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString("base64url");
}

let provider: IdentityProvider | null = null;
export function ondi(): IdentityProvider {
  if (process.env.ONDI_MODE !== "stub") {
    throw new Error("Real Ondi OIDC is not configured yet. Set ONDI_MODE=stub for development.");
  }
  provider ??= new OndiStub();
  return provider;
}

export function ondiStub(): OndiStub {
  if (process.env.ONDI_MODE !== "stub") throw new Error("Ondi stub is disabled");
  return ondi() as OndiStub;
}
