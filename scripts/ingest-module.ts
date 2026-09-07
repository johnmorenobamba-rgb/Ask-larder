import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { ingestModule } from "@/lib/ai/ingestModule";

// Not src/lib/supabase/admin.ts's createAdminClient(): that file is guarded
// by `server-only`, which throws unconditionally outside Next's bundler (it
// relies on webpack/Next module aliasing, not a runtime check) — it can't be
// imported from this standalone script at all. Same service-role client,
// just constructed inline for a context Next's guard doesn't cover.
function createAdminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const moduleId = process.argv[2];
if (!moduleId) {
  console.error("Usage: npx tsx scripts/ingest-module.ts <moduleId>");
  process.exit(1);
}

ingestModule(moduleId, createAdminClient())
  .then(({ chunkCount, title }) => {
    if (chunkCount === 0) {
      console.log(`"${title}" has no section content or questions to ingest — nothing to do.`);
    } else {
      console.log(`Ingested ${chunkCount} chunk(s) for "${title}".`);
    }
  })
  .catch((err) => {
    console.error("Ingestion failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
