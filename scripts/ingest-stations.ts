import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { ingestStationContent } from "@/lib/ai/ingestStationContent";

// Backfill / repair: embeds every station's APPROVED FAQs and troubleshooting
// entries for one venue into knowledge_chunks (see ingestStationContent).
// Safe to rerun; a station with no approved entries has its chunks removed.
//
//   npx tsx scripts/ingest-stations.ts <venueId>
//
// Service-role client built inline, same reason as scripts/ingest-module.ts
// (src/lib/supabase/admin.ts is `server-only` guarded).
function createAdminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const venueId = process.argv[2];
  if (!venueId) {
    console.error("Usage: npx tsx scripts/ingest-stations.ts <venueId>");
    process.exit(1);
  }

  const supabase = createAdminClient();
  const { data: stations, error } = await supabase
    .from("stations")
    .select("id, name")
    .eq("venue_id", venueId)
    .order("name");
  if (error) throw new Error(error.message);
  if (!stations || stations.length === 0) {
    console.log("No stations for this venue. Nothing to do.");
    return;
  }

  let failures = 0;
  for (const station of stations) {
    // A free-tier Voyage key allows about 3 requests a minute; retry a
    // rate-limited station after a pause rather than failing the whole run.
    for (let attempt = 1; ; attempt++) {
      try {
        const { chunkCount } = await ingestStationContent(station.id, supabase);
        console.log(`${station.name}: ${chunkCount} chunk(s).`);
        break;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (attempt < 3 && message.includes("(429)")) {
          console.log(`${station.name}: rate limited, retrying in 30s.`);
          await sleep(30_000);
          continue;
        }
        console.error(`${station.name}: FAILED: ${message}`);
        failures++;
        break;
      }
    }
  }

  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Station ingest failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
