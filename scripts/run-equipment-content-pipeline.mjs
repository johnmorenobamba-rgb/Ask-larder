// Task 2: the equipment-sourced content pipeline, run for real against
// every station of a given venue that has real, owner-confirmed
// manufacturer/model/serial data captured through the actual
// NameplateCapture flow.
//
// Per station: research (web_search + fetch_url agentic loop) -> module
// (draft, pending the existing submit-for-approval step, same as every
// other module in this app) -> SOP document (generateSopDocument, derived
// from the module, matching how every other module's SOP gets made) ->
// FAQs -> troubleshooting entries. Everything is tagged with real
// provenance and a real citation (manual title/URL, or "Standard
// hospitality practice" on fallback) -- nothing here is presented as
// owner-authored, and nothing goes live automatically.
//
// Generalised 18 Sep 2026 (was hardcoded to Two Fires' venue_id, a one-off
// that would have needed re-patching for every future venue) to take the
// venue's slug as a CLI argument, so a real run for a new venue is a normal
// invocation, not a code edit.
//
// Run with: npx tsx scripts/run-equipment-content-pipeline.mjs <venue-slug>
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { researchEquipmentContent } from "../src/lib/ai/researchEquipmentContent.ts";
import { generateSopDocument } from "../src/lib/ai/generateSopDocument.ts";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const venueSlug = process.argv[2];
if (!venueSlug) {
  console.error("Usage: npx tsx scripts/run-equipment-content-pipeline.mjs <venue-slug>");
  process.exit(1);
}

const { data: venue, error: venueError } = await supabase.from("venues").select("id, name").eq("slug", venueSlug).maybeSingle();
if (venueError) throw new Error(venueError.message);
if (!venue) {
  console.error(`No venue found with slug "${venueSlug}".`);
  process.exit(1);
}
const VENUE_ID = venue.id;
console.log(`Running equipment-content pipeline for ${venue.name} (${venueSlug}, ${VENUE_ID})`);

const { data: stations, error } = await supabase
  .from("stations")
  .select("id, name, qr_code_slug, equipment_manufacturer, equipment_model, equipment_serial")
  .eq("venue_id", VENUE_ID)
  .order("name");
if (error) throw new Error(error.message);

const summary = [];

for (const station of stations) {
  if (!station.equipment_model) {
    console.log(`\n=== ${station.name}: SKIPPED (no equipment data on file) ===`);
    continue;
  }

  // Now that this script is meant to be run again for future venues (not a
  // one-off), guard against a re-run against the same venue silently
  // creating a second station_equipment_* module for the same station.
  const topicKey = `station_equipment_${station.qr_code_slug}`;
  const { data: existingModule } = await supabase
    .from("modules")
    .select("id")
    .eq("venue_id", VENUE_ID)
    .eq("topic_key", topicKey)
    .maybeSingle();
  if (existingModule) {
    console.log(`\n=== ${station.name}: SKIPPED (module ${existingModule.id} already exists for ${topicKey}) ===`);
    continue;
  }

  console.log(`\n=== ${station.name}: ${station.equipment_manufacturer} ${station.equipment_model} ===`);
  let result;
  try {
    result = await researchEquipmentContent({
      stationName: station.name,
      manufacturer: station.equipment_manufacturer,
      model: station.equipment_model,
      serial: station.equipment_serial ?? "unknown",
    });
  } catch (err) {
    console.error(`  FAILED research: ${err instanceof Error ? err.message : err}`);
    summary.push({ station: station.name, model: station.equipment_model, outcome: "research failed" });
    continue;
  }

  console.log(`  foundRealSource: ${result.foundRealSource}`);
  console.log(`  citation: ${result.citationTitle}${result.citationUrl ? ` (${result.citationUrl})` : ""}`);
  if (result.withheldFields.length > 0) console.log(`  WITHHELD (verbatim overlap): ${result.withheldFields.join(", ")}`);

  const provenance = result.foundRealSource ? "ai_manual_sourced" : "ai_standard_fill";
  const citation = result.citationUrl ? `${result.citationTitle} (${result.citationUrl})` : result.citationTitle;

  // Module: draft status (DB default), same starting state as every other
  // module -- the existing submit-for-approval step is unchanged, this
  // pipeline doesn't add a second approval path.
  const sectionsToInsert = result.moduleSections.length > 0 ? result.moduleSections : [result.sopContent];
  const { data: createdModule, error: moduleError } = await supabase
    .from("modules")
    .insert({ venue_id: VENUE_ID, title: `${station.name} Equipment Guide`, topic_key: `station_equipment_${station.qr_code_slug}` })
    .select("id")
    .single();
  if (moduleError || !createdModule) {
    console.error(`  FAILED module insert: ${moduleError?.message}`);
    summary.push({ station: station.name, model: station.equipment_model, outcome: "module insert failed" });
    continue;
  }
  const moduleId = createdModule.id;

  const { error: sectionsError } = await supabase.from("module_sections").insert(
    sectionsToInsert.map((content, i) => ({ module_id: moduleId, section_order: i, content, provenance, citation })),
  );
  if (sectionsError) console.error(`  FAILED sections insert: ${sectionsError.message}`);

  // SOP document, derived from the module -- same real infra as the
  // "Generate SOP document" button on the SOPs page.
  try {
    await generateSopDocument(moduleId, supabase);
    console.log(`  SOP document generated.`);
  } catch (err) {
    console.error(`  FAILED SOP generation: ${err instanceof Error ? err.message : err}`);
  }

  // FAQs
  if (result.faqs.length > 0) {
    const { error: faqError } = await supabase.from("station_faqs").insert(
      result.faqs.map((f) => ({
        station_id: station.id,
        question: f.question,
        answer: f.answer,
        provenance,
        citation,
        status: "pending_approval",
      })),
    );
    if (faqError) console.error(`  FAILED faqs insert: ${faqError.message}`);
  }

  // Troubleshooting
  if (result.troubleshooting.length > 0) {
    const { error: tsError } = await supabase.from("station_troubleshooting_issues").insert(
      result.troubleshooting.map((t) => ({
        station_id: station.id,
        issue_title: t.issueTitle,
        diagnosis_steps: t.diagnosisSteps,
        resolution_text: t.resolutionText,
        escalation_required: t.escalationRequired,
        provenance,
        citation,
        status: "pending_approval",
      })),
    );
    if (tsError) console.error(`  FAILED troubleshooting insert: ${tsError.message}`);
  }

  console.log(`  Module ${moduleId}: ${sectionsToInsert.length} sections, ${result.faqs.length} FAQs, ${result.troubleshooting.length} troubleshooting entries.`);
  summary.push({
    station: station.name,
    model: `${station.equipment_manufacturer} ${station.equipment_model}`,
    outcome: result.foundRealSource ? "real source found" : "generic fallback",
    citation,
    moduleId,
  });
}

console.log("\n\n=== SUMMARY ===");
for (const s of summary) {
  console.log(`${s.station} (${s.model}): ${s.outcome}${s.citation ? ` -- ${s.citation}` : ""}`);
}
