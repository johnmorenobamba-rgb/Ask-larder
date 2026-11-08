import "server-only";
import { stationScanUrl } from "@/lib/site";
import QRCode from "qrcode";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { getPhotoLibraryUrls } from "@/lib/owner/photoLibraryUrl";

export type StationDisplay = {
  id: string;
  name: string;
  qrCodeSlug: string;
  qrDataUrl: string;
  photoUrl: string;
};

const STOCK_STATION_PHOTO = "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=400&h=560&fit=crop";

/**
 * Block J5's real-QR-code + tagged-photo shaping for `StationsGallery`,
 * extracted so Block K4 (owner dashboard reusing the same carousel) pulls
 * from the exact same logic instead of a second copy that could drift --
 * the staff home page and the owner dashboard now both call this directly.
 *
 * Real generated QR codes, not placeholders: `stations.qr_code_slug`
 * exists but no rendered code asset is stored anywhere, so each one is
 * generated on the fly via the `qrcode` package. Real venue photography
 * (tagged "station" in the photo library) is preferred when available;
 * TEMPORARY stock-photo fallback otherwise, same acknowledged Branding Kit
 * anti-pattern exception as the Continue cell.
 */
export async function getStationsWithDisplay(
  supabase: SupabaseClient<Database>,
  venueId: string,
  venueSlug: string,
): Promise<StationDisplay[]> {
  // Stations and the venue's station-tagged photos in one round (the photos are looked up by venue rather than by the
  // station list, so they no longer wait for it), then every photo URL signed in one batch call.
  const [{ data: stations }, { data: stationPhotos }] = await Promise.all([
    supabase.from("stations").select("id, name, qr_code_slug").eq("venue_id", venueId).order("created_at"),
    supabase.from("photo_library").select("station_id, storage_path").eq("venue_id", venueId).eq("tag", "station").not("station_id", "is", null),
  ]);
  const stationPhotoByStationId = new Map((stationPhotos ?? []).map((p) => [p.station_id, p.storage_path]));
  const paths = (stations ?? []).map((s) => stationPhotoByStationId.get(s.id)).filter((p): p is string => !!p);
  const signed = await getPhotoLibraryUrls(paths);

  return Promise.all(
    (stations ?? []).map(async (s) => {
      const taggedPath = stationPhotoByStationId.get(s.id);
      return {
        id: s.id,
        name: s.name,
        qrCodeSlug: s.qr_code_slug,
        qrDataUrl: await QRCode.toDataURL(stationScanUrl(venueSlug, s.qr_code_slug)),
        photoUrl: (taggedPath && signed.get(taggedPath)) || STOCK_STATION_PHOTO,
      };
    }),
  );
}
