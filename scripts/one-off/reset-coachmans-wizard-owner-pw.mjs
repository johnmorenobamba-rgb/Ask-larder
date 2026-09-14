// Pre-launch audit (14 Sep 2026): the password on record for
// coachmans-arms-wizard-owner@example.com (memory said BlockUVerify2026!,
// set during Block U verification 2026-09-13) no longer works -- confirmed
// via a direct Supabase Auth password-grant call, "invalid_credentials".
// Resetting to a known value so the audit's parallel UI/UX and Sales lanes,
// which were both handed the stale password, can get in.
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const AUTH_USER_ID = "c5add398-c5d9-471d-ae9a-964a51d593c2";
const NEW_PASSWORD = "AuditReset2026!";

const { data, error } = await admin.auth.admin.updateUserById(AUTH_USER_ID, { password: NEW_PASSWORD });
if (error) throw error;
console.log("Password reset OK for", data.user.email);
