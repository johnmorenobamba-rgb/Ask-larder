// Block T6 -- headless test of the curation pipeline (persistModuleContent +
// curateModuleContent + curateSopDocumentFromIntake) against three real
// before/after comparisons on The Coachman's Arms: Equipment (a genuine
// total gap -- no such module exists today), Crowd control (existing
// narrative content, testing the Type 1 behavioral-read layer), and
// Allergen awareness (existing honest content, testing the Type 2
// safety-honesty layer). Simulates a specialist interview by inserting
// sop_intake_answers rows directly, same convention as the seed scripts.
//
// Run with: npx tsx scripts/test-block-t-curation.mjs
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { curateTopic } from "../src/lib/onboarding/curateTopic.ts";
import { confirmExtractedContact } from "../src/lib/onboarding/confirmContact.ts";

function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const supabase = createAdminClient();
const VENUE_SLUG = "block-p-pub-coachmans-arms";

const INTERVIEWS = {
  equipment_operating_and_cleaning: {
    trigger_and_scope: {
      type: "universal",
      text: "This covers the coldroom, the glasswasher behind the main bar, and the ice machine out the back. Doesn't cover the kitchen's own gear, Vinh handles that separately as part of food safety.",
    },
    who_performs_it: {
      type: "universal",
      text: "Whoever's on shift really, but Dave usually does the deep clean on the glasswasher on Mondays when we're closed for lunch.",
    },
    materials: {
      type: "universal",
      text: "Sanitiser tablets for the glasswasher, a scrubber, and the manual that's taped inside the cupboard under the ice machine.",
    },
    procedure: {
      type: "universal",
      text: "Glasswasher gets rinsed and a sanitiser tablet dropped in at the start of every shift, and wiped down at close. Ice machine gets scooped clean of any stray ice at the end of the night so it doesn't clog. Coldroom door seals get checked weekly, Monday, same day as the glasswasher deep clean.",
    },
    safety_critical: {
      type: "universal",
      text: "The ice machine drain can back up if it's not cleared, and if that happens water pools near the power outlet next to it, so if you ever see standing water near that outlet, don't touch anything until it's dry.",
    },
    definition_of_done: {
      type: "universal",
      text: "Glasswasher's rinsed out and looks clear, no cloudy glasses coming out, ice machine's got no stray ice built up around the chute.",
    },
    escalation_contact: { type: "universal", text: "Dave, our Duty Manager, if something's not working right on shift." },
    troubleshoot_then_escalate: {
      type: "troubleshoot_escalate",
      text: "If the glasswasher stops draining properly, first check the drain hose isn't kinked behind the unit, that fixes it most of the time. If that doesn't work, we call Robbo from Robbo's Cellar and Bar Equipment Co, his number's 0412 555 019, he's fixed it for us twice before.",
    },
  },
  crowd_control_and_door_security: {
    trigger_and_scope: {
      type: "universal",
      text: "Friday and Saturday nights, and Thursdays when there's a band on. Covers ID scanning, bag checks, and general door security those nights.",
    },
    who_performs_it: {
      type: "universal",
      text: "The contracted crowd controllers on the door, with the Duty Manager or Bar Supervisor backing them up if things get busy.",
    },
    materials: { type: "universal", text: "ID scanner, the incident log book kept behind the bar." },
    procedure: {
      type: "universal",
      text: "Crowd controllers scan ID and do bag checks on the door on the nights they're rostered. Bar staff still check ID manually behind the bar every night regardless.",
    },
    safety_critical: {
      type: "universal",
      text: "If there's ever a physical altercation near the door, staff should not physically intervene, only crowd controllers or police should. Right now there's no shared radio channel between the door and the bar, so if something's happening at the door, send someone over in person rather than assuming you can call out.",
    },
    definition_of_done: {
      type: "universal",
      text: "Door's covered for the whole night, incident log filled in if anything actually happened, nothing left for the next shift to chase up.",
    },
    escalation_contact: { type: "universal", text: "Dave, our Duty Manager, or Steph if Dave's not on." },
    behavioral_read: {
      type: "behavioral_read",
      text: "Last month a group tried to come in already pretty drunk. The first thing that tipped the crowd controller off wasn't anything they said, it was that one of them couldn't stand still in the queue line, kept swaying and grabbing the rail. That's usually the tell before anyone even starts talking to them.",
    },
  },
  food_handling_and_allergens: {
    trigger_and_scope: {
      type: "universal",
      text: "Comes up whenever a guest asks about an ingredient or discloses an allergy, at the table or at the bar. Covers our whole food menu, not drinks.",
    },
    who_performs_it: { type: "universal", text: "Whoever's serving the table, but they always have to check with the kitchen, not answer from memory." },
    materials: { type: "universal", text: "Nothing physical, it's a process not a checklist, the menu changes too often for a fixed list." },
    procedure: {
      type: "universal",
      text: "Guest mentions an allergy or intolerance. Staff member goes to the kitchen and asks directly, doesn't guess. Kitchen confirms or says they can't confirm.",
    },
    safety_critical: {
      type: "universal",
      text: "We genuinely don't have a full written allergen record for the whole menu, most of it's in Vinh's head.",
    },
    definition_of_done: {
      type: "universal",
      text: "Guest has a real answer, either a confirmed yes/no from the kitchen, or an honest 'we can't confirm that right now' if nobody's sure.",
    },
    escalation_contact: { type: "universal", text: "Vinh normally, or whoever's running the kitchen that shift." },
    safety_honesty_check: {
      type: "safety_honesty",
      text: "Honestly, yes, there's real cross-contamination risk we can't fully rule out, especially with the fryer and shared prep boards. If Vinh's not on and nobody in the kitchen is confident, staff need to tell the guest honestly that we can't confirm it right now, not say it's probably fine.",
    },
  },
};

