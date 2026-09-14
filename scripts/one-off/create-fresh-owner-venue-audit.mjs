// Pre-launch audit (14 Sep 2026): create one brand-new, empty venue + owner
// login for the "first-time owner, cold" audit lane, so that agent experiences
// real onboarding/setup rather than a pre-populated demo venue.
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const PASSWORD = "FreshOwnerAudit2026!";
const slug = "the-public-bar-audit";
const name = "The Public Bar";
const email = "public-bar-audit-owner@example.com";

const { data: authData, error: authErr } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
if (authErr) throw authErr;
const { data, error } = await admin.rpc("bootstrap_owner", {
  p_auth_id: authData.user.id,
  p_venue_name: name,
  p_venue_slug: slug,
  p_owner_name: "Sam Whitfield",
  p_owner_email: email,
});
if (error) throw error;
console.log(JSON.stringify({ venueId: data.venue_id, authUserId: authData.user.id, email, password: PASSWORD, slug }, null, 2));
