// Task 2 completion: run the two-axis Gap-Recognition Agent against (a) the
// module actually generated for the QA venue's Workplace health & safety
// topic (drafted only from filler specialist answers, since analyze-document
// extracted zero real coverage from the uploaded Safe Work Australia doc --
// confirmed via sop_intake_answers, all answer_source='specialist'), and
// (b) the RAW real external document text directly, to see whether a
// broader "standard + venue-specific coverage" judgment (not a strict
// verbatim-extraction requirement like analyze-document's) finds more real
// signal in the same genuinely external source material.
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { detectContentGaps } from "../src/lib/ai/detectContentGaps.ts";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const QA_VENUE_ID = "b15aa2d4-190f-4467-b446-9fa88a3e2906";
const MODULE_ID = "8cfeb63e-dcf8-4c44-9e8d-22165d52c9bb";

const { data: checklistRow } = await supabase
  .from("topic_gap_checklists")
  .select("*")
  .eq("topic_key", "manual_handling_ppe")
  .single();
const checklist = {
  topic_key: checklistRow.topic_key,
  title: checklistRow.title,
  sub_procedures: checklistRow.sub_procedures,
  version: checklistRow.version,
};

const { data: sections } = await supabase.from("module_sections").select("content").eq("module_id", MODULE_ID).order("section_order");
const generatedMaterial = sections.map((s) => s.content ?? "").join("\n\n");

const rawDoc = readFileSync("C:\\Users\\johnm\\AppData\\Local\\Temp\\claude\\safework-accommodation-risks.txt", "utf-8");

async function run(label, material, materialSource) {
  console.log(`\n=== ${label} (${material.length} chars) ===`);
  const findings = await detectContentGaps(checklist, material);
  const rows = findings.map((f) => ({
    venue_id: QA_VENUE_ID,
    module_id: MODULE_ID,
    topic_key: "manual_handling_ppe_vs_workplace_health_and_safety",
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
    if (f.evidenceQuote) console.log(`       evidence: "${f.evidenceQuote.slice(0, 120)}"`);
  }
  const gaps = findings.filter((f) => f.recommendedMechanism !== "none").length;
  console.log(`  -> ${gaps}/${findings.length} need action`);
}

await run("Generated module (filler answers only)", generatedMaterial, "current_module_content");
await run("RAW real Safe Work Australia document (direct)", rawDoc, "raw_intake_answers");
