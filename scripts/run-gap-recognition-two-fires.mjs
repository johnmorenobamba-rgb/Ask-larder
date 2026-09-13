// Gap-Recognition Agent, real run against Two Fires' 14 live modules
// (Decision Log correction, 14 Sep 2026: standing pipeline step, run on
// every module always, including the "solid" ones -- length was never
// proof of completeness).
//
// Two Fires was seeded directly (seed-block-o-two-fires.mjs), bypassing the
// Block T/U intake flow that populates sop_intake_answers -- confirmed
// empty (0 rows, every venue) before this run. So the material checked here
// is each module's CURRENT drafted content (module_sections), not raw
// pre-draft intake answers -- recorded per-row as material_source =
// 'current_module_content', which is exactly the intended fallback for
// re-checking already-seeded/legacy modules per detectContentGaps.ts's doc
// comment.
//
// This run only REPORTS gaps (persisted to topic_gap_reports) -- it does
// not write standard-fill content into module_sections. Doing that for
// real needs the provenance-aware owner-approval UI (module_sections.
// provenance exists as of this migration, but nothing renders it yet),
// which is a separate, larger UI project than this scoping/reporting pass.
//
// Run with: npx tsx scripts/run-gap-recognition-two-fires.mjs
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { detectContentGaps } from "../src/lib/ai/detectContentGaps.ts";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const VENUE_ID = "b379e33f-b0d8-47bf-810e-450635b29b6b"; // Two Fires

const { data: modules, error: modulesError } = await supabase
  .from("modules")
  .select("id, title, topic_key")
  .eq("venue_id", VENUE_ID)
  .not("topic_key", "is", null)
  .order("title");
if (modulesError) throw new Error(modulesError.message);

const { data: checklists, error: checklistError } = await supabase.from("topic_gap_checklists").select("*");
if (checklistError) throw new Error(checklistError.message);
const checklistByTopic = new Map(checklists.map((c) => [c.topic_key, c]));

const summary = [];

for (const mod of modules) {
  const checklistRow = checklistByTopic.get(mod.topic_key);
  if (!checklistRow) {
    console.error(`SKIP ${mod.title}: no checklist for topic_key ${mod.topic_key}`);
    continue;
  }

  const { data: sections } = await supabase
    .from("module_sections")
    .select("content")
    .eq("module_id", mod.id)
    .order("section_order");
  const material = (sections ?? []).map((s) => s.content ?? "").join("\n\n");

  const checklist = {
    topic_key: checklistRow.topic_key,
    title: checklistRow.title,
    sub_procedures: checklistRow.sub_procedures,
    version: checklistRow.version,
  };

  console.log(`\n=== ${mod.title} (${material.length} chars, ${checklist.sub_procedures.length} checklist items) ===`);

  let findings;
  try {
    findings = await detectContentGaps(checklist, material);
  } catch (err) {
    console.error(`FAILED ${mod.title}:`, err instanceof Error ? err.message : err);
    continue;
  }

  const rows = findings.map((f) => ({
    venue_id: VENUE_ID,
    module_id: mod.id,
    topic_key: checklist.topic_key,
    checklist_version: checklist.version,
    sub_procedure_key: f.subProcedureKey,
    standard_coverage: f.standardCoverage,
    venue_specific_coverage: f.venueSpecificCoverage,
    evidence_quote: f.evidenceQuote,
    recommended_action: f.recommendedAction,
    recommended_mechanism: f.recommendedMechanism,
    material_source: "current_module_content",
  }));
  const { error: insertError } = await supabase.from("topic_gap_reports").insert(rows);
  if (insertError) console.error(`FAILED to persist report rows for ${mod.title}:`, insertError.message);

  const gaps = findings.filter((f) => f.recommendedMechanism !== "none");
  for (const f of findings) {
    const flag = f.recommendedMechanism === "none" ? "OK  " : "GAP ";
    console.log(
      `  ${flag}${f.subProcedureKey}: standard=${f.standardCoverage}, venue=${f.venueSpecificCoverage}, action=${f.recommendedMechanism}`,
    );
  }
  summary.push({ title: mod.title, total: findings.length, gaps: gaps.length });
}

console.log("\n=== SUMMARY ===");
for (const s of summary) {
  console.log(`${s.gaps}/${s.total} checklist items need action: ${s.title}`);
}
