// Re-test Task 1's fix against the exact same real Safe Work Australia
// document already on file for internal-qa-test / workplace_health_and_safety
// (sop_source_documents), comparing the old strict-only pass against the
// new two-pass result.
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { detectSopGaps, detectSopGapsTwoPass } from "../src/lib/ai/detectSopGaps.ts";
import { getQuestionsForTopic } from "../src/lib/onboarding/sopQuestions.ts";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const QA_VENUE_ID = "b15aa2d4-190f-4467-b446-9fa88a3e2906";

const { data: sourceDoc, error } = await supabase
  .from("sop_source_documents")
  .select("raw_content")
  .eq("venue_id", QA_VENUE_ID)
  .eq("topic_key", "workplace_health_and_safety")
  .limit(1)
  .maybeSingle();
if (error || !sourceDoc) throw new Error("Couldn't load the stored source document: " + (error?.message ?? "not found"));

const questions = getQuestionsForTopic("workplace_health_and_safety");

console.log("=== BEFORE (strict verbatim only, detectSopGaps) ===");
const before = await detectSopGaps("Workplace health & safety", sourceDoc.raw_content, questions);
for (const r of before) {
  console.log(`  ${r.covered ? "COVERED" : "gap    "} ${r.questionKey}${r.covered ? `: "${r.extractedAnswer?.slice(0, 100)}"` : ""}`);
}
console.log(`-> ${before.filter((r) => r.covered).length}/${before.length} covered`);

console.log("\n=== AFTER (two-pass: verbatim + structural fallback) ===");
const after = await detectSopGapsTwoPass("Workplace health & safety", sourceDoc.raw_content, questions);
for (const r of after) {
  console.log(`  ${r.covered ? "COVERED" : "gap    "} ${r.questionKey} [${r.source ?? "-"}]`);
  if (r.covered) {
    console.log(`           answer: "${r.answerText?.slice(0, 150)}"`);
    if (r.evidenceQuote) console.log(`           evidence: "${r.evidenceQuote.slice(0, 120)}"`);
  }
}
console.log(`-> ${after.filter((r) => r.covered).length}/${after.length} covered`);
