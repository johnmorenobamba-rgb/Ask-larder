// Disposable test venue (Two Fires) -- setting a known password to drive
// the real owner-side UI for a live verification check (provenance badge
// fix, 14 Sep 2026 pre-launch audit follow-up work).
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: users } = await admin.auth.admin.listUsers();
const user = users.users.find((u) => u.email === "two-fires-owner@example.com");
if (!user) throw new Error("two-fires-owner@example.com not found");

const { error } = await admin.auth.admin.updateUserById(user.id, { password: "TwoFiresVerify2026!", email_confirm: true });
if (error) throw error;
console.log("Password reset OK for two-fires-owner@example.com");
