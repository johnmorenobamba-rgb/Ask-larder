// Live verification for item 8's email-format guardrail (14 Sep build
// session): bootstrap-owner should now reject an obviously-placeholder
// email the way Two Fires' was, and still accept a real-looking one.
//
// The realistic-email case below actually creates a real venue + owner
// through the real, unauthenticated /api/auth/bootstrap-owner route
// (the exact endpoint flagged mid-item-8 as a real, live self-serve-
// signup gap contradicting CLAUDE.md's locked decision) -- cleaned up
// immediately after.
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BASE = "http://localhost:3000";
const results = [];
function check(label, ok, detail) {
  results.push({ label, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} - ${label}${detail ? " :: " + detail : ""}`);
}

async function attempt(email) {
  const res = await fetch(`${BASE}/api/auth/bootstrap-owner`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      venueName: "TEST Email Guardrail Check",
      venueSlug: `test-email-guardrail-${Date.now()}`,
      ownerName: "Test Owner",
      ownerEmail: email,
      ownerPassword: "TestPassword2026!",
    }),
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

const r1 = await attempt("someone@example.com");
check("example.com rejected (400)", r1.status === 400, JSON.stringify(r1.body));

const r2 = await attempt("not-an-email");
check("malformed email rejected (400)", r2.status === 400, JSON.stringify(r2.body));

const r3 = await attempt("owner@venue.test");
check(".test TLD rejected (400)", r3.status === 400, JSON.stringify(r3.body));

// A real-looking email should still pass the guardrail itself (may still
// fail downstream for other reasons, e.g. Supabase local validation, but
// must NOT fail with the guardrail's own message).
const r4 = await attempt(`email-guardrail-check-${Date.now()}@gmail.com`);
const guardrailBlockedIt = r4.status === 400 && r4.body?.error?.includes("doesn't look like a real address");
check("realistic email is NOT blocked by the guardrail", !guardrailBlockedIt, JSON.stringify(r4));

// Clean up the real venue/owner this last call just created.
if (r4.status === 201 && r4.body?.venueId) {
  await admin.from("app_users").delete().eq("id", r4.body.ownerId);
  await admin.from("venues").delete().eq("id", r4.body.venueId);
  await admin.auth.admin.deleteUser(r4.body.authUserId);
  console.log("cleaned up test venue", r4.body.venueId);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("FAILURES:", failed.map((f) => f.label).join(", "));
  process.exit(1);
}
