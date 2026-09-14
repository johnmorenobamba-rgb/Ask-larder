// Seeds the first onboarding_specialists row (15 Sep 2026 build session,
// Part 2 of the PIN-gate work): John, PIN 0623, active. Bcrypt-hashed the
// same way as everywhere else in this codebase (staffPin.ts, BCRYPT_COST
// 10) -- never stored in plaintext.
import { config } from "dotenv";
config({ path: ".env.local" });
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const pinHash = await bcrypt.hash("0623", 10);
const { data, error } = await admin
  .from("onboarding_specialists")
  .insert({ name: "John", pin_hash: pinHash, active: true })
  .select("id, name, active")
  .single();

if (error) {
  console.error("Failed to seed onboarding specialist:", error.message);
  process.exit(1);
}
console.log("Seeded onboarding specialist:", data);
