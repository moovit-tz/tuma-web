import "server-only";
import { AwsClient } from "aws4fetch";

/**
 * Copies of uploaded files in Cloudflare R2 (its S3-compatible API), under the same key as the local file.
 * Configured by R2_ENDPOINT (https://<account id>.r2.cloudflarestorage.com), R2_BUCKET, R2_ACCESS_KEY_ID and
 * R2_SECRET_ACCESS_KEY (an R2 API token with Object Read & Write on that bucket). Without them, nothing is copied.
 */
function config() {
  const endpoint = process.env.R2_ENDPOINT?.replace(/\/+$/, "");
  const bucket = process.env.R2_BUCKET;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  return { endpoint, bucket, client: new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" }) };
}

let cached: ReturnType<typeof config> | undefined;
const r2 = () => (cached === undefined ? (cached = config()) : cached);

export const r2Enabled = () => !!r2();

const url = (c: NonNullable<ReturnType<typeof config>>, key: string) => `${c.endpoint}/${c.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;

/** Puts one object; retries twice on a network error or a 5xx. Throws when it still fails. */
export async function r2Put(key: string, bytes: Uint8Array, type: string): Promise<void> {
  const c = r2();
  if (!c) return;
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await c.client.fetch(url(c, key), {
        method: "PUT",
        body: new Blob([bytes as Uint8Array<ArrayBuffer>], { type }),
        headers: { "content-type": type, "cache-control": "private, max-age=31536000, immutable" },
        signal: AbortSignal.timeout(20_000),
      });
      if (res.ok) return;
      last = new Error(`R2 PUT ${key}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
      if (res.status < 500) break;
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  throw last;
}

/** Whether an object is there (for the backfill). */
export async function r2Has(key: string): Promise<boolean> {
  const c = r2();
  if (!c) return false;
  const res = await c.client.fetch(url(c, key), { method: "HEAD", signal: AbortSignal.timeout(15_000) });
  return res.ok;
}
