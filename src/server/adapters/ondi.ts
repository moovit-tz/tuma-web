import "server-only";
import { SignJWT, createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { toE164 } from "@/domain/phone";

/**
 * Ondi identity adapter (section 9.5, FR-IDN-01/02).
 *
 * Ondi (ondi.hudumika.tz) is an OIDC provider: authorization code + PKCE, where people sign in or sign up, then
 * come back to Tuma. ONDI_MODE=oidc talks to it (ONDI_ISSUER, ONDI_CLIENT_ID, optional ONDI_CLIENT_SECRET);
 * ONDI_MODE=stub runs a local stand-in at /dev/ondi that issues the same claim shape. Code outside this file only
 * sees the IdentityProvider interface.
 */
export type OndiClaims = {
  sub: string;
  name: string;
  email?: string;
  phone?: string;
  /** Profile photo URL (OIDC `picture`). Ondi sets it for people who signed in with Google or Microsoft. */
  picture?: string;
  accountId?: string | null;
  roles: string[];
  locale?: string;
};

export interface IdentityProvider {
  /** URL to send the browser to. */
  authorizeUrl(params: { state: string; codeChallenge: string; redirectUri: string }): Promise<string>;
  /** Exchange the authorization code for verified claims. */
  exchangeCode(params: { code: string; codeVerifier: string; redirectUri: string; state?: string }): Promise<OndiClaims>;
}

const enc = (s: string) => new TextEncoder().encode(s);
const STUB_ISSUER = "ondi-stub";

class OndiStub implements IdentityProvider {
  private key = enc(process.env.ONDI_STUB_SECRET ?? "");

  async authorizeUrl({ state, codeChallenge, redirectUri }: { state: string; codeChallenge: string; redirectUri: string }) {
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

type Discovery = { authorization_endpoint: string; token_endpoint: string; jwks_uri: string; issuer: string };

/**
 * Real Ondi, per moovit-beta services/ondi-api: discovery at {api}/v1/oauth/.well-known/openid-configuration,
 * the web app's /authorize page (login, sign-up, consent), token endpoint with client_secret_post, RS256 ID tokens
 * checked against the published JWKS. Ondi doesn't echo a nonce, so state + PKCE carry the binding.
 * Discovery and keys are cached; jose refreshes the key set when Ondi rotates keys.
 */
class OndiOidc implements IdentityProvider {
  private meta: Promise<Discovery> | null = null;
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(
    private apiUrl: string,
    /** Ondi's web app, which hosts the real /authorize page (login, sign-up, consent). */
    private webUrl: string,
    private clientId: string,
    private clientSecret: string | undefined,
    private rolesClaim: string,
  ) {}

  private discovery(): Promise<Discovery> {
    this.meta ??= fetch(new URL("/v1/oauth/.well-known/openid-configuration", this.apiUrl), { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`Ondi discovery failed (${r.status})`);
        return r.json() as Promise<Discovery>;
      })
      .catch((e) => {
        this.meta = null; // retry on the next sign-in
        throw e;
      });
    return this.meta;
  }

  async authorizeUrl({ state, codeChallenge, redirectUri }: { state: string; codeChallenge: string; redirectUri: string }) {
    // Discovery lists the API's /v1/oauth/authorize, but that only returns consent context (JSON) for Ondi's own UI.
    // People go to the web page, as @ondi/auth-client does; it signs them in and calls the API itself.
    const u = new URL("/authorize", this.webUrl);
    u.search = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: "openid profile email phone organizations",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      // Ondi's account chooser, as "Continue with Google" shows: pick which signed-in account, or add another.
      prompt: "select_account",
    }).toString();
    return u.toString();
  }

  async exchangeCode({ code, codeVerifier, redirectUri }: { code: string; codeVerifier: string; redirectUri: string; state?: string }) {
    const d = await this.discovery();
    const res = await fetch(d.token_endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
        client_id: this.clientId,
        ...(this.clientSecret ? { client_secret: this.clientSecret } : {}),
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Ondi token exchange failed (${res.status})`);
    const tokens = (await res.json()) as { id_token?: string };
    if (!tokens.id_token) throw new Error("Ondi returned no ID token");
    this.jwks ??= createRemoteJWKSet(new URL(d.jwks_uri));
    const { payload } = await jwtVerify(tokens.id_token, this.jwks, { issuer: d.issuer, audience: this.clientId });
    return claimsFrom(payload, this.rolesClaim);
  }
}

/**
 * Ondi's phone claim, only when it's a real mobile number. A Google / Microsoft / Apple sign-up has no number yet, and
 * Ondi keeps a placeholder there ("federated_google_<id>"); taking that as a phone showed people a 21-digit "+255"
 * number. Without a real one, Tuma asks for it where it's needed.
 */
export function phoneClaim(v: unknown): string | undefined {
  if (typeof v !== "string" || /[a-z_]/i.test(v)) return undefined;
  return toE164(v) ?? undefined;
}

export function claimsFrom(p: JWTPayload, rolesClaim: string): OndiClaims {
  const roles = p[rolesClaim];
  const name = typeof p.name === "string" && p.name.trim() ? p.name.trim() : typeof p.email === "string" ? p.email : "Ondi user";
  return {
    sub: String(p.sub),
    name,
    email: typeof p.email === "string" ? p.email : undefined,
    phone: phoneClaim(p.phone),
    picture: typeof p.picture === "string" && /^https:\/\//.test(p.picture) ? p.picture : undefined,
    accountId: null, // Tuma owns account membership (CRM / KYB), not Ondi
    roles: Array.isArray(roles) ? roles.map(String) : [],
    locale: typeof p.locale === "string" ? p.locale.slice(0, 2) : undefined,
  };
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
  if (provider) return provider;
  const mode = process.env.ONDI_MODE;
  if (mode === "stub") return (provider = new OndiStub());
  if (mode === "oidc") {
    const apiUrl = process.env.ONDI_API_URL;
    const clientId = process.env.ONDI_CLIENT_ID;
    if (!apiUrl || !clientId) throw new Error("ONDI_MODE=oidc needs ONDI_API_URL and ONDI_CLIENT_ID.");
    return (provider = new OndiOidc(apiUrl, process.env.ONDI_WEB_URL || apiUrl, clientId, process.env.ONDI_CLIENT_SECRET || undefined, process.env.ONDI_ROLES_CLAIM || "roles"));
  }
  throw new Error("Set ONDI_MODE to oidc (ondi.hudumika.tz) or stub (development).");
}

export function ondiStub(): OndiStub {
  if (process.env.ONDI_MODE !== "stub") throw new Error("Ondi stub is disabled");
  return ondi() as OndiStub;
}
