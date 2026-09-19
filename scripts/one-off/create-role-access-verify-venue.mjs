// One-off, disposable: verification fixture for the role-access-unification
// + contacts-directory live check (Part 1/2/3 of the 20 Sep 2026 task).
// Fresh throwaway venue, deleted entirely at the end of verification --
// never touches a real venue, matching the Block V4 tenant-isolation
// script's precedent for synthetic venue_contacts rows on disposable fixtures.
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const PASSWORD = "RoleAccessVerify2026!";
const slug = "role-access-verify";
const name = "Role Access Verify";
const email = "role-access-verify-owner@example.com";

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
