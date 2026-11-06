import "server-only";

/**
 * Hudumika HuduBI adapter: Tuma's analytics snapshots for Hudumika's admins (parcel pricing first).
 *
 * HuduBI (moovit-beta apps/api, /v1/hudubi) takes them on its service route `POST {HUDUBI_API_URL}/v1/hudubi/ingest/:source`
 * with `x-service-key: HUDUBI_INGEST_KEY`, upserting by the message's idempotency key, and shows them to platform
 * SuperAdmins only. Without HUDUBI_API_URL (development, tests) messages are kept here and counted as delivered.
 */
export const huduBIStub = () => !process.env.HUDUBI_API_URL;

/** What the stub received, newest last (development and tests). */
export const stubInbox: { topic: string; key: string; payload: Record<string, unknown> }[] = [];

export async function deliverToHuduBI(topic: string, key: string, payload: Record<string, unknown>): Promise<{ ok: true } | { ok: false; error: string }> {
  if (huduBIStub()) {
    stubInbox.push({ topic, key, payload });
    return { ok: true };
  }
  const base = process.env.HUDUBI_API_URL!.replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/v1/hudubi/ingest/tuma`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-service-key": process.env.HUDUBI_INGEST_KEY ?? "", "idempotency-key": key },
      body: JSON.stringify({ topic, key, payload }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { ok: false, error: `HuduBI ${res.status}: ${(await res.text()).slice(0, 300)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
