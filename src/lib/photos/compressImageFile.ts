"use client";

/**
 * Client-side photo compression, added 14 Sep 2026: no upload path in this
 * app ever resized or compressed an image before storing it -- fine for
 * today's demo-sourced photos (170-370KB), but a real venue's real phone
 * camera photos are commonly 3-8MB each, and nothing here would resist
 * that. Runs entirely in the browser (Canvas API) before the upload
 * request, not a server-side step -- keeps the large original bytes off
 * the wire entirely rather than uploading them and shrinking after.
 *
 * Deliberately conservative: only touches images that are actually large.
 * A photo already smaller than maxBytes, or not decodable as an image
 * (createImageBitmap throwing), is returned completely untouched -- this
 * must never be the reason a real upload fails.
 */
export interface CompressImageOptions {
  /** Longest edge, in pixels, after resize. Default 1600 -- generous for
   * a training-module or station photo, well past what any of this app's
   * display contexts actually render at. */
  maxDimension?: number;
  /** JPEG quality, 0-1. Default 0.82, a standard "visually lossless for
   * photography" starting point. */
  quality?: number;
  /** Skip compression entirely if the original is already under this
   * size. Default 400KB -- roughly the size of this app's own existing
   * demo photos, so those are left untouched. */
  skipIfUnderBytes?: number;
}

export async function compressImageFile(file: File, options: CompressImageOptions = {}): Promise<File> {
  const { maxDimension = 1600, quality = 0.82, skipIfUnderBytes = 400_000 } = options;

  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (file.size <= skipIfUnderBytes) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    // Already smaller than the target -- resizing would upscale, and a
    // same-size JPEG re-encode risks making a PNG/WebP original larger,
    // not smaller. Only proceed if we're actually shrinking dimensions.
    if (scale >= 1) {
      bitmap.close();
      return file;
    }

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    // Any failure (decode error, unsupported format, canvas exception) --
    // fall back to the original file untouched rather than blocking the
    // upload over an optimization step.
    return file;
  }
}
