import "server-only";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 5;

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
