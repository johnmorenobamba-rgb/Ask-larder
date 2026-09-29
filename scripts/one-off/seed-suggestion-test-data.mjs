// Suggestion assistant Part 4 live verification (21 Sep 2026): seeds the
// disposable suggestion-verify venue with a deliberately SMALL team (5
// active staff) plus real activity data crafted to exercise all three
// detectors, the proportional small-venue threshold, and the credential
// gate -- all clearly synthetic, all on a throwaway venue.
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const VENUE_ID = "2d7eb4b2-19f6-408f-b5d9-8e547c21e12b";

async function must(label, promise) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

// -- Roles --
const [headChefRole, lineCookRole] = await must(
  "staff_roles",
  admin
    .from("staff_roles")
    .insert([
      { venue_id: VENUE_ID, name: "Head Chef", department: "BOH", fallback_tier: "authorized" },
      { venue_id: VENUE_ID, name: "Line Cook", department: "BOH", fallback_tier: "frontline" },
    ])
    .select("id, name"),
);

// -- Staff: 5 active (small team, per John's small-venue threshold requirement) --
const staffNames = [
  { name: "Ravi Nair", role: headChefRole.id },
  { name: "Priya Chandra", role: lineCookRole.id },
  { name: "Tomas Weber", role: lineCookRole.id },
  { name: "Mia Alvarez", role: lineCookRole.id },
  { name: "Josh Kelly", role: lineCookRole.id },
];
const staff = await must(
  "app_users",
  admin
    .from("app_users")
    .insert(staffNames.map((s) => ({ venue_id: VENUE_ID, name: s.name, role: "staff", staff_role_id: s.role })))
    .select("id, name"),
);
const staffByName = Object.fromEntries(staff.map((s) => [s.name, s.id]));

// -- Station (for stationName evidence on escalations/near-misses) --
const station = await must(
  "stations",
  admin.from("stations").insert({ venue_id: VENUE_ID, name: "Cold Store", qr_code_slug: `suggestion-verify-cold-store-${randomUUID().slice(0, 8)}` }).select("id").single(),
);

// -- A live module (target for suggestions) with an existing version row --
const module_ = await must(
  "modules",
  admin
    .from("modules")
    .insert({ venue_id: VENUE_ID, title: "Kitchen Safety Basics", status: "live", version: 1, topic_key: "kitchen_safety_basics" })
    .select("id")
    .single(),
);
await must(
  "module_sections",
  admin
    .from("module_sections")
    .insert({ module_id: module_.id, content: "Always wear cut-resistant gloves when breaking down deliveries.", provenance: "owner_sourced", section_order: 0 }),
);
await must("module_versions", admin.from("module_versions").insert({ module_id: module_.id, version: 1, changelog: "Initial version." }));

function iso(daysAgo) {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

// -- Repeated-gap cluster: SMALL-VENUE THRESHOLD TEST --
// 5 active staff -> threshold = max(2, ceil(5*0.3)) = 2. A flat "3 distinct
// staff" floor (the design John rejected) would never fire here. 2 distinct
// staff, differently phrased, same real topic (walk-in fridge thermostat).
const gapPairs = [
  { staff: "Priya Chandra", text: "How do I adjust the temperature on the walk-in fridge, it feels too warm today" },
  { staff: "Tomas Weber", text: "The cold room doesn't feel cold enough, is there a dial somewhere to turn it down" },
];
const gapRows = [];
gapPairs.forEach((g, i) => {
  const exchangeId = randomUUID();
  gapRows.push({ venue_id: VENUE_ID, role: "user", message: g.text, user_id: staffByName[g.staff], exchange_id: exchangeId, created_at: iso(3 + i) });
  gapRows.push({
    venue_id: VENUE_ID,
    role: "assistant",
    message: "I don't have an approved answer for that. Ask your supervisor for assistance.",
    user_id: staffByName[g.staff],
    exchange_id: exchangeId,
    out_of_scope: true,
    created_at: iso(3 + i),
  });
});

// -- Escalation-pattern cluster: 3 escalations, same real topic (burns first aid) --
const escalationTriples = [
  { staff: "Priya Chandra", text: "I got a minor oil splash burn on my hand, where's the first aid kit for burns" },
  { staff: "Mia Alvarez", text: "Someone needs the burn gel, which cupboard is that kept in" },
  { staff: "Josh Kelly", text: "What do I do right now, I just burned my wrist on the grill" },
];
const escalationRows = [];
escalationTriples.forEach((e, i) => {
  const exchangeId = randomUUID();
  escalationRows.push({ venue_id: VENUE_ID, role: "user", message: e.text, user_id: staffByName[e.staff], exchange_id: exchangeId, station_id: station.id, created_at: iso(10 + i) });
  escalationRows.push({
    venue_id: VENUE_ID,
    role: "assistant",
    message: "This needs a person, not me. Ask your supervisor for assistance, as they have access to first aid supplies.",
    user_id: staffByName[e.staff],
    exchange_id: exchangeId,
    station_id: station.id,
    is_escalation: true,
    created_at: iso(10 + i),
  });
});

await must("chat_messages", admin.from("chat_messages").insert([...gapRows, ...escalationRows]));

// -- Near-miss cluster A: genuine safety pattern, no credential (2 reports) --
const nearMissSafety = [
  { staff: "Mia Alvarez", text: "Almost slipped on a wet patch near the walk-in door, the floor mat there has gone flat and isn't gripping anymore" },
  { staff: "Josh Kelly", text: "Nearly went over by the cold room entrance, that mat is basically worn smooth now, someone could really hurt themselves" },
];

// -- Near-miss cluster B: CREDENTIAL GATE TEST (generation time) --
// Real staff evidence naturally states a real code -- exactly the scenario
// the gate exists for: genuine evidence, not model invention, still must
// never reach a normal pending suggestion.
const nearMissCredential = [
  { staff: "Priya Chandra", text: "Couldn't remember the loading dock gate code, 5893, and had to wait outside in the rain for ten minutes until someone let me in" },
  { staff: "Tomas Weber", text: "Forgot the gate code again, it's 5893, ended up climbing over the low fence instead of waiting around" },
];

const nearMissRows = [...nearMissSafety, ...nearMissCredential].map((n, i) => ({
  venue_id: VENUE_ID,
  description: n.text,
  reported_by: staffByName[n.staff],
  station_id: station.id,
  is_anonymous: false,
  status: "open",
  created_at: iso(5 + i),
}));
await must("near_miss_reports", admin.from("near_miss_reports").insert(nearMissRows));

console.log(
  JSON.stringify(
    {
      venueId: VENUE_ID,
      moduleId: module_.id,
      stationId: station.id,
      headChefRoleId: headChefRole.id,
      lineCookRoleId: lineCookRole.id,
      staff: staffByName,
      activeStaffCount: staff.length,
      expectedRepeatedGapThreshold: "max(2, ceil(5*0.3)) = 2",
    },
    null,
    2,
  ),
);
