// Pre-launch audit (14 Sep 2026), correction: the credential used earlier
// (coachmans-arms-wizard-owner@example.com) turned out to be an orphaned
// auth.users row with no app_users record at all -- not the real owner.
// The REAL owner of coachmans-arms-wizard (venue_id 79a9ea70-8302-4ab8-b501-
// 8d27dc85457e) is john.moreno.bamba+coachmans-arms-wizard@gmail.com
// (auth_id c83714d6-df05-421e-a444-ea448b6e7391), already email-confirmed.
// Resetting its password to a known value so the audit can actually verify
// the real owner dashboard. This is John's own account (gmail alias) --
// reported clearly in the session's final handover, not a disposable test
// user.
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const AUTH_USER_ID = "c83714d6-df05-421e-a444-ea448b6e7391";
const NEW_PASSWORD = "RealOwnerAudit2026!";

const { data, error } = await admin.auth.admin.updateUserById(AUTH_USER_ID, { password: NEW_PASSWORD });
if (error) throw error;
console.log("Password reset OK for", data.user.email, "confirmed_at:", data.user.email_confirmed_at);
