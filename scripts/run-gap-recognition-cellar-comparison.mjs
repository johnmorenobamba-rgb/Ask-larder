// Real-intake vs. fallback comparison, per the follow-up task: Two Fires
// just went through the actual live intake flow (SopInterview) for
// cellar_and_gas_safety for the first time ever -- 9 real sop_intake_answers
// rows exist now, plus a freshly-curated module (draft, v1,
// acf1981a-0fa5-4859-a990-e2fae0f77895), separate from the old seeded
// "Beer Line & Cellar Hygiene" module already gap-checked in the previous
// run (f06ac21c-..., 4/5 gaps against current_module_content).
//
// This runs the SAME checklist (beer_line_cellar_hygiene, the closest
// existing match to the canonical cellar_and_gas_safety topic) against
// THREE inputs for a real comparison:
//   1. raw_intake_answers -- the actual sop_intake_answers rows, concatenated
//      (the live pipeline's real hookup point)
//   2. the freshly-curated module's content (what curateModuleContent wrote
//      from those same answers)
//   3. (for reference) the OLD seeded module's content, re-stated from the
//      previous run's persisted topic_gap_reports rather than re-querying
//      the LLM again, to avoid re-spending on an unchanged input
//
// Run with: npx tsx scripts/run-gap-recognition-cellar-comparison.mjs
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { detectContentGaps } from "../src/lib/ai/detectContentGaps.ts";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const VENUE_ID = "b379e33f-b0d8-47bf-810e-450635b29b6b";
const NEW_MODULE_ID = "acf1981a-0fa5-4859-a990-e2fae0f77895";

const { data: checklistRow } = await supabase
  .from("topic_gap_checklists")
  .select("*")
  .eq("topic_key", "beer_line_cellar_hygiene")
  .single();
const checklist = {
  topic_key: checklistRow.topic_key,
  title: checklistRow.title,
  sub_procedures: checklistRow.sub_procedures,
  version: checklistRow.version,
};

const { data: answerRows } = await supabase
  .from("sop_intake_answers")
  .select("question_key, answer_text")
  .eq("venue_id", VENUE_ID)
  .eq("topic_key", "cellar_and_gas_safety")
  .order("created_at");
const rawMaterial = answerRows.map((r) => `Q: ${r.question_key}\nA: ${r.answer_text}`).join("\n\n");

const { data: newSections } = await supabase
  .from("module_sections")
  .select("content")
  .eq("module_id", NEW_MODULE_ID)
  .order("section_order");
const curatedMaterial = newSections.map((s) => s.content ?? "").join("\n\n");

async function run(label, material, materialSource) {
  console.log(`\n=== ${label} (${material.length} chars) ===`);
  const findings = await detectContentGaps(checklist, material);
  const rows = findings.map((f) => ({
    venue_id: VENUE_ID,
    module_id: NEW_MODULE_ID,
    topic_key: "cellar_and_gas_safety",
    checklist_version: checklist.version,
    sub_procedure_key: f.subProcedureKey,
    standard_coverage: f.standardCoverage,
    venue_specific_coverage: f.venueSpecificCoverage,
    evidence_quote: f.evidenceQuote,
    recommended_action: f.recommendedAction,
    recommended_mechanism: f.recommendedMechanism,
    material_source: materialSource,
  }));
  await supabase.from("topic_gap_reports").insert(rows);
  for (const f of findings) {
    const flag = f.recommendedMechanism === "none" ? "OK  " : "GAP ";
    console.log(`  ${flag}${f.subProcedureKey}: standard=${f.standardCoverage}, venue=${f.venueSpecificCoverage}, action=${f.recommendedMechanism}`);
  }
  const gaps = findings.filter((f) => f.recommendedMechanism !== "none").length;
  console.log(`  -> ${gaps}/${findings.length} need action`);
  return { gaps, total: findings.length };
}

const rawResult = await run("REAL RAW INTAKE ANSWERS", rawMaterial, "raw_intake_answers");
const curatedResult = await run("FRESHLY CURATED MODULE (from those same answers)", curatedMaterial, "current_module_content");

console.log("\n=== COMPARISON ===");
console.log(`Old seeded module (previous run, current_module_content fallback): 4/5 needed action`);
console.log(`Real raw intake answers (this run):                                 ${rawResult.gaps}/${rawResult.total} needed action`);
console.log(`Freshly curated module from those answers (this run):               ${curatedResult.gaps}/${curatedResult.total} needed action`);
