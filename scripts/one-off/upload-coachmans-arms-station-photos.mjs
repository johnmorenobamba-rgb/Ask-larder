// Seeds station photos for coachmans-arms-wizard (the real, wizard-onboarded
// venue -- see reference_two_coachmans_arms_venues.md, do not confuse with
// the old block-p-pub-coachmans-arms fixture). 3 of its 4 stations had no
// photo (Cellar already had one). Pattern copied from
// upload-block-o-station-photos.mjs (Two Fires). Free, non-Unsplash+ stock
// photos, individually confirmed via "Download free" before sourcing.
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const VENUE_ID = "79a9ea70-8302-4ab8-b501-8d27dc85457e"; // coachmans-arms-wizard
const UPLOADED_BY = "248c3796-72a2-4e0e-9a6a-c175a56916b2"; // Gary Pappas (owner)

const stationPhotos = [
  { stationId: "85fcf61e-40d2-4cbd-95b3-b14714298f97", name: "Bistro", file: "bistro-station.jpg" },
  { stationId: "17e7b2d7-b2fe-4105-a9e6-d760dad03b52", name: "Kitchen", file: "kitchen-station.jpg" },
  { stationId: "6f953d0f-7ae5-48c8-93c4-b1157ffeeae8", name: "Public Bar", file: "public-bar-station.jpg" },
];

for (const station of stationPhotos) {
  const localPath = `scratch/station-photos/${station.file}`;
  const bytes = readFileSync(localPath);
  const storagePath = `${VENUE_ID}/stations/${station.stationId}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("photo-library")
    .upload(storagePath, bytes, { contentType: "image/jpeg", upsert: true });
  if (uploadError) {
    console.log(`FAIL upload ${station.name}: ${uploadError.message}`);
    continue;
  }

  await supabase
    .from("photo_library")
    .delete()
    .eq("venue_id", VENUE_ID)
    .eq("tag", "station")
    .eq("station_id", station.stationId);

  const { error: insertError } = await supabase.from("photo_library").insert({
    venue_id: VENUE_ID,
    storage_path: storagePath,
    tag: "station",
    station_id: station.stationId,
    uploaded_by: UPLOADED_BY,
  });
  if (insertError) {
    console.log(`FAIL insert row ${station.name}: ${insertError.message}`);
    continue;
  }

  console.log(`OK ${station.name}: ${storagePath} (${(bytes.length / 1024).toFixed(0)}KB)`);
}
