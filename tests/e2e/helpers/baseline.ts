import fs from "node:fs";
import path from "node:path";
import { adminClient, listObjects, removeFixtureObjects } from "./stage0";

// Run level safety net for every Playwright run (wired in as globalSetup and globalTeardown):
//  1. setup records baseline counts of the shared database,
//  2. teardown removes any DISPOSABLE fixture left behind by a failed or killed spec (service role, only venues made by
//     createFixture during this run and the synthetic logins made with them), then
//  3. compares the counts to the baseline and FAILS the run if anything differs. Never touches a venue it did not create.
export const FIXTURE_PREFIXES = ["s0", "td", "pl", "gd", "gh", "rg", "tl", "ev", "al", "ca", "es", "rc", "vt", "ge", "ex", "gp", "nh"];
const FILE = path.join("test-results", ".baseline.json");

export type Counts = { venues: number; records: number; logins: number; appUsers: number; roles: number; activation: number; signatures: number; certs: number; nearMissPhotos: number; onboardingUploads: number; photoLibrary: number };

async function count(table: string): Promise<number> {
  const { count: c, error } = await adminClient().from(table as never).select("*", { count: "exact", head: true });
  if (error) throw new Error(`baseline: could not count ${table}`);
  return c ?? 0;
}

async function loginCount(): Promise<number> {
  const admin = adminClient();
  let total = 0;
  for (let page = 1; page < 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("baseline: could not list logins");
    total += data.users.length;
    if (data.users.length < 1000) break;
  }
  return total;
}

export async function snapshot(): Promise<Counts> {
  return {
    venues: await count("venues"),
    records: await count("compliance_form_submissions"),
    logins: await loginCount(),
    appUsers: await count("app_users"),
    roles: await count("staff_roles"),
    activation: await count("venue_compliance_forms"),
    signatures: await count("esignatures"),
    certs: (await listObjects("certs")).length,
    nearMissPhotos: (await listObjects("near-miss-photos")).length,
    onboardingUploads: (await listObjects("onboarding-uploads")).length,
    photoLibrary: (await listObjects("photo-library")).length,
  };
}

export async function recordBaseline() {
  fs.mkdirSync("test-results", { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify({ startedAt: new Date().toISOString(), counts: await snapshot() }));
}

/** Remove disposable fixtures made during this run (matched by slug shape and creation time) and their synthetic logins. */
export async function sweepFixtures(startedAt: string): Promise<{ venues: number; logins: number }> {
  const admin = adminClient();
  const re = new RegExp(`^(${FIXTURE_PREFIXES.join("|")})-[0-9a-f]{8}$`);
  const { data: venues } = await admin.from("venues").select("id, slug").gte("created_at", startedAt);
  const ids = (venues ?? []).filter((v) => re.test(v.slug ?? "")).map((v) => v.id);
  const staffEmails: string[] = [];
  if (ids.length) {
    const { data: staff } = await admin.from("app_users").select("id").in("venue_id", ids);
    for (const s of staff ?? []) staffEmails.push(`staff-${s.id}@venue.internal`);
    for (const id of ids) await removeFixtureObjects(id); // only objects under the fixture's own venue folder
    await admin.from("venues").delete().in("id", ids); // cascades over records, activation rows, units, stations, staff
  }
  let logins = 0;
  const ownerRe = new RegExp(`^delivered\+(${FIXTURE_PREFIXES.join("|")})[0-9a-f]{8}@resend\.dev$`);
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  // staff logins made during this run whose staff row no longer exists (a spec deleted its venue but not the login)
  const { data: linked } = await admin.from("app_users").select("auth_id").not("auth_id", "is", null);
  const linkedIds = new Set((linked ?? []).map((r) => r.auth_id));
  const syntheticStaff = /^staff-[0-9a-f-]{36}@venue.internal$/;
  for (const u of list?.users ?? []) {
    if (new Date(u.created_at).getTime() < new Date(startedAt).getTime()) continue;
    const email = u.email ?? "";
    if (staffEmails.includes(email) || ownerRe.test(email) || (syntheticStaff.test(email) && !linkedIds.has(u.id))) {
      await admin.auth.admin.deleteUser(u.id);
      logins++;
    }
  }
  return { venues: ids.length, logins };
}

export async function checkBaseline() {
  if (!fs.existsSync(FILE)) return;
  const { startedAt, counts: before } = JSON.parse(fs.readFileSync(FILE, "utf8")) as { startedAt: string; counts: Counts };
  const swept = await sweepFixtures(startedAt);
  const after = await snapshot();
  const diffs = (Object.keys(before) as (keyof Counts)[]).filter((k) => before[k] !== after[k]).map((k) => `${k}: ${before[k]} to ${after[k]}`);
  if (swept.venues || swept.logins) console.warn(`[baseline] removed ${swept.venues} leftover fixture venue(s) and ${swept.logins} synthetic login(s) from this run`);
  if (diffs.length) throw new Error(`Baseline count check FAILED after this run (${diffs.join("; ")}). A spec left data behind.`);
  console.log(`[baseline] counts unchanged: ${Object.entries(after).map(([k, v]) => `${k} ${v}`).join(", ")}`);
}
