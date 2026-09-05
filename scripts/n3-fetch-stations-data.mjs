import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";

// Hero tablet rebuild (5-6 Sep 2026) -- one-time snapshot of Two Fires'
// REAL stations (name + real tagged photo) for the new HeroTileDrop
// Remotion composition. Plain @supabase/supabase-js client with the
// service-role key, same as scripts/n3-fetch-video-data.mjs -- the real
// getStationsWithDisplay()/getPhotoLibraryUrl() helpers need Next's
// request-scoped headers(), which doesn't exist outside a real request.
// QR codes are skipped deliberately: real but pointless at this preview's
// scale, not a "not fabricated" concern since the station identity/photo
// stays real either way.

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: venueRow } = await supabase.from("venues").select("id, slug, name").eq("slug", "two-fires").single();
  const venueId = venueRow.id;

  const { data: stations } = await supabase
    .from("stations")
    .select("id, name")
    .eq("venue_id", venueId)
    .order("created_at");

  const { data: stationPhotos } = await supabase
    .from("photo_library")
    .select("station_id, storage_path")
    .eq("tag", "station")
    .in("station_id", (stations ?? []).map((s) => s.id));
  const photoByStationId = new Map((stationPhotos ?? []).map((p) => [p.station_id, p.storage_path]));

  const result = [];
  for (const s of stations ?? []) {
    const storagePath = photoByStationId.get(s.id);
    if (!storagePath) {
      console.error(`No tagged photo for station "${s.name}" -- skipping, not substituting a stock fallback here.`);
      continue;
    }
    const { data, error } = await supabase.storage.from("photo-library").createSignedUrl(storagePath, 60 * 60 * 24 * 7);
    if (error) {
      console.error(`Signed URL error for "${s.name}":`, error.message);
      continue;
    }
    result.push({ id: s.id, name: s.name, photoUrl: data.signedUrl });
  }

  mkdirSync("src/data", { recursive: true });
  writeFileSync("src/data/two-fires-stations.json", JSON.stringify(result, null, 2));
  console.log(`Wrote src/data/two-fires-stations.json -- ${result.length} real stations:`);
  console.log(result.map((r) => r.name).join(", "));
}

main();
