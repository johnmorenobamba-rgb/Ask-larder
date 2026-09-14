// Pre-launch audit (14 Sep 2026), follow-up to reset-coachmans-wizard-owner-pw.mjs:
// after resetting the password, login still failed with "email_not_confirmed"
// -- this venue's real owner account had email_confirmed_at unset in Supabase
// Auth, which blocks email+password login regardless of a correct password.
// This is the actual root cause of the login failures the parallel audit
// agents hit. Setting email_confirm: true, matching what bootstrapOwner.ts
// does for every new owner.
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const AUTH_USER_ID = "c5add398-c5d9-471d-ae9a-964a51d593c2";

const { data, error } = await admin.auth.admin.updateUserById(AUTH_USER_ID, { email_confirm: true });
if (error) throw error;
console.log("email_confirmed_at now:", data.user.email_confirmed_at);
