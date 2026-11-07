import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ulid } from "../ids";

/**
 * File storage for proof-of-delivery photos. STUB: writes under UPLOAD_DIR (default ./uploads, git-ignored)
 * until object storage is chosen; swap the body of `put` for S3/GCS and keep the returned key format.
 */
const ROOT = () => path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "uploads");

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "application/pdf": "pdf" };
/** Photos everywhere; PDFs only for business documents (kind "kyb"). */
export const UPLOAD_TYPES = Object.keys(EXT).filter((t) => t !== "application/pdf");
export const DOCUMENT_TYPES = Object.keys(EXT);
export const UPLOAD_MAX_BYTES = 8 * 1024 * 1024;

/** Saves the bytes and returns a key like "pod/2026/11/01JC….jpg". */
export async function put(folder: "pod" | "driver" | "kyb" | "parcel" | "dispatch", type: string, bytes: Uint8Array): Promise<string> {
  const d = new Date();
  const key = `${folder}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${ulid()}.${EXT[type] ?? "bin"}`;
  const file = path.join(ROOT(), key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
  return key;
}
