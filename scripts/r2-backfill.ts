/**
 * Copies uploads that aren't in Cloudflare R2 yet (everything from before R2 was set up, and any copy that failed).
 * Files go up as they are, under the same key; new uploads are already optimised when they're saved.
 *   pnpm tsx scripts/r2-backfill.ts            copy what's missing
 *   pnpm tsx scripts/r2-backfill.ts --dry-run  only count it
 * Needs UPLOAD_DIR (default ./uploads) and the R2_* settings (see src/server/adapters/r2.ts).
 */
import { config } from "dotenv";
config({ path: ".env.local", override: false });

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", pdf: "application/pdf" };
const dry = process.argv.includes("--dry-run");

async function* walk(dir: string): AsyncGenerator<string> {
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile()) yield p;
  }
}

async function main() {
  const { R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ENDPOINT || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) throw new Error("Set R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY first.");
  const client = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" });
  const root = path.resolve(process.env.UPLOAD_DIR ?? "uploads");
  const url = (key: string) => `${R2_ENDPOINT.replace(/\/+$/, "")}/${R2_BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`;
  // Checks the keys first: a bucket listing of one object answers 200 with access, 401/403 without.
  const check = await client.fetch(`${R2_ENDPOINT.replace(/\/+$/, "")}/${R2_BUCKET}?list-type=2&max-keys=1`);
  if (!check.ok) throw new Error(`R2 refused the keys (HTTP ${check.status}). Check the token has Object Read & Write on ${R2_BUCKET}.`);
  console.log(`R2 bucket ${R2_BUCKET}: keys work.`);
  let seen = 0;
  let sent = 0;
  let failed = 0;
  for await (const file of walk(root)) {
    const key = path.relative(root, file).split(path.sep).join("/");
    const type = TYPES[key.split(".").pop() ?? ""];
    if (!type) continue;
    seen++;
    const head = await client.fetch(url(key), { method: "HEAD" });
    if (head.ok) continue;
    if (head.status !== 404) throw new Error(`${key}: HTTP ${head.status} from R2`);
    if (dry) {
      sent++;
      continue;
    }
    const res = await client.fetch(url(key), { method: "PUT", body: await readFile(file), headers: { "content-type": type, "cache-control": "private, max-age=31536000, immutable" } });
    if (res.ok) sent++;
    else {
      failed++;
      console.error(`${key}: HTTP ${res.status}`);
    }
  }
  console.log(`${seen} files in ${root}; ${dry ? "would copy" : "copied"} ${sent}${failed ? `, ${failed} failed` : ""}.`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