const createdModuleIds = [];

for (const [topicKey, answers] of Object.entries(INTERVIEWS)) {
  const { data: venue, error: venueError } = await supabase.from("venues").select("id, name").eq("slug", VENUE_SLUG).maybeSingle();
  if (venueError || !venue) {
    console.error("Could not find venue:", venueError?.message ?? "not found");
    process.exit(1);
  }

  const rows = Object.entries(answers).map(([questionKey, a]) => ({
    venue_id: venue.id,
    topic_key: topicKey,
    question_key: questionKey,
    question_type: a.type,
    answer_text: a.text,
  }));
  const { error: insertError } = await supabase.from("sop_intake_answers").upsert(rows, { onConflict: "venue_id,topic_key,question_key" });
  if (insertError) {
    console.error(`Could not seed answers for ${topicKey}:`, insertError.message);
    continue;
  }

  // Deliberately NOT looking up/replacing any existing seeded module here --
  // Coachman's Arms is a shared fixture other validation passes depend on.
  // This always creates a new (draft-status, never gone live) module so the
  // real "before" content stays untouched on disk for comparison; the test
  // cleans these draft rows up again at the end.
  console.log(`\n${"=".repeat(70)}\nCURATING (new draft module): ${topicKey}\n${"=".repeat(70)}`);
  try {
    const result = await curateTopic(supabase, venue.id, topicKey);
    createdModuleIds.push(result.moduleId);
    console.log(`Module id: ${result.moduleId} (${result.chunkCount} chunks embedded)`);

    const { data: sections } = await supabase
      .from("module_sections")
      .select("content, is_restricted, section_order")
      .eq("module_id", result.moduleId)
      .order("section_order");
    const { data: questions } = await supabase
      .from("check_questions")
      .select("question, section_order, options, correct_option_index")
      .eq("module_id", result.moduleId);
    const { data: sopDoc } = await supabase.from("sop_documents").select("content, generated_via").eq("module_id", result.moduleId).maybeSingle();

    console.log("\n--- MODULE SECTIONS ---");
    for (const s of sections ?? []) {
      console.log(`\n[Section ${s.section_order}${s.is_restricted ? " RESTRICTED" : ""}]\n${s.content}`);
    }
    console.log("\n--- CHECK QUESTIONS ---");
    for (const q of questions ?? []) {
      console.log(`\nSection ${q.section_order}: ${q.question}`);
      (q.options ?? []).forEach((o, i) => console.log(`  ${i === q.correct_option_index ? "[correct]" : "          "} ${o}`));
    }
    console.log("\n--- SOP DOCUMENT (generated_via=" + sopDoc?.generated_via + ") ---");
    console.log(JSON.stringify(sopDoc?.content, null, 2));

    if (result.extractedContact) {
      console.log("\n--- EXTRACTED CONTACT CANDIDATE ---");
      console.log(JSON.stringify(result.extractedContact, null, 2));
      const confirmed = await confirmExtractedContact(supabase, venue.id, topicKey, "equipment_service");
      console.log("Confirmed into venue_contacts:", confirmed);
    } else {
      console.log("\n--- EXTRACTED CONTACT CANDIDATE --- none");
    }
  } catch (err) {
    console.error(`curateTopic failed for ${topicKey}:`, err instanceof Error ? err.message : err);
  }
}

if (createdModuleIds.length > 0) {
  console.log(`\nCleaning up ${createdModuleIds.length} test draft module(s) created against the shared Coachman's Arms fixture...`);
  await supabase.from("knowledge_chunks").delete().in("source_module_id", createdModuleIds);
  await supabase.from("sop_documents").delete().in("module_id", createdModuleIds);
  await supabase.from("check_questions").delete().in("module_id", createdModuleIds);
  await supabase.from("module_sections").delete().in("module_id", createdModuleIds);
  await supabase.from("modules").delete().in("id", createdModuleIds);
  console.log("Cleaned up.");
}

console.log("\nDone.");
