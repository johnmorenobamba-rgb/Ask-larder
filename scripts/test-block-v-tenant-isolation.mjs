// Block V4 -- independent multi-tenant isolation re-verification across
// every table added since Block Q's last isolation test. Two fresh
// disposable venues, populated with real rows, then tested with each
// venue's own authenticated (anon-key, signed-in) client -- the same RLS
// enforcement path the app's own server client uses for every one of these
// tables -- attempting cross-venue reads/writes. Never uses the service-role
// key for the actual test assertions, only for setup/teardown.
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const PASSWORD = "BlockV4Isolation2026!";

async function createTestVenue(slug, name) {
  const email = `${slug}-owner@example.com`;
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (authErr) throw authErr;
  const { data, error } = await admin.rpc("bootstrap_owner", {
    p_auth_id: authData.user.id,
    p_venue_name: name,
    p_venue_slug: slug,
    p_owner_name: "Test Owner",
    p_owner_email: email,
  });
  if (error) throw error;
  return { venueId: data.venue_id, authUserId: authData.user.id, email };
}

async function populateVenue(venueId, label) {
  const { data: moduleRow, error: moduleErr } = await admin
    .from("modules")
    .insert({ venue_id: venueId, title: `${label} module`, topic_key: "welcome_and_how_we_work" })
    .select("id")
    .single();
  if (moduleErr) throw moduleErr;
  const moduleId = moduleRow.id;

  const { data: stationRow, error: stationErr } = await admin
    .from("stations")
    .insert({ venue_id: venueId, name: `${label} station`, qr_code_slug: `${label}-station-${Math.random().toString(36).slice(2, 8)}` })
    .select("id")
    .single();
  if (stationErr) throw stationErr;
  const stationId = stationRow.id;

  const rows = {};

  const { data: sopDoc, error: e1 } = await admin
    .from("sop_documents")
    .insert({ module_id: moduleId, content: { purpose: `${label} secret purpose` }, generated_from_hash: "test", generated_via: "intake_curation" })
    .select("id")
    .single();
  if (e1) throw e1;
  rows.sop_documents = sopDoc.id;

  const { data: editReq, error: e2 } = await admin
    .from("sop_edit_requests")
    .insert({ venue_id: venueId, module_id: moduleId, description: `${label} edit request` })
    .select("id")
    .single();
  if (e2) throw e2;
  rows.sop_edit_requests = editReq.id;

  rows.stations = stationId;

  const { data: photo, error: e3 } = await admin
    .from("photo_library")
    .insert({ venue_id: venueId, storage_path: `${venueId}/${label}-fake.jpg`, tag: "station", station_id: stationId })
    .select("id")
    .single();
  if (e3) throw e3;
  rows.photo_library = photo.id;

  const { data: contact, error: e4 } = await admin
    .from("venue_contacts")
    .insert({ venue_id: venueId, contact_type: "electrician", name: `${label} electrician` })
    .select("id")
    .single();
  if (e4) throw e4;
  rows.venue_contacts = contact.id;

  const { data: answer, error: e5 } = await admin
    .from("sop_intake_answers")
    .insert({ venue_id: venueId, topic_key: "welcome_and_how_we_work", question_key: "trigger_and_scope", question_type: "universal", answer_text: `${label} secret answer` })
    .select("id")
    .single();
  if (e5) throw e5;
  rows.sop_intake_answers = answer.id;

  const { data: sourceDoc, error: e6 } = await admin
    .from("sop_source_documents")
    .insert({ venue_id: venueId, topic_key: "welcome_and_how_we_work", file_ref: "fake.txt", raw_content: `${label} secret document`, processed_status: "parsed" })
    .select("id")
    .single();
  if (e6) throw e6;
  rows.sop_source_documents = sourceDoc.id;

  const { data: decision, error: e7 } = await admin
    .from("sop_topic_decisions")
    .insert({ venue_id: venueId, topic_key: "welcome_and_how_we_work", applicable: true, confidence: "high", source: "rule", rationale: `${label} secret rationale` })
    .select("id")
    .single();
  if (e7) throw e7;
  rows.sop_topic_decisions = decision.id;

  return { moduleId, stationId, rows };
}

