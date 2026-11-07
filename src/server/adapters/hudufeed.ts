import "server-only";

/**
 * Hudumika HuduFeed: outbound SMS, WhatsApp, email and push (moovit-beta services/feed-api). Tuma calls
 * `POST {HUDUFEED_URL}/dispatch` with `x-service-key: HUDUFEED_SERVICE_KEY` and finished text; for push, `to` is the
 * device's FCM token and HuduFeed holds the Firebase credentials. Without HUDUFEED_URL (development, tests) messages
 * are kept here and count as sent.
 */
export type Channel = "sms" | "whatsapp" | "email" | "push";
export type FeedMessage = { channel: Channel; to: string; message: string; title?: string; data?: Record<string, string> };

export const feedStub = () => !process.env.HUDUFEED_URL;
export const feedInbox: FeedMessage[] = [];

/** True when the push token is dead (app uninstalled, token rotated): the device should be forgotten. */
export const deadToken = (response: string) => /registration-token-not-registered|invalid-registration-token|invalid-argument/i.test(response);

export async function dispatch(m: FeedMessage): Promise<{ ok: true } | { ok: false; error: string; dead?: boolean }> {
  if (feedStub()) {
    feedInbox.push(m);
    return { ok: true };
  }
  try {
    const res = await fetch(`${process.env.HUDUFEED_URL!.replace(/\/+$/, "")}/dispatch`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-service-key": process.env.HUDUFEED_SERVICE_KEY ?? "" },
      body: JSON.stringify({ sourceApp: "tuma", ...m }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; response?: string; error?: string };
    // "No provider configured" for a channel is HuduFeed's expected, non-blocking outcome (logged there).
    if (res.ok) return { ok: true };
    const error = `HuduFeed ${res.status}: ${String(body.response ?? body.error ?? "").slice(0, 300)}`;
    return { ok: false, error, dead: m.channel === "push" && deadToken(String(body.response ?? "")) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
