// Regenerates content for Pizza Station specifically, after fixing the
// thinness bug in researchEquipmentContent.ts (application-level count
// check + forced retry, since strict-mode minItems only accepts 0/1).
// Deletes the old 1-section/1-FAQ/1-issue result first.
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { researchEquipmentContent } from "../src/lib/ai/researchEquipmentContent.ts";
import { generateSopDocument } from "../src/lib/ai/generateSopDocument.ts";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const VENUE_ID = "b379e33f-b0d8-47bf-810e-450635b29b6b";
const STATION_ID = "f728e280-2265-42c4-b076-18b473c630f0"; // Pizza Station
const OLD_MODULE_ID = "c678b5b2-1745-4145-959c-3895b1ebce9a";

console.log("Deleting old thin content...");
await supabase.from("station_faqs").delete().eq("station_id", STATION_ID);
await supabase.from("station_troubleshooting_issues").delete().eq("station_id", STATION_ID);
await supabase.from("modules").delete().eq("id", OLD_MODULE_ID);

const { data: station } = await supabase
  .from("stations")
  .select("id, name, qr_code_slug, equipment_manufacturer, equipment_model, equipment_serial")
  .eq("id", STATION_ID)
  .single();

console.log(`Regenerating: ${station.equipment_manufacturer} ${station.equipment_model}...`);
const result = await researchEquipmentContent({
  stationName: station.name,
  manufacturer: station.equipment_manufacturer,
  model: station.equipment_model,
  serial: station.equipment_serial ?? "unknown",
});

console.log(`foundRealSource: ${result.foundRealSource}`);
console.log(`citation: ${result.citationTitle}${result.citationUrl ? ` (${result.citationUrl})` : ""}`);
console.log(`counts: ${result.moduleSections.length} sections, ${result.faqs.length} FAQs, ${result.troubleshooting.length} troubleshooting`);
if (result.withheldFields.length > 0) console.log(`WITHHELD: ${result.withheldFields.join(", ")}`);

const provenance = result.foundRealSource ? "ai_manual_sourced" : "ai_standard_fill";
const citation = result.citationUrl ? `${result.citationTitle} (${result.citationUrl})` : result.citationTitle;

const { data: createdModule, error: moduleError } = await supabase
  .from("modules")
  .insert({ venue_id: VENUE_ID, title: `${station.name} Equipment Guide`, topic_key: `station_equipment_${station.qr_code_slug}` })
  .select("id")
  .single();
if (moduleError) throw new Error(moduleError.message);
const moduleId = createdModule.id;

const sectionsToInsert = result.moduleSections.length > 0 ? result.moduleSections : [result.sopContent];
await supabase.from("module_sections").insert(sectionsToInsert.map((content, i) => ({ module_id: moduleId, section_order: i, content, provenance })));

await generateSopDocument(moduleId, supabase);
console.log("SOP document generated.");

if (result.faqs.length > 0) {
  await supabase.from("station_faqs").insert(
    result.faqs.map((f) => ({ station_id: STATION_ID, question: f.question, answer: f.answer, provenance, citation, status: "pending_approval" })),
  );
}
if (result.troubleshooting.length > 0) {
  await supabase.from("station_troubleshooting_issues").insert(
    result.troubleshooting.map((t) => ({
      station_id: STATION_ID,
      issue_title: t.issueTitle,
      diagnosis_steps: t.diagnosisSteps,
      resolution_text: t.resolutionText,
      escalation_required: t.escalationRequired,
      provenance,
      citation,
      status: "pending_approval",
    })),
  );
}

console.log(`\nNew module: ${moduleId}, ${sectionsToInsert.length} sections, ${result.faqs.length} FAQs, ${result.troubleshooting.length} troubleshooting.`);
