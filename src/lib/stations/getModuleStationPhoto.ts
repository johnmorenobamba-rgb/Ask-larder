import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { getPhotoLibraryUrl } from "@/lib/owner/photoLibraryUrl";

export type ModuleStationPhoto = { url: string; stationName: string };

/**
 * Block S4 -- the real photo-in-module mechanism: a module renders a
 * station's real uploaded photo inline when one exists, nothing when it
 * doesn't. There's no direct FK from a module to a photo, so this goes via
 * the one real link that already exists (stations.primary_module_id), then
 * looks up that station's own tagged photo in photo_library.
 *
 * Deliberately does NOT fall back to a stock photo (unlike
 * getStationsWithDisplay.ts's carousel use, an already-approved, separate
 * exception) -- this is staff-facing training content, and a stock photo
 * standing in for "this is what your actual cellar looks like" would be
 * actively misleading, not just decorative. Render nothing until a real
 * photo exists.
 *
 * If more than one station happens to share a primary_module_id, the
 * first (by name) is used -- fine for the current one-station-per-module
 * reality; nothing breaks if that ever changes, it just shows one photo.
 */
export async function getModuleStationPhoto(
  supabase: SupabaseClient<Database>,
  moduleId: string,
): Promise<ModuleStationPhoto | null> {
  const { data: station } = await supabase
    .from("stations")
    .select("id, name")
    .eq("primary_module_id", moduleId)
    .order("name")
    .limit(1)
    .maybeSingle();
  if (!station) return null;

  const { data: photo } = await supabase
    .from("photo_library")
    .select("storage_path")
    .eq("station_id", station.id)
    .eq("tag", "station")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!photo) return null;

  const url = await getPhotoLibraryUrl(photo.storage_path);
  if (!url) return null;

  return { url, stationName: station.name };
}
