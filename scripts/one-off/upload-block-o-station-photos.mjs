// One-off: replaces the single shared Unsplash stock-kitchen fallback photo
// (a bright residential kitchen -- read as a house kitchen, not a real
// venue) with 5 distinct, professional/commercial-hospitality Unsplash
// photos, one per Two Fires station, uploaded into the real photo_library
// mechanism (tag='station', station_id set) so getStationsWithDisplay picks
// them up ahead of the generic fallback. All free-tier (images.unsplash.com,
// Unsplash License, no attribution required) -- avoided any plus.unsplash.com
// (paid) results. Source photos, for reference:
//   Fryer Station -> photo-1534938665420-4193effeacc4 (fries in basket, upscale plating)
//   Pizza Station -> photo-1745031601376-51802da5ae5e (chef at wood-fired oven)
//   Bar           -> photo-1778034951254-63452b7b77cd (tap wall, working bar)
//   Cellar        -> photo-1575844537064-29b4655170a4 (stainless steel kegs)
//   Wash-up       -> photo-1589109807644-924edf14ee09 (commercial dishwashing line)
// Not idempotent-safe against re-running with different source files without
// re-populating scratch/station-photos/ first -- kept as a record of what
// was done, not meant to be re-run blindly.
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const VENUE_ID = "b379e33f-b0d8-47bf-810e-450635b29b6b"; // two-fires
const OWNER_ID = "c069fa7a-f149-44a2-8de3-bec61ddaae0b";

const stationPhotos = [
  { stationId: "74673443-e4b1-41b8-a0ba-27d8d92b4d19", name: "Fryer Station", file: "fryer-station.jpg" },
  { stationId: "f728e280-2265-42c4-b076-18b473c630f0", name: "Pizza Station", file: "pizza-station.jpg" },
  { stationId: "a4b7e570-da23-478e-9094-dd9fdf598c15", name: "Bar", file: "bar.jpg" },
  { stationId: "b854a8ce-4470-441c-b021-3be10971767b", name: "Cellar", file: "cellar.jpg" },
  { stationId: "01a3c8e9-8bb8-426e-93ae-498b758d0d3a", name: "Wash-up", file: "wash-up.jpg" },
];

async function main() {
  for (const sp of stationPhotos) {
    const fileBuffer = readFileSync(`scratch/station-photos/${sp.file}`);
    const storagePath = `${VENUE_ID}/stations/${sp.stationId}.jpg`;

    const { error: uploadError } = await admin.storage.from("photo-library").upload(storagePath, fileBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (uploadError) throw new Error(`upload failed for ${sp.name}: ${uploadError.message}`);

    // Remove any previous photo_library row for this station (idempotent re-run).
    await admin.from("photo_library").delete().eq("station_id", sp.stationId).eq("tag", "station");

    const { error: insertError } = await admin.from("photo_library").insert({
      venue_id: VENUE_ID,
      storage_path: storagePath,
      tag: "station",
      station_id: sp.stationId,
      uploaded_by: OWNER_ID,
    });
    if (insertError) throw new Error(`insert failed for ${sp.name}: ${insertError.message}`);

    console.log(`Uploaded + linked photo for ${sp.name}`);
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
