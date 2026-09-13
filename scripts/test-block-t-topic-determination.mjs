// Block T6 -- headless test of T1's determination logic across three
// different venue profiles, proving it genuinely selects different topic
// sets per venue rather than silently reproducing the same fixed 15/16
// every time. Run with:
//   npx tsx scripts/test-block-t-topic-determination.mjs
//
// Sets a representative venue_type_flags profile on three existing seeded
// venues (this only affects sop_topic_decisions -- it does not touch their
// real module/content rows), then calls determineSopTopics() directly, the
// same function the determine-topics API route calls.
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { determineSopTopics } from "../src/lib/ai/sopTopicDetermination.ts";

function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const supabase = createAdminClient();

const PROFILES = [
  {
    label: "The Coachman's Arms Hotel -- full licensed pub, kitchen, crowd control, happy hour",
    slug: "block-p-pub-coachmans-arms",
    flags: {
      licensed: true,
      crowd_control_required: true,
      runs_happy_hour: true,
      food_service_level: "full_kitchen",
      founder_escalation: [],
    },
  },
  {
    label: "The Batch House -- unlicensed cafe, full kitchen, no crowd control",
    slug: "block-p-cafe-batch-house",
    flags: {
      licensed: false,
      crowd_control_required: false,
      runs_happy_hour: false,
      food_service_level: "full_kitchen",
      founder_escalation: [],
    },
  },
  {
    label: "Synthetic test profile on The Quiet Fox -- licensed pub, bar snacks only, EGM entitlement",
    slug: "block-p-quiet-fox",
    flags: {
      licensed: true,
      crowd_control_required: true,
      runs_happy_hour: true,
      food_service_level: "bar_snacks_low_risk",
      founder_escalation: ["gaming_egm"],
    },
  },
];

for (const profile of PROFILES) {
  const { data: venue, error: venueError } = await supabase.from("venues").select("id, name").eq("slug", profile.slug).maybeSingle();
  if (venueError || !venue) {
    console.error(`Could not find venue ${profile.slug}:`, venueError?.message ?? "not found");
    continue;
  }

  const { error: sessionError } = await supabase
    .from("wizard_sessions")
    .upsert({ venue_id: venue.id, venue_type_flags: profile.flags }, { onConflict: "venue_id" });
  if (sessionError) {
    console.error(`Could not set flags for ${venue.name}:`, sessionError.message);
    continue;
  }

  console.log(`\n=== ${profile.label} ===`);
  console.log("Flags:", JSON.stringify(profile.flags));
  try {
    const decisions = await determineSopTopics(venue.id, supabase);
    const applicable = decisions.filter((d) => d.applicable).map((d) => d.topicKey);
    const notApplicable = decisions.filter((d) => !d.applicable).map((d) => d.topicKey);
    const lowConfidence = decisions.filter((d) => d.confidence === "low");

    console.log(`Applicable (${applicable.length}):`, applicable.join(", "));
    console.log(`Not applicable (${notApplicable.length}):`, notApplicable.join(", "));
    if (lowConfidence.length > 0) {
      console.log("Low-confidence flags for specialist confirm:");
      for (const d of lowConfidence) {
        console.log(`  - ${d.topicKey} (${d.source}, applicable=${d.applicable}): ${d.rationale}`);
      }
    } else {
      console.log("Low-confidence flags: none");
    }
  } catch (err) {
    console.error(`determineSopTopics failed for ${venue.name}:`, err instanceof Error ? err.message : err);
  }
}

console.log("\nDone.");