function authedClient(email) {
  return createClient(URL, ANON_KEY);
}

async function signIn(client, email) {
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
}

console.log("Creating two disposable test venues...");
const venueA = await createTestVenue("block-v4-isolation-a", "Block V4 Isolation Test A");
const venueB = await createTestVenue("block-v4-isolation-b", "Block V4 Isolation Test B");
console.log("Venue A:", venueA.venueId, " Venue B:", venueB.venueId);

console.log("Populating both venues across all 8 tables...");
const dataA = await populateVenue(venueA.venueId, "venue-a");
const dataB = await populateVenue(venueB.venueId, "venue-b");

const clientA = authedClient(venueA.email);
const clientB = authedClient(venueB.email);
await signIn(clientA, venueA.email);
await signIn(clientB, venueB.email);

const TABLES = ["sop_documents", "sop_edit_requests", "stations", "photo_library", "venue_contacts", "sop_intake_answers", "sop_source_documents", "sop_topic_decisions"];

let pass = 0;
let fail = 0;
const failures = [];

async function testDirection(attackerClient, attackerLabel, victimRows, victimLabel) {
  for (const table of TABLES) {
    const id = victimRows[table];

    // Read attempt
    const { data: readData, error: readError } = await attackerClient.from(table).select("id").eq("id", id);
    const readBlocked = !readError && (readData ?? []).length === 0;
    if (readBlocked) pass++;
    else {
      fail++;
      failures.push(`READ LEAK: ${attackerLabel} could read ${victimLabel}'s ${table} row (error=${readError?.message ?? "none"}, rows=${JSON.stringify(readData)})`);
    }

    // Write attempt (update)
    const { data: writeData, error: writeError } = await attackerClient.from(table).update({ id }).eq("id", id).select("id");
    const writeBlocked = !!writeError || (writeData ?? []).length === 0;
    if (writeBlocked) pass++;
    else {
      fail++;
      failures.push(`WRITE LEAK: ${attackerLabel} could write ${victimLabel}'s ${table} row (error=${writeError?.message ?? "none"}, rows=${JSON.stringify(writeData)})`);
    }
  }
}

console.log("\nTesting venue A's authenticated client against venue B's rows...");
await testDirection(clientA, "Venue A", dataB.rows, "Venue B");

console.log("Testing venue B's authenticated client against venue A's rows...");
await testDirection(clientB, "Venue B", dataA.rows, "Venue A");

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed (out of ${pass + fail}) ===`);
if (failures.length > 0) {
  console.log("\nFAILURES:");
  failures.forEach((f) => console.log(" - " + f));
}

console.log("\nCleaning up both test venues...");
for (const venueId of [venueA.venueId, venueB.venueId]) {
  await admin.from("sop_documents").delete().in("module_id", (await admin.from("modules").select("id").eq("venue_id", venueId)).data?.map((m) => m.id) ?? []);
  await admin.from("sop_edit_requests").delete().eq("venue_id", venueId);
  await admin.from("photo_library").delete().eq("venue_id", venueId);
  await admin.from("venue_contacts").delete().eq("venue_id", venueId);
  await admin.from("sop_intake_answers").delete().eq("venue_id", venueId);
  await admin.from("sop_source_documents").delete().eq("venue_id", venueId);
  await admin.from("sop_topic_decisions").delete().eq("venue_id", venueId);
  await admin.from("stations").delete().eq("venue_id", venueId);
  await admin.from("modules").delete().eq("venue_id", venueId);
  const { data: users } = await admin.from("app_users").select("id, auth_id").eq("venue_id", venueId);
  for (const u of users ?? []) {
    await admin.from("app_users").delete().eq("id", u.id);
    if (u.auth_id) await admin.auth.admin.deleteUser(u.auth_id);
  }
  await admin.from("venues").delete().eq("id", venueId);
}
console.log("Cleaned up.");
