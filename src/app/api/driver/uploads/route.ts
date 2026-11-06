import { driverRoute } from "@/server/http/driver-api";
import { DOCUMENT_TYPES, put, UPLOAD_MAX_BYTES, UPLOAD_TYPES } from "@/server/adapters/storage";
import { DomainError } from "@/server/services/shipments";

/**
 * POST multipart { file, kind: "pod" | "driver" | "kyb" | "parcel" } → { key } to send with the delivery, registration or
 * business application. Business documents (kyb) may also be PDFs.
 */
export const POST = driverRoute(async (_ctx, req) => {
  const form = await req.formData();
  const file = form.get("file");
  const raw = form.get("kind");
  const kind = raw === "driver" || raw === "kyb" || raw === "parcel" ? raw : "pod";
  if (!(file instanceof File)) throw new DomainError("NO_FILE", "Attach a photo.", 400);
  const types = kind === "kyb" ? DOCUMENT_TYPES : UPLOAD_TYPES;
  if (!types.includes(file.type)) {
    throw new DomainError("BAD_TYPE", kind === "kyb" ? "Send a photo or a PDF." : "Send a JPEG, PNG, WebP or HEIC photo.", 400);
  }
  if (file.size > UPLOAD_MAX_BYTES) throw new DomainError("TOO_BIG", "The file is larger than 8 MB.", 413);
  return { key: await put(kind, file.type, new Uint8Array(await file.arrayBuffer())) };
});
