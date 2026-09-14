// Set a known PIN directly for a disposable test-venue staff member, for
// live verification purposes (14 Sep build session). Same bcrypt cost as
// src/lib/auth/staffPin.ts's own setStaffPin().
import { config } from "dotenv";
config({ path: ".env.local" });
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const staffUserId = process.argv[2];
const pin = process.argv[3];
if (!staffUserId || !pin) {
  console.error("Usage: node set-test-staff-pin.mjs <staffUserId> <pin>");
  process.exit(1);
}

const pinHash = await bcrypt.hash(pin, 10);
const { error } = await admin
  .from("app_users")
  .update({ pin_hash: pinHash, pin_set_at: new Date().toISOString(), pin_failed_attempts: 0, pin_locked_until: null })
  .eq("id", staffUserId);
if (error) throw error;
console.log("PIN set OK for", staffUserId);
