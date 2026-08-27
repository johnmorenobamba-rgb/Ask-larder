import "server-only";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 5;

/**
 * The `certs` bucket is private, so a cert photo's stored path isn't
 * directly viewable — every read needs a short-lived signed URL minted
 * per request rather than a public path.
 */
export async function getCertPhotoUrl(photoRef: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("certs")
    .createSignedUrl(photoRef, SIGNED_URL_TTL_SECONDS);

  if (error || !data) return null;
  return data.signedUrl;
}
