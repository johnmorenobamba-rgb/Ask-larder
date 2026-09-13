import "server-only";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 5;

export type PhotoLibraryImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const IMAGE_EXTENSIONS: Record<string, PhotoLibraryImageMediaType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

/**
 * Downloads a photo-library image's bytes for a Claude vision call (the
 * nameplate OCR analyze route). Mirrors onboardingUpload.ts's
 * fetchOnboardingUpload, scoped to this bucket instead -- kept separate
 * rather than generalized across both buckets, since they have different
 * RLS/venue-folder conventions and only one caller needs this today.
 */
export async function fetchPhotoLibraryImageBytes(
  storagePath: string,
  venueId: string,
): Promise<{ base64: string; mediaType: PhotoLibraryImageMediaType }> {
  if (!storagePath.startsWith(`${venueId}/`)) {
    throw new Error("storagePath does not belong to this venue.");
  }
  const ext = storagePath.slice(storagePath.lastIndexOf(".") + 1).toLowerCase();
  const mediaType = IMAGE_EXTENSIONS[ext];
  if (!mediaType) {
    throw new Error("File must be a photo (jpg, png, gif, or webp).");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("photo-library").download(storagePath);
  if (error || !data) {
    throw new Error(error?.message ?? "Couldn't read the uploaded photo.");
  }

  const buf = Buffer.from(await data.arrayBuffer());
  return { base64: buf.toString("base64"), mediaType };
}

/**
 * photo-library is a private bucket -- every read needs a short-lived
 * signed URL minted per request. Mirrors certPhotoUrl.ts / nearMissPhotoUrl.ts.
 */
export async function getPhotoLibraryUrl(storagePath: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("photo-library")
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data) return null;
  return data.signedUrl;
}
