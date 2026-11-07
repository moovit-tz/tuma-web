import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ulid } from "../ids";
import { optimiseImage } from "./image";
import { r2Put } from "./r2";

/**
 * File storage for uploaded photos and documents. Photos are optimised first (see image.ts); the file is written
 * under UPLOAD_DIR (default ./uploads, git-ignored) and a copy goes to Cloudflare R2 under the same key when R2 is
 * configured (see r2.ts). The copy never fails an upload: if R2 is unreachable it's logged, and the backfill script
 * (scripts/r2-backfill.ts) sends what's missing later.
 */
export const ROOT = () => path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "uploads");

export const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "application/pdf": "pdf" };
/** Photos everywhere; PDFs only for business documents (kind "kyb"). */
export const UPLOAD_TYPES = Object.keys(EXT).filter((t) => t !== "application/pdf");
export const DOCUMENT_TYPES = Object.keys(EXT);
export const UPLOAD_MAX_BYTES = 8 * 1024 * 1024;

/** Saves the bytes and returns a key like "pod/2026/11/01JC….webp". */
export async function put(folder: "pod" | "driver" | "kyb" | "parcel" | "dispatch", type: string, bytes: Uint8Array): Promise<string> {
  const file = await optimiseImage(bytes, type);
  const d = new Date();
  const key = `${folder}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${ulid()}.${EXT[file.type] ?? "bin"}`;
  const local = path.join(ROOT(), key);
  await mkdir(path.dirname(local), { recursive: true });
  await writeFile(local, file.bytes);
  try {
    await r2Put(key, file.bytes, file.type);
  } catch (e) {
    console.error(`[storage] R2 copy of ${key} failed; the backfill will retry it.`, e instanceof Error ? e.message : e);
  }
  return key;
}
