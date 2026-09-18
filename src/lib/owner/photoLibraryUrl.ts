import "server-only";
import { createClient } from "@/lib/supabase/server";

// Was 5 minutes -- too short for real usage. A station tile viewed on the
// owner Stations page, or a photo inline in a module a staff member is
// actually reading, can easily stay on screen longer than that with no
// client-side refresh mechanism, so the <img> silently goes blank once the
// token expires (confirmed live, 15 Sep 2026: Coachman's Arms station tiles
// intermittently rendering blank, not tied to any specific station -- purely
// a function of how long the token had been alive by the time the browser
// actually fetched it). An hour matches the cacheControl already set on the
// uploaded objects themselves (max-age=3600).
const SIGNED_URL_TTL_SECONDS = 60 * 60;

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

  if (error || !data) {
    // Same silent-failure class as the query-error pattern hardened
    // elsewhere (logQueryError.ts) -- this one is a storage API call, not a
    // Postgres query, so it wasn't caught by that earlier sweep. A failure
    // here used to just render as a blank/broken image with zero trace in
    // the logs.
    if (error) console.error(`[signed url failed] photo-library/${storagePath}:`, error.message);
    return null;
  }
  return data.signedUrl;
}
