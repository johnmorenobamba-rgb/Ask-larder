import "server-only";
import { headers } from "next/headers";
import QRCode from "qrcode";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { getPhotoLibraryUrl } from "@/lib/owner/photoLibraryUrl";

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
  const { data: stations } = await supabase
    .from("stations")
    .select("id, name, qr_code_slug")
    .eq("venue_id", venueId)
    .order("created_at");

  const headerList = await headers();
  const origin = `${headerList.get("x-forwarded-proto") ?? "https"}://${headerList.get("host")}`;

  const stationIds = (stations ?? []).map((s) => s.id);
  const { data: stationPhotos } =
    stationIds.length > 0
      ? await supabase.from("photo_library").select("station_id, storage_path").eq("tag", "station").in("station_id", stationIds)
      : { data: [] as { station_id: string | null; storage_path: string }[] };
  const stationPhotoByStationId = new Map((stationPhotos ?? []).map((p) => [p.station_id, p.storage_path]));

  return Promise.all(
    (stations ?? []).map(async (s) => {
      const taggedPath = stationPhotoByStationId.get(s.id);
      return {
        id: s.id,
        name: s.name,
        qrCodeSlug: s.qr_code_slug,
        qrDataUrl: await QRCode.toDataURL(`${origin}/${venueSlug}/station/${s.qr_code_slug}`),
        photoUrl: taggedPath ? ((await getPhotoLibraryUrl(taggedPath)) ?? STOCK_STATION_PHOTO) : STOCK_STATION_PHOTO,
      };
    }),
  );
}
