import "server-only";
import sharp from "sharp";

/**
 * Makes an uploaded photo (proof of delivery, a parcel, a receipt, a driver or business document) small without it
 * looking any different: turned upright from its EXIF orientation, no larger than 2048 px on its longest side (enough
 * for a receipt's small print), WebP at quality 82, and stripped of metadata such as the GPS position. When that
 * isn't smaller, or the format can't be read here (HEIC, PDF), the original is kept.
 */
const MAX_SIDE = 2048;
const QUALITY = 82;
const OPTIMISABLE = new Set(["image/jpeg", "image/png", "image/webp"]);

export type Optimised = { bytes: Uint8Array; type: string; optimised: boolean };

export async function optimiseImage(bytes: Uint8Array, type: string): Promise<Optimised> {
  if (!OPTIMISABLE.has(type)) return { bytes, type, optimised: false };
  try {
    const out = await sharp(bytes, { failOn: "error" })
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 4, smartSubsample: true })
      .toBuffer();
    if (out.byteLength >= bytes.byteLength) return { bytes, type, optimised: false };
    return { bytes: new Uint8Array(out.buffer, out.byteOffset, out.byteLength), type: "image/webp", optimised: true };
  } catch {
    // Not an image sharp can read (or a damaged one): keep what was sent.
    return { bytes, type, optimised: false };
  }
}
