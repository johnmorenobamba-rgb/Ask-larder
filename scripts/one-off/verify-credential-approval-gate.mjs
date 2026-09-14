// Live verification for item 2 (14 Sep build session): the new
// credential/access-code pre-publish check on the module approve route.
// Creates a disposable test module on Two Fires with unrestricted
// credential-like content, confirms approval is blocked, restricts it,
// confirms approval then succeeds, cleans up afterward.
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const TWO_FIRES_VENUE_ID = "b379e33f-b0d8-47bf-810e-450635b29b6b";
const BASE = "http://localhost:3000";
const results = [];
function check(label, ok, detail) {
  results.push({ label, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} - ${label}${detail ? " :: " + detail : ""}`);
}

const { data: module, error: moduleErr } = await admin
  .from("modules")
  .insert({ venue_id: TWO_FIRES_VENUE_ID, title: "TEST -- credential gate check", status: "pending_approval", version: 1 })
  .select("id")
  .single();
if (moduleErr) throw moduleErr;
const moduleId = module.id;
console.log("test module id:", moduleId);

const { data: section, error: sectionErr } = await admin
  .from("module_sections")
  .insert({
    module_id: moduleId,
    section_order: 1,
    content: "## Test section\nThe alarm code is 9911. Ask your supervisor if unsure.",
    provenance: "owner_sourced",
  })
  .select("id")
  .single();
if (sectionErr) throw sectionErr;

try {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${BASE}/two-fires/owner/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').pressSequentially("two-fires-owner@example.com", { delay: 15 });
  await page.locator('input[type="password"]').pressSequentially("TwoFiresVerify2026!", { delay: 15 });
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Log in" }).evaluate((el) => el.click());
  await page.waitForTimeout(2000);

  // Attempt 1: unrestricted, should be blocked with 400.
  const res1 = await page.request.post(`${BASE}/api/owner/modules/${moduleId}/approve`);
  const body1 = await res1.json().catch(() => null);
  check("unrestricted credential module blocked (400)", res1.status() === 400, `status=${res1.status()} body=${JSON.stringify(body1)}`);
  check("error message mentions restriction", !!body1?.error?.toLowerCase().includes("restrict"), body1?.error);

  const { data: stillPending } = await admin.from("modules").select("status").eq("id", moduleId).single();
  check("module still pending_approval after blocked attempt", stillPending?.status === "pending_approval", stillPending?.status);

  // Restrict to Duty Manager, then retry -- should now succeed.
  const { data: dutyManagerRole } = await admin
    .from("staff_roles")
    .select("id")
    .eq("venue_id", TWO_FIRES_VENUE_ID)
    .eq("name", "Venue Manager")
    .maybeSingle();
  check("found a real role to restrict to", !!dutyManagerRole, dutyManagerRole);
  if (dutyManagerRole) {
    await admin.from("module_roles").insert({ module_id: moduleId, role_id: dutyManagerRole.id });
    const res2 = await page.request.post(`${BASE}/api/owner/modules/${moduleId}/approve`);
    const body2 = await res2.json().catch(() => null);
    check("restricted module now approves (200)", res2.status() === 200, `status=${res2.status()} body=${JSON.stringify(body2)}`);
  }

  await browser.close();
} finally {
  // Cleanup: remove every trace of the disposable test module.
  await admin.from("module_roles").delete().eq("module_id", moduleId);
  await admin.from("module_sections").delete().eq("module_id", moduleId);
  await admin.from("modules").delete().eq("id", moduleId);
  console.log("cleanup done for test module", moduleId);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("FAILURES:", failed.map((f) => f.label).join(", "));
  process.exit(1);
}
