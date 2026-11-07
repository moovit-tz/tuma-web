import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
vi.mock("server-only", () => ({}));
const { optimiseImage } = await import("./image");

/** A phone-sized photo with real detail (noise compresses like a photo, not like a flat colour). */
async function photo(width: number, height: number, opts: { orientation?: number } = {}) {
  const noise = Buffer.alloc(width * height * 3);
  for (let i = 0; i < noise.length; i++) noise[i] = (i * 7919 + ((i / 3) | 0) * 104729) % 251;
  let img = sharp(noise, { raw: { width, height, channels: 3 } }).jpeg({ quality: 95 });
  if (opts.orientation) img = img.withMetadata({ orientation: opts.orientation });
  return new Uint8Array(await img.toBuffer());
}

describe("optimiseImage", () => {
  it("makes a phone photo WebP, no wider than 2048 px, and much smaller", { timeout: 30_000 }, async () => {
    const src = await photo(4000, 3000);
    const out = await optimiseImage(src, "image/jpeg");
    expect(out).toMatchObject({ type: "image/webp", optimised: true });
    expect(out.bytes.byteLength).toBeLessThan(src.byteLength / 2);
    const m = await sharp(out.bytes).metadata();
    expect([m.width, m.height]).toEqual([2048, 1536]);
  });

  it("turns it upright and drops the metadata", async () => {
    const out = await optimiseImage(await photo(1200, 800, { orientation: 6 }), "image/jpeg");
    const m = await sharp(out.bytes).metadata();
    expect([m.width, m.height]).toEqual([800, 1200]);
    expect(m.orientation).toBeUndefined();
    expect(m.exif).toBeUndefined();
  });

  it("keeps a small image as it is, and anything it can't read", async () => {
    // Never bigger than what was sent.
    const tiny = await photo(40, 30);
    expect((await optimiseImage(tiny, "image/jpeg")).bytes.byteLength).toBeLessThanOrEqual(tiny.byteLength);
    const pdf = new TextEncoder().encode("%PDF-1.4 not an image");
    expect(await optimiseImage(pdf, "application/pdf")).toEqual({ bytes: pdf, type: "application/pdf", optimised: false });
    const broken = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x01]);
    expect(await optimiseImage(broken, "image/jpeg")).toEqual({ bytes: broken, type: "image/jpeg", optimised: false });
  });
});
