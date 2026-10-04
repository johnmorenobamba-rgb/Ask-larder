import { config } from "dotenv";
config({ path: ".env.local" });

import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { exportVenue } from "@/lib/export/venueExport";

// FOUNDER RUN venue data export (the "no lock-in" function). Uses the service role, READ ONLY: it never writes to the database
// or storage. Writes one venue's records to a folder (and optionally a zip) OUTSIDE the repository.
//
//   npx tsx scripts/export-venue.ts <venue-slug> <output-folder> [--zip]
//
// Example:  npx tsx scripts/export-venue.ts coachmans-arms-wizard "C:\Larder exports\coachmans-2026-10-05" --zip
// The folder must not exist or must be empty, and must not be inside this repository. Hand the result over by a secure link.
// Not src/lib/supabase/admin.ts's createAdminClient(): that file is guarded by `server-only`, which cannot be imported here.
const [slug, out, ...flags] = process.argv.slice(2);
if (!slug || !out) {
  console.error("Usage: npx tsx scripts/export-venue.ts <venue-slug> <output-folder> [--zip]");
  process.exit(1);
}

async function main() {
  const admin = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const secretValues = [process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.ANTHROPIC_API_KEY, process.env.RESEND_API_KEY, process.env.VOYAGE_API_KEY].filter((v): v is string => !!v);
  const result = await exportVenue(admin, slug, path.resolve(out), { zip: flags.includes("--zip"), secretValues, repoRoot: process.cwd() });
  console.log(`Exported ${slug} to ${result.outDir}${result.zipPath ? ` and ${result.zipPath}` : ""}`);
  console.log(`${result.files.length + 1} files. Counts: ${Object.entries(result.counts).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  if (result.skipped.length) console.log(`Skipped ${result.skipped.length} file(s): see manifest.json`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : "export failed");
  process.exit(1);
});
