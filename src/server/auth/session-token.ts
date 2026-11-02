import { SignJWT, jwtVerify } from "jose";

/** Session cookie contents. Kept small; permissions are resolved per request from the role tables. */
export type SessionToken = { sub: string; name: string; accountId: string | null; roles: string[]; locale: string };

export const SESSION_COOKIE = "tuma_session";
/** NFR-12: console idle timeout 30 minutes (sliding; the proxy renews on activity). */
export const IDLE_SECONDS = 30 * 60;
/** Absolute lifetime regardless of activity. */
export const ABSOLUTE_SECONDS = 12 * 3600;

const key = () => new TextEncoder().encode(process.env.SESSION_SECRET ?? "");

export async function signSession(s: SessionToken, startedAt = Math.floor(Date.now() / 1000)): Promise<string> {
  return new SignJWT({ ...s, sat: startedAt })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.sub)
    .setIssuedAt()
    .setExpirationTime(`${IDLE_SECONDS}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<(SessionToken & { sat: number }) | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    const sat = Number(payload.sat);
    if (Date.now() / 1000 - sat > ABSOLUTE_SECONDS) return null;
    return {
      sub: String(payload.sub),
      name: String(payload.name),
      accountId: (payload.accountId as string | null) ?? null,
      roles: (payload.roles as string[]) ?? [],
      locale: String(payload.locale ?? "en"),
      sat,
    };
  } catch {
    return null;
  }
}
