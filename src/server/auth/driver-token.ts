import "server-only";
import { SignJWT, jwtVerify } from "jose";

/**
 * Bearer token for the Tuma-X driver app. Separate audience from the portal session cookie, so neither
 * can stand in for the other, and longer-lived (a driver signs in once per phone). The user row is
 * re-checked on every request, so suspending a driver takes effect at once.
 */
const AUD = "tuma-x";
export const DRIVER_TOKEN_DAYS = 30;
const key = () => new TextEncoder().encode(process.env.SESSION_SECRET ?? "");

export async function signDriverToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setAudience(AUD)
    .setIssuedAt()
    .setExpirationTime(`${DRIVER_TOKEN_DAYS}d`)
    .sign(key());
}

export async function verifyDriverToken(token: string | null | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { audience: AUD });
    return payload.sub ? String(payload.sub) : null;
  } catch {
    return null;
  }
}
