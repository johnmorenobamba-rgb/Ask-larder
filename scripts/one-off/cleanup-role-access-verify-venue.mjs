// Teardown for scripts/one-off/create-role-access-verify-venue.mjs -- the
// disposable venue used to live-verify the 20 Sep 2026 role-access
// unification + contacts directory work. Full deletion (not just the
// staff-deactivate flow) since the whole venue is throwaway, matching the
// test-block-v-tenant-isolation.mjs cleanup pattern.
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const venueId = "fab0c873-cbbc-4b04-8201-3ecd42e6bdd1";

await admin.from("chat_messages").delete().eq("venue_id", venueId);
await admin.from("venue_contacts").delete().eq("venue_id", venueId);
await admin.from("staff_roles").delete().eq("venue_id", venueId);

const { data: users } = await admin.from("app_users").select("id, auth_id").eq("venue_id", venueId);
for (const u of users ?? []) {
  await admin.from("app_users").delete().eq("id", u.id);
  if (u.auth_id) await admin.auth.admin.deleteUser(u.auth_id);
}

await admin.from("venues").delete().eq("id", venueId);

console.log("Cleaned up role-access-verify venue:", venueId);
