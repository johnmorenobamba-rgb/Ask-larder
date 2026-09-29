// Suggestion assistant Part 4 live verification (21 Sep 2026): a fresh,
// fully disposable venue -- never touches any real account or Coachman's
// Arms. Deliberately a SMALL team (5 active staff) to test the
// proportion-of-staff threshold for real, not just a large venue where the
// old flat "3 distinct staff" floor would have worked anyway.
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const PASSWORD = process.env.TEST_VENUE_PASSWORD;
if (!PASSWORD) {
  console.error("Missing TEST_VENUE_PASSWORD. Set it in .env.local before running this script.");
  process.exit(1);
}
const slug = "suggestion-verify";
const name = "Suggestion Verify Venue";
const email = "suggestion-verify-owner@example.com";

const { data: authData, error: authErr } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
if (authErr) throw authErr;
const { data, error } = await admin.rpc("bootstrap_owner", {
  p_auth_id: authData.user.id,
  p_venue_name: name,
  p_venue_slug: slug,
  p_owner_name: "Test Owner",
  p_owner_email: email,
});
if (error) throw error;

console.log(JSON.stringify({ venueId: data.venue_id, authUserId: authData.user.id, email, password: PASSWORD, slug }, null, 2));
