// Mints a real Supabase Auth session for an existing user without touching
// or knowing their password (generateLink + verifyOtp, the same mechanism
// loginWithStaffPin uses for PIN login). Usage:
//   npx tsx scripts/mint-owner-session.mjs <email>
//
// IMPORTANT, confirmed the hard way during Block V (2026-09-13): the
// resulting access_token is only useful for testing Supabase's own REST API
// directly (RLS-enforced Postgrest calls) or Supabase Auth endpoints. It is
// NOT useful as a Bearer token against this app's own Next.js routes --
// src/lib/supabase/server.ts's createClient() is cookie-only (@supabase/ssr
// createServerClient reading next/headers' cookies()), so an Authorization
// header is silently ignored there and getCurrentStaff() will resolve to
// "not authenticated" regardless of whether the token is valid. To test an
// actual app route as a specific user, either log in through the real UI
// (a password is required -- set one via admin.auth.admin.updateUserById
// on disposable test data, never on a real account without asking) or hit
// Supabase's REST API directly with this token, mirroring the exact query
// the route's own lib code runs (see e.g. getCurrentStaff() in
// src/lib/auth/session.ts) rather than trying to drive the Next.js route
// itself.
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx tsx scripts/mint-owner-session.mjs <email>");
  process.exit(1);
}

const admin = createAdminClient();
const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
if (linkError || !linkData) throw linkError ?? new Error("no link data");

const { data: otpData, error: otpError } = await admin.auth.verifyOtp({
  type: "magiclink",
  token_hash: linkData.properties.hashed_token,
});
if (otpError || !otpData?.session) throw otpError ?? new Error("no session");

console.log(JSON.stringify({ access_token: otpData.session.access_token, refresh_token: otpData.session.refresh_token }));
